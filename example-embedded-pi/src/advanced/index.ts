/**
 * Advanced features for embedded pi integration.
 *
 * These are examples of more sophisticated features similar to OpenClaw's:
 * - Compaction safeguard
 * - Context pruning
 * - Auth profile failover
 * - Block chunking
 */

export * from "./compaction-safeguard.js";
export * from "./context-pruning.js";

// Re-export from main
export {
  type EmbeddedPiAgentParams,
  type EmbeddedPiRunResult,
  type AnyAgentTool,
  type ErrorType,
  type EmbeddedPiEventHandlers,
} from "../types.js";
