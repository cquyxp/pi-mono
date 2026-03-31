/**
 * Autoresearch Models - Karpathy风格的多代理研究系统数据模型
 */
import { z } from "zod";

// 使用项目已有的uuid，不依赖外部包
let idCounter = 0;
function generateId(): string {
  return `ar-${Date.now()}-${++idCounter}`;
}

// ==== Enums ====
export const HypothesisStatus = z.enum(["pending", "verified", "falsified", "refined"]);
export type HypothesisStatus = z.infer<typeof HypothesisStatus>;

export const AgentType = z.enum([
  "oracle",
  "critic",
  "experimenter",
  "librarian",
  "synthesizer"
]);
export type AgentType = z.infer<typeof AgentType>;

export const ToolType = z.enum([
  "search",
  "read",
  "write",
  "execute",
  "analyze"
]);
export type ToolType = z.infer<typeof ToolType>;

// ==== Core Models ====
export const Hypothesis = z.object({
  id: z.string().default(generateId()),
  content: z.string(),
  status: HypothesisStatus.default("pending"),
  confidence: z.number().min(0).max(1).default(0),
  createdAt: z.number().default(Date.now()),
  cycle: z.number().default(0)
});
export type Hypothesis = z.infer<typeof Hypothesis>;

export const Experiment = z.object({
  id: z.string().default(() => generateId()),
  hypothesisId: z.string(),
  description: z.string(),
  tool: ToolType,
  params: z.record(z.any()),
  expectedOutcome: z.string().optional()
});
export type Experiment = z.infer<typeof Experiment>;

export const Observation = z.object({
  id: z.string().default(() => generateId()),
  experimentId: z.string(),
  success: z.boolean(),
  output: z.string().optional(),
  error: z.string().optional(),
  timestamp: z.number().default(() => Date.now())
});
export type Observation = z.infer<typeof Observation>;

export const MemoryLaw = z.object({
  id: z.string().default(() => generateId()),
  content: z.string(),
  importance: z.number().min(0).max(1).default(0.5),
  cycleCreated: z.number(),
  evidenceCount: z.number().default(1)
});
export type MemoryLaw = z.infer<typeof MemoryLaw>;

export const ResearchState = z.object({
  id: z.string().default(() => generateId()),
  goal: z.string(),
  hypotheses: z.array(Hypothesis).default([]),
  experiments: z.array(Experiment).default([]),
  observations: z.array(Observation).default([]),
  memoryLaws: z.array(MemoryLaw).default([]),
  verifiedFacts: z.array(z.string()).default([]),
  failedAttempts: z.array(z.object({
    cycle: z.number(),
    action: z.string(),
    error: z.string(),
    analysis: z.string()
  })).default([]),
  cycleCount: z.number().default(0),
  maxCycles: z.number().default(10),
  isConverged: z.boolean().default(false),
  convergenceReasoning: z.string().optional(),
  currentPhase: z.enum(["hypothesis", "experiment", "observation", "reflection", "synthesis"]).default("hypothesis")
});
export type ResearchState = z.infer<typeof ResearchState>;

export const AgentMessage = z.object({
  id: z.string().default(() => generateId()),
  from: AgentType,
  to: z.union([AgentType, z.literal("all")]),
  type: z.enum(["request", "response", "broadcast"]),
  content: z.string(),
  timestamp: z.number().default(() => Date.now()),
  metadata: z.record(z.any()).default({})
});
export type AgentMessage = z.infer<typeof AgentMessage>;

// ==== Utility Functions ====
export function createResearchState(goal: string, maxCycles: number = 10): ResearchState {
  return ResearchState.parse({
    goal,
    maxCycles
  });
}

export function createHypothesis(content: string, cycle: number = 0): Hypothesis {
  return Hypothesis.parse({ content, cycle });
}

export function createExperiment(
  hypothesisId: string,
  description: string,
  tool: ToolType,
  params: Record<string, any>
): Experiment {
  return Experiment.parse({ hypothesisId, description, tool, params });
}
