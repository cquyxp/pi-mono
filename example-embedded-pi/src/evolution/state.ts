/**
 * State management for the evolutionary system
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { homedir } from "os";
import type { EvolutionState, EvolutionConfig, ImprovementResult } from "./types.js";

const DEFAULT_STATE_FILE = join(homedir(), ".example-embedded-pi", "evolution-state.json");

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
  return currentState!;
}

export function loadState(): EvolutionState {
  const stateFile = currentConfig.stateFile;

  if (existsSync(stateFile)) {
    try {
      const content = readFileSync(stateFile, "utf-8");
      currentState = JSON.parse(content);
    } catch {
      currentState = createEmptyState();
    }
  } else {
    currentState = createEmptyState();
  }

  return currentState;
}

export function saveState(): void {
  const stateFile = currentConfig.stateFile;
  const dir = dirname(stateFile);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
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
