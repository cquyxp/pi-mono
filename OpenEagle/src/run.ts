import {
  createAgentSession,
  SettingsManager,
  AuthStorage,
  ModelRegistry,
  discoverContextFiles,
  buildSystemPrompt,
  codingTools,
} from "@mariozechner/pi-coding-agent";
import { getAgentDir } from "@mariozechner/pi-coding-agent";
import { getModel } from "@mariozechner/pi-ai";
import type { Model, Api } from "@mariozechner/pi-ai";
import { subscribeEmbeddedPiSession } from "./subscribe.js";
import { splitTools, toToolDefinitions } from "./tool-adapter.js";
import {
  getCachedSessionManager,
  prewarmSessionFile,
  trackSessionManagerAccess,
} from "./session-manager.js";
import { WORKSPACE_DIR, AGENTS_DIR } from "./workspace-config.js";
import type {
  EmbeddedPiAgentParams,
  EmbeddedPiRunResult,
  EmbeddedPiEventHandlers,
  AnyAgentTool,
  ErrorType,
} from "./types.js";
import { homedir } from "os";
import { join } from "path";

// 火山引擎配置 - 直接创建 Model 对象
function createVolcengineModel(): Model<"openai-completions"> {
  return {
    id: "doubao-seed-2.0-code",
    name: "Doubao Seed 2.0 Code",
    api: "openai-completions",
    provider: "volcengine-coding",
    baseUrl: "https://ark.cn-beijing.volces.com/api/coding/v3",
    reasoning: true,
    input: ["text"],
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
    contextWindow: 128000,
    maxTokens: 16384,
    compat: {
      supportsStore: false,
      supportsDeveloperRole: false,
      supportsReasoningEffort: true,
      supportsUsageInStreaming: true,
      maxTokensField: "max_completion_tokens",
      requiresToolResultName: false,
      requiresAssistantAfterToolResult: false,
      requiresThinkingAsText: false,
      requiresMistralToolIds: false,
      thinkingFormat: "openai",
    },
  };
}

// ============================================================================
// Main Entry Point
// ============================================================================

export interface RunEmbeddedPiAgentParams extends EmbeddedPiAgentParams, EmbeddedPiEventHandlers {}

/**
 * Main entry point for running an embedded pi agent.
 * Similar to OpenClaw's runEmbeddedPiAgent().
 */
