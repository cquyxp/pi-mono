/**
 * Embedded Pi Web Server
 *
 * Provides:
 * - REST API for basic operations
 * - WebSocket for real-time chat
 * - Static files for the web UI
 */
import express from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { handleWebSocketMessage } from "./websocket-handler.js";
import { sessionStore } from "./session-store.js";
import { startScheduler, stopScheduler, getState, findImprovementCandidates } from "../index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 7187;
const app = express();
const server = createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Static files - serve from public directory
const publicDir = join(__dirname, "../../public");
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

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Embedded Pi Web Server                                      ║
║                                                                ║
║   Web UI:      http://localhost:${PORT}                        ║
║   WebSocket:   ws://localhost:${PORT}/ws                       ║
║   Health:      http://localhost:${PORT}/api/health             ║
║                                                                ║
║   Evolution API:                                               ║
║   - Status:    GET  /api/evolution/status                    ║
║   - Candidates:GET  /api/evolution/candidates                ║
║   - Start:     POST /api/evolution/start                     ║
║   - Stop:      POST /api/evolution/stop                      ║
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
