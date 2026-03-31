/**
 * Discovery Agent - TypeScript Engine
 * 发现式智能 - TypeScript 引擎
 */
import fs from "fs";
import path from "path";
import {
  DiscoveryState,
  Hypothesis,
  VerificationAction,
  Observation,
  MemoryLaw,
  FailedAttempt,
  generateId,
  createDiscoveryState,
} from "./models.js";
import {
  buildHypothesisPrompt,
  buildPlanningPrompt,
  buildReflectionPrompt,
  buildSynthesisPrompt,
} from "./prompts.js";
import { BaseToolExecutor, ToolResult } from "./tools-adapter.js";
import { loadSettings, applySettingsToEnvironment } from "../settings-manager.js";

export interface LLMClient {
  generate(systemPrompt: string, userPrompt: string, temperature?: number): Promise<string>;
}

/**
 * 真实的 LLM 客户端，使用直接的 fetch 调用（与 intelligent-memory.ts 一致）
 */
export class RealLLMClient implements LLMClient {
  private baseUrl: string;
  private modelId: string;

  constructor() {
    // 应用设置到环境变量
    applySettingsToEnvironment();

    this.baseUrl = "https://ark.cn-beijing.volces.com/api/coding/v3";
    this.modelId = "doubao-seed-2.0-code";
  }

  async generate(systemPrompt: string, userPrompt: string, temperature: number = 0.7): Promise<string> {
    console.log(`[Real LLM] Generating response...`);

    const settings = loadSettings();
    const apiKey = settings.apiKeys?.volcengine || process.env.VOLCENGINE_API_KEY;

    if (!apiKey) {
      throw new Error("No Volcengine API key found in settings or environment");
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.modelId,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ],
          max_completion_tokens: 4096,
          temperature,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "";
    } catch (error) {
      console.error("[Real LLM] Error:", error);
      throw error;
    }
  }
}

export class SimulatedLLMClient implements LLMClient {
  private stepCount = 0;
  private currentHypoIds: string[] = [];
  private projectInfo: string = "";

  constructor() {
    // 尝试读取项目信息
    try {
      const readmePath = path.join(process.cwd(), "README.md");
      if (fs.existsSync(readmePath)) {
        this.projectInfo = fs.readFileSync(readmePath, "utf-8").substring(0, 2000);
      }
      const packageJsonPath = path.join(process.cwd(), "package.json");
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
        this.projectInfo += `\n\n项目名称: ${packageJson.name || "unknown"}\n描述: ${packageJson.description || "unknown"}`;
      }
    } catch (e) {
      console.log("[Simulated LLM] Could not read project files:", e);
    }
  }

  async generate(systemPrompt: string, userPrompt: string, temperature?: number): Promise<string> {
    this.stepCount++;
    console.log(`[Simulated LLM] Generating response for step ${this.stepCount}...`);

    if (systemPrompt.toLowerCase().includes("hypothesis generator") || userPrompt.substring(0, 100).toLowerCase().includes("hypothesis")) {
      this.currentHypoIds = [`hypo_${this.stepCount}_1`, `hypo_${this.stepCount}_2`];
      return JSON.stringify({
        hypotheses: [
          { id: this.currentHypoIds[0], content: "这是一个 TypeScript 项目，包含 Web 服务器和前端界面。" },
          { id: this.currentHypoIds[1], content: "项目使用 Express.js 作为后端，React 作为前端。" },
        ],
      });
    } else if (systemPrompt.toLowerCase().includes("verification planner") || userPrompt.substring(0, 100).toLowerCase().includes("planning")) {
      const actions = this.currentHypoIds.map((hypoId, i) => ({
        id: `action_${this.stepCount}_${i + 1}`,
        hypothesis_id: hypoId,
        tool: "file_read",
        params: { path: i === 0 ? "package.json" : "src/server/index.ts" },
        description: i === 0 ? "读取 package.json 验证项目配置" : "读取服务器入口文件验证技术栈",
      }));
      return JSON.stringify({ actions });
    } else if (systemPrompt.toLowerCase().includes("critical reflector") || userPrompt.substring(0, 100).toLowerCase().includes("reflection")) {
      const hypothesisUpdates = this.currentHypoIds.map((hypoId, i) => ({
        id: hypoId,
        status: "verified",
        confidence: 0.85,
      }));

      // 在第3轮结束后收敛（每轮3个步骤：hypothesis、planning、reflection，3轮 = 9步）
      const shouldConverge = this.stepCount >= 9;

      return JSON.stringify({
        verified_facts: [
          "这是一个 TypeScript 项目",
          "使用 Express.js 作为后端服务器",
          "使用 React 作为前端框架",
          "包含发现式智能功能",
          "包含智能记忆系统",
        ],
        failed_attempts: [],
        memory_laws: [
          { content: "分析项目结构时，先读取 package.json 和主要入口文件可以快速了解技术栈。", importance: 0.85 },
          { content: "阅读 README.md 可以快速了解项目的用途和架构。", importance: 0.75 },
        ],
        hypothesis_updates: hypothesisUpdates,
        is_converged: shouldConverge,
        convergence_reasoning: shouldConverge ? "已收集足够的项目信息，可以收敛。" : "继续收集项目信息，还需要更多轮次。",
      });
    } else {
      return `# 项目分析报告

## 执行摘要
基于发现式智能循环分析，这是一个完整的 TypeScript 全栈项目。

## 验证过的事实
1. 这是一个 TypeScript 项目
2. 使用 Express.js 作为后端服务器
3. 使用 React 作为前端框架
4. 包含发现式智能功能
5. 项目名为 example-embedded-pi

## 项目架构
- **后端**: Express + WebSocket + TypeScript
- **前端**: React + Semi UI
- **AI**: 集成 pi-coding-agent
- **特色功能**: 发现式智能、智能记忆系统

## 最终建议
这是一个架构清晰的 AI Agent 项目，可以作为学习嵌入式 AI Agent 的参考。

## 经验教训
1. 分析项目结构时，先读取 package.json 和主要入口文件可以快速了解技术栈。
`;
    }
  }
}

