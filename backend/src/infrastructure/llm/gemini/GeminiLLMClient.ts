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

export interface GeminiClientConfig {
  readonly apiKey: string;
  readonly model?: string;
  readonly timeoutMs?: number;
  readonly fetch?: typeof fetch;
}

/**
 * GeminiLLMClient: Provider adapter implementing LLMClient for Google Gemini (REST API).
 *
 * Invariants:
 * - Completely isolated from domain and application layers.
 * - Normalized error handling (no provider SDK classes or raw secrets leaked).
 * - Untrusted output: returns candidate updates for domain validation pipeline.
 * - Supports dependency injection of `fetch` for zero-credential testing.
 */
export class GeminiLLMClient implements LLMClient {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(config: GeminiClientConfig) {
    if (!config.apiKey || config.apiKey.trim().length === 0) {
      throw new LLMClientError(
        "Gemini API key is required",
        "CONFIGURATION_ERROR",
      );
    }
    this.apiKey = config.apiKey.trim();
    this.model = config.model?.trim() || "gemini-1.5-flash";
    this.timeoutMs = config.timeoutMs ?? 15000;
    this.fetchImpl = config.fetch ?? fetch;
  }

  async extractUpdates(
    input: LLMExtractionInput,
  ): Promise<LLMExtractionResult> {
    const prompt = buildExtractionPrompt(input);

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${EXTRACTION_SYSTEM_PROMPT}\n\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.0,
        responseMimeType: "application/json",
      },
    };

    const rawText = await this.executeRequest(body);

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new LLMClientError(
        "Failed to parse Gemini response as JSON",
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
        "Gemini output missing expected 'updates' array",
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
      contents: [
        {
          role: "user",
          parts: [
            { text: `${RESPONSE_GENERATION_SYSTEM_PROMPT}\n\n${prompt}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
      },
    };

    const rawText = await this.executeRequest(body);
    const cleaned = rawText.trim();
    if (cleaned.length === 0 && input.nextQuestionPrompt) {
      return input.nextQuestionPrompt;
    }
    return cleaned;
  }

  private async executeRequest(body: unknown): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent`;

    let response: Response;
    try {
      response = await this.fetchImpl(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey,
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
        "Invalid JSON received from Gemini API endpoint",
        "MALFORMED_OUTPUT",
      );
    }

    // Extract text from Gemini candidates response structure
    const candidateText = this.extractTextFromGeminiResponse(json);
    return candidateText;
  }

  private extractTextFromGeminiResponse(responseJson: unknown): string {
    if (
      typeof responseJson !== "object" ||
      responseJson === null ||
      !("candidates" in responseJson)
    ) {
      throw new LLMClientError(
        "Gemini response has no candidates",
        "MALFORMED_OUTPUT",
      );
    }

    const candidates = (responseJson as { candidates?: unknown[] }).candidates;
    if (!Array.isArray(candidates) || candidates.length === 0) {
      throw new LLMClientError(
        "Gemini returned an empty candidates list",
        "MALFORMED_OUTPUT",
      );
    }

    const firstCandidate = candidates[0] as {
      content?: { parts?: { text?: string }[] };
    };
    const parts = firstCandidate.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0 || !parts[0].text) {
      throw new LLMClientError(
        "Gemini candidate content has no text parts",
        "MALFORMED_OUTPUT",
      );
    }

    return parts[0].text;
  }

  private handleNetworkError(err: unknown): never {
    if (err instanceof Error) {
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        throw new LLMClientError(
          `Gemini request timed out after ${this.timeoutMs}ms`,
          "PROVIDER_TIMEOUT",
          { cause: err },
        );
      }
      throw new LLMClientError(
        `Gemini network communication error: ${err.message}`,
        "PROVIDER_UNAVAILABLE",
        { cause: err },
      );
    }
    throw new LLMClientError(
      "Unknown Gemini network error",
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
        "Gemini authentication failed: invalid API key or insufficient permissions",
        "PROVIDER_AUTH_ERROR",
        { status },
      );
    }
    if (status === 429) {
      throw new LLMClientError(
        "Gemini rate limit exceeded",
        "PROVIDER_RATE_LIMIT",
        { status },
      );
    }
    if (status >= 500) {
      throw new LLMClientError(
        `Gemini provider server error (HTTP ${status})`,
        "PROVIDER_UNAVAILABLE",
        { status },
      );
    }

    throw new LLMClientError(
      `Gemini provider returned HTTP ${status}${errorDetail ? `: ${errorDetail}` : ""}`,
      "PROVIDER_ERROR",
      { status },
    );
  }
}
