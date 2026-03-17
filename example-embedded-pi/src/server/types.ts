/**
 * Types for the WebSocket API
 */

export interface WebSocketMessage {
  type: string;
  data?: unknown;
  id?: string;
}

// Client -> Server messages
export interface PromptMessage extends WebSocketMessage {
  type: "prompt";
  data: {
    sessionId: string;
    prompt: string;
    provider?: string;
    model?: string;
    thinkingLevel?: "off" | "low" | "medium" | "high";
  };
  id: string;
}

export interface SubscribeMessage extends WebSocketMessage {
  type: "subscribe";
  data: {
    sessionId: string;
  };
}

export interface GetHistoryMessage extends WebSocketMessage {
  type: "get_history";
  data: {
    sessionId: string;
  };
  id: string;
}

export interface StopMessage extends WebSocketMessage {
  type: "stop";
  data: {
    sessionId: string;
  };
  id?: string;
}

// Server -> Client messages
export interface PartialReplyMessage extends WebSocketMessage {
  type: "partial_reply";
  data: {
    text: string;
  };
}

export interface BlockReplyMessage extends WebSocketMessage {
  type: "block_reply";
  data: {
    text: string;
    mediaUrls: string[];
  };
}

export interface ReasoningStreamMessage extends WebSocketMessage {
  type: "reasoning_stream";
  data: {
    text: string;
  };
}

export interface ToolResultMessage extends WebSocketMessage {
  type: "tool_result";
  data: {
    id: string;
    name: string;
    parameters: Record<string, unknown>;
    result?: unknown;
    isError: boolean;
  };
}

export interface AgentEventMessage extends WebSocketMessage {
  type: "agent_event";
  data: {
    eventType: string;
    eventData: unknown;
    timestamp: number;
  };
}

export interface HistoryMessage extends WebSocketMessage {
  type: "history";
  data: {
    messages: Array<{
      role: string;
      content: string;
      timestamp: number;
    }>;
  };
  id: string;
}

export interface ErrorMessage extends WebSocketMessage {
  type: "error";
  data: {
    message: string;
    errorType?: string;
  };
  id?: string;
}

export interface SuccessMessage extends WebSocketMessage {
  type: "success";
  data: {
    message: string;
  };
  id: string;
}
