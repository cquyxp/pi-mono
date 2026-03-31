/**
 * Example: Compaction Safeguard Extension
 *
 * Similar to OpenClaw's compaction-safeguard extension.
 * Prevents accidental compaction by setting runtime guards.
 */

import type { ExtensionContext, ExtensionFactory } from "@mariozechner/pi-coding-agent";

export interface CompactionSafeguardRuntime {
  maxHistoryShare: number;
}

const RUNTIME_KEY = "compaction-safeguard:runtime";

export function setCompactionSafeguardRuntime(
  sessionManager: any,
  runtime: CompactionSafeguardRuntime
): void {
  (sessionManager as any)[RUNTIME_KEY] = runtime;
}

export function getCompactionSafeguardRuntime(sessionManager: any): CompactionSafeguardRuntime | null {
  return (sessionManager as any)[RUNTIME_KEY] ?? null;
}

export const compactionSafeguardExtension: ExtensionFactory = () => {
  return {
    name: "compaction-safeguard",

    init(ctx: ExtensionContext) {
      console.log("[CompactionSafeguard] Extension initialized");
    },

    // Hook into context transformation to check history size
    async transformContext(messages: any[], ctx: ExtensionContext) {
      const runtime = getCompactionSafeguardRuntime(ctx.sessionManager);

      if (runtime) {
        const historySize = messages.length;
        const maxHistory = Math.floor(100 * runtime.maxHistoryShare);

        if (historySize > maxHistory) {
          console.warn(
            `[CompactionSafeguard] History size (${historySize}) exceeds max (${maxHistory})`
          );
          // Could trigger auto-compaction here
        }
      }

      return messages;
    },
  };
};
