/**
 * Embedded Pi Web Server
 *
 * Provides:
 * - REST API for basic operations
 * - WebSocket for real-time chat
 * - Static files for the web UI
 */
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { handleWebSocketMessage } from "./websocket-handler.js";
import { sessionStore } from "./session-store.js";
import { startScheduler, stopScheduler, getState, findImprovementCandidates } from "../index.js";
import { SESSION_DIR } from "./websocket-handler.js";
import { loadSettings, saveSettings, getSettingsForClient, applySettingsToEnvironment } from "./settings-manager.js";
import {
  loadMetadata,
  getSessionMetadata,
  setSessionName,
  updateSessionModified,
  deleteSessionMetadata,
} from "./session-metadata.js";
import { readMemory, writeMemory, appendMemory, getRecentMemory } from "./memory-manager.js";
import {
  appendMemoryEntry,
  searchRelevantMemories,
  getRecentMemories,
  readMemoryIndex,
} from "./intelligent-memory.js";
import { getAutoresearchManager } from "./autoresearch/manager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || "7187", 10) || 7187;
const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Static files - serve from public directory
const publicDir = path.join(__dirname, "../../public");
app.use(express.static(publicDir));

// REST API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    sessions: sessionStore.getAllSessions(),
  });
});

app.get("/api/sessions", (req, res) => {
  res.json({
    sessions: sessionStore.getAllSessions(),
  });
});

// 获取所有会话文件（包括磁盘上的）
app.get("/api/sessions/all", (req, res) => {
  const sessions: Array<{ id: string; name: string; modified: number; hasMessages: boolean }> = [];
  const metadata = loadMetadata();

  if (fs.existsSync(SESSION_DIR)) {
    const files = fs.readdirSync(SESSION_DIR);
    files.forEach((file) => {
      if (file.endsWith(".jsonl")) {
        const sessionId = file.replace(".jsonl", "");
        const filePath = path.join(SESSION_DIR, file);
        const stats = fs.statSync(filePath);
        const sessionMeta = metadata[sessionId];

        sessions.push({
          id: sessionId,
          name: sessionMeta?.name || sessionId,
          modified: sessionMeta?.modifiedAt || stats.mtimeMs,
          hasMessages: stats.size > 0,
        });
      }
    });
  }

  // 按修改时间排序（最新的在前）
  sessions.sort((a, b) => b.modified - a.modified);
  res.json({ sessions });
});

// 创建新会话
app.post("/api/sessions", (req, res) => {
  const { sessionId, name } = req.body;
  const id = sessionId || `session_${Date.now()}`;
  res.json({ success: true, sessionId: id, name: name || id });
});

// 删除会话
app.delete("/api/sessions/:sessionId", (req, res) => {
  const { sessionId } = req.params;
  const sessionFile = path.join(SESSION_DIR, `${sessionId}.jsonl`);

  try {
    if (fs.existsSync(sessionFile)) {
      fs.unlinkSync(sessionFile);
    }
    deleteSessionMetadata(sessionId);
    res.json({ success: true, message: `Session ${sessionId} deleted` });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to delete session" });
  }
});

// 重命名会话
app.put("/api/sessions/:sessionId/name", (req, res) => {
  const { sessionId } = req.params;
  const { name } = req.body;

  if (!name || name.trim().length === 0) {
    res.status(400).json({ success: false, error: "Name is required" });
    return;
  }

  try {
    setSessionName(sessionId, name.trim());
    res.json({ success: true, sessionId, name: name.trim() });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to rename session" });
  }
});

app.post("/api/sessions/:sessionId/clear", (req, res) => {
  const { sessionId } = req.params;
  const session = sessionStore.get(sessionId);
  if (session) {
    session.history = [];
    res.json({ success: true, message: `Session ${sessionId} history cleared` });
  } else {
    res.status(404).json({ success: false, error: "Session not found" });
  }
});

// Evolution API
app.get("/api/evolution/status", (req, res) => {
  res.json({
    status: "ok",
    state: getState(),
  });
});

app.get("/api/evolution/candidates", (req, res) => {
  const candidates = findImprovementCandidates();
  res.json({
    candidates: candidates.slice(0, 20),
  });
});

let evolutionSchedulerRunning = false;

app.post("/api/evolution/start", (req, res) => {
  if (!evolutionSchedulerRunning) {
    startScheduler();
    evolutionSchedulerRunning = true;
  }
  res.json({ success: true, running: evolutionSchedulerRunning });
});

app.post("/api/evolution/stop", (req, res) => {
  if (evolutionSchedulerRunning) {
    stopScheduler();
    evolutionSchedulerRunning = false;
  }
  res.json({ success: true, running: evolutionSchedulerRunning });
});

// Memory API
app.get("/api/memory", (req, res) => {
  const limit = parseInt(req.query.limit as string) || 10;
  res.json({
    success: true,
    content: readMemory(),
    recent: getRecentMemory(limit),
  });
});

app.post("/api/memory", (req, res) => {
  const { content } = req.body;
  if (!content) {
    res.status(400).json({ success: false, error: "Content is required" });
    return;
  }
  appendMemory(content);
  res.json({ success: true });
});

app.put("/api/memory", (req, res) => {
  const { content } = req.body;
  if (content === undefined) {
    res.status(400).json({ success: false, error: "Content is required" });
    return;
  }
  writeMemory(content);
  res.json({ success: true });
});

// Intelligent Memory API
app.post("/api/intelligent-memory/append", (req, res) => {
  const { content, sourceSessionId, sourceSessionName } = req.body;
  if (!content) {
    res.status(400).json({ success: false, error: "Content is required" });
    return;
  }
  const entry = appendMemoryEntry({ content, sourceSessionId, sourceSessionName });
  res.json({ success: true, entry });
});

app.get("/api/intelligent-memory/search", (req, res) => {
  const { q, limit = "5" } = req.query;
  if (!q || typeof q !== "string") {
    res.status(400).json({ success: false, error: "Query parameter 'q' is required" });
    return;
  }
  const results = searchRelevantMemories(q, parseInt(limit as string, 10));
  res.json({ success: true, results });
});

app.get("/api/intelligent-memory/recent", (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 10;
  const results = getRecentMemories(limit);
  res.json({ success: true, results });
});

app.get("/api/intelligent-memory/index", (req, res) => {
  const index = readMemoryIndex();
  res.json({ success: true, index });
});

// Settings API
app.get("/api/settings", (req, res) => {
  res.json({
    success: true,
    settings: getSettingsForClient(),
  });
});

app.post("/api/settings", (req, res) => {
  try {
    saveSettings(req.body);
    applySettingsToEnvironment();
    res.json({
      success: true,
      settings: getSettingsForClient(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to save settings",
    });
  }
});

// Discovery Agent API (now using Autoresearch v2 - Karpathy-style)
app.get("/api/discovery/health", (req, res) => {
  res.json({ success: true, status: "ok", service: "autoresearch-v2" });
});

app.post("/api/discovery/start", async (req, res) => {
  try {
    const { goal, max_cycles = 3 } = req.body;
    if (!goal) {
      res.status(400).json({ success: false, error: "Goal is required" });
      return;
    }
    const ar2Manager = getAutoresearchManager();
    const task = await ar2Manager.startTask(goal, max_cycles, false); // 默认使用真实LLM
    res.json({ 
      success: true, 
      task_id: task.task_id,
      status: task.status,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to start discovery task",
    });
  }
});

app.get("/api/discovery/status/:taskId", (req, res) => {
  try {
    const { taskId } = req.params;
    const ar2Manager = getAutoresearchManager();
    const task = ar2Manager.getTask(taskId);
    if (!task) {
      res.status(404).json({ success: false, error: "Task not found" });
      return;
    }
    // 转换为旧 API 格式以保持兼容性
    res.json({ 
      success: true, 
      task_id: task.task_id,
      status: task.status,
      goal: task.goal,
      current_cycle: task.current_cycle,
      max_cycles: task.max_cycles,
      is_converged: task.is_converged,
      error: task.error,
      final_state: task.final_state,
      cycle_states: task.cycle_states,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to get task status",
    });
  }
});

app.get("/api/discovery/tasks", (req, res) => {
  try {
    const ar2Manager = getAutoresearchManager();
    const tasks = ar2Manager.listTasks();
    // 转换为旧 API 格式以保持兼容性
    const compatibleTasks = tasks.map(task => ({
      task_id: task.task_id,
      status: task.status,
      goal: task.goal,
      current_cycle: task.current_cycle,
      max_cycles: task.max_cycles,
      is_converged: task.is_converged,
      error: task.error,
    }));
    res.json({ success: true, tasks: compatibleTasks });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to list tasks",
    });
  }
});

// WebSocket Server
const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
  console.log("[WebSocket] New connection");

  ws.on("message", async (data: Buffer) => {
    try {
      const message = JSON.parse(data.toString());
      await handleWebSocketMessage(ws, message);
    } catch (error) {
      console.error("[WebSocket] Error parsing message:", error);
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: "Invalid JSON message" },
        })
      );
    }
  });

  ws.on("close", () => {
    console.log("[WebSocket] Connection closed");
  });

  ws.on("error", (error) => {
    console.error("[WebSocket] Error:", error);
  });

  // Send welcome
  ws.send(
    JSON.stringify({
      type: "connected",
      data: { message: "Welcome to Embedded Pi WebSocket" },
    })
  );
});

// Start server with automatic port fallback
function startServer(port: number) {
  server.listen(port, () => {
    console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Embedded Pi Web Server                                      ║
║                                                                ║
║   Web UI:      http://localhost:${port}                        ║
║   WebSocket:   ws://localhost:${port}/ws                       ║
║   Health:      http://localhost:${port}/api/health             ║
║                                                                ║
║   Evolution API:                                               ║
║   - Status:    GET  /api/evolution/status                    ║
║   - Candidates:GET  /api/evolution/candidates                ║
║   - Start:     POST /api/evolution/start                     ║
║   - Stop:      POST /api/evolution/stop                      ║
║                                                                ║
║   Discovery Agent API:                                         ║
║   - Health:    GET  /api/discovery/health                    ║
║   - Start:     POST /api/discovery/start                     ║
║   - Status:    GET  /api/discovery/status/:taskId            ║
║   - Tasks:     GET  /api/discovery/tasks                     ║
║                                                                ║
║   Press Ctrl+C to stop                                        ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
    `);

    // Cleanup on exit
    process.on("SIGINT", () => {
      console.log("\nShutting down...");
      stopScheduler();
      process.exit(0);
    });
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${port} is in use, trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(PORT);
