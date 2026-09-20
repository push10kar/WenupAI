import { AppConfig } from "../../config";
import { LLMClient } from "./LLMClient";
import { MockLLMClient } from "./MockLLMClient";
import { GeminiLLMClient } from "./gemini/GeminiLLMClient";
import { OpenRouterLLMClient } from "./openrouter/OpenRouterLLMClient";
import { FallbackLLMClient } from "./FallbackLLMClient";
import { LLMClientError } from "./errors";
import {
  ActiveProviderId,
  recordActiveProvider,
} from "./providerTelemetry";

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
 * - openrouter -> OpenRouterLLMClient (OpenAI-compatible chat completions; defaults to OpenRouter, overridable base URL e.g. local gateway)
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

      return wrapWithFallback(geminiClient, cfg, overrides, "gemini", "mock");
    }

    case "openrouter": {
      if (!cfg.openRouterApiKey || cfg.openRouterApiKey.trim().length === 0) {
        throw new LLMClientError(
          "Missing required environment variable OPENROUTER_API_KEY for LLM_PROVIDER 'openrouter'",
          "CONFIGURATION_ERROR",
        );
      }
      const openRouterClient = new OpenRouterLLMClient({
        apiKey: cfg.openRouterApiKey,
        model: cfg.openRouterModel,
        baseUrl: cfg.openRouterBaseUrl,
        timeoutMs: cfg.llmTimeoutMs,
        fetch: overrides?.fetch,
      });

      return wrapWithFallback(openRouterClient, cfg, overrides, "openrouter", "mock");
    }

    default:
      throw new LLMClientError(
        `Unsupported LLM provider: '${(cfg as { llmProvider: string }).llmProvider}'. Supported: mock, gemini, openrouter`,
        "CONFIGURATION_ERROR",
      );
  }
}

function wrapWithFallback(
  primary: LLMClient,
  cfg: AppConfig,
  overrides: CreateLLMClientOverrides | undefined,
  primaryProvider: ActiveProviderId,
  fallbackProvider: ActiveProviderId,
): LLMClient {
  const shouldFallback =
    overrides?.enableFallback ?? cfg.enableFallback ?? false;

  if (shouldFallback) {
    return new FallbackLLMClient({
      primary,
      fallback: overrides?.fallbackClient ?? new MockLLMClient(),
      onFallback: () => recordActiveProvider(fallbackProvider),
      onPrimarySuccess: () => recordActiveProvider(primaryProvider),
    });
  }

  return primary;
}
