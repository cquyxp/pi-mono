import type { AgentSession, ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { ThinkingLevel } from "@mariozechner/pi-agent-core";
import type { Model } from "@mariozechner/pi-ai";

// ============================================================================
// Core Types
// ============================================================================

export interface EmbeddedPiAgentParams {
  /** Unique session identifier */
  sessionId: string;
  /** Session key for persistence (e.g., "user:123:channel:whatsapp") */
  sessionKey: string;
  /** Path to session JSONL file */
  sessionFile: string;
  /** Working directory for the agent */
  workspaceDir: string;
  /** Directory for agent config/storage */
  agentDir?: string;
  /** The prompt to send */
  prompt: string;
  /** Provider ID (e.g., "anthropic", "openai") */
  provider: string;
  /** Model ID (e.g., "claude-sonnet-4-20250514") */
  model: string;
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Unique run ID for this execution */
  runId?: string;
  /** Thinking level (off, low, medium, high) */
  thinkingLevel?: ThinkingLevel;
  /** Images to include (vision models) */
  images?: Array<{ type: "image"; data: string; mimeType: string }>;
  /** Custom tools to make available */
  tools?: AnyAgentTool[];
  /** System prompt override */
  systemPrompt?: string;
  /** Additional system prompt to append */
  appendSystemPrompt?: string;
}

export interface EmbeddedPiRunResult {
  success: boolean;
  text?: string;
  mediaUrls?: string[];
  error?: string;
  errorType?: ErrorType;
  toolCalls?: ToolCallResult[];
  sessionId: string;
  runId?: string;
}

export interface ToolCallResult {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  isError: boolean;
}

export type ErrorType =
  | "auth"
  | "rate_limit"
  | "quota"
  | "timeout"
  | "context_overflow"
  | "compaction_failure"
  | "unknown";

// ============================================================================
// Tool Types
// ============================================================================

export interface AnyAgentTool {
  name: string;
  label?: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (
    toolCallId: string,
    params: Record<string, unknown>,
    signal?: AbortSignal,
    onUpdate?: (update: string) => void
  ) => Promise<unknown>;
}

// ============================================================================
// Event Handler Types
// ============================================================================

export interface EmbeddedPiEventHandlers {
  /** Called when a block of text is ready */
  onBlockReply?: (payload: BlockReplyPayload) => Promise<void> | void;
  /** Called with partial text as it streams in */
  onPartialReply?: (text: string) => Promise<void> | void;
  /** Called when reasoning content is available */
  onReasoningStream?: (text: string) => Promise<void> | void;
  /** Called when a tool result is available */
  onToolResult?: (result: ToolCallResult) => Promise<void> | void;
  /** Called for low-level agent events */
  onAgentEvent?: (event: AgentEvent) => Promise<void> | void;
}

export interface BlockReplyPayload {
  text: string;
  mediaUrls: string[];
  audioAsVoice?: boolean;
  replyToId?: string;
}

export interface AgentEvent {
  type: string;
  data: unknown;
  timestamp: number;
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface SessionManagerCache {
  [sessionFile: string]: {
    manager: unknown;
    lastAccess: number;
  };
}

export interface CompactionOptions {
  mode: "auto" | "manual" | "safeguard";
  maxHistoryShare?: number;
}

export interface ContextPruningOptions {
  mode: "cache-ttl" | "none";
  ttlSeconds?: number;
  contextWindowTokens?: number;
}
