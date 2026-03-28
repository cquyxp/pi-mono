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

// Autoresearch messages
export interface ARStartMessage extends WebSocketMessage {
  type: "ar_start";
  data: {
    topic?: string;
    maxIterations?: number;
    timeoutMinutes?: number;
  };
  id: string;
}

export interface ARStopMessage extends WebSocketMessage {
  type: "ar_stop";
  id?: string;
}

export interface ARGetStateMessage extends WebSocketMessage {
  type: "ar_get_state";
  id?: string;
}

export interface ARStateMessage extends WebSocketMessage {
  type: "ar_state";
  data: {
    running: boolean;
    iterations: number;
    successCount: number;
    bestValBpb: number | null;
    config: {
      maxIterations: number;
      timeoutMinutes: number;
    };
  };
}

export interface ARLogMessage extends WebSocketMessage {
  type: "ar_log";
  data: {
    time: string;
    type: "info" | "success" | "error" | "warning";
    message: string;
  };
}

// Settings messages
export interface GetSettingsMessage extends WebSocketMessage {
  type: "get_settings";
  id?: string;
}

export interface SaveSettingsMessage extends WebSocketMessage {
  type: "save_settings";
  data: {
    apiKeys?: {
      anthropic?: string;
      openai?: string;
      groq?: string;
      volcengine?: string;
    };
    baseUrls?: {
      anthropic?: string;
      openai?: string;
      groq?: string;
      volcengine?: string;
    };
    models?: {
      anthropic?: string;
      openai?: string;
      groq?: string;
      volcengine?: string;
    };
    defaultProvider?: string;
    defaultModel?: string;
    workspaceDir?: string;
  };
  id: string;
}

export interface SettingsMessage extends WebSocketMessage {
  type: "settings";
  data: {
    apiKeys?: {
      anthropic?: boolean;
      openai?: boolean;
      groq?: boolean;
      volcengine?: boolean;
    };
    baseUrls?: {
      anthropic?: string;
      openai?: string;
      groq?: string;
      volcengine?: string;
    };
    models?: {
      anthropic?: string;
      openai?: string;
      groq?: string;
      volcengine?: string;
    };
    defaultProvider?: string;
    defaultModel?: string;
    workspaceDir?: string;
  };
  id?: string;
}

// System prompt info message
export interface SystemPromptMessage extends WebSocketMessage {
  type: "system_prompt";
  data: {
    content?: string;
    estimatedTokens?: number;
  };
}

// Discovery Agent messages
export interface DiscoveryStepMessage extends WebSocketMessage {
  type: "discovery_step";
  data: {
    taskId: string;
    stepType: "hypothesis" | "planning" | "execution" | "reflection" | "synthesis" | "cycle_complete";
    cycle: number;
    title: string;
    content: string;
    data?: any;
  };
}

export interface DiscoveryStartMessage extends WebSocketMessage {
  type: "discovery_start";
  data: {
    taskId: string;
    goal: string;
    maxCycles: number;
  };
  id: string;
}

export interface DiscoveryCompleteMessage extends WebSocketMessage {
  type: "discovery_complete";
  data: {
    taskId: string;
    status: "completed" | "failed";
    finalState?: any;
    error?: string;
  };
}

// ============================================
// Autoresearch v2 (Karpathy-style) Messages
// ============================================
export interface AR2StartMessage extends WebSocketMessage {
  type: "ar2_start";
  data: {
    goal: string;
    maxCycles?: number;
    useMock?: boolean;
  };
  id: string;
}

export interface AR2StopMessage extends WebSocketMessage {
  type: "ar2_stop";
  data: {
    taskId: string;
  };
  id?: string;
}

export interface AR2GetTaskMessage extends WebSocketMessage {
  type: "ar2_get_task";
  data: {
    taskId: string;
  };
  id?: string;
}

export interface AR2ListTasksMessage extends WebSocketMessage {
  type: "ar2_list_tasks";
  id?: string;
}

export interface AR2StateMessage extends WebSocketMessage {
  type: "ar2_state";
  data: {
    taskId: string;
    status: "pending" | "running" | "completed" | "failed";
    goal: string;
    current_cycle: number;
    max_cycles: number;
    is_converged: boolean;
    final_state?: any;
    error?: string;
  };
}

export interface AR2LogMessage extends WebSocketMessage {
  type: "ar2_log";
  data: {
    taskId?: string;
    type: "info" | "success" | "error" | "warning";
    message: string;
    time: string;
  };
}

export interface AR2TaskListMessage extends WebSocketMessage {
  type: "ar2_task_list";
  data: any[];
  id?: string;
}
