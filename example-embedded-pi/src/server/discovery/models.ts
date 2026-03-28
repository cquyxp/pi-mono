/**
 * Discovery Agent - TypeScript Models
 * 发现式智能 - TypeScript 数据模型
 */

export type HypothesisStatus = "pending" | "verified" | "falsified";

export interface Hypothesis {
  id: string;
  content: string;
  status: HypothesisStatus;
  confidence: number;
}

export interface FailedAttempt {
  cycle: number;
  action: string;
  error: string;
  analysis: string;
}

export interface VerificationAction {
  id: string;
  hypothesis_id: string;
  tool: string;
  params: Record<string, any>;
  description: string;
}

export interface Observation {
  action_id: string;
  success: boolean;
  output?: string;
  error?: string;
}

export interface MemoryLaw {
  id: string;
  content: string;
  importance: number;
  cycle_created: number;
}

export interface DiscoveryState {
  goal: string;
  hypotheses: Hypothesis[];
  verified_facts: string[];
  failed_attempts: FailedAttempt[];
  memory_laws: MemoryLaw[];
  cycle_count: number;
  max_cycles: number;
  is_converged: boolean;
  verification_actions: VerificationAction[];
  observations: Observation[];
  max_memory_laws: number;
  final_synthesis?: string;
}

export interface DiscoveryTask {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  goal: string;
  current_cycle: number;
  max_cycles: number;
  is_converged: boolean;
  final_state?: DiscoveryState;
  cycle_states?: Record<number, DiscoveryState>;
  error?: string;
}

// Helper functions
export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createDiscoveryState(goal: string, maxCycles: number = 3): DiscoveryState {
  return {
    goal,
    hypotheses: [],
    verified_facts: [],
    failed_attempts: [],
    memory_laws: [],
    cycle_count: 0,
    max_cycles: maxCycles,
    is_converged: false,
    verification_actions: [],
    observations: [],
    max_memory_laws: 10,
    final_synthesis: undefined,
  };
}
