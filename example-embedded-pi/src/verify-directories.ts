#!/usr/bin/env node
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

const workspaceBase = join(process.cwd(), "workspace");
const sessionsDir = join(workspaceBase, "sessions");
const agentsDir = join(workspaceBase, "agents");

console.log("Verifying directory structure...\n");

console.log("Workspace base:", workspaceBase);
if (!existsSync(workspaceBase)) {
  mkdirSync(workspaceBase, { recursive: true });
  console.log("  Created workspace directory");
} else {
  console.log("  ✓ Exists");
}

console.log("\nSessions dir:", sessionsDir);
if (!existsSync(sessionsDir)) {
  mkdirSync(sessionsDir, { recursive: true });
  console.log("  Created sessions directory");
} else {
  console.log("  ✓ Exists");
}

console.log("\nAgents dir:", agentsDir);
if (!existsSync(agentsDir)) {
  mkdirSync(agentsDir, { recursive: true });
  console.log("  Created agents directory");
} else {
  console.log("  ✓ Exists");
}

console.log("\nAGENTS.md:", join(workspaceBase, "AGENTS.md"));
if (existsSync(join(workspaceBase, "AGENTS.md"))) {
  console.log("  ✓ Exists");
} else {
  console.log("  ✗ Not found");
}

console.log("\nDirectory structure updated successfully!");
console.log("\nNew structure:");
console.log("  workspace/");
console.log("    AGENTS.md");
console.log("    sessions/");
console.log("    agents/");
