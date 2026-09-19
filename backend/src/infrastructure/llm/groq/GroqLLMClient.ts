import { LLMClient } from "../LLMClient";
import { LLMClientError } from "../errors";
import {
  EXTRACTION_SYSTEM_PROMPT,
  RESPONSE_GENERATION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  buildResponsePrompt,
} from "../prompts";
import {
  LLMExtractionInput,
  LLMExtractionResult,
  ResponseGenerationInput,
} from "../types";

export interface GroqClientConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

/**
 * GroqLLMClient: Provider adapter implementing LLMClient for Groq (REST API).
 *
 * Invariants:
 * - Completely isolated from domain and application layers.
 * - Normalized error handling (no provider SDK classes or raw secrets leaked).
 * - Untrusted output: returns candidate updates for domain validation pipeline.
 * - Supports dependency injection of `fetch` for zero-credential testing.
 */
export class GroqLLMClient implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GroqClientConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LLMClientError(
        "Groq API key is required",
        "CONFIGURATION_ERROR",
      );
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || "llama-3.3-70b-versatile";
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async extractUpdates(
    input: LLMExtractionInput,
  ): Promise<LLMExtractionResult> {
    const prompt = buildExtractionPrompt(input);

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.0,
      response_format: { type: "json_object" },
    };

    const rawText = await this.executeChatCompletion(body);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new LLMClientError(
        "Failed to parse Groq response as JSON",
        "MALFORMED_OUTPUT",
      );
    }

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !("updates" in parsed) ||
      !Array.isArray((parsed as Record<string, unknown>).updates)
    ) {
      throw new LLMClientError(
        "Groq output missing expected 'updates' array",
        "MALFORMED_OUTPUT",
      );
    }

    const typedResult = parsed as { updates: unknown[] };

    return {
      updates: typedResult.updates as LLMExtractionResult["updates"],
    };
  }

  async generateResponse(input: ResponseGenerationInput): Promise<string> {
    const prompt = buildResponsePrompt(input);

    const body = {
      model: this.model,
      messages: [
        { role: "system", content: RESPONSE_GENERATION_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    };

    const rawText = await this.executeChatCompletion(body);
    const cleaned = rawText.trim();
    if (cleaned.length === 0 && input.nextQuestionPrompt) {
      return input.nextQuestionPrompt;
    }
    return cleaned;
  }

  private async executeChatCompletion(body: unknown): Promise<string> {
    const url = "https://api.groq.com/openai/v1/chat/completions";

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (err: unknown) {
      this.handleNetworkError(err);
    }

    if (!response.ok) {
      await this.handleHttpStatusError(response);
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new LLMClientError(
        "Invalid JSON received from Groq API endpoint",
        "MALFORMED_OUTPUT",
      );
    }

    const content = this.extractContentFromGroqResponse(json);
    return content;
  }

  private extractContentFromGroqResponse(responseJson: unknown): string {
    if (
      typeof responseJson !== "object" ||
      responseJson === null ||
      !("choices" in responseJson)
    ) {
      throw new LLMClientError(
        "Groq response has no choices",
        "MALFORMED_OUTPUT",
      );
    }

    const choices = (responseJson as { choices?: unknown[] }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new LLMClientError(
        "Groq returned an empty choices list",
        "MALFORMED_OUTPUT",
      );
    }

    const firstChoice = choices[0] as {
      message?: { content?: string };
    };
    const content = firstChoice.message?.content;
    if (typeof content !== "string") {
      throw new LLMClientError(
        "Groq message has no content",
        "MALFORMED_OUTPUT",
      );
    }

    return content;
  }

  private handleNetworkError(err: unknown): never {
    if (err instanceof Error) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new LLMClientError(
          `Groq request timed out after ${this.timeoutMs}ms`,
          "PROVIDER_TIMEOUT",
          { cause: err },
        );
      }
      throw new LLMClientError(
        `Groq network communication error: ${err.message}`,
        "PROVIDER_UNAVAILABLE",
        { cause: err },
      );
    }
    throw new LLMClientError(
      "Unknown Groq network error",
      "PROVIDER_UNAVAILABLE",
    );
  }

  private async handleHttpStatusError(response: Response): Promise<never> {
    const status = response.status;
    let errorDetail = "";
    try {
      const errJson = (await response.json()) as {
        error?: { message?: string };
      };
      errorDetail = errJson?.error?.message || "";
    } catch {
      // Ignore body parsing failure
    }

    if (status === 401 || status === 403) {
      throw new LLMClientError(
        "Groq authentication failed: invalid API key or unauthorized",
        "PROVIDER_AUTH_ERROR",
        { status },
      );
    }
    if (status === 429) {
      throw new LLMClientError(
        "Groq rate limit exceeded",
        "PROVIDER_RATE_LIMIT",
        { status },
      );
    }
    if (status >= 500) {
      throw new LLMClientError(
        `Groq provider server error (HTTP ${status})`,
        "PROVIDER_UNAVAILABLE",
        { status },
      );
    }

    throw new LLMClientError(
      `Groq provider returned HTTP ${status}${errorDetail ? `: ${errorDetail}` : ""}`,
      "PROVIDER_ERROR",
      { status },
    );
  }
}
