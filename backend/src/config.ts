import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env if present (looking at project root and backend)
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

export interface AppConfig {
  port: number;
  nodeEnv: "development" | "production" | "test";
  llmProvider: "mock" | "gemini" | "groq";
  geminiApiKey?: string;
  groqApiKey?: string;
}

export const config: AppConfig = {
  port: parseInt(process.env.PORT || "3000", 10),
  nodeEnv: (process.env.NODE_ENV as AppConfig["nodeEnv"]) || "development",
  llmProvider: (process.env.LLM_PROVIDER as AppConfig["llmProvider"]) || "mock",
  geminiApiKey: process.env.GEMINI_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY,
};
