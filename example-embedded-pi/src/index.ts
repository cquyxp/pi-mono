/**
 * Example Embedded Pi Integration
 *
 * This module demonstrates how to embed pi-coding-agent in your application,
 * similar to how OpenClaw does it.
 *
 * Key features:
 * - Direct embedding (no subprocess/RPC)
 * - Custom tool injection
 * - Session persistence
 * - Event handling
 * - Multiple authentication profiles
 */

// Re-export all types
export * from "./types.js";

// Re-export core functions
export { runEmbeddedPiAgent } from "./run.js";
export { subscribeEmbeddedPiSession } from "./subscribe.js";
export { toToolDefinitions, splitTools, createToolSchema } from "./tool-adapter.js";
export {
  getCachedSessionManager,
  prewarmSessionFile,
  trackSessionManagerAccess,
  closeAllSessionManagers,
} from "./session-manager.js";

// Re-export example tools
export {
  createMessageTool,
  createCalculatorTool,
  createWeatherTool,
  createExampleTools,
} from "./example-tools.js";

// Re-export evolution system
export * from "./evolution/index.js";

// Re-export web tools
export * from "./web-tools.js";

// Re-export autoresearch tools
export * from "./autoresearch-tools.js";

// Re-export workspace config
export * from "./workspace-config.js";

// Re-export session utilities
export * from "./session-utils.js";
