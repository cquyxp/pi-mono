/**
 * WebSocket handler for real-time communication
 */
import type WebSocket from "ws";
import {
  createAgentSession,
  SettingsManager,
  AuthStorage,
  ModelRegistry,
  discoverContextFiles,
  buildSystemPrompt,
  codingTools,
} from "@mariozechner/pi-coding-agent";
import { getModel } from "@mariozechner/pi-ai";
import type { Model } from "@mariozechner/pi-ai";
import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, TextContent, ThinkingContent, ToolCall } from "@mariozechner/pi-ai";
import path from "path";
import { homedir } from "os";
import fs from "fs";
import { sessionStore } from "./session-store.js";
import { getAutoresearchManager } from "./autoresearch-manager.js";
import { getAutoresearchManager as getAutoresearchV2Manager } from "./autoresearch/manager.js";
import type {
  WebSocketMessage,
  PromptMessage,
  SubscribeMessage,
  GetHistoryMessage,
  StopMessage,
  PartialReplyMessage,
  BlockReplyMessage,
  ReasoningStreamMessage,
  ToolResultMessage,
  AgentEventMessage,
  HistoryMessage,
  ErrorMessage,
  SuccessMessage,
  ARStartMessage,
  ARStopMessage,
  ARGetStateMessage,
  ARStateMessage,
  ARLogMessage,
  GetSettingsMessage,
  SaveSettingsMessage,
  SettingsMessage,
  AR2StartMessage,
  AR2StopMessage,
  AR2GetTaskMessage,
  AR2ListTasksMessage,
  AR2StateMessage,
  AR2LogMessage,
  AR2TaskListMessage,
} from "./types.js";
import {
  loadSettings,
  saveSettings,
  getSettingsForClient,
  applySettingsToEnvironment,
} from "./settings-manager.js";
import {
  appendMemoryEntry,
  searchRelevantMemories,
  buildSessionSummaryPrompt,
  shouldExtractMemory,
} from "./intelligent-memory.js";

// Apply saved settings on startup
applySettingsToEnvironment();

// 火山引擎配置 - 直接创建 Model 对象
function createVolcengineModel(): Model<"openai-completions"> {
  return {
    id: "doubao-seed-2.0-code",
    name: "Doubao Seed 2.0 Code",
    api: "openai-completions",
    provider: "volcengine-coding",
    baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 16384,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      supportsUsageInStreaming: true,
      maxTokensField: "max_completion_tokens",
      requiresToolResultName: false,
      requiresAssistantAfterToolResult: false,
      requiresThinkingAsText: false,
      requiresMistralToolIds: false,
      thinkingFormat: "openai",
    },
  };
}

// Workspace base directory - 支持环境变量配置
const baseWorkspace = process.env.WORKSPACE_DIR || "workspace";
const WORKSPACE_BASE = path.isAbsolute(baseWorkspace)
  ? baseWorkspace
  : path.join(process.cwd(), baseWorkspace);
export const SESSION_DIR = path.join(WORKSPACE_BASE, "sessions");
const AGENT_DIR = path.join(WORKSPACE_BASE, "agents");
export const WORKSPACE_DIR = WORKSPACE_BASE;

// Ensure directories exist
if (!fs.existsSync(SESSION_DIR)) {
  fs.mkdirSync(SESSION_DIR, { recursive: true });
}
if (!fs.existsSync(AGENT_DIR)) {
  fs.mkdirSync(AGENT_DIR, { recursive: true });
}

// Helper to check if message has tool calls
function hasToolCalls(message: AssistantMessage): boolean {
  if (!message.content || !Array.isArray(message.content)) {
    return false;
  }
  return message.content.some((c) => (c as any).type === "toolCall");
}