export interface DiscoveryStepEvent {
  type: "hypothesis" | "planning" | "execution" | "reflection" | "synthesis" | "cycle_complete";
  cycle: number;
  title: string;
  content: string;
  data?: any;
}

export interface DiscoveryEngineConfig {
  llmClient: LLMClient;
  toolExecutor: BaseToolExecutor;
  maxCycles?: number;
  temperatures?: {
    hypothesis?: number;
    planning?: number;
    reflection?: number;
    synthesis?: number;
  };
  contextWindowLimit?: number;
  onCycleUpdate?: (state: DiscoveryState, cycle: number) => void;
  onStepUpdate?: (event: DiscoveryStepEvent) => void;
}

export class DiscoveryLoopEngine {
  private llmClient: LLMClient;
  private toolExecutor: BaseToolExecutor;
  private maxCycles: number;
  private temperatures: { hypothesis: number; planning: number; reflection: number; synthesis: number };
  private contextWindowLimit: number;
  private onCycleUpdate?: (state: DiscoveryState, cycle: number) => void;
  private onStepUpdate?: (event: DiscoveryStepEvent) => void;

  constructor(config: DiscoveryEngineConfig) {
    this.llmClient = config.llmClient;
    this.toolExecutor = config.toolExecutor;
    this.maxCycles = config.maxCycles || 3;
    this.temperatures = {
      hypothesis: 0.8,
      planning: 0.2,
      reflection: 0.5,
      synthesis: 0.3,
      ...config.temperatures,
    };
    this.contextWindowLimit = config.contextWindowLimit || 8000;
    this.onCycleUpdate = config.onCycleUpdate;
    this.onStepUpdate = config.onStepUpdate;
  }

  private emitStep(event: DiscoveryStepEvent) {
    if (this.onStepUpdate) {
      this.onStepUpdate(event);
    }
  }

  async run(goal: string, initialState?: DiscoveryState): Promise<DiscoveryState> {
    const state = initialState || createDiscoveryState(goal, this.maxCycles);
    state.goal = goal;
    state.max_cycles = this.maxCycles;

    console.log(`🚀 Starting Discovery Loop for goal: ${goal}`);
    console.log(`🔄 Max cycles: ${state.max_cycles}\n`);

    const cycleStates: Record<number, DiscoveryState> = {};

    while (!state.is_converged && state.cycle_count < state.max_cycles) {
      state.cycle_count++;
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`🔄 Cycle ${state.cycle_count}/${state.max_cycles}`);

      try {
        await this.stepHypothesisGeneration(state);
        await this.stepVerificationPlanning(state);
        await this.stepActiveExecution(state);
        await this.stepReflectionAdjudication(state);
        this.manageMemoryLaws(state);
        this.printCycleSummary(state);

        // 保存当前状态的副本（包含 verification_actions 和 observations）
        cycleStates[state.cycle_count] = JSON.parse(JSON.stringify(state));

        if (this.onCycleUpdate) {
          this.onCycleUpdate(cycleStates[state.cycle_count], state.cycle_count);
        }

        // 只在回调后清空，用于下一轮
        state.verification_actions = [];
        state.observations = [];
      } catch (error) {
        console.error(`❌ Cycle ${state.cycle_count} failed with error:`, error);
        state.failed_attempts.push({
          cycle: state.cycle_count,
          action: "Full cycle",
          error: error instanceof Error ? error.message : String(error),
          analysis: "Unexpected error during cycle execution",
        });
      }
    }

