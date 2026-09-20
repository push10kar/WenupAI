import { config } from "../../config";

/**
 * Identifiers of the LLM providers the application can serve with. Mirrors the
 * `llmProvider` union in AppConfig so the config endpoint and the badge can rely
 * on a single canonical shape.
 */
export type ActiveProviderId = "mock" | "gemini" | "openrouter";

let activeProvider: ActiveProviderId | null = null;

/**
 * Records which provider actually served a request. Normally this only changes
 * at runtime when the resilient FallbackLLMClient shifts traffic to the fallback
 * provider (or recovers back to the primary).
 */
export function recordActiveProvider(provider: ActiveProviderId): void {
  activeProvider = provider;
}

/**
 * Returns the provider currently serving requests, defaulting to the configured
 * provider until real traffic has been observed.
 */
export function getActiveProvider(): ActiveProviderId {
  return activeProvider ?? config.llmProvider;
}