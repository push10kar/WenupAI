import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env if present (looking at project root and backend)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  llmProvider: "mock" | "gemini" | "openrouter";
  geminiApiKey?: string;
  geminiModel: string;
  openRouterApiKey?: string;
  openRouterModel?: string;
  openRouterBaseUrl?: string;
  llmTimeoutMs: number;
  enableFallback?: boolean;
}

export function validateConfig(cfg: AppConfig): void {
  if (cfg.llmProvider === "gemini" && !cfg.geminiApiKey) {
    throw new Error(
      "Missing required environment variable GEMINI_API_KEY for LLM_PROVIDER 'gemini'",
    );
  }
  if (cfg.llmProvider === "openrouter" && !cfg.openRouterApiKey) {
    throw new Error(
      "Missing required environment variable OPENROUTER_API_KEY for LLM_PROVIDER 'openrouter'",
    );
  }
  const supported = ["mock", "gemini", "openrouter"];
  if (!supported.includes(cfg.llmProvider)) {
    throw new Error(
      `Unsupported LLM provider: '${cfg.llmProvider}'. Supported options: mock, gemini, openrouter`,
    );
  }
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development",
  llmProvider: (process.env.LLM_PROVIDER as AppConfig["llmProvider"]) || "mock",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  openRouterApiKey: process.env.OPENROUTER_API_KEY,
  openRouterModel: process.env.OPENROUTER_MODEL || "openrouter/free",
  openRouterBaseUrl:
    process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || "60000", 10),
  enableFallback:
    process.env.ENABLE_LLM_FALLBACK !== undefined
      ? process.env.ENABLE_LLM_FALLBACK === "true"
      : process.env.NODE_ENV !== "test",
};
