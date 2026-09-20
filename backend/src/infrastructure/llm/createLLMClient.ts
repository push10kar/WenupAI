import { AppConfig } from "../../config";
import { LLMClient } from "./LLMClient";
import { MockLLMClient } from "./MockLLMClient";
import { GeminiLLMClient } from "./gemini/GeminiLLMClient";
import { LLMClientError } from "./errors";

export interface CreateLLMClientOverrides {
  readonly fetch?: typeof fetch;
}

/**
 * Single composition boundary responsible for instantiating the configured LLMClient.
 *
 * Supports:
 * - mock -> MockLLMClient
 * - gemini -> GeminiLLMClient
 *
 * Invariants:
 * - No automatic fallback between providers.
 * - Fails clearly when a selected provider lacks its required API key.
 * - The rest of the application remains provider-agnostic.
 */
export function createLLMClient(
  cfg: AppConfig,
  overrides?: CreateLLMClientOverrides,
): LLMClient {
  switch (cfg.llmProvider) {
    case "mock":
      return new MockLLMClient();

    case "gemini": {
      if (!cfg.geminiApiKey || cfg.geminiApiKey.trim().length === 0) {
        throw new LLMClientError(
          "Missing required environment variable GEMINI_API_KEY for LLM_PROVIDER 'gemini'",
          "CONFIGURATION_ERROR",
        );
      }
      return new GeminiLLMClient({
        apiKey: cfg.geminiApiKey,
        model: cfg.geminiModel,
        timeoutMs: cfg.llmTimeoutMs,
        fetch: overrides?.fetch,
      });
    }

    default:
      throw new LLMClientError(
        `Unsupported LLM provider: '${(cfg as { llmProvider: string }).llmProvider}'. Supported: mock, gemini`,
        "CONFIGURATION_ERROR",
      );
  }
}