// Helper to extract text from AssistantMessage content
function extractTextFromMessage(message: AssistantMessage): string {
  if (!message.content || !Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .filter((c): c is TextContent => c.type === "text")
    .map((c) => c.text)
    .join("");
}

// Helper to extract thinking from AssistantMessage content
function extractThinkingFromMessage(message: AssistantMessage): string {
  if (!message.content || !Array.isArray(message.content)) {
    return "";
  }
  return message.content
    .filter((c): c is ThinkingContent => c.type === "thinking")
    .map((c) => c.thinking)
    .join("");
}

// Token 估算函数（与前端保持一致）
function estimateTokens(text: string): number {
  if (!text) return 0;

  // 统计中文字符、日文、韩文等（CJK 字符）
  const cjkChars = (text.match(/[\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/g) || []).length;
  // 统计其他字符
  const otherChars = text.length - cjkChars;

  // CJK: 约 1.3 字符 = 1 token
  // 英文/其他: 约 4 字符 = 1 token
  const cjkTokens = Math.ceil(cjkChars / 1.3);
  const otherTokens = Math.ceil(otherChars / 4);

  return cjkTokens + otherTokens;
}

// Track all connected WebSockets for broadcasting
const connectedWebSockets: Set<WebSocket> = new Set();

// Broadcast autoresearch state and logs to all connected clients
function broadcastARMessage(message: WebSocketMessage): void {
  const msgStr = JSON.stringify(message);
  for (const ws of connectedWebSockets) {
    if (ws.readyState === 1) {
      try {
        ws.send(msgStr);
      } catch (e) {
        console.error("Failed to broadcast to WS:", e);
      }
    }
  }
}

// Broadcast autoresearch v2 (Karpathy-style) messages to all connected clients
function broadcastAR2Message(message: WebSocketMessage): void {
  const msgStr = JSON.stringify(message);
  for (const ws of connectedWebSockets) {
    if (ws.readyState === 1) {
      try {
        ws.send(msgStr);
      } catch (e) {
        console.error("Failed to broadcast AR2 to WS:", e);
      }
    }
  }
}

// Setup autoresearch manager event listeners
const arManager = getAutoresearchManager();
arManager.on("stateChanged", (state: any) => {
  broadcastARMessage({
    type: "ar_state",
    data: {
      running: state.running,
      iterations: state.iterations,
      successCount: state.successCount,
      bestValBpb: state.bestValBpb,
      config: state.config,
    },
  } as ARStateMessage);
});

arManager.on("log", (log: any) => {
  broadcastARMessage({
    type: "ar_log",
    data: log,
  } as ARLogMessage);
});

// Setup autoresearch v2 (Karpathy-style) manager event listeners
const ar2Manager = getAutoresearchV2Manager();
ar2Manager.on("taskCreated", (task: any) => {
  broadcastAR2Message({
    type: "ar2_state",
    data: task,
  } as AR2StateMessage);
});

ar2Manager.on("taskUpdated", (task: any) => {
  broadcastAR2Message({
    type: "ar2_state",
    data: task,
  } as AR2StateMessage);
});

ar2Manager.on("log", (log: any) => {
  const time = new Date().toTimeString().split(" ")[0];
  broadcastAR2Message({
    type: "ar2_log",
    data: { ...log, time },
  } as AR2LogMessage);
});

export async function handleWebSocketMessage(
  ws: WebSocket,
  message: WebSocketMessage
): Promise<void> {
  // Add to connected set
  connectedWebSockets.add(ws);
  ws.on("close", () => connectedWebSockets.delete(ws));

  try {
    switch (message.type) {
      case "ping":
        sendMessage(ws, { type: "pong" });
        break;

      case "subscribe":
        await handleSubscribe(ws, message as SubscribeMessage);
        // Send current autoresearch state
        sendMessage(ws, {
          type: "ar_state",
          data: {
            running: arManager.getState().running,
            iterations: arManager.getState().iterations,
            successCount: arManager.getState().successCount,
            bestValBpb: arManager.getState().bestValBpb,
            config: arManager.getState().config,
          },
        } as ARStateMessage);
        break;

      case "prompt":
        await handlePrompt(ws, message as PromptMessage);
        break;

      case "stop":
        await handleStop(ws, message as StopMessage);
        break;

      case "get_history":
        await handleGetHistory(ws, message as GetHistoryMessage);
        break;

      case "ar_start": {
        const arMsg = message as ARStartMessage;
        if (arMsg.data?.maxIterations) {
          arManager.setConfig(arMsg.data.maxIterations, arMsg.data.timeoutMinutes || 5);
        }
        arManager.setTopic(arMsg.data?.topic);
        arManager.start();
        sendMessage(ws, {
          type: "success",
          data: { message: "Autoresearch started" },
          id: message.id,
        } as SuccessMessage);
        break;
      }

      case "ar_stop":
        arManager.stop();
        sendMessage(ws, {
          type: "success",
          data: { message: "Autoresearch stopped" },
          id: message.id,
        } as SuccessMessage);
        break;

      case "ar_get_state":
        sendMessage(ws, {
          type: "ar_state",
          data: {
            running: arManager.getState().running,
            iterations: arManager.getState().iterations,
            successCount: arManager.getState().successCount,
            bestValBpb: arManager.getState().bestValBpb,
            config: arManager.getState().config,
          },
        } as ARStateMessage);
        break;

      // ========== Autoresearch v2 (Karpathy-style) ==========
      case "ar2_start": {
        const ar2Msg = message as AR2StartMessage;
        const task = await ar2Manager.startTask(
          ar2Msg.data.goal,
          ar2Msg.data.maxCycles || 5,
          ar2Msg.data.useMock !== false
        );
        sendMessage(ws, {
          type: "success",
          data: { message: "Autoresearch v2 started", taskId: task.task_id },
          id: message.id,
        } as SuccessMessage);
        break;
      }

      case "ar2_stop": {
        const ar2Msg = message as AR2StopMessage;
        const stopped = ar2Manager.stopTask(ar2Msg.data.taskId);
        sendMessage(ws, {
          type: "success",
          data: { message: stopped ? "Autoresearch v2 stopped" : "Task not found" },
          id: message.id,
        } as SuccessMessage);
        break;
      }

      case "ar2_get_task": {
        const ar2Msg = message as AR2GetTaskMessage;
        const task = ar2Manager.getTask(ar2Msg.data.taskId);
        if (task) {
          sendMessage(ws, {
            type: "ar2_state",
            data: task,
            id: message.id,
          } as AR2StateMessage);
        } else {
          sendMessage(ws, {
            type: "error",
            data: { message: "Task not found" },
            id: message.id,
          } as ErrorMessage);
        }
        break;
      }

      case "ar2_list_tasks": {
        const tasks = ar2Manager.listTasks();
        sendMessage(ws, {
          type: "ar2_task_list",
          data: tasks,
          id: message.id,
        } as AR2TaskListMessage);
        break;
      }

      case "get_settings":
        sendMessage(ws, {
          type: "settings",
          data: getSettingsForClient(),
          id: message.id,
        } as SettingsMessage);
        break;

      case "save_settings": {
        const saveMsg = message as SaveSettingsMessage;
        saveSettings(saveMsg.data || {});
        applySettingsToEnvironment();
        sendMessage(ws, {
          type: "success",
          data: { message: "Settings saved" },
          id: message.id,
        } as SuccessMessage);
        // Broadcast updated settings to all connected clients
        const settingsMsg = JSON.stringify({
          type: "settings",
          data: getSettingsForClient(),
        } as SettingsMessage);
        for (const client of connectedWebSockets) {
          if (client.readyState === 1) {
            client.send(settingsMsg);
          }
        }
        break;
      }

      default:
        sendMessage(ws, {
          type: "error",
          data: { message: `Unknown message type: ${message.type}` },
          id: message.id,
        } as ErrorMessage);
    }
  } catch (error) {
    console.error("WebSocket handler error:", error);
    sendMessage(ws, {
      type: "error",
      data: {
        message: error instanceof Error ? error.message : String(error),
      },
      id: message.id,
    } as ErrorMessage);
  }
}

async function handleSubscribe(
  ws: WebSocket,
  message: SubscribeMessage
): Promise<void> {
  const { sessionId } = message.data;

  // Create or get session
  if (!sessionStore.has(sessionId)) {
    await createSession(sessionId);
  }

  sessionStore.addConnection(sessionId, ws);

  // Cleanup on disconnect
  ws.on("close", () => {
    sessionStore.removeConnection(sessionId, ws);
  });

  // Send system prompt info if available
  const activeSession = sessionStore.get(sessionId);
  if (activeSession?.systemPrompt) {
    sendMessage(ws, {
      type: "system_prompt",
      data: {
        content: activeSession.systemPrompt,
        estimatedTokens: estimateTokens(activeSession.systemPrompt),
      },
    });
  }

  sendMessage(ws, {
    type: "success",
    data: { message: `Subscribed to session ${sessionId}` },
    id: message.id,
  } as SuccessMessage);
}

async function handlePrompt(ws: WebSocket, message: PromptMessage): Promise<void> {
  const { sessionId, prompt, provider = "volcengine-coding", model = "doubao-seed-2.0-code", thinkingLevel = "medium" } = message.data;

  // Ensure session exists
  if (!sessionStore.has(sessionId)) {
    await createSession(sessionId);
  }

  const activeSession = sessionStore.get(sessionId);
  if (!activeSession) {
    throw new Error("Session not found");
  }

  // 检查是否是新会话的第一条消息，如果是则检索相关记忆
  const history = sessionStore.getHistory(sessionId);
  const isFirstMessage = history.length === 0;

  // 在 system prompt 中加入相关记忆
  let memoryContext = "";
  if (isFirstMessage) {
    const relevantMemories = searchRelevantMemories(prompt, 5);
    if (relevantMemories.length > 0) {
      memoryContext = `## 相关记忆（供参考）：\n${
        relevantMemories.map(m => `- ${m.content}`).join('\n')
      }\n\n`;
      console.log(`[Intelligent Memory] Found ${relevantMemories.length} relevant memories for new session`);
    }
  }

  // If already running, abort first
  if (activeSession.isRunning) {
    await activeSession.session.abort();
  }

  // Mark as running
  activeSession.isRunning = true;

  // Add user message to history
  sessionStore.addToHistory(sessionId, "user", prompt);

  // Subscribe to events for this run
  let finalText = "";
  let currentThinking = "";
  let isToolExecuting = false;
  let lastStableText = "";

  const unsubscribe = activeSession.session.subscribe((event: AgentSessionEvent) => {
    // Broadcast all events
    sessionStore.broadcast(sessionId, JSON.stringify({
      type: "agent_event",
      data: {
        eventType: (event as any).type,
        eventData: event,
        timestamp: Date.now(),
      },
    } as AgentEventMessage));

    // Handle specific event types
    if ("type" in event) {
      switch (event.type) {
        case "tool_execution_start": {
          isToolExecuting = true;
          break;
        }

        case "tool_execution_end": {
          const toolExec = event as {
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result: unknown;
            isError: boolean;
          };
          sessionStore.broadcast(sessionId, JSON.stringify({
            type: "tool_result",
            data: {
              id: toolExec.toolCallId,
              name: toolExec.toolName,
              parameters: toolExec.args ?? {},
              result: toolExec.isError ? undefined : toolExec.result,
              isError: toolExec.isError,
            },
          } as ToolResultMessage));
          break;
        }

        case "message_update":
        case "text_delta": {
          // Try to extract from different event formats
          let text = "";
          let hasToolCall = false;

          if ("message" in event && event.message) {
            const msg = event.message as AssistantMessage;
            hasToolCall = hasToolCalls(msg);
            text = extractTextFromMessage(msg);
          } else if ("partial" in event && event.partial) {
            const msg = event.partial as AssistantMessage;
            hasToolCall = hasToolCalls(msg);
            text = extractTextFromMessage(msg);
          } else if ("delta" in event && typeof event.delta === "string") {
            finalText += event.delta;
            text = finalText;
          }

          // Only update reply if:
          // 1. We have text, AND
          // 2. Either not executing tools, OR the text is actually changing in a stable way
          if (text) {
            // If tool is executing, only update if text is significantly different
            // or if we don't have any stable text yet
            if (!isToolExecuting || !lastStableText || text.length > lastStableText.length + 10) {
              finalText = text;
              if (!isToolExecuting) {
                lastStableText = text;
              }
              sessionStore.broadcast(sessionId, JSON.stringify({
                type: "partial_reply",
                data: { text },
              } as PartialReplyMessage));
            }
          }
          break;
        }

        case "thinking_delta": {
          let thinking = "";
          if ("delta" in event && typeof event.delta === "string") {
            currentThinking += event.delta;
            thinking = currentThinking;
          } else if ("partial" in event && event.partial) {
            thinking = extractThinkingFromMessage(event.partial as AssistantMessage);
          }

          if (thinking) {
            sessionStore.broadcast(sessionId, JSON.stringify({
              type: "reasoning_stream",
              data: { text: thinking },
            } as ReasoningStreamMessage));
          }
          break;
        }

        case "message_end":
        case "done": {
          isToolExecuting = false;
          let text = "";
          if ("message" in event && event.message) {
            text = extractTextFromMessage(event.message as AssistantMessage);
          }

          if (text) {
            finalText = text;
            lastStableText = text;
          }
          break;
        }
      }
    }
  });

  try {
    // Run the prompt
    await activeSession.session.prompt(prompt);

    // Get final text from the session if we don't have it
    if (!finalText) {
      const messages = activeSession.session.messages;
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && "content" in lastMessage) {
        const content = lastMessage.content;
        if (typeof content === "string") {
          finalText = content;
        } else if (Array.isArray(content)) {
          finalText = content
            .filter((c: any) => c.type === "text")
            .map((c: any) => c.text)
            .join("");
        }
      }
    }

    // Use last stable text if final text is empty
    if (!finalText && lastStableText) {
      finalText = lastStableText;
    }

    // Add assistant message to history
    sessionStore.addToHistory(sessionId, "assistant", finalText);

    // Send final block reply
    sessionStore.broadcast(sessionId, JSON.stringify({
      type: "block_reply",
      data: { text: finalText, mediaUrls: [] },
    } as BlockReplyMessage));

    // Send success
    sendMessage(ws, {
      type: "success",
      data: { message: "Prompt completed" },
      id: message.id,
    } as SuccessMessage);

    // 自动提取记忆（在后台异步执行，不阻塞响应）
    const fullHistory = sessionStore.getHistory(sessionId);
    if (fullHistory.length >= 2) {
      const metadata = getSessionMetadata(sessionId);
      autoExtractMemory(
        fullHistory,
        sessionId,
        metadata?.name || sessionId
      ).catch((err) => console.error("[Intelligent Memory] Auto extract failed:", err));
    }
  } catch (error) {
    console.error("[WebSocket] Prompt error:", error);

    // Check if it was an abort
    if (error instanceof Error && (error.name === "AbortError" || error.message?.includes("abort"))) {
      // Use last stable text if we have it
      const textToUse = lastStableText || finalText;
      if (textToUse) {
        sessionStore.addToHistory(sessionId, "assistant", textToUse);
        sessionStore.broadcast(sessionId, JSON.stringify({
          type: "block_reply",
          data: { text: textToUse, mediaUrls: [] },
        } as BlockReplyMessage));
      }
      sendMessage(ws, {
        type: "success",
        data: { message: "Generation stopped" },
        id: message.id,
      } as SuccessMessage);
    } else {
      // 对于其他错误，也要向客户端发送错误消息，避免前端卡住
      const errorMessage = error instanceof Error ? error.message : String(error);
      sendMessage(ws, {
        type: "error",
        data: { message: errorMessage },
        id: message.id,
      } as ErrorMessage);

      // 如果有部分内容，也发送给用户
      const textToUse = lastStableText || finalText;
      if (textToUse) {
        sessionStore.addToHistory(sessionId, "assistant", textToUse);
        sessionStore.broadcast(sessionId, JSON.stringify({
          type: "block_reply",
          data: { text: textToUse, mediaUrls: [] },
        } as BlockReplyMessage));
      }
    }
  } finally {
    // Mark as not running
    activeSession.isRunning = false;
    // Cleanup event listener
    unsubscribe();
  }
}

async function handleStop(ws: WebSocket, message: StopMessage): Promise<void> {
  const { sessionId } = message.data;

  const activeSession = sessionStore.get(sessionId);
  if (!activeSession) {
    sendMessage(ws, {
      type: "error",
      data: { message: "Session not found" },
      id: message.id,
    } as ErrorMessage);
    return;
  }

  if (activeSession.isRunning) {
    await activeSession.session.abort();
  }

  sendMessage(ws, {
    type: "success",
    data: { message: "Stopped" },
    id: message.id,
  } as SuccessMessage);
}

async function handleGetHistory(
  ws: WebSocket,
  message: GetHistoryMessage
): Promise<void> {
  const { sessionId } = message.data;

  const activeSession = sessionStore.get(sessionId);

  let messages: Array<{ role: string; content: string }> = [];
  if (activeSession) {
    // 优先从 session 的持久化消息中获取（这是最完整的历史记录）
    if (activeSession.session && activeSession.session.messages) {
      messages = activeSession.session.messages
        .filter((msg: any) => msg.role === "user" || msg.role === "assistant")
        .map((msg: any) => {
          let content = "";
          if (typeof msg.content === "string") {
            content = msg.content;
          } else if (Array.isArray(msg.content)) {
            // 提取文本内容
            content = msg.content
              .filter((c: any) => c.type === "text")
              .map((c: any) => c.text)
              .join("");
          }
          return {
            role: msg.role,
            content: content || "",
          };
        });
    }
    // 如果持久化消息中没有，再使用内存中的 history 作为备选
    else if (activeSession.history.length > 0) {
      messages = activeSession.history.map((h) => ({
        role: h.role,
        content: h.content,
      }));
    }
  }

  console.log("Sending history messages:", messages);

  sendMessage(ws, {
    type: "history",
    data: { messages },
    id: message.id,
  } as HistoryMessage);
}

async function createSession(sessionId: string): Promise<void> {
  const sessionFile = path.join(SESSION_DIR, `${sessionId}.jsonl`);
  const workspaceDir = WORKSPACE_DIR;

  const settingsManager = SettingsManager.create(workspaceDir, AGENT_DIR);

  // 启用自动 Context 压缩机制
  settingsManager.setCompactionEnabled(true);
  // 配置压缩：保留 32k token 空间用于新消息，保留最近 64k token 的对话历史
  settingsManager.applyOverrides({
    compaction: {
      enabled: true,
      reserveTokens: 32000,      // 为新消息保留 32k token
      keepRecentTokens: 64000,   // 保留最近 64k token 的历史
    },
  });

  const authStorage = new AuthStorage(path.join(AGENT_DIR, "auth.json"));
  const modelRegistry = new ModelRegistry(authStorage, path.join(AGENT_DIR, "models.json"));

  // Get default model - use volcengine model directly
  const defaultProvider = settingsManager.getDefaultProvider() || "volcengine-coding";
  const defaultModelId = settingsManager.getDefaultModel() || "doubao-seed-2.0-code";

  let model: Model<any>;
  if (defaultProvider === "volcengine-coding") {
    model = createVolcengineModel();
    // Set API key via runtime override if available
    const apiKey = process.env.VOLCENGINE_API_KEY;
    if (apiKey) {
      authStorage.setRuntimeApiKey(defaultProvider, apiKey);
    }
  } else {
    try {
      model = modelRegistry.find(defaultProvider, defaultModelId)!;
    } catch {
      model = getModel(defaultProvider as any, defaultModelId);
    }
  }

  const sessionManager = (await import("../session-manager.js")).getCachedSessionManager(sessionFile);

  // 发现所有 context files（包括 AGENTS.md 和其他相关的 md 文件）
  const contextFiles = discoverContextFiles(workspaceDir, AGENT_DIR);

  // 使用 buildSystemPrompt 构建完整的 system prompt
  // 这会包含所有 context files、tools 信息等
  const fullSystemPrompt = buildSystemPrompt({
    contextFiles,
    tools: codingTools,
    cwd: workspaceDir,
  });

  const { session } = await createAgentSession({
    cwd: workspaceDir,
    agentDir: AGENT_DIR,
    authStorage,
    modelRegistry,
    model,
    sessionManager,
    settingsManager,
    systemPrompt: fullSystemPrompt,
    contextFiles,
  });

  sessionStore.set(sessionId, {
    session,
    connections: new Set(),
    history: [],
    systemPrompt: fullSystemPrompt,
  });
}

// 自动从对话中提取记忆
async function autoExtractMemory(
  messages: Array<{ role: string; content: string }>,
  sourceSessionId?: string,
  sourceSessionName?: string
): Promise<void> {
  // 检查是否值得提取记忆
  if (!shouldExtractMemory(messages)) {
    console.log("[Intelligent Memory] Conversation not worth extracting");
    return;
  }

  try {
    console.log("[Intelligent Memory] Starting memory extraction...");

    // 创建一个临时的 model 来做记忆提取
    const model = createVolcengineModel();

    // 构建提示词
    const prompt = buildSessionSummaryPrompt(messages);

    // 使用简单的 fetch 调用 AI 来提取要点
    const apiKey = process.env.VOLCENGINE_API_KEY;
    if (!apiKey) {
      console.log("[Intelligent Memory] No API key, skipping memory extraction");
      return;
    }

    const response = await fetch(`${model.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model.id,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_completion_tokens: 1024,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      console.error("[Intelligent Memory] API request failed:", response.statusText);
      return;
    }

    const data = await response.json();
    const summaryText = data.choices?.[0]?.message?.content || "";

    if (!summaryText.trim()) {
      console.log("[Intelligent Memory] No summary returned");
      return;
    }

    // 解析提取的要点并保存
    const lines = summaryText.split("\n").filter((line: string) => line.trim().length > 0);

    if (lines.length === 0) {
      console.log("[Intelligent Memory] No memory points extracted");
      return;
    }

    // 保存每个要点作为单独的记忆
    for (const line of lines) {
      const content = line.replace(/^[-*•]\s*/, "").trim();
      if (content.length > 0) {
        appendMemoryEntry({
          content,
          sourceSessionId,
          sourceSessionName,
        });
      }
    }

    console.log(`[Intelligent Memory] Extracted ${lines.length} memory points`);
  } catch (error) {
    console.error("[Intelligent Memory] Failed to extract memory:", error);
  }
}

function sendMessage(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}
