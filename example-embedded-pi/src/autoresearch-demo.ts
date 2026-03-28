#!/usr/bin/env node
/**
 * Autoresearch Demo
 *
 * This demonstrates how to use pi-coding-agent
 * to run autonomous research loops like autoresearch.
 */

import {
  runEmbeddedPiAgent,
  createAutoresearchTools,
  AUTORESEARCH_SYSTEM_PROMPT,
  SESSION_DIR,
} from "./index.js";
import { join } from "path";

const SESSION_FILE = join(SESSION_DIR, "autoresearch-session.jsonl");

async function main() {
  console.log("=".repeat(60));
  console.log("Autoresearch Demo");
  console.log("=".repeat(60));
  console.log();

  const args = process.argv.slice(2);
  const prompt = args.length > 0 ? args.join(" ") : "Start by checking the current git status and seeing what files are in the project.";

  console.log("Starting autonomous research agent...");
  console.log(`Session file: ${SESSION_FILE}`);
  console.log();

  const tools = createAutoresearchTools({
    // Allow any command (in production you might want to restrict this)
    allowedCommands: undefined,
    commandTimeoutMs: 5 * 60 * 1000, // 5 minutes
  });

  const result = await runEmbeddedPiAgent({
    sessionId: "autoresearch",
    sessionKey: "autoresearch:demo",
    sessionFile: SESSION_FILE,
    workspaceDir: process.cwd(),
    prompt,
    // provider: "anthropic",
    // model: "claude-sonnet-4-20250514",
    // Or use火山引擎:
    provider: "volcengine-coding",
    model: "doubao-seed-2.0-code",
    systemPrompt: AUTORESEARCH_SYSTEM_PROMPT,
    tools,
    timeoutMs: 30 * 60 * 1000, // 30 minutes total
    thinkingLevel: "medium",

    onPartialReply: (text) => {
      process.stdout.write(text);
    },
    onReasoningStream: (text) => {
      console.log(`[Thinking] ${text}`);
    },
    onToolResult: (result) => {
      console.log();
      console.log(`[Tool] ${result.name}`);
      if (!result.isError) {
        console.log("  Success");
      } else {
        console.log("  Error");
      }
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
  console.error("Autoresearch failed:", error);
  process.exit(1);
});
