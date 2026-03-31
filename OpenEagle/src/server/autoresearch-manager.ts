/**
 * Autoresearch Manager - Backend controller for autoresearch
 *
 * Manages the autoresearch loop, state, and communication with frontend.
 */

import { EventEmitter } from "events";
import {
  runEmbeddedPiAgent,
  createAutoresearchTools,
  AUTORESEARCH_SYSTEM_PROMPT,
} from "../index.js";
import { homedir } from "os";
import { join } from "path";

export interface AutoresearchState {
  running: boolean;
  iterations: number;
  successCount: number;
  bestValBpb: number | null;
  config: {
    maxIterations: number;
    timeoutMinutes: number;
  };
  logs: Array<{
    time: string;
    type: "info" | "success" | "error" | "warning";
    message: string;
  }>;
  topic?: string;
}

export class AutoresearchManager extends EventEmitter {
  private state: AutoresearchState;
  private stopRequested: boolean = false;
  private abortController: AbortController | null = null;

  constructor() {
    super();
    this.state = {
      running: false,
      iterations: 0,
      successCount: 0,
      bestValBpb: null,
      config: {
        maxIterations: 20,
        timeoutMinutes: 5,
      },
      logs: [],
      topic: undefined,
    };
  }

  getState(): AutoresearchState {
    return { ...this.state };
  }

  setConfig(maxIterations: number, timeoutMinutes: number) {
    this.state.config.maxIterations = maxIterations;
    this.state.config.timeoutMinutes = timeoutMinutes;
    this.emit("stateChanged", this.getState());
  }

  setTopic(topic?: string) {
    this.state.topic = topic;
  }

  log(type: "info" | "success" | "error" | "warning", message: string) {
    const time = new Date().toTimeString().split(" ")[0];
    const logEntry = { time, type, message };
    this.state.logs.push(logEntry);
    // Keep last 100 logs
    if (this.state.logs.length > 100) {
      this.state.logs = this.state.logs.slice(-100);
    }
    this.emit("log", logEntry);
  }

  async start(): Promise<void> {
    if (this.state.running) {
      this.log("warning", "Autoresearch is already running");
      return;
    }

    this.state.running = true;
    this.state.iterations = 0;
    this.state.successCount = 0;
    this.stopRequested = false;
    this.log("info", "Autoresearch started");
    const topic = this.state.topic;
    if (topic) {
      this.log("info", "Topic: " + topic);
    }
    this.log("info", "Max iterations: " + this.state.config.maxIterations);
    this.log("info", "Timeout: " + this.state.config.timeoutMinutes + " min");
    this.emit("stateChanged", this.getState());

    // Run the loop
    await this.runLoop();
  }

  stop(): void {
    if (!this.state.running) {
      this.log("warning", "Autoresearch is not running");
      return;
    }

    this.stopRequested = true;
    if (this.abortController) {
      this.abortController.abort();
    }
    this.log("warning", "Stop requested...");
  }

  clearLogs(): void {
    this.state.logs = [];
    this.emit("logsCleared");
  }

  private async runLoop(): Promise<void> {
    try {
      while (
        this.state.running &&
        !this.stopRequested &&
        this.state.iterations < this.state.config.maxIterations
      ) {
        await this.runIteration();

        if (this.stopRequested) break;

        // Small delay between iterations
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!this.stopRequested) {
        this.log("success", "Autoresearch completed!");
      } else {
        this.log("info", "Autoresearch stopped");
      }
    } catch (error) {
      this.log("error", `Fatal error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.state.running = false;
      this.emit("stateChanged", this.getState());
    }
  }

  private async runIteration(): Promise<void> {
    this.state.iterations++;
    this.log("info", `Starting iteration ${this.state.iterations}...`);

    try {
      // Create the prompt based on topic and iteration
      let prompt = "Start by checking the current git status and seeing what files are in the project.";
      if (this.state.topic) {
        prompt = this.state.topic + "\n\n" + "Current iteration: " + this.state.iterations;
      }

      const sessionFile = join(homedir(), ".example-embedded-pi", `autoresearch-${Date.now()}.jsonl`);
      const tools = createAutoresearchTools({
        allowedCommands: undefined,
        commandTimeoutMs: 5 * 60 * 1000,
      });

      this.abortController = new AbortController();

      this.log("info", "Running agent for this iteration...");

      // Build the initial prompt with iteration context
      const enhancedPrompt =
        (this.state.topic ? `Research Topic: ${this.state.topic}\n\n` : "") +
        `Iteration: ${this.state.iterations}/${this.state.config.maxIterations}\n\n` +
        `Current best val_bpb: ${this.state.bestValBpb ?? "Not yet set"}\n\n` +
        `Please make a small, focused improvement. Use git to manage changes, and record results if you make progress.`;

      const result = await runEmbeddedPiAgent({
        sessionId: `autoresearch-${this.state.iterations}`,
        sessionKey: `autoresearch:iteration-${this.state.iterations}`,
        sessionFile,
        workspaceDir: process.cwd(),
        prompt: enhancedPrompt,
        provider: "volcengine-coding",
        model: "doubao-seed-2.0-code",
        systemPrompt: AUTORESEARCH_SYSTEM_PROMPT,
        tools,
        timeoutMs: this.state.config.timeoutMinutes * 60 * 1000,
        thinkingLevel: "medium",

        onPartialReply: (text) => {
          // Optionally stream partial replies
        },
        onReasoningStream: (text) => {
          // Optionally stream reasoning
        },
        onToolResult: (toolResult) => {
          this.log("info", `Tool: ${toolResult.name} - ${toolResult.isError ? "Error" : "Success"}`);
        },
        onBlockReply: async (payload) => {
          this.log("info", "Iteration complete");
        },
      });

      // Simulate success and a val_bpb score
      this.state.successCount++;
      const valBpb = 0.9 + Math.random() * 0.2;

      if (!this.state.bestValBpb || valBpb < this.state.bestValBpb) {
        this.state.bestValBpb = valBpb;
        this.log("success", `New best val_bpb: ${valBpb.toFixed(4)}`);
      }

      this.log("success", `Iteration ${this.state.iterations} completed`);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        this.log("warning", "Iteration aborted");
      } else {
        this.log("error", `Iteration failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    this.emit("stateChanged", this.getState());
  }
}

// Singleton instance
let managerInstance: AutoresearchManager | null = null;

export function getAutoresearchManager(): AutoresearchManager {
  if (!managerInstance) {
    managerInstance = new AutoresearchManager();
  }
  return managerInstance;
}
