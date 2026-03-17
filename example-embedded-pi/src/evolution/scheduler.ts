/**
 * Schedule evolution tasks
 */
import { setTimeout as sleep } from "timers/promises";
import { getConfig, getState, canRunToday, loadState } from "./state.js";
import { findImprovementCandidates, selectTopCandidate } from "./candidate-finder.js";
import { executeImprovement } from "./executor.js";

let isRunning = false;
let scheduleTimeout: NodeJS.Timeout | null = null;

export function startScheduler(): void {
  if (isRunning) {
    console.log("[Evolution] Scheduler already running");
    return;
  }

  isRunning = true;
  loadState();

  console.log("[Evolution] Scheduler started");
  scheduleNextRun();
}

export function stopScheduler(): void {
  isRunning = false;
  if (scheduleTimeout) {
    clearTimeout(scheduleTimeout);
    scheduleTimeout = null;
  }
  console.log("[Evolution] Scheduler stopped");
}

function scheduleNextRun(): void {
  if (!isRunning) return;

  const config = getConfig();
  const now = new Date();
  const [targetHour, targetMinute] = config.dailyStartTime.split(":").map(Number);

  // Calculate next run time
  const nextRun = new Date(now);
  nextRun.setHours(targetHour, targetMinute, 0, 0);

  if (nextRun <= now) {
    nextRun.setDate(nextRun.getDate() + 1);
  }

  const delayMs = nextRun.getTime() - now.getTime();
  const delayMinutes = Math.round(delayMs / 60000);

  console.log(`[Evolution] Next run scheduled for ${nextRun.toLocaleString()} (in ${delayMinutes} minutes)`);

  scheduleTimeout = setTimeout(() => {
    runEvolutionLoop().finally(() => {
      scheduleNextRun();
    });
  }, delayMs);
}

async function runEvolutionLoop(): Promise<void> {
  if (!isRunning) return;

  console.log("[Evolution] Starting evolution loop");

  if (!canRunToday()) {
    console.log("[Evolution] Max iterations reached for today");
    return;
  }

  try {
    // Find candidates
    console.log("[Evolution] Finding improvement candidates...");
    const candidates = findImprovementCandidates();
    console.log(`[Evolution] Found ${candidates.length} candidates`);

    if (candidates.length === 0) {
      console.log("[Evolution] No candidates found");
      return;
    }

    // Select top candidate
    const candidate = selectTopCandidate(candidates);
    if (!candidate) {
      console.log("[Evolution] No suitable candidate found");
      return;
    }

    console.log(`[Evolution] Selected candidate: ${candidate.description}`);

    // Execute improvement
    const result = await executeImprovement(candidate);

    if (result.success) {
      console.log(`[Evolution] Success! Changes: ${result.changes.join(", ")}`);
    } else {
      console.log(`[Evolution] Failed: ${result.error}`);
    }

  } catch (error) {
    console.error("[Evolution] Error in loop:", error);
  }
}

export async function runOnce(): Promise<void> {
  console.log("[Evolution] Running one-shot evolution");
  loadState();
  await runEvolutionLoop();
}
