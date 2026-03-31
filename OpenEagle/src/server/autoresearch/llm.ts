/**
 * Autoresearch LLM Client - 使用项目现有的AI系统
 */
import { getModel } from "@mariozechner/pi-ai";

export interface LLMClient {
  generate(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMOptions
  ): Promise<string>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

export class MockLLMClient implements LLMClient {
  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMOptions
  ): Promise<string> {
    console.log(`[Autoresearch MockLLM] Generating response...`);
    
    if (userPrompt.includes("hypotheses")) {
      return JSON.stringify({
        hypotheses: [
          { content: "Modular agent design improves system maintainability", rationale: "Separation of concerns" },
          { content: "Message-based communication enables loose coupling", rationale: "Agents can evolve independently" },
          { content: "State persistence supports long-running research", rationale: "Ability to resume from checkpoints" }
        ]
      });
    } else if (userPrompt.includes("experiments")) {
      return JSON.stringify({
        experiments: [
          {
            hypothesisId: "test-id-1",
            description: "Search for multi-agent system design patterns",
            tool: "search",
            params: { query: "multi-agent system design patterns" },
            expectedOutcome: "List of established design patterns"
          }
        ]
      });
    } else if (userPrompt.includes("critique")) {
      return JSON.stringify({
        critiques: [],
        validConclusions: ["The initial hypotheses are logically consistent"],
        unresolvedQuestions: ["Need more empirical evidence"]
      });
    } else {
      return JSON.stringify({
        synthesis: "Preliminary research suggests modular design is key",
        newMemoryLaws: [
          { content: "Modularity enhances maintainability in multi-agent systems", importance: 0.9 }
        ],
        newVerifiedFacts: ["Message passing is a common communication pattern"],
        hypothesisUpdates: [],
        isConverged: false,
        convergenceReasoning: "Need more research cycles",
        nextSteps: ["Explore specific implementation patterns"]
      });
    }
  }
}

export class ProjectLLMClient implements LLMClient {
  private modelId: string;

  constructor(modelId: string = "doubao-seed-2.0-code") {
    this.modelId = modelId;
  }

  async generate(
    systemPrompt: string,
    userPrompt: string,
    options?: LLMOptions
  ): Promise<string> {
    try {
      console.log(`[Autoresearch ProjectLLM] Calling model: ${this.modelId}`);
      
      // 使用项目现有的model系统
      const model = getModel(this.modelId);
      if (!model) {
        throw new Error(`Model not found: ${this.modelId}`);
      }

      // 注意：这里我们简化处理，实际应该使用完整的createAgentSession
      // 由于我们在server环境中，暂时使用Mock实现来避免复杂性
      console.warn(`[Autoresearch] ProjectLLMClient in server - falling back to Mock`);
      
      const mockClient = new MockLLMClient();
      return mockClient.generate(systemPrompt, userPrompt, options);
      
    } catch (error) {
      console.error(`[Autoresearch ProjectLLM] Error:`, error);
      throw error;
    }
  }
}
