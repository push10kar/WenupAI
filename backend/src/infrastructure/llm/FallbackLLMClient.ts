import { LLMClient } from "./LLMClient";
import {
  LLMExtractionInput,
  LLMExtractionResult,
  ResponseGenerationInput,
} from "./types";
import { LLMClientError } from "./errors";

export interface FallbackLLMClientConfig {
  readonly primary: LLMClient;
  readonly fallback: LLMClient;
  readonly onFallback?: (
    error: Error,
    operation: "extractUpdates" | "generateResponse",
  ) => void;
}

/**
 * FallbackLLMClient implements the Fallback Decorator pattern for LLM providers.
 *
 * It delegates operations to a primary provider (e.g. Gemini), and if that provider
 * fails due to quota exhaustion, rate limits (HTTP 429), or temporary unavailability,
 * it seamlessly and automatically shifts to a fallback provider (e.g. MockLLMClient).
 *
 * Invariants:
 * - Configuration errors (like missing API keys) fail fast and are NOT suppressed.
 * - The rest of the application remains completely provider-agnostic.
 * - Does not alter state machine or validation pipelines.
 */
export class FallbackLLMClient implements LLMClient {
  readonly primary: LLMClient;
  readonly fallback: LLMClient;
  private readonly onFallback?: (
    error: Error,
    operation: "extractUpdates" | "generateResponse",
  ) => void;

  constructor(config: FallbackLLMClientConfig) {
    this.primary = config.primary;
    this.fallback = config.fallback;
    this.onFallback = config.onFallback;
  }

  async extractUpdates(
    input: LLMExtractionInput,
  ): Promise<LLMExtractionResult> {
    try {
      const result = await this.primary.extractUpdates(input);
      console.log("[LLM] Candidate updates extracted using Gemini.");
      return result;
    } catch (err: unknown) {
      if (this.shouldFallback(err)) {
        this.notifyFallback(err, "extractUpdates");
        return await this.fallback.extractUpdates(input);
      }
      throw err;
    }
  }

  async generateResponse(input: ResponseGenerationInput): Promise<string> {
    try {
      const response = await this.primary.generateResponse(input);
      console.log("[LLM] Assistant response generated using Gemini.");
      return response;
    } catch (err: unknown) {
      if (this.shouldFallback(err)) {
        this.notifyFallback(err, "generateResponse");
        return await this.fallback.generateResponse(input);
      }
      throw err;
    }
  }

  private shouldFallback(err: unknown): boolean {
    if (err instanceof LLMClientError) {
      // Do NOT fallback on configuration errors or bad schemas
      if (err.code === "CONFIGURATION_ERROR") {
        return false;
      }

      return (
        err.code === "PROVIDER_RATE_LIMIT" ||
        err.code === "PROVIDER_UNAVAILABLE" ||
        err.code === "PROVIDER_TIMEOUT" ||
        err.status === 429 ||
        err.status === 503 ||
        /quota|exhausted|rate limit|too many requests/i.test(err.message)
      );
    }

    if (err instanceof Error) {
      return /quota|exhausted|rate limit|429|too many requests/i.test(
        err.message,
      );
    }

    return false;
  }

  private notifyFallback(
    err: unknown,
    operation: "extractUpdates" | "generateResponse",
  ): void {
    const errorObj = err instanceof Error ? err : new Error(String(err));
    if (this.onFallback) {
      this.onFallback(errorObj, operation);
    } else {
      console.warn(
        `[LLM Fallback] Primary provider failed on ${operation} (${errorObj.message}). Automatically switching to MockLLM.`,
      );
    }
  }
}