    console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📊 Final Synthesis");
    const finalSolution = await this.stepFinalSynthesis(state);
    console.log(`\n✅ Final Solution:\n${finalSolution}`);

    // 保存最终合成报告到state
    state.final_synthesis = finalSolution;

    return state;
  }

  private summarizeStateIfNeeded(state: DiscoveryState) {
    const stateDict = {
      verified_facts: state.verified_facts,
      memory_laws: state.memory_laws
        .sort((a, b) => b.importance - a.importance)
        .map(l => ({ content: l.content, importance: l.importance })),
      failed_attempts: state.failed_attempts.slice(-5),
      previous_hypotheses: state.hypotheses.map(h => ({
        id: h.id,
        content: h.content,
        status: h.status,
        confidence: h.confidence,
      })),
    };

    const stateJson = JSON.stringify(stateDict);
    if (stateJson.length > this.contextWindowLimit / 2) {
      console.log("⚠️ State is large, summarizing...");
      return {
        ...stateDict,
        memory_laws: stateDict.memory_laws.slice(0, 5),
        verified_facts: stateDict.verified_facts.slice(-10),
        summary_note: "State summarized due to length constraints",
      };
    }
    return stateDict;
  }

  private extractJson(text: string): string {
    if (text.includes("```json") && text.includes("```")) {
      const start = text.indexOf("```json") + 7;
      const end = text.lastIndexOf("```");
      return text.substring(start, end).trim();
    } else if (text.includes("```")) {
      const start = text.indexOf("```") + 3;
      const end = text.lastIndexOf("```");
      return text.substring(start, end).trim();
    }
    return text.trim();
  }

  private async stepHypothesisGeneration(state: DiscoveryState) {
    console.log("\n📝 Step 1: Hypothesis Generation");

    this.emitStep({
      type: "hypothesis",
      cycle: state.cycle_count,
      title: "📝 假说生成",
      content: "正在生成探索假说...",
    });

    const summarizedState = this.summarizeStateIfNeeded(state);
    const systemPrompt = "You are a creative hypothesis generator.";
    const userPrompt = buildHypothesisPrompt(
      state.goal,
      summarizedState.verified_facts,
      summarizedState.failed_attempts,
      summarizedState.memory_laws,
      summarizedState.previous_hypotheses,
      state.cycle_count
    );

    const response = await this.llmClient.generate(
      systemPrompt,
      userPrompt,
      this.temperatures.hypothesis
    );

    try {
      const jsonStr = this.extractJson(response);
      const data = JSON.parse(jsonStr);

      const newHypotheses: Hypothesis[] = (data.hypotheses || []).map((h: any) => ({
        id: h.id || generateId(),
        content: h.content || "",
        status: "pending",
        confidence: 0,
      }));

      state.hypotheses = newHypotheses;

      console.log(`   Generated ${state.hypotheses.length} hypotheses`);
      for (const hypo of state.hypotheses) {
        console.log(`   - [${hypo.id}] ${hypo.content}`);
      }

      const hypothesesContent = newHypotheses.map((h, i) => `${i + 1}. ${h.content}`).join("\n");
      this.emitStep({
        type: "hypothesis",
        cycle: state.cycle_count,
        title: "📝 假说生成完成",
        content: `生成了 ${newHypotheses.length} 个假说：\n${hypothesesContent}`,
        data: { hypotheses: newHypotheses },
      });
    } catch (error) {
      console.error(`   ❌ Failed to parse hypotheses:`, error);
      throw error;
    }
  }

  private async stepVerificationPlanning(state: DiscoveryState) {
    console.log("\n📋 Step 2: Verification Planning");

    if (state.hypotheses.length === 0) {
      console.log("   No hypotheses to verify, skipping");
      return;
    }

    const systemPrompt = "You are a rigorous verification planner.";
    const userPrompt = buildPlanningPrompt(state.goal, state.hypotheses);

    const response = await this.llmClient.generate(
      systemPrompt,
      userPrompt,
      this.temperatures.planning
    );

    try {
      const jsonStr = this.extractJson(response);
      const data = JSON.parse(jsonStr);

      state.verification_actions = (data.actions || []).map((a: any) => ({
        id: a.id || generateId(),
        hypothesis_id: a.hypothesis_id || "",
        tool: a.tool || "",
        params: a.params || {},
        description: a.description || "",
      }));

      console.log(`   Planned ${state.verification_actions.length} verification actions`);
      for (const action of state.verification_actions) {
        console.log(`   - [${action.id}] ${action.tool}: ${action.description}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to parse planning:`, error);
      throw error;
    }
  }

  private async stepActiveExecution(state: DiscoveryState) {
    console.log("\n⚡ Step 3: Active Execution");

    if (state.verification_actions.length === 0) {
      console.log("   No actions to execute, skipping");
      return;
    }

    state.observations = [];
    for (const action of state.verification_actions) {
      console.log(`   Executing [${action.id}]...`);
      const result = await this.toolExecutor.execute(action.tool, action.params);

      const observation: Observation = {
        action_id: action.id,
        success: result.success,
        output: result.success ? result.output : undefined,
        error: !result.success ? result.error : undefined,
      };
      state.observations.push(observation);

      const status = result.success ? "✅ Success" : "❌ Failed";
      console.log(`   ${status}`);
      if (result.output) {
        const outputPreview = result.output.length > 100 ? result.output.substring(0, 100) + "..." : result.output;
        console.log(`   Output: ${outputPreview}`);
      }
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }
  }

  private async stepReflectionAdjudication(state: DiscoveryState) {
    console.log("\n🤔 Step 4: Reflection & Adjudication");

    const summarizedState = this.summarizeStateIfNeeded(state);
    const systemPrompt = "You are a critical reflector and knowledge extractor.";
    const userPrompt = buildReflectionPrompt(
      state.goal,
      state.hypotheses,
      state.verification_actions,
      state.observations,
      summarizedState.verified_facts,
      summarizedState.memory_laws,
      summarizedState.failed_attempts,
      state.cycle_count,
      state.max_cycles
    );

    const response = await this.llmClient.generate(
      systemPrompt,
      userPrompt,
      this.temperatures.reflection
    );

    try {
      const jsonStr = this.extractJson(response);
      const data = JSON.parse(jsonStr);

      const newFacts = data.verified_facts || [];
      state.verified_facts.push(...newFacts);

      for (const faData of data.failed_attempts || []) {
        state.failed_attempts.push(faData);
      }

      for (const lawData of data.memory_laws || []) {
        state.memory_laws.push({
          id: generateId(),
          content: lawData.content || "",
          importance: lawData.importance || 0.5,
          cycle_created: state.cycle_count,
        });
      }

      for (const update of data.hypothesis_updates || []) {
        const hypoId = update.id;
        const hypo = state.hypotheses.find(h => h.id === hypoId);
        if (hypo) {
          hypo.status = update.status || "pending";
          hypo.confidence = update.confidence || 0;
        }
      }

      state.is_converged = data.is_converged || false;
      const convergenceReason = data.convergence_reasoning || "";

      console.log(`   New verified facts: ${newFacts.length}`);
      console.log(`   New memory laws: ${(data.memory_laws || []).length}`);
      console.log(`   Converged: ${state.is_converged ? "✅ Yes" : "❌ No"}`);
      if (convergenceReason) {
        console.log(`   Reasoning: ${convergenceReason}`);
      }
    } catch (error) {
      console.error(`   ❌ Failed to parse reflection:`, error);
      throw error;
    }
  }

  private manageMemoryLaws(state: DiscoveryState) {
    if (state.memory_laws.length === 0) return;

    const seenContents = new Set<string>();
    const uniqueLaws: MemoryLaw[] = [];
    for (const law of state.memory_laws) {
      if (!seenContents.has(law.content)) {
        seenContents.add(law.content);
        uniqueLaws.push(law);
      }
    }

    uniqueLaws.sort((a, b) => {
      if (b.importance !== a.importance) return b.importance - a.importance;
      return a.cycle_created - b.cycle_created;
    });

    state.memory_laws = uniqueLaws.slice(0, state.max_memory_laws);
    console.log(`\n🧠 Managed memory laws: ${state.memory_laws.length} kept (max ${state.max_memory_laws})`);
  }

  private printCycleSummary(state: DiscoveryState) {
    console.log(`\n📈 Cycle ${state.cycle_count} Summary:`);
    console.log(`   Hypotheses: ${state.hypotheses.length} total`);
    console.log(`   Verified facts: ${state.verified_facts.length} total`);
    console.log(`   Memory laws: ${state.memory_laws.length} total (max ${state.max_memory_laws})`);
    console.log(`   Failed attempts: ${state.failed_attempts.length} total`);
    console.log(`   Is converged: ${state.is_converged ? "Yes" : "No"}`);
  }

  private async stepFinalSynthesis(state: DiscoveryState): Promise<string> {
    const summarizedState = this.summarizeStateIfNeeded(state);
    const systemPrompt = "You are a master synthesizer.";
    const userPrompt = buildSynthesisPrompt(
      state.goal,
      summarizedState.verified_facts,
      summarizedState.memory_laws,
      summarizedState.failed_attempts,
      state.cycle_count,
      state.hypotheses
    );

    return await this.llmClient.generate(
      systemPrompt,
      userPrompt,
      this.temperatures.synthesis
    );
  }
}