export async function runEmbeddedPiAgent(params: RunEmbeddedPiAgentParams): Promise<EmbeddedPiRunResult> {
  const {
    sessionId,
    sessionKey,
    sessionFile,
    workspaceDir,
    agentDir,
    prompt,
    provider,
    model,
    timeoutMs = 120000,
    runId,
    thinkingLevel = "medium",
    images,
    tools = [],
    systemPrompt,
    appendSystemPrompt,
    ...eventHandlers
  } = params;

  const startTime = Date.now();
  let subscription: { unsubscribe: () => void } | null = null;
  let capturedText = "";

  try {
    // 1. Initialize session file
    prewarmSessionFile(sessionFile);

    // 2. Resolve directories
    const resolvedAgentDir = agentDir ?? AGENTS_DIR;
    const resolvedWorkspace = workspaceDir ?? WORKSPACE_DIR;

    // 3. Create core components
    const settingsManager = SettingsManager.create(resolvedWorkspace, resolvedAgentDir);
    const authStorage = new AuthStorage(join(resolvedAgentDir, "auth.json"));
    const modelRegistry = new ModelRegistry(authStorage, join(resolvedAgentDir, "models.json"));

    // 4. Get model instance - use direct creation for volcengine
    let modelInstance: Model<any>;
    if (provider === "volcengine-coding") {
      modelInstance = createVolcengineModel();
      // Set API key via runtime override if available
      const apiKey = process.env.VOLCENGINE_API_KEY;
      if (apiKey) {
        authStorage.setRuntimeApiKey(provider, apiKey);
      }
    } else {
      modelInstance = await resolveModel(provider, model, modelRegistry, authStorage);
    }

    // 5. Get session manager (cached)
    const sessionManager = getCachedSessionManager(sessionFile);
    trackSessionManagerAccess(sessionFile);

    // 6. Split tools
    const { builtInTools, customTools } = splitTools({ tools });

    // 7. 发现所有 context files 并构建完整的 system prompt
    const contextFiles = discoverContextFiles(resolvedWorkspace, resolvedAgentDir);

    // 8. 构建最终的 system prompt
    let finalSystemPrompt: string | ((defaultPrompt: string) => string);
    if (systemPrompt) {
      finalSystemPrompt = systemPrompt;
    } else if (appendSystemPrompt) {
      finalSystemPrompt = (defaultPrompt: string) => defaultPrompt + "\n\n" + appendSystemPrompt;
    } else {
      // 使用 buildSystemPrompt 构建包含所有 context files 的完整 system prompt
      finalSystemPrompt = buildSystemPrompt({
        contextFiles,
        tools: codingTools,
        cwd: resolvedWorkspace,
      });
    }

    // 9. Create agent session
    const { session } = await createAgentSession({
      cwd: resolvedWorkspace,
      agentDir: resolvedAgentDir,
      authStorage,
      modelRegistry,
      model: modelInstance,
      thinkingLevel,
      tools: builtInTools as any[],
      customTools,
      sessionManager,
      settingsManager,
      systemPrompt: finalSystemPrompt,
      contextFiles,
    });

    // 10. Subscribe to events - wrap to capture text
    const wrappedHandlers = {
      ...eventHandlers,
      onBlockReply: (payload: any) => {
        capturedText = payload.text || "";
        if (eventHandlers.onBlockReply) {
          eventHandlers.onBlockReply(payload);
        }
      },
      onPartialReply: (text: string) => {
        capturedText = text;
        if (eventHandlers.onPartialReply) {
          eventHandlers.onPartialReply(text);
        }
      },
    };

    subscription = subscribeEmbeddedPiSession({
      session,
      runId,
      ...wrappedHandlers,
    });

    // 11. Run the prompt with timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Timeout")), timeoutMs);
    });

    const promptPromise = session.prompt(prompt, {
      images: images as any[],
    });

    await Promise.race([promptPromise, timeoutPromise]);

    // 12. Build result
    const text = capturedText || "";

    return {
      success: true,
      text,
      mediaUrls: [],
      sessionId,
      runId,
    };
  } catch (error) {
    const errorInfo = classifyError(error);

    return {
      success: false,
      error: errorInfo.message,
      errorType: errorInfo.type,
      sessionId,
      runId,
    };
  } finally {
    if (subscription) {
      subscription.unsubscribe();
    }
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

async function resolveModel(
  provider: string,
  modelId: string,
  modelRegistry: ModelRegistry,
  authStorage: AuthStorage
): Promise<Model<any>> {
  // First try to find in registry
  let model = modelRegistry.find(provider, modelId);

  if (!model) {
    // Fall back to direct getModel
    model = getModel(provider as any, modelId);
  }

  // Check if we have an API key
  const apiKey = await modelRegistry.getApiKey(model);
  if (!apiKey) {
    throw new Error(`No API key found for ${provider}/${modelId}`);
  }

  return model;
}

function applySystemPromptOverride(
  session: any,
  systemPrompt?: string,
  appendSystemPrompt?: string
): void {
  if (systemPrompt) {
    session.agent.state.systemPrompt = systemPrompt;
  }
  if (appendSystemPrompt) {
    const current = session.agent.state.systemPrompt || "";
    session.agent.state.systemPrompt = current + "\n\n" + appendSystemPrompt;
  }
}

function classifyError(error: unknown): { message: string; type: ErrorType } {
  const message = error instanceof Error ? error.message : String(error);
  let type: ErrorType = "unknown";

  if (/api key|auth|authentication|401|403/i.test(message)) {
    type = "auth";
  } else if (/rate limit|429|too many requests/i.test(message)) {
    type = "rate_limit";
  } else if (/quota|exceeded|billing/i.test(message)) {
    type = "quota";
  } else if (/timeout|timed out/i.test(message)) {
    type = "timeout";
  } else if (/context|token limit|too long/i.test(message)) {
    type = "context_overflow";
  } else if (/compact|compaction/i.test(message)) {
    type = "compaction_failure";
  }

  return { message, type };
}
