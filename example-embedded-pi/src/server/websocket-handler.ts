/**
 * WebSocket handler for real-time communication
 */
import type WebSocket from "ws";
import {
  createAgentSession,
  SettingsManager,
  AuthStorage,
  ModelRegistry,
} from "@mariozechner/pi-coding-agent";
import { getModel } from "@mariozechner/pi-ai";
import type { Model } from "@mariozechner/pi-ai";
import type { AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import type { AssistantMessage, TextContent, ThinkingContent, ToolCall } from "@mariozechner/pi-ai";
import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";
import { sessionStore } from "./session-store.js";
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
} from "./types.js";

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

const SESSION_DIR = join(homedir(), ".example-embedded-pi", "sessions");
const AGENT_DIR = join(homedir(), ".pi", "agent");

// Ensure directories exist
if (!existsSync(SESSION_DIR)) {
  mkdirSync(SESSION_DIR, { recursive: true });
}
if (!existsSync(AGENT_DIR)) {
  mkdirSync(AGENT_DIR, { recursive: true });
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

export async function handleWebSocketMessage(
  ws: WebSocket,
  message: WebSocketMessage
): Promise<void> {
  try {
    switch (message.type) {
      case "ping":
        sendMessage(ws, { type: "pong" });
        break;

      case "subscribe":
        await handleSubscribe(ws, message as SubscribeMessage);
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
        case "message_update":
        case "text_delta": {
          // Try to extract from different event formats
          let text = "";
          if ("message" in event && event.message) {
            text = extractTextFromMessage(event.message as AssistantMessage);
          } else if ("partial" in event && event.partial) {
            text = extractTextFromMessage(event.partial as AssistantMessage);
          } else if ("delta" in event && typeof event.delta === "string") {
            finalText += event.delta;
            text = finalText;
          }

          if (text) {
            finalText = text;
            sessionStore.broadcast(sessionId, JSON.stringify({
              type: "partial_reply",
              data: { text },
            } as PartialReplyMessage));
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

        case "message_end":
        case "done": {
          let text = "";
          if ("message" in event && event.message) {
            text = extractTextFromMessage(event.message as AssistantMessage);
          }

          if (text) {
            finalText = text;
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
  } catch (error) {
    // Check if it was an abort
    if (error instanceof Error && (error.name === "AbortError" || error.message?.includes("abort"))) {
      // Add whatever text we have
      if (finalText) {
        sessionStore.addToHistory(sessionId, "assistant", finalText);
        sessionStore.broadcast(sessionId, JSON.stringify({
          type: "block_reply",
          data: { text: finalText, mediaUrls: [] },
        } as BlockReplyMessage));
      }
      sendMessage(ws, {
        type: "success",
        data: { message: "Generation stopped" },
        id: message.id,
      } as SuccessMessage);
    } else {
      throw error;
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

  sendMessage(ws, {
    type: "history",
    data: {
      messages: activeSession ? activeSession.history : [],
    },
    id: message.id,
  } as HistoryMessage);
}

async function createSession(sessionId: string): Promise<void> {
  const sessionFile = join(SESSION_DIR, `${sessionId}.jsonl`);
  const workspaceDir = process.cwd();

  const settingsManager = SettingsManager.create(workspaceDir, AGENT_DIR);
  const authStorage = new AuthStorage(join(AGENT_DIR, "auth.json"));
  const modelRegistry = new ModelRegistry(authStorage, join(AGENT_DIR, "models.json"));

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

  const { session } = await createAgentSession({
    cwd: workspaceDir,
    agentDir: AGENT_DIR,
    authStorage,
    modelRegistry,
    model,
    sessionManager,
    settingsManager,
  });

  sessionStore.set(sessionId, {
    session,
    connections: new Set(),
    history: [],
  });
}

function sendMessage(ws: WebSocket, message: WebSocketMessage): void {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify(message));
  }
}
