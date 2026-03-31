/**
 * Settings manager for storing and retrieving application settings
 */
import path from "path";
import { homedir } from "os";
import fs from "fs";

// 优先使用环境变量，否则使用用户主目录
const baseDir = process.env.SETTINGS_DIR || path.join(homedir(), ".example-embedded-pi");
const SETTINGS_DIR = path.isAbsolute(baseDir) ? baseDir : path.join(process.cwd(), baseDir);
const SETTINGS_FILE = path.join(SETTINGS_DIR, "settings.json");

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export interface AppSettings {
  apiKeys?: {
    anthropic?: string;
    openai?: string;
    groq?: string;
    volcengine?: string;
  };
  baseUrls?: {
    anthropic?: string;
    openai?: string;
    groq?: string;
    volcengine?: string;
  };
  models?: {
    anthropic?: string;
    openai?: string;
    groq?: string;
    volcengine?: string;
  };
  defaultProvider?: string;
  defaultModel?: string;
  workspaceDir?: string;
}

export interface AppSettingsForClient {
  apiKeys?: {
    anthropic?: boolean;
    openai?: boolean;
    groq?: boolean;
    volcengine?: boolean;
  };
  baseUrls?: {
    anthropic?: string;
    openai?: string;
    groq?: string;
    volcengine?: string;
  };
  models?: {
    anthropic?: string;
    openai?: string;
    groq?: string;
    volcengine?: string;
  };
  defaultProvider?: string;
  defaultModel?: string;
  workspaceDir?: string;
}

let cachedSettings: AppSettings | null = null;

function ensureSettingsDir(): void {
  if (!fs.existsSync(SETTINGS_DIR)) {
    fs.mkdirSync(SETTINGS_DIR, { recursive: true });
  }
}

export function loadSettings(): AppSettings {
  if (cachedSettings) {
    return cachedSettings;
  }

  ensureSettingsDir();

  if (!fs.existsSync(SETTINGS_FILE)) {
    cachedSettings = {};
    return cachedSettings;
  }

  try {
    const content = fs.readFileSync(SETTINGS_FILE, "utf-8");
    const parsed = JSON.parse(content);
    cachedSettings = (parsed || {}) as AppSettings;
    return cachedSettings;
  } catch (error) {
    console.error("Failed to load settings:", error);
    cachedSettings = {};
    return cachedSettings;
  }
}

export function saveSettings(settings: AppSettings): void {
  ensureSettingsDir();

  // Merge with existing settings
  const existing = loadSettings();
  cachedSettings = { ...existing, ...settings };

  // Don't save empty API keys to avoid overwriting
  if (settings.apiKeys) {
    cachedSettings.apiKeys = { ...existing.apiKeys };
    for (const [key, value] of Object.entries(settings.apiKeys)) {
      if (value !== undefined) {
        if (value) {
          (cachedSettings.apiKeys as any)[key] = value;
        } else {
          // 如果传空字符串，删除该 key
          delete (cachedSettings.apiKeys as any)[key];
        }
      }
    }
  }

  // Merge baseUrls
  if (settings.baseUrls) {
    cachedSettings.baseUrls = { ...existing.baseUrls, ...settings.baseUrls };
    // 清理空值
    if (cachedSettings.baseUrls) {
      for (const [key, value] of Object.entries(cachedSettings.baseUrls)) {
        if (!value) {
          delete (cachedSettings.baseUrls as any)[key];
        }
      }
    }
  }

  // Merge models
  if (settings.models) {
    cachedSettings.models = { ...existing.models, ...settings.models };
    // 清理空值
    if (cachedSettings.models) {
      for (const [key, value] of Object.entries(cachedSettings.models)) {
        if (!value) {
          delete (cachedSettings.models as any)[key];
        }
      }
    }
  }

  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(cachedSettings, null, 2));
  } catch (error) {
    console.error("Failed to save settings:", error);
    throw error;
  }
}

export function getSettingsForClient(): AppSettingsForClient {
  const settings = loadSettings();
  return {
    ...settings,
    apiKeys: settings.apiKeys
      ? {
          anthropic: !!settings.apiKeys.anthropic,
          openai: !!settings.apiKeys.openai,
          groq: !!settings.apiKeys.groq,
          volcengine: !!settings.apiKeys.volcengine,
        }
      : undefined,
    // Base URLs are safe to send to client (not secrets)
    baseUrls: settings.baseUrls,
    // Models are safe to send to client
    models: settings.models,
  };
}

export function applySettingsToEnvironment(): void {
  const settings = loadSettings();
  if (settings.apiKeys) {
    if (settings.apiKeys.anthropic) {
      process.env.ANTHROPIC_API_KEY = settings.apiKeys.anthropic;
    }
    if (settings.apiKeys.openai) {
      process.env.OPENAI_API_KEY = settings.apiKeys.openai;
    }
    if (settings.apiKeys.groq) {
      process.env.GROQ_API_KEY = settings.apiKeys.groq;
    }
    if (settings.apiKeys.volcengine) {
      process.env.VOLCENGINE_API_KEY = settings.apiKeys.volcengine;
    }
  }
}
