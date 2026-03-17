import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { AnyAgentTool } from "./types.js";

/**
 * Convert our tool format to pi's ToolDefinition format.
 * Pi has a slightly different signature for execute().
 */
export function toToolDefinitions(tools: AnyAgentTool[]): ToolDefinition[] {
  return tools.map((tool) => ({
    name: tool.name,
    label: tool.label ?? tool.name,
    description: tool.description ?? "",
    parameters: tool.parameters,
    execute: async (
      toolCallId: string,
      params: Record<string, unknown>,
      onUpdate: (update: string) => void,
      _ctx: unknown,
      signal?: AbortSignal
    ) => {
      // pi-coding-agent signature is: (toolCallId, params, onUpdate, ctx, signal)
      // Our signature is: (toolCallId, params, signal, onUpdate)
      // So we need to adapt the order
      return await tool.execute(toolCallId, params, signal, onUpdate);
    },
  }));
}

/**
 * Split tools into built-in vs custom.
 * In this example, we make all tools custom to have full control.
 */
export function splitTools(options: { tools: AnyAgentTool[] }) {
  return {
    builtInTools: [], // Empty - we override everything with custom tools
    customTools: toToolDefinitions(options.tools),
  };
}

/**
 * Create a default tool schema with proper JSON Schema format.
 */
export function createToolSchema(params: {
  name: string;
  description: string;
  properties?: Record<string, unknown>;
  required?: string[];
}): AnyAgentTool {
  return {
    name: params.name,
    description: params.description,
    parameters: {
      type: "object",
      properties: params.properties ?? {},
      required: params.required ?? [],
    },
    execute: async () => {
      throw new Error(`Tool ${params.name} not implemented`);
    },
  };
}
