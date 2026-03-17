/**
 * Example: Context Pruning Extension
 *
 * Similar to OpenClaw's context-pruning extension.
 * Prunes old messages based on cache TTL.
 */

import type { ExtensionContext, ExtensionFactory } from "@mariozechner/pi-coding-agent";

export interface ContextPruningRuntime {
  ttlSeconds: number;
  contextWindowTokens?: number;
  isToolPrunable?: (toolName: string) => boolean;
  lastCacheTouchAt?: Map<string, number>;
}

const RUNTIME_KEY = "context-pruning:runtime";

export function setContextPruningRuntime(
  sessionManager: any,
  runtime: ContextPruningRuntime
): void {
  (sessionManager as any)[RUNTIME_KEY] = runtime;
}

export function getContextPruningRuntime(sessionManager: any): ContextPruningRuntime | null {
  return (sessionManager as any)[RUNTIME_KEY] ?? null;
}

export const contextPruningExtension: ExtensionFactory = () => {
  return {
    name: "context-pruning",

    init(ctx: ExtensionContext) {
      console.log("[ContextPruning] Extension initialized");
    },

    // Hook into context transformation to prune old messages
    async transformContext(messages: any[], ctx: ExtensionContext) {
      const runtime = getContextPruningRuntime(ctx.sessionManager);

      if (!runtime) {
        return messages;
      }

      const now = Date.now();
      const ttlMs = runtime.ttlSeconds * 1000;

      // Filter out old messages based on timestamp
      // This is a simplified example - real implementation would track message timestamps
      const prunedMessages = messages.filter((msg, index) => {
        // Keep system messages and recent messages
        if (msg.role === "system") return true;

        // Example: Keep last N messages
        const keepCount = 20;
        return index >= messages.length - keepCount;
      });

      if (prunedMessages.length < messages.length) {
        console.log(
          `[ContextPruning] Pruned ${messages.length - prunedMessages.length} messages`
        );
      }

      return prunedMessages;
    },
  };
};
