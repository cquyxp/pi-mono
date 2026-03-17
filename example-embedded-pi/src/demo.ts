#!/usr/bin/env node
/**
 * Demo of the embedded pi integration.
 *
 * Before running:
 * 1. Set your API key: export ANTHROPIC_API_KEY=sk-ant-...
 * 2. Install dependencies: npm install
 */

import { join } from "path";
import { homedir } from "os";
import { existsSync, mkdirSync } from "fs";
import { runEmbeddedPiAgent, createExampleTools } from "./index.js";

async function main() {
  console.log("=".repeat(60));
  console.log("Embedded Pi Integration Demo");
  console.log("=".repeat(60));
  console.log();

  // Create session directory
  const sessionDir = join(homedir(), ".example-embedded-pi", "sessions");
  if (!existsSync(sessionDir)) {
    mkdirSync(sessionDir, { recursive: true });
  }

  // Create example tools
  const tools = createExampleTools({
    sendMessage: async (text: string, channelId: string) => {
      console.log(`[SEND MESSAGE] To ${channelId}: ${text}`);
    },
  });

  // Run the agent
  console.log("Running agent...");
  console.log();

  const result = await runEmbeddedPiAgent({
    sessionId: "demo-session-001",
    sessionKey: "demo:user:001",
    sessionFile: join(sessionDir, "demo.jsonl"),
    workspaceDir: process.cwd(),
    prompt: "What's 15 + 27 * 2? Also, what's the weather in Tokyo?",
    provider: "volcengine-coding",
    model: "doubao-seed-2.0-code",
    thinkingLevel: "medium",
    timeoutMs: 60000,
    tools,

    // Event handlers
    onPartialReply: (text: string) => {
      process.stdout.write(text);
    },
    onReasoningStream: (text: string) => {
      // Optional: show reasoning
      // console.log(`[REASONING] ${text}`);
    },
    onToolResult: (result) => {
      console.log();
      console.log(`[TOOL] ${result.name}(${JSON.stringify(result.parameters)})`);
      if (result.isError) {
        console.log(`  ERROR: ${result.result}`);
      } else {
        console.log(`  Result:`, result.result);
      }
    },
    onBlockReply: (payload) => {
      console.log();
      console.log();
      console.log("=".repeat(60));
      console.log("Final Reply:");
      console.log(payload.text);
    },
  });

  console.log();
  console.log("=".repeat(60));
  console.log("Run Result:");
  console.log(`Success: ${result.success}`);
  if (!result.success) {
    console.log(`Error: ${result.error}`);
    console.log(`Error Type: ${result.errorType}`);
  }
  console.log("=".repeat(60));
}

main().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
