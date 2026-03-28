/**
 * Discovery Agent - TypeScript Tools Adapter
 * 发现式智能 - TypeScript 工具适配器
 */
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

export interface ToolResult {
  success: boolean;
  output: string;
  error: string;
}

export abstract class BaseToolExecutor {
  abstract execute(tool: string, params: Record<string, any>): Promise<ToolResult>;
}

export class RealToolExecutor extends BaseToolExecutor {
  private timeout: number;

  constructor(timeout: number = 30) {
    super();
    this.timeout = timeout;
  }

  async execute(tool: string, params: Record<string, any>): Promise<ToolResult> {
    try {
      switch (tool) {
        case "shell": {
          const command = params.command || "";
          try {
            const { stdout, stderr } = await execAsync(command, {
              timeout: this.timeout * 1000,
            });
            return {
              success: true,
              output: stdout,
              error: stderr,
            };
          } catch (execError: any) {
            return {
              success: false,
              output: execError.stdout || "",
              error: execError.stderr || execError.message || String(execError),
            };
          }
        }

        case "file_read": {
          const filePath = params.path || "";
          if (!fs.existsSync(filePath)) {
            return {
              success: false,
              output: "",
              error: `File not found: ${filePath}`,
            };
          }
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            return {
              success: true,
              output: content,
              error: "",
            };
          } catch (readError: any) {
            return {
              success: false,
              output: "",
              error: readError.message || String(readError),
            };
          }
        }

        case "search": {
          return {
            success: false,
            output: "",
            error: "Real web search requires API integration (e.g., SerpAPI)",
          };
        }

        case "code_exec": {
          return {
            success: false,
            output: "",
            error: "Real code execution is disabled for safety",
          };
        }

        default: {
          return {
            success: false,
            output: "",
            error: `Unknown tool: ${tool}`,
          };
        }
      }
    } catch (error: any) {
      return {
        success: false,
        output: "",
        error: error.message || String(error),
      };
    }
  }
}

export class SimulatedToolExecutor extends BaseToolExecutor {
  async execute(tool: string, params: Record<string, any>): Promise<ToolResult> {
    console.log(`[Simulated Tool] ${tool} with params:`, params);

    switch (tool) {
      case "shell":
        return {
          success: true,
          output: `Simulated shell output for: ${params.command || ""}`,
          error: "",
        };

      case "file_read": {
        const filePath = params.path || "";
        if (fs.existsSync(filePath)) {
          try {
            const content = fs.readFileSync(filePath, "utf-8");
            return {
              success: true,
              output: content,
              error: "",
            };
          } catch {
            // fall through
          }
        }
        return {
          success: false,
          output: "",
          error: `File not found: ${filePath}`,
        };
      }

      case "search":
        return {
          success: true,
          output: `Simulated search results for: ${params.query || ""}`,
          error: "",
        };

      case "code_exec":
        return {
          success: true,
          output: "Simulated code execution output",
          error: "",
        };

      default:
        return {
          success: false,
          output: "",
          error: `Unknown tool: ${tool}`,
        };
    }
  }
}
