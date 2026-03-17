#!/usr/bin/env node
/**
 * Demo of the evolution system
 */

import {
  startScheduler,
  stopScheduler,
  runOnce,
  findImprovementCandidates,
  getState,
  getConfig,
} from "./index.js";

async function main() {
  console.log("=".repeat(60));
  console.log("Evolution System Demo");
  console.log("=".repeat(60));
  console.log();

  const args = process.argv.slice(2);
  const mode = args[0] || "once";

  // Show config
  const config = getConfig();
  console.log("Config:");
  console.log(`  Daily start time: ${config.dailyStartTime}`);
  console.log(`  Max iterations/day: ${config.maxIterationsPerDay}`);
  console.log(`  Enabled types: ${config.enabledImprovementTypes.join(", ")}`);
  console.log(`  Max risk level: ${config.maxRiskLevel}`);
  console.log();

  switch (mode) {
    case "scan":
      await scanCandidates();
      break;
    case "once":
      await runOnce();
      break;
    case "daemon":
      await runDaemon();
      break;
    case "status":
      showStatus();
      break;
    default:
      console.log("Usage: npx tsx src/evolution-demo.ts [scan|once|daemon|status]");
  }
}

async function scanCandidates() {
  console.log("Scanning for improvement candidates...");
  console.log();

  const candidates = findImprovementCandidates();

  if (candidates.length === 0) {
    console.log("No candidates found.");
    return;
  }

  console.log(`Found ${candidates.length} candidate(s):`);
  console.log();

  for (let i = 0; i < Math.min(10, candidates.length); i++) {
    const c = candidates[i];
    console.log(`${i + 1}. [${c.type.toUpperCase()}] ${c.target}`);
    console.log(`    ${c.description}`);
    console.log(`    Priority: ${c.priority}, Risk: ${c.riskLevel}`);
    console.log();
  }

  if (candidates.length > 10) {
    console.log(`... and ${candidates.length - 10} more`);
  }
}

async function runDaemon() {
  console.log("Starting evolution scheduler (daemon mode)...");
  console.log("Press Ctrl+C to stop");
  console.log();

  startScheduler();

  // Keep process alive
  process.on("SIGINT", () => {
    console.log("\nShutting down...");
    stopScheduler();
    process.exit(0);
  });
}

function showStatus() {
  const state = getState();

  console.log("Evolution Status:");
  console.log(`  Last run date: ${state.lastRunDate || "Never"}`);
  console.log(`  Iterations today: ${state.iterationsToday}`);
  console.log(`  Total history entries: ${state.history.length}`);
  console.log();

  if (state.history.length > 0) {
    console.log("Recent history:");
    for (let i = 0; i < Math.min(5, state.history.length); i++) {
      const entry = state.history[i];
      const status = entry.success ? "SUCCESS" : "FAILED";
      console.log(`  ${status}: ${entry.candidate.description}`);
    }
  }
}

main().catch((error) => {
  console.error("Demo failed:", error);
  process.exit(1);
});
