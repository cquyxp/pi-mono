import type { AnyAgentTool } from "./types.js";
import { createToolSchema } from "./tool-adapter.js";

/**
 * Example custom tools that can be injected into the embedded pi agent.
 * These demonstrate how to create tools similar to OpenClaw's channel tools.
 */

// ============================================================================
// Example: Message Tool
// ============================================================================

export function createMessageTool(options: {
  sendMessage: (text: string, channelId: string) => Promise<void>;
}): AnyAgentTool {
  const base = createToolSchema({
    name: "send_message",
    description: "Send a message to a channel or user",
    properties: {
      text: {
        type: "string",
        description: "The message text to send",
      },
      channelId: {
        type: "string",
        description: "Channel or user ID to send to",
      },
    },
    required: ["text", "channelId"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>) => {
      const text = params.text as string;
      const channelId = params.channelId as string;
      await options.sendMessage(text, channelId);
      return { success: true, message: "Message sent" };
    },
  };
}

// ============================================================================
// Example: Calculator Tool
// ============================================================================

export function createCalculatorTool(): AnyAgentTool {
  const base = createToolSchema({
    name: "calculate",
    description: "Perform mathematical calculations",
    properties: {
      expression: {
        type: "string",
        description: "Mathematical expression to evaluate (e.g., '2 + 2 * 3')",
      },
    },
    required: ["expression"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>) => {
      const expression = params.expression as string;

      // Safe evaluation (in real code, use a proper math library)
      if (!/^[\d\s+\-*/().]+$/.test(expression)) {
        throw new Error("Invalid expression");
      }

      // Note: In production, use a safe math evaluator instead of eval!
      const result = Function('"use strict"; return (' + expression + ")")();

      return {
        expression,
        result,
      };
    },
  };
}

// ============================================================================
// Example: Weather Tool (simulated)
// ============================================================================

export function createWeatherTool(): AnyAgentTool {
  const base = createToolSchema({
    name: "get_weather",
    description: "Get current weather for a location",
    properties: {
      location: {
        type: "string",
        description: "City name or location",
      },
      unit: {
        type: "string",
        enum: ["celsius", "fahrenheit"],
        description: "Temperature unit",
      },
    },
    required: ["location"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>) => {
      const location = params.location as string;
      const unit = (params.unit as string) || "celsius";

      // Simulated weather data
      const temp = Math.round(15 + Math.random() * 15);
      const conditions = ["Sunny", "Cloudy", "Partly cloudy", "Rainy"][Math.floor(Math.random() * 4)];

      return {
        location,
        temperature: unit === "celsius" ? temp : Math.round((temp * 9) / 5 + 32),
        unit,
        conditions,
        humidity: Math.round(40 + Math.random() * 40),
      };
    },
  };
}

// ============================================================================
// Bundle all example tools
// ============================================================================

export function createExampleTools(options: {
  sendMessage?: (text: string, channelId: string) => Promise<void>;
}): AnyAgentTool[] {
  const tools: AnyAgentTool[] = [createCalculatorTool(), createWeatherTool()];

  if (options.sendMessage) {
    tools.push(createMessageTool({ sendMessage: options.sendMessage }));
  }

  return tools;
}
