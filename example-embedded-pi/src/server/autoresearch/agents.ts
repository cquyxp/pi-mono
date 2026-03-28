/**
 * Autoresearch Agents - 多代理系统
 */
import { AgentType, AgentMessage, ResearchState } from "./models.js";
import { LLMClient } from "./llm.js";
import { PROMPTS } from "./prompts.js";
import { ToolExecutor } from "./tools.js";

export abstract class BaseAgent {
  public readonly type: AgentType;
  protected llm: LLMClient;
  protected messageQueue: AgentMessage[] = [];

  constructor(type: AgentType, llm: LLMClient) {
    this.type = type;
    this.llm = llm;
  }

  abstract execute(state: ResearchState, messages: AgentMessage[]): Promise<AgentMessage[]>;

  receiveMessage(message: AgentMessage): void {
    this.messageQueue.push(message);
  }

  protected clearMessages(): void {
    this.messageQueue = [];
  }

  protected createMessage(
    to: AgentType | "all",
    type: "request" | "response" | "broadcast",
    content: string,
    metadata: Record<string, any> = {}
  ): AgentMessage {
    return {
      id: `msg-${Date.now()}-${Math.random()}`,
      from: this.type,
      to,
      type,
      content,
      timestamp: Date.now(),
      metadata
    };
  }

  protected extractJSON(text: string): any {
    let jsonStr = text.trim();
    
    if (jsonStr.startsWith("```json")) {
      jsonStr = jsonStr.slice(7, jsonStr.lastIndexOf("```")).trim();
    } else if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.slice(3, jsonStr.lastIndexOf("```")).trim();
    }
    
    try {
      return JSON.parse(jsonStr);
    } catch {
      throw new Error("Failed to parse JSON response");
    }
  }
}

export class OracleAgent extends BaseAgent {
  constructor(llm: LLMClient) {
    super("oracle", llm);
  }

  async execute(state: ResearchState, messages: AgentMessage[]): Promise<AgentMessage[]> {
    console.log(`[Autoresearch Oracle] Executing for cycle ${state.cycleCount}`);
    
    const systemPrompt = PROMPTS.oracle.system;
    const userPrompt = PROMPTS.oracle.generate(state);
    
    const response = await this.llm.generate(systemPrompt, userPrompt, { temperature: 0.8 });
    
    try {
      const data = this.extractJSON(response);
      const newHypotheses = (data.hypotheses || []).map((h: any) => ({
        id: `hypo-${Date.now()}-${Math.random()}`,
        content: h.content,
        status: "pending" as const,
        confidence: 0,
        createdAt: Date.now(),
        cycle: state.cycleCount
      }));
      
      return [this.createMessage("all", "broadcast", "Generated new hypotheses", { hypotheses: newHypotheses })];
    } catch (error) {
      console.error(`[Autoresearch Oracle] Error:`, error);
      return [this.createMessage("all", "broadcast", "Failed to generate hypotheses", { error: String(error) })];
    }
  }
}

export class LibrarianAgent extends BaseAgent {
  private toolExecutor: ToolExecutor;

  constructor(llm: LLMClient, toolExecutor: ToolExecutor) {
    super("librarian", llm);
    this.toolExecutor = toolExecutor;
  }

  async execute(state: ResearchState, messages: AgentMessage[]): Promise<AgentMessage[]> {
    console.log(`[Autoresearch Librarian] Executing for cycle ${state.cycleCount}`);
    return [this.createMessage("all", "broadcast", "Literature research completed", { results: [] })];
  }
}

export class ExperimenterAgent extends BaseAgent {
  private toolExecutor: ToolExecutor;

  constructor(llm: LLMClient, toolExecutor: ToolExecutor) {
    super("experimenter", llm);
    this.toolExecutor = toolExecutor;
  }

  async execute(state: ResearchState, messages: AgentMessage[]): Promise<AgentMessage[]> {
    console.log(`[Autoresearch Experimenter] Executing for cycle ${state.cycleCount}`);
    return [this.createMessage("all", "broadcast", "Experiments completed", { experiments: [], observations: [] })];
  }
}

export class CriticAgent extends BaseAgent {
  constructor(llm: LLMClient) {
    super("critic", llm);
  }

  async execute(state: ResearchState, messages: AgentMessage[]): Promise<AgentMessage[]> {
    console.log(`[Autoresearch Critic] Executing for cycle ${state.cycleCount}`);
    return [this.createMessage("all", "broadcast", "Critical analysis completed", { critique: {} })];
  }
}

export class SynthesizerAgent extends BaseAgent {
  constructor(llm: LLMClient) {
    super("synthesizer", llm);
  }

  async execute(state: ResearchState, messages: AgentMessage[]): Promise<AgentMessage[]> {
    console.log(`[Autoresearch Synthesizer] Executing for cycle ${state.cycleCount}`);
    
    const systemPrompt = PROMPTS.synthesizer.system;
    const userPrompt = PROMPTS.synthesizer.synthesize(state);
    
    const response = await this.llm.generate(systemPrompt, userPrompt, { temperature: 0.4 });
    
    try {
      const data = this.extractJSON(response);
      return [this.createMessage("all", "broadcast", "Synthesis completed", { ...data })];
    } catch (error) {
      console.error(`[Autoresearch Synthesizer] Error:`, error);
      return [this.createMessage("all", "broadcast", "Failed to synthesize", { error: String(error) })];
    }
  }
}
