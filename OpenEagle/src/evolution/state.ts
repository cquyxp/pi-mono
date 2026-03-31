/**
 * State management for the evolutionary system
 */
import fs from "fs";
import path from "path";
import { homedir } from "os";
import type { EvolutionState, EvolutionConfig, ImprovementResult } from "./types.js";

const DEFAULT_STATE_FILE = path.join(homedir(), ".example-embedded-pi", "evolution-state.json");

const DEFAULT_CONFIG: EvolutionConfig = {
  dailyStartTime: "02:00",
  maxIterationsPerDay: 5,
  minIntervalMinutes: 60,

  safeDirectories: ["./src", "./public", "./docs"],
  protectedFiles: ["./src/server/index.ts", "./src/evolution/"],
  autoRollbackOnFailure: true,
  maxChangeSizeLines: 100,

  enabledImprovementTypes: ["documentation", "tests", "refactoring"],
  maxRiskLevel: "low",

  stateFile: DEFAULT_STATE_FILE,
};

let currentState: EvolutionState | null = null;
let currentConfig: EvolutionConfig = { ...DEFAULT_CONFIG };

export function getConfig(): EvolutionConfig {
  return { ...currentConfig };
}

export function updateConfig(updates: Partial<EvolutionConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

export function getState(): EvolutionState {
  if (!currentState) {
    loadState();
  }
  return currentState as EvolutionState;
}

export function loadState(): EvolutionState {
  const stateFile = currentConfig.stateFile;

  if (fs.existsSync(stateFile)) {
    try {
      const content = fs.readFileSync(stateFile, "utf-8");
      const parsed = JSON.parse(content);
      currentState = parsed || createEmptyState();
    } catch {
      currentState = createEmptyState();
    }
  } else {
    currentState = createEmptyState();
  }

  return currentState as EvolutionState;
}

export function saveState(): void {
  const stateFile = currentConfig.stateFile;
  const dir = path.dirname(stateFile);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
}

export function recordImprovement(result: ImprovementResult): void {
  const state = getState();
  state.history.unshift(result);
  // Keep last 100 results
  if (state.history.length > 100) {
    state.history = state.history.slice(0, 100);
  }
  state.iterationsToday++;
  state.lastRunDate = new Date().toISOString().split("T")[0];
  saveState();
}

export function canRunToday(): boolean {
  const state = getState();
  const today = new Date().toISOString().split("T")[0];

  if (state.lastRunDate !== today) {
    state.iterationsToday = 0;
    saveState();
  }

  return state.iterationsToday < currentConfig.maxIterationsPerDay;
}

function createEmptyState(): EvolutionState {
  return {
    lastRunDate: null,
    iterationsToday: 0,
    history: [],
    skippedCandidates: [],
  };
}
