/**
 * Autoresearch Tools - Tools for autonomous research and self-improvement
 *
 * These tools enable the AI to:
 * - Run commands and experiments
 * - Manage git (commit/reset)
 * - Record results
 * - Work autonomously without human intervention
 */

import { execSync } from "child_process";
import { writeFileSync, readFileSync, existsSync, appendFileSync } from "fs";
import { join } from "path";
import type { AnyAgentTool } from "./types.js";
import { createToolSchema } from "./tool-adapter.js";

// ============================================================================
// Git Tools
// ============================================================================

export function createGitTool(): AnyAgentTool {
  const base = createToolSchema({
    name: "git",
    description: "Run git commands. Use this to check status, commit, reset, etc.",
    properties: {
      command: {
        type: "string",
        description: "The git command to run (without 'git ' prefix), e.g. 'status', 'add .', 'commit -m \"msg\"', 'reset --hard HEAD'",
      },
    },
    required: ["command"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: (update: string) => void) => {
      const command = params.command as string;
      try {
        const output = execSync(`git ${command}`, {
          encoding: "utf-8",
          stdio: "pipe",
          timeout: 30000,
        });
        return {
          success: true,
          command: `git ${command}`,
          output: output.trim(),
        };
      } catch (error: any) {
        return {
          success: false,
          command: `git ${command}`,
          error: error.message || String(error),
          stderr: error.stderr?.toString?.() || "",
        };
      }
    },
  };
}

// ============================================================================
// Run Command Tool
// ============================================================================

export function createRunCommandTool(options?: {
  timeoutMs?: number;
  allowedCommands?: string[];
}): AnyAgentTool {
  const timeoutMs = options?.timeoutMs || 300000; // 5 minutes default
  const allowedCommands = options?.allowedCommands;

  const base = createToolSchema({
    name: "run_command",
    description:
      "Run a shell command and get the output. Use this to run tests, build, train, etc. " +
      "Note: Long-running commands will be killed after timeout.",
    properties: {
      command: {
        type: "string",
        description: "The shell command to run",
      },
      timeout: {
        type: "number",
        description: `Timeout in milliseconds (default: ${timeoutMs})`,
      },
      cwd: {
        type: "string",
        description: "Working directory (default: project root)",
      },
    },
    required: ["command"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: (update: string) => void) => {
      const command = params.command as string;
      const timeout = (params.timeout as number) || timeoutMs;
      const cwd = (params.cwd as string) || process.cwd();

      // Security check if allowedCommands is specified
      if (allowedCommands) {
        const isAllowed = allowedCommands.some((allowed) => command.startsWith(allowed));
        if (!isAllowed) {
          return {
            success: false,
            command,
            error: "Command not allowed",
            allowedCommands,
          };
        }
      }

      try {
        const output = execSync(command, {
          encoding: "utf-8",
          stdio: "pipe",
          timeout,
          cwd,
          maxBuffer: 10 * 1024 * 1024, // 10MB
        });
        return {
          success: true,
          command,
          output: output.trim(),
        };
      } catch (error: any) {
        return {
          success: false,
          command,
          error: error.message || String(error),
          stdout: error.stdout?.toString?.() || "",
          stderr: error.stderr?.toString?.() || "",
        };
      }
    },
  };
}

// ============================================================================
// Read/Write File Tools
// ============================================================================

export function createReadFileTool(): AnyAgentTool {
  const base = createToolSchema({
    name: "read_file",
    description: "Read the contents of a file",
    properties: {
      path: {
        type: "string",
        description: "Path to the file",
      },
    },
    required: ["path"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: (update: string) => void) => {
      const path = params.path as string;
      try {
        if (!existsSync(path)) {
          return { success: false, path, error: "File not found" };
        }
        const content = readFileSync(path, "utf-8");
        return {
          success: true,
          path,
          content,
        };
      } catch (error: any) {
        return {
          success: false,
          path,
          error: error.message || String(error),
        };
      }
    },
  };
}

export function createWriteFileTool(): AnyAgentTool {
  const base = createToolSchema({
    name: "write_file",
    description: "Write content to a file (overwrites existing file!)",
    properties: {
      path: {
        type: "string",
        description: "Path to the file",
      },
      content: {
        type: "string",
        description: "Content to write",
      },
    },
    required: ["path", "content"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: (update: string) => void) => {
      const path = params.path as string;
      const content = params.content as string;
      try {
        writeFileSync(path, content, "utf-8");
        return {
          success: true,
          path,
          message: "File written successfully",
        };
      } catch (error: any) {
        return {
          success: false,
          path,
          error: error.message || String(error),
        };
      }
    },
  };
}

// ============================================================================
// Results TSV Tool
// ============================================================================

export function createResultsTsvTool(options?: { path?: string }): AnyAgentTool {
  const tsvPath = options?.path || join(process.cwd(), "results.tsv");

  const base = createToolSchema({
    name: "record_result",
    description: "Record an experiment result to results.tsv",
    properties: {
      commit: {
        type: "string",
        description: "Git commit hash (short, 7 chars)",
      },
      val_bpb: {
        type: "number",
        description: "The val_bpb metric achieved (use 0.0 for crashes)",
      },
      memory_gb: {
        type: "number",
        description: "Peak memory usage in GB (use 0.0 for crashes)",
      },
      status: {
        type: "string",
        enum: ["keep", "discard", "crash"],
        description: "Status of the experiment",
      },
      description: {
        type: "string",
        description: "Short description of what this experiment tried",
      },
    },
    required: ["commit", "val_bpb", "memory_gb", "status", "description"],
  });

  return {
    ...base,
    execute: async (toolCallId: string, params: Record<string, unknown>, signal?: AbortSignal, onUpdate?: (update: string) => void) => {
      const { commit, val_bpb, memory_gb, status, description } = params as {
        commit: string;
        val_bpb: number;
        memory_gb: number;
        status: "keep" | "discard" | "crash";
        description: string;
      };

      try {
        // Create header if file doesn't exist
        if (!existsSync(tsvPath)) {
          writeFileSync(tsvPath, "commit\tval_bpb\tmemory_gb\tstatus\tdescription\n", "utf-8");
        }

        // Append the row (use tabs, NOT commas!)
        const row = `${commit}\t${val_bpb.toFixed(6)}\t${memory_gb.toFixed(1)}\t${status}\t${description}\n`;
        appendFileSync(tsvPath, row, "utf-8");

        return {
          success: true,
          path: tsvPath,
          message: "Result recorded",
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message || String(error),
        };
      }
    },
  };
}

// ============================================================================
// Bundle all autoresearch tools
// ============================================================================

export function createAutoresearchTools(options?: {
  commandTimeoutMs?: number;
  allowedCommands?: string[];
  resultsTsvPath?: string;
}): AnyAgentTool[] {
  return [
    createGitTool(),
    createRunCommandTool({
      timeoutMs: options?.commandTimeoutMs,
      allowedCommands: options?.allowedCommands,
    }),
    createReadFileTool(),
    createWriteFileTool(),
    createResultsTsvTool({ path: options?.resultsTsvPath }),
  ];
}

// ============================================================================
// Autoresearch System Prompt
// ============================================================================

export const AUTORESEARCH_SYSTEM_PROMPT = `You are an Autonomous Researcher running in a continuous, unattended loop.
Your goal: Optimize the codebase to maximize the metric defined in \`eval.py\` (or minimize loss).

## 🛡️ CRITICAL SAFETY PROTOCOLS (NON-NEGOTIABLE)
1. **GIT AS TIME MACHINE**:
   - \`HEAD\` is the ONLY "Safe State".
   - BEFORE making any file change: Run \`git add -A\` then \`git stash\` (OR create a temp branch). This ensures you can ALWAYS return to a clean state even if your new code breaks syntax.
   - DECISION LOGIC (Strictly Numeric):
     - Run baseline test -> Get Score_Baseline.
     - Apply Change -> Run test -> Get Score_New.
     - IF \`Score_New\` > \`Score_Baseline\` (or Loss < Baseline): \`git stash pop\` (or merge), then \`git add . && git commit -m "feat: description (Score: X)"\`. Update Best Score.
     - IF \`Score_New\` <= \`Score_Baseline\` OR Crash: \`git reset --hard HEAD\` (or \`git stash drop\`). Discard changes completely.
   - NEVER rely on your "feeling" of improvement. Only trust the numeric output of the test command.

2. **ATOMIC CHANGES**:
   - Modify only ONE file or ONE logical concept per cycle.
   - If a file edit results in a Syntax Error that prevents the test command from running, IMMEDIATELY \`git reset --hard HEAD\`. Do not try to "fix the syntax" in the same cycle; treat it as a failed experiment and revert.

3. **CIRCUIT BREAKER (STOP CONDITIONS)**:
   - Stop the loop IF:
     - 5 consecutive experiments result in crashes or syntax errors.
     - 10 consecutive experiments show NO improvement over the current Best Score.
     - The test command hangs for > 60 seconds.
   - When stopping, write a summary to \`final_report.md\` and exit gracefully. DO NOT keep trying forever.

4. **NO HUMAN INTERACTION**:
   - Do not ask for help. If stuck, try a radically different approach once. If that fails, Revert and try a different parameter.
   - Assume the user is asleep. Your job is to return a list of successful commits by morning.

## 🔄 EXECUTION LOOP
Repeat until a STOP CONDITION is met:

1. **CHECKPOINT**:
   - Run \`git status\`. Ensure working tree is clean. If not, \`git reset --hard HEAD\`.
   - Read \`best_score.txt\` (or recall from context) to know the target to beat.

2. **HYPOTHESIZE**:
   - Propose a small, specific change (e.g., "Change learning rate from 0.01 to 0.005", "Replace ReLU with GELU").

3. **EXECUTE**:
   - Make the change using \`write_file\` (overwrite) or shell commands.
   - **Safety Net**: Immediately run a syntax check (e.g., \`python -m py_compile file.py\`) if applicable.

4. **VERIFY**:
   - Run the specific evaluation command: \`python eval.py\` (Replace with your actual command).
   - Parse the output for the metric (e.g., "Accuracy: 0.85").
   - Handle Crashes: If the command fails, log "CRASH", trigger \`git reset --hard HEAD\`, and go to step 1.

5. **DECIDE & COMMIT**:
   - Compare New Metric vs. Best Metric.
   - Better? -> \`git add .\`, \`git commit -m "Improved metric to X"\`, update \`best_score.txt\`.
   - Worse/Same? -> \`git reset --hard HEAD\`.

6. **LOG**:
   - Append a line to \`experiment_log.tsv\`: \`[Timestamp] | [Hypothesis] | [Result: Success/Fail/Crash] | [Metric Value]\`.

## 🚀 START NOW
1. Check \`git log -1\` and run \`python eval.py\` to establish the current baseline.
2. Save the baseline score to \`best_score.txt\`.
3. Begin the loop.`;
