/**
 * Discovery Agent - TypeScript Task Manager
 * 发现式智能 - TypeScript 任务管理器
 */
import {
  DiscoveryState,
  DiscoveryTask,
  createDiscoveryState,
  generateId,
} from "./models.js";
import {
  DiscoveryLoopEngine,
  LLMClient,
  SimulatedLLMClient,
  RealLLMClient,
  DiscoveryStepEvent,
} from "./engine.js";
import {
  BaseToolExecutor,
  RealToolExecutor,
  SimulatedToolExecutor,
} from "./tools-adapter.js";

interface Task {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  goal: string;
  maxCycles: number;
  useRealLLM: boolean;
  useRealTools: boolean;
  state?: DiscoveryState;
  cycleStates?: Record<number, DiscoveryState>;
  error?: string;
  onStepUpdate?: (event: DiscoveryStepEvent) => void;
}

const tasks = new Map<string, Task>();

export function listTasks(): DiscoveryTask[] {
  return Array.from(tasks.values()).map((task) => ({
    task_id: task.id,
    status: task.status,
    goal: task.goal,
    current_cycle: task.state?.cycle_count || 0,
    max_cycles: task.maxCycles,
    is_converged: task.state?.is_converged || false,
    final_state: task.state,
    cycle_states: task.cycleStates,
    error: task.error,
  }));
}

export function getTask(taskId: string): DiscoveryTask | undefined {
  const task = tasks.get(taskId);
  if (!task) return undefined;
  return {
    task_id: task.id,
    status: task.status,
    goal: task.goal,
    current_cycle: task.state?.cycle_count || 0,
    max_cycles: task.maxCycles,
    is_converged: task.state?.is_converged || false,
    final_state: task.state,
    cycle_states: task.cycleStates,
    error: task.error,
  };
}

export async function startTask(
  goal: string,
  maxCycles: number = 3,
  useRealLLM: boolean = false,
  useRealTools: boolean = true,
  onStepUpdate?: (event: DiscoveryStepEvent) => void
): Promise<DiscoveryTask> {
  const taskId = generateId();

  const task: Task = {
    id: taskId,
    status: "pending",
    goal,
    maxCycles,
    useRealLLM,
    useRealTools,
    state: createDiscoveryState(goal, maxCycles),
    cycleStates: {},
    onStepUpdate,
  };

  tasks.set(taskId, task);

  runTaskInBackground(taskId);

  return {
    task_id: taskId,
    status: "pending",
    goal,
    current_cycle: 0,
    max_cycles: maxCycles,
    is_converged: false,
  };
}

async function runTaskInBackground(taskId: string) {
  const task = tasks.get(taskId);
  if (!task) return;

  task.status = "running";

  try {
    const llmClient: LLMClient = task.useRealLLM
      ? new RealLLMClient()
      : new SimulatedLLMClient();

    const toolExecutor: BaseToolExecutor = task.useRealTools
      ? new RealToolExecutor(30)
      : new SimulatedToolExecutor();

    const cycleStates: Record<number, DiscoveryState> = {};

    const engine = new DiscoveryLoopEngine({
      llmClient,
      toolExecutor,
      maxCycles: task.maxCycles,
      onCycleUpdate: (state, cycle) => {
        cycleStates[cycle] = JSON.parse(JSON.stringify(state));
        task.state = JSON.parse(JSON.stringify(state));
        task.cycleStates = { ...cycleStates };
      },
      onStepUpdate: task.onStepUpdate,
    });

    const finalState = await engine.run(task.goal, task.state);

    // 确保最终状态包含最后一轮的完整数据（从cycleStates获取）
    const lastCycle = Math.max(...Object.keys(cycleStates).map(Number));
    if (lastCycle > 0 && cycleStates[lastCycle]) {
      task.state = {
        ...finalState,
        verification_actions: cycleStates[lastCycle].verification_actions,
        observations: cycleStates[lastCycle].observations,
      };
    } else {
      task.state = finalState;
    }

    task.cycleStates = cycleStates;
    task.status = "completed";
  } catch (error) {
    task.status = "failed";
    task.error = error instanceof Error ? error.message : String(error);
    console.error(`[Discovery] Task ${taskId} failed:`, error);
  }
}
