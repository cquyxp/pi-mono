import type { AgentSession, AgentSessionEvent } from "@mariozechner/pi-coding-agent";
import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type {
  EmbeddedPiEventHandlers,
  AgentEvent,
  ToolCallResult,
  BlockReplyPayload,
} from "./types.js";
import type { AssistantMessage, TextContent, ThinkingContent } from "@mariozechner/pi-ai";

export interface SubscribeEmbeddedPiSessionParams extends EmbeddedPiEventHandlers {
  session: AgentSession;
  runId?: string;
  verboseLevel?: number;
  reasoningMode?: "full" | "compact" | "off";
  toolResultFormat?: "full" | "compact" | "summary";
}

export interface Subscription {
  unsubscribe: () => void;
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

/**
 * Subscribe to events from an embedded pi session.
 * This bridges pi's event system to our callback interface.
 */
export function subscribeEmbeddedPiSession(
  params: SubscribeEmbeddedPiSessionParams
): Subscription {
  const { session, runId, onBlockReply, onPartialReply, onReasoningStream, onToolResult, onAgentEvent } =
    params;

  let buffer = "";
  let reasoningBuffer = "";
  let finalText = "";

  const unsubscribe = session.subscribe((event: AgentSessionEvent) => {
    // Forward raw agent events
    if (onAgentEvent) {
      onAgentEvent({
        type: (event as any).type || "unknown",
        data: event,
        timestamp: Date.now(),
      });
    }

    // Handle specific event types
    if ("type" in event) {
      switch (event.type) {
        case "tool_execution_end": {
          const toolExec = event as {
            toolCallId: string;
            toolName: string;
            args: Record<string, unknown>;
            result: unknown;
            isError: boolean;
          };
          if (onToolResult) {
            const result: ToolCallResult = {
              id: toolExec.toolCallId,
              name: toolExec.toolName,
              parameters: toolExec.args ?? {},
              result: toolExec.isError ? undefined : toolExec.result,
              isError: toolExec.isError,
            };
            onToolResult(result);
          }
          break;
        }

        case "message_update":
        case "text_delta": {
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
            buffer = text;
            if (onPartialReply) {
              onPartialReply(text);
            }
          }
          break;
        }

        case "thinking_delta": {
          let thinking = "";
          if ("delta" in event && typeof event.delta === "string") {
            reasoningBuffer += event.delta;
            thinking = reasoningBuffer;
          } else if ("partial" in event && event.partial) {
            thinking = extractThinkingFromMessage(event.partial as AssistantMessage);
          }

          if (thinking && onReasoningStream) {
            onReasoningStream(thinking);
          }
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
            buffer = text;
          }

          if (onBlockReply && buffer) {
            const payload: BlockReplyPayload = {
              text: buffer,
              mediaUrls: [],
            };
            onBlockReply(payload);
          }
          break;
        }
      }
    }
  });

  return {
    unsubscribe: unsubscribe,
  };
}
