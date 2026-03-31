/**
 * Autoresearch Manager - 整合到现有项目的管理器
 * 提供向后兼容的API
 */
import { EventEmitter } from "events";
import { AutoresearchEngine, AutoresearchConfig } from "./engine.js";
import { ResearchState, createResearchState } from "./models.js";
import { MockLLMClient } from "./llm.js";
import { MockToolExecutor } from "./tools.js";

export interface AutoresearchTask {
  task_id: string;
  status: "pending" | "running" | "completed" | "failed";
  goal: string;
  current_cycle: number;
  max_cycles: number;
  is_converged: boolean;
  final_state?: ResearchState;
  cycle_states?: Record<number, ResearchState>;
  error?: string;
}

interface InternalTask {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  goal: string;
  maxCycles: number;
  useMock: boolean;
  state?: ResearchState;
  cycleStates?: Record<number, ResearchState>;
  error?: string;
  engine?: AutoresearchEngine;
}

const tasks = new Map<string, InternalTask>();
let taskIdCounter = 0;

function generateTaskId(): string {
  return `artask-${Date.now()}-${++taskIdCounter}`;
}

export class AutoresearchManager extends EventEmitter {
  private static instance: AutoresearchManager;

  static getInstance(): AutoresearchManager {
    if (!AutoresearchManager.instance) {
      AutoresearchManager.instance = new AutoresearchManager();
    }
    return AutoresearchManager.instance;
  }

  listTasks(): AutoresearchTask[] {
    return Array.from(tasks.values()).map((task) => ({
      task_id: task.id,
      status: task.status,
      goal: task.goal,
      current_cycle: task.state?.cycleCount || 0,
      max_cycles: task.maxCycles,
      is_converged: task.state?.isConverged || false,
      final_state: task.state,
      cycle_states: task.cycleStates,
      error: task.error,
    }));
  }

  getTask(taskId: string): AutoresearchTask | undefined {
    const task = tasks.get(taskId);
    if (!task) return undefined;
    return {
      task_id: task.id,
      status: task.status,
      goal: task.goal,
      current_cycle: task.state?.cycleCount || 0,
      max_cycles: task.maxCycles,
      is_converged: task.state?.isConverged || false,
      final_state: task.state,
      cycle_states: task.cycleStates,
      error: task.error,
    };
  }

  async startTask(
    goal: string,
    maxCycles: number = 5,
    useMock: boolean = true
  ): Promise<AutoresearchTask> {
    const taskId = generateTaskId();

    const task: InternalTask = {
      id: taskId,
      status: "pending",
      goal,
      maxCycles,
      useMock,
      state: createResearchState(goal, maxCycles),
      cycleStates: {},
    };

    tasks.set(taskId, task);
    this.emit("taskCreated", this.toPublicTask(task));

    this.runTaskInBackground(taskId);

    return this.toPublicTask(task);
  }

  stopTask(taskId: string): boolean {
    const task = tasks.get(taskId);
    if (!task || task.status !== "running") {
      return false;
    }

    if (task.engine) {
      task.engine.stop();
    }

    task.status = "failed";
    task.error = "Stopped by user";
    this.emit("taskUpdated", this.toPublicTask(task));
    return true;
  }

  private toPublicTask(task: InternalTask): AutoresearchTask {
    return {
      task_id: task.id,
      status: task.status,
      goal: task.goal,
      current_cycle: task.state?.cycleCount || 0,
      max_cycles: task.maxCycles,
      is_converged: task.state?.isConverged || false,
      final_state: task.state,
      cycle_states: task.cycleStates,
      error: task.error,
    };
  }

  private async runTaskInBackground(taskId: string): Promise<void> {
    const task = tasks.get(taskId);
    if (!task) return;

    task.status = "running";
    this.emit("taskUpdated", this.toPublicTask(task));
    this.emit("log", { taskId, type: "info", message: `Starting research for: ${task.goal}` });

    try {
      const llm = new MockLLMClient();
      const tools = new MockToolExecutor();
      const cycleStates: Record<number, ResearchState> = {};

      const engine = new AutoresearchEngine(llm, tools, {
        maxCycles: task.maxCycles,
        verbose: true,
        saveStateHistory: true,
        useMock: true
      });

      task.engine = engine;

      // 监听事件
      engine.on("cycleStart", (cycle: number, state: ResearchState) => {
        this.emit("log", { taskId, type: "info", message: `Cycle ${cycle} started` });
      });

      engine.on("stateUpdate", (state: ResearchState) => {
        task.state = JSON.parse(JSON.stringify(state));
        cycleStates[state.cycleCount] = JSON.parse(JSON.stringify(state));
        task.cycleStates = { ...cycleStates };
        this.emit("taskUpdated", this.toPublicTask(task));
      });

      engine.on("log", (log: any) => {
        this.emit("log", { taskId, ...log });
      });

      const finalState = await engine.run(task.goal, task.state);

      task.state = finalState;
      task.cycleStates = cycleStates;
      task.status = "completed";

      this.emit("log", { taskId, type: "success", message: "Research completed" });
      this.emit("taskCompleted", this.toPublicTask(task));

    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : String(error);
      this.emit("log", { taskId, type: "error", message: `Task failed: ${task.error}` });
      this.emit("taskFailed", this.toPublicTask(task));
      console.error(`[Autoresearch] Task ${taskId} failed:`, error);
    }

    this.emit("taskUpdated", this.toPublicTask(task));
  }
}

// 单例导出
export function getAutoresearchManager(): AutoresearchManager {
  return AutoresearchManager.getInstance();
}
