import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type {
  EmbeddedPiEventHandlers,
  AgentEvent,
  ToolCallResult,
  BlockReplyPayload,
} from "./types.js";

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

/**
 * Subscribe to events from an embedded pi session.
 * This bridges pi's event system to our callback interface.
 */
export function subscribeEmbeddedPiSession(
  params: SubscribeEmbeddedPiSessionParams
): Subscription {
  const { session, runId, onBlockReply, onPartialReply, onReasoningStream, onToolResult, onAgentEvent } =
    params;

  const subscriptions: Array<() => void> = [];
  let buffer = "";
  let reasoningBuffer = "";
  let isThinking = false;

  // Subscribe to agent events (low-level)
  if (onAgentEvent) {
    const unsubscribe = session.on("*", (event: string, data: unknown) => {
      onAgentEvent({
        type: event,
        data,
        timestamp: Date.now(),
      });
    });
    subscriptions.push(unsubscribe);
  }

  // Subscribe to message updates
  const unsubscribeMessage = session.on("message_update", (data: unknown) => {
    const message = data as { content?: string; role?: string };

    if (message.content && typeof message.content === "string") {
      // Handle partial reply
      if (onPartialReply) {
        onPartialReply(message.content);
      }

      // Buffer for block reply
      buffer = message.content;
    }
  });
  subscriptions.push(unsubscribeMessage);

  // Subscribe to thinking/reasoning content
  const unsubscribeThinking = session.on("thinking", (data: unknown) => {
    const thinking = data as { text?: string; done?: boolean };

    if (thinking.text && typeof thinking.text === "string") {
      isThinking = true;
      reasoningBuffer += thinking.text;

      if (onReasoningStream) {
        onReasoningStream(thinking.text);
      }
    }

    if (thinking.done) {
      isThinking = false;
    }
  });
  subscriptions.push(unsubscribeThinking);

  // Subscribe to tool executions
  const unsubscribeTool = session.on("tool_execution", (data: unknown) => {
    const toolExec = data as {
      toolCallId?: string;
      name?: string;
      parameters?: Record<string, unknown>;
      result?: unknown;
      error?: unknown;
    };

    if (onToolResult && toolExec.name && toolExec.toolCallId) {
      const result: ToolCallResult = {
        id: toolExec.toolCallId,
        name: toolExec.name,
        parameters: toolExec.parameters ?? {},
        result: toolExec.error ? undefined : toolExec.result,
        isError: !!toolExec.error,
      };
      onToolResult(result);
    }
  });
  subscriptions.push(unsubscribeTool);

  // Subscribe to turn end (final block reply)
  const unsubscribeTurnEnd = session.on("turn_end", () => {
    if (onBlockReply && buffer) {
      const payload: BlockReplyPayload = {
        text: buffer,
        mediaUrls: [],
      };
      onBlockReply(payload);
    }

    // Reset buffers
    buffer = "";
    reasoningBuffer = "";
  });
  subscriptions.push(unsubscribeTurnEnd);

  return {
    unsubscribe: () => {
      subscriptions.forEach((unsub) => unsub());
    },
  };
}
