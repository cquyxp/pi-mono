/**
 * Types for the evolutionary system
 */

export type ImprovementType =
  | "documentation"
  | "tests"
  | "refactoring"
  | "performance"
  | "experiment"
  | "learning";

export interface ImprovementCandidate {
  type: ImprovementType;
  target: string;
  description: string;
  priority: number; // 0-10, higher is more important
  riskLevel: "low" | "medium" | "high";
}

export interface ImprovementResult {
  success: boolean;
  candidate: ImprovementCandidate;
  changes: string[];
  error?: string;
  durationMs: number;
}

export interface EvolutionConfig {
  // Timing
  dailyStartTime: string; // "02:00"
  maxIterationsPerDay: number;
  minIntervalMinutes: number;

  // Safety
  safeDirectories: string[];
  protectedFiles: string[];
  autoRollbackOnFailure: boolean;
  maxChangeSizeLines: number;

  // Scope
  enabledImprovementTypes: ImprovementType[];
  maxRiskLevel: "low" | "medium" | "high";

  // Persistence
  stateFile: string;
}

export interface EvolutionState {
  lastRunDate: string | null;
  iterationsToday: number;
  history: ImprovementResult[];
  skippedCandidates: string[];
}
