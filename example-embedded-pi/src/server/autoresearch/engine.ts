/**
 * Autoresearch Engine - 核心研究循环引擎
 */
import { EventEmitter } from "events";
import { ResearchState, createResearchState } from "./models.js";
import { LLMClient, MockLLMClient } from "./llm.js";
import { ToolExecutor, MockToolExecutor } from "./tools.js";
import {
  BaseAgent,
  OracleAgent,
  LibrarianAgent,
  ExperimenterAgent,
  CriticAgent,
  SynthesizerAgent
} from "./agents.js";

export interface AutoresearchConfig {
  maxCycles?: number;
  verbose?: boolean;
  saveStateHistory?: boolean;
  useMock?: boolean;
}

const DEFAULT_CONFIG: AutoresearchConfig = {
  maxCycles: 10,
  verbose: true,
  saveStateHistory: true,
  useMock: true
};

export class AutoresearchEngine extends EventEmitter {
  private config: AutoresearchConfig;
  private llm: LLMClient;
  private toolExecutor: ToolExecutor;
  private stateHistory: ResearchState[] = [];
  private stopRequested: boolean = false;

  constructor(
    llm?: LLMClient,
    toolExecutor?: ToolExecutor,
    config: AutoresearchConfig = {}
  ) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.llm = llm || (this.config.useMock ? new MockLLMClient() : new MockLLMClient());
    this.toolExecutor = toolExecutor || (this.config.useMock ? new MockToolExecutor() : new MockToolExecutor());
  }

  stop(): void {
    this.stopRequested = true;
  }

  async run(goal: string, initialState?: ResearchState): Promise<ResearchState> {
    let state = initialState || createResearchState(goal, this.config.maxCycles);
    state.goal = goal;

    if (this.config.verbose) {
      console.log(`[Autoresearch] Starting for goal: ${goal}`);
      this.emit("log", { type: "info", message: `Starting research for: ${goal}` });
    }

    this.stateHistory = [];
    this.stopRequested = false;

    while (!state.isConverged && state.cycleCount < state.maxCycles && !this.stopRequested) {
      state.cycleCount++;
      
      if (this.config.verbose) {
        console.log(`[Autoresearch] Cycle ${state.cycleCount}/${state.maxCycles}`);
        this.emit("cycleStart", state.cycleCount, state);
        this.emit("log", { type: "info", message: `Cycle ${state.cycleCount}/${state.maxCycles}` });
      }

      try {
        state = await this.runCycle(state);
        
        if (this.config.saveStateHistory) {
          this.stateHistory.push(JSON.parse(JSON.stringify(state)));
        }

        this.emit("cycleComplete", state.cycleCount, state);
        this.emit("stateUpdate", state);

      } catch (error) {
        console.error(`[Autoresearch] Cycle ${state.cycleCount} failed:`, error);
        this.emit("error", error);
        this.emit("log", { type: "error", message: `Cycle failed: ${error}` });
        state.failedAttempts.push({
          cycle: state.cycleCount,
          action: "Full cycle",
          error: String(error),
          analysis: "Unexpected error"
        });
      }

      if (this.stopRequested) break;
    }

    if (this.config.verbose) {
      console.log(`[Autoresearch] Complete. Converged: ${state.isConverged}`);
      this.emit("log", { type: "success", message: `Research complete. Converged: ${state.isConverged}` });
    }

    this.emit("complete", state);
    return state;
  }

  getHistory(): ResearchState[] {
    return [...this.stateHistory];
  }

  private async runCycle(state: ResearchState): Promise<ResearchState> {
    const messages: any[] = [];

    // Initialize agents
    const oracle = new OracleAgent(this.llm);
    const librarian = new LibrarianAgent(this.llm, this.toolExecutor);
    const experimenter = new ExperimenterAgent(this.llm, this.toolExecutor);
    const critic = new CriticAgent(this.llm);
    const synthesizer = new SynthesizerAgent(this.llm);

    // Phase 1: Oracle
    this.emit("phase", "hypothesis");
    this.emit("log", { type: "info", message: "Phase: Oracle - Generating hypotheses" });
    const oracleMessages = await oracle.execute(state, messages);
    messages.push(...oracleMessages);
    state = this.updateStateFromMessages(state, oracleMessages);

    // Phase 2: Librarian
    this.emit("phase", "hypothesis");
    this.emit("log", { type: "info", message: "Phase: Librarian - Researching" });
    const librarianMessages = await librarian.execute(state, messages);
    messages.push(...librarianMessages);

    // Phase 3: Experimenter
    this.emit("phase", "experiment");
    this.emit("log", { type: "info", message: "Phase: Experimenter - Designing experiments" });
    const experimenterMessages = await experimenter.execute(state, messages);
    messages.push(...experimenterMessages);

    // Phase 4: Critic
    this.emit("phase", "observation");
    this.emit("log", { type: "info", message: "Phase: Critic - Analyzing results" });
    const criticMessages = await critic.execute(state, messages);
    messages.push(...criticMessages);

    // Phase 5: Synthesizer
    this.emit("phase", "synthesis");
    this.emit("log", { type: "info", message: "Phase: Synthesizer - Synthesizing findings" });
    const synthesizerMessages = await synthesizer.execute(state, messages);
    state = this.updateStateFromMessages(state, synthesizerMessages);

    return state;
  }

  private updateStateFromMessages(state: ResearchState, messages: any[]): ResearchState {
    const updatedState = JSON.parse(JSON.stringify(state));

    for (const message of messages) {
      const metadata = message.metadata || {};

      if (metadata.hypotheses) {
        updatedState.hypotheses = [
          ...updatedState.hypotheses.filter((h: any) => h.status !== "pending"),
          ...metadata.hypotheses
        ];
      }

      if (metadata.newMemoryLaws) {
        for (const lawData of metadata.newMemoryLaws) {
          const exists = updatedState.memoryLaws.some(
            (l: any) => l.content === lawData.content
          );
          if (!exists) {
            updatedState.memoryLaws.push({
              id: `law-${Date.now()}-${Math.random()}`,
              content: lawData.content,
              importance: lawData.importance,
              cycleCreated: state.cycleCount,
              evidenceCount: 1
            });
          }
        }
      }

      if (metadata.newVerifiedFacts) {
        for (const fact of metadata.newVerifiedFacts) {
          if (!updatedState.verifiedFacts.includes(fact)) {
            updatedState.verifiedFacts.push(fact);
          }
        }
      }

      if (metadata.isConverged !== undefined) {
        updatedState.isConverged = metadata.isConverged;
        updatedState.convergenceReasoning = metadata.convergenceReasoning;
      }
    }

    return updatedState;
  }
}
