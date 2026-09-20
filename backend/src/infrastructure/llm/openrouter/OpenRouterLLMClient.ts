import { z } from "zod";
import { candidateUpdateSchema } from "../../../domain/candidate";
import { LLMClient } from "../LLMClient";
import { LLMClientError } from "../errors";
import {
  buildExtractionSystemPrompt,
  RESPONSE_GENERATION_SYSTEM_PROMPT,
  buildExtractionPrompt,
  buildResponsePrompt,
} from "../prompts";
import {
  LLMExtractionInput,
  LLMExtractionResult,
  ResponseGenerationInput,
} from "../types";

export interface OpenRouterClientConfig {
  readonly apiKey: string;
  readonly model?: string;
  /** Base URL of an OpenAI-compatible chat completions API. Defaults to OpenRouter. */
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  /**
   * Number of additional retries (with Zod validation error feedback) when the
   * model returns output that fails JSON parsing or schema validation.
   * Defaults to 1.
   */
  readonly maxRetriesOnValidation?: number;
  readonly fetch?: typeof fetch;
}

type ChatMessage = { readonly role: "system" | "user" | "assistant"; readonly content: string };

const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "openrouter/free";
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_RETRIES = 1;

function normalizeEndpoint(baseUrl?: string): string {
  const base = (baseUrl?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
  return `${base}/chat/completions`;
}

/**
 * Removes markdown code fences around JSON before parsing.
 */
function sanitizeJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

/**
 * Renders Zod issues into a concise, model-readable feedback string.
 */
function formatZodIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const pathStr = issue.path.length > 0 ? issue.path.join(".") : "<root>";
      return `- ${pathStr}: ${issue.message}`;
    })
    .join("\n");
}

/**
 * OpenRouterLLMClient: Provider adapter implementing LLMClient for any
 * OpenAI-compatible chat completions endpoint. By default it targets the
 * OpenRouter API (free-tier models via the openrouter/free router); a custom
 * baseUrl lets it talk to a local gateway such as OmniRoute.
 *
 * Structured JSON enforcement strategy (no reliance on provider-native schemas):
 * 1. The Zod-derived JSON Schema is injected directly into the system prompt.
 * 2. The raw response is parsed defensively (JSON.parse with fence stripping).
 * 3. The parsed object is validated with the authoritative Zod
 *    candidateUpdateSchema.
 * 4. On JSON/Zod failure the model is retried once (default) with the exact
 *    validation errors fed back into the conversation.
 * 5. If it still fails, a normalized MALFORMED_OUTPUT error is raised.
 *
 * Invariants:
 * - Completely isolated from domain and application layers.
 * - Normalized error handling (no provider SDK classes or raw secrets leaked).
 * - Untrusted output: returns candidate updates for domain validation pipeline.
 * - Supports dependency injection of `fetch` for zero-credential testing.
 */
