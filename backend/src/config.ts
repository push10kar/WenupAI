import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env if present (looking at project root and backend)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  llmProvider: "mock" | "gemini";
  geminiApiKey?: string;
  geminiModel: string;
  llmTimeoutMs: number;
}

export function validateConfig(cfg: AppConfig): void {
  if (cfg.llmProvider === "gemini" && !cfg.geminiApiKey) {
    throw new Error(
      "Missing required environment variable GEMINI_API_KEY for LLM_PROVIDER 'gemini'",
    );
  }
  if (cfg.llmProvider !== "mock" && cfg.llmProvider !== "gemini") {
    throw new Error(
      `Unsupported LLM provider: '${cfg.llmProvider}'. Supported options: mock, gemini`,
    );
  }
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development",
  llmProvider: (process.env.LLM_PROVIDER as AppConfig["llmProvider"]) || "mock",
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || "gemini-1.5-flash",
  llmTimeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || "15000", 10),
};
