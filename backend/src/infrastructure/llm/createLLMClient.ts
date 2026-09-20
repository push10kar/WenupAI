import { AppConfig } from "../../config";
import { LLMClient } from "./LLMClient";
import { MockLLMClient } from "./MockLLMClient";
import { GeminiLLMClient } from "./gemini/GeminiLLMClient";
import { FallbackLLMClient } from "./FallbackLLMClient";
import { LLMClientError } from "./errors";

export interface CreateLLMClientOverrides {
  readonly fetch?: typeof fetch;
  readonly enableFallback?: boolean;
  readonly fallbackClient?: LLMClient;
}

/**
 * Single composition boundary responsible for instantiating the configured LLMClient.
 *
 * Supports:
 * - mock -> MockLLMClient
 * - gemini -> GeminiLLMClient (with optional resilient FallbackLLMClient to MockLLMClient on rate-limits/quotas)
 *
 * Invariants:
 * - Fails clearly and immediately when a selected provider lacks its required API key.
 * - Automatic fallback is isolated to runtime transient errors (e.g. HTTP 429 quota exhaustion).
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
      const geminiClient = new GeminiLLMClient({
        apiKey: cfg.geminiApiKey,
        model: cfg.geminiModel,
        timeoutMs: cfg.llmTimeoutMs,
        fetch: overrides?.fetch,
      });

      const shouldFallback =
        overrides?.enableFallback ?? cfg.enableFallback ?? false;

      if (shouldFallback) {
        return new FallbackLLMClient({
          primary: geminiClient,
          fallback: overrides?.fallbackClient ?? new MockLLMClient(),
        });
      }

      return geminiClient;
    }

    default:
      throw new LLMClientError(
        `Unsupported LLM provider: '${(cfg as { llmProvider: string }).llmProvider}'. Supported: mock, gemini`,
        "CONFIGURATION_ERROR",
      );
  }
}