export class OpenRouterLLMClient implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly endpoint: string;
  private readonly timeoutMs: number;
  private readonly maxRetriesOnValidation: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: OpenRouterClientConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LLMClientError(
        "OpenRouter API key is required",
        "CONFIGURATION_ERROR",
      );
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || DEFAULT_MODEL;
    this.endpoint = normalizeEndpoint(config.baseUrl);
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetriesOnValidation =
      config.maxRetriesOnValidation ?? DEFAULT_MAX_RETRIES;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async extractUpdates(
    input: LLMExtractionInput,
  ): Promise<LLMExtractionResult> {
    const messages: ChatMessage[] = [
      { role: "system", content: buildExtractionSystemPrompt() },
      { role: "user", content: buildExtractionPrompt(input) },
    ];

    let lastValidationError: string | null = null;

    for (
      let attempt = 0;
      attempt <= this.maxRetriesOnValidation;
      attempt++
    ) {
      const rawText = await this.complete(messages);

      const parseResult = this.tryParseExtraction(rawText);
      if (parseResult.kind === "ok") {
        return parseResult.result;
      }

      lastValidationError = parseResult.error;

      if (attempt < this.maxRetriesOnValidation) {
        messages.push({
          role: "user",
          content: `Your previous response did not satisfy the required JSON schema.

Raw response you returned:
${rawText}

Validation errors:
${lastValidationError}

Return ONLY a single raw JSON object matching the TARGET JSON SCHEMA exactly. No markdown, no code fences, no extra text.`,
        });
      }
    }

    throw new LLMClientError(
      `OpenRouter returned extraction output that failed validation: ${lastValidationError ?? "unknown error"}`,
      "MALFORMED_OUTPUT",
    );
  }

  async generateResponse(input: ResponseGenerationInput): Promise<string> {
    const messages: ChatMessage[] = [
      { role: "system", content: RESPONSE_GENERATION_SYSTEM_PROMPT },
      { role: "user", content: buildResponsePrompt(input) },
    ];

    const rawText = await this.complete(messages, 0.2);
    const cleaned = rawText.trim();
    if (cleaned.length === 0 && input.nextQuestionPrompt) {
      return input.nextQuestionPrompt;
    }
    return cleaned;
  }

  /**
   * Defensive parse of raw model output into an LLMExtractionResult.
   * Returns a structured error string (never throws) when parsing or Zod
   * validation fails so the caller can drive the retry loop.
   */
  private tryParseExtraction(rawText: string):
    | { kind: "ok"; result: LLMExtractionResult }
    | { kind: "error"; error: string } {
    const cleaned = sanitizeJsonText(rawText);

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch (err: unknown) {
      return {
        kind: "error",
        error: `Response is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    const validation = candidateUpdateSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        kind: "error",
        error: formatZodIssues(validation.error),
      };
    }

    return {
      kind: "ok",
      result: { updates: validation.data.updates },
    };
  }

  /**
   * Executes a chat completion request and returns the assistant content text.
   */
  private async complete(
    messages: readonly ChatMessage[],
    temperature: number = 0.0,
  ): Promise<string> {
    const body = {
      model: this.model,
      messages,
      temperature,
    };

    let response: Response;
    try {
      response = await this.fetchImpl(this.endpoint, {
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
        "Invalid JSON received from OpenRouter API endpoint",
        "MALFORMED_OUTPUT",
      );
    }

    const content = this.extractContentText(json);
    return content;
  }

  private extractContentText(responseJson: unknown): string {
    if (
      typeof responseJson !== "object" ||
      responseJson === null ||
      !("choices" in responseJson)
    ) {
      throw new LLMClientError(
        "OpenRouter response has no choices",
        "MALFORMED_OUTPUT",
      );
    }

    const choices = (responseJson as { choices?: unknown[] }).choices;
    if (!Array.isArray(choices) || choices.length === 0) {
      throw new LLMClientError(
        "OpenRouter returned an empty choices list",
        "MALFORMED_OUTPUT",
      );
    }

    const firstChoice = choices[0] as {
      message?: { content?: string | null };
    };
    const content = firstChoice.message?.content;
    if (typeof content !== "string") {
      throw new LLMClientError(
        "OpenRouter candidate message has no text content",
        "MALFORMED_OUTPUT",
      );
    }
    return content;
  }

  private handleNetworkError(err: unknown): never {
    if (err instanceof Error) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new LLMClientError(
          `OpenRouter request timed out after ${this.timeoutMs}ms`,
          "PROVIDER_TIMEOUT",
          { cause: err },
        );
      }
      throw new LLMClientError(
        `OpenRouter network communication error: ${err.message}`,
        "PROVIDER_UNAVAILABLE",
        { cause: err },
      );
    }
    throw new LLMClientError(
      "Unknown OpenRouter network error",
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

    const detail = errorDetail ? `: ${errorDetail}` : "";

    if (status === 401 || status === 403) {
      throw new LLMClientError(
        `OpenRouter authentication failed: invalid API key or insufficient permissions${detail}`,
        "PROVIDER_AUTH_ERROR",
        { status },
      );
    }
    if (status === 402 || status === 429) {
      throw new LLMClientError(
        status === 402
          ? `OpenRouter insufficient credits or quota exceeded${detail}`
          : `OpenRouter rate limit exceeded${detail}`,
        "PROVIDER_RATE_LIMIT",
        { status },
      );
    }
    if (status >= 500) {
      throw new LLMClientError(
        `OpenRouter provider server error (HTTP ${status})${detail}`,
        "PROVIDER_UNAVAILABLE",
        { status },
      );
    }

    throw new LLMClientError(
      `OpenRouter provider returned HTTP ${status}${detail}`,
      "PROVIDER_ERROR",
      { status },
    );
  }
}