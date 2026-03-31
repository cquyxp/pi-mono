#!/usr/bin/env node
/**
 * Simple tool test - verify that tools work
 */

import {
  runEmbeddedPiAgent,
  createGitTool,
} from "./index.js";
import { homedir } from "os";
import { join } from "path";

const SESSION_FILE = join(homedir(), ".example-embedded-pi", "test-session.jsonl");

async function main() {
  console.log("=".repeat(60));
  console.log("Simple Tool Test");
  console.log("=".repeat(60));
  console.log();

  const tools = [createGitTool()];

  console.log("Tools available:", tools.map(t => t.name));
  console.log();

  const result = await runEmbeddedPiAgent({
    sessionId: "test",
    sessionKey: "test",
    sessionFile: SESSION_FILE,
    workspaceDir: process.cwd(),
    prompt: "Use the git tool to run 'git status' and tell me what the output is.",
    provider: "volcengine-coding",
    model: "doubao-seed-2.0-code",
    tools,
    timeoutMs: 5 * 60 * 1000,
    thinkingLevel: "low",

    onPartialReply: (text) => {
      process.stdout.write(text);
    },
    onReasoningStream: (text) => {
      console.log(`[Thinking] ${text}`);
    },
    onToolResult: (result) => {
      console.log();
      console.log("=".repeat(60));
      console.log(`[TOOL CALLED] ${result.name}`);
      console.log("  Parameters:", JSON.stringify(result.parameters, null, 2));
      if (result.isError) {
        console.log("  ERROR:", result.result);
      } else {
        console.log("  Result:", result.result);
      }
      console.log("=".repeat(60));
      console.log();
    },
    onBlockReply: async (payload) => {
      console.log();
      console.log("=".repeat(60));
      console.log("Final response:");
      console.log(payload.text);
      console.log("=".repeat(60));
    },
  });

  console.log();
  console.log("Done!");
  console.log("Result:", result);
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});
