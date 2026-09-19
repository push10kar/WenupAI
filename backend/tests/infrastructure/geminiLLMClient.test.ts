import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/domain";
import {
  GeminiLLMClient,
  LLMClientError,
  LLMExtractionInput,
} from "../../src/infrastructure/llm";

describe("Phase 13: GeminiLLMClient Adapter", () => {
  const baseInput: LLMExtractionInput = {
    currentState: createInitialState(),
    conversation: [],
    latestUserMessage: "My name is Arthur Dent",
  };

  const createMockFetch = (status: number, responseData: unknown) => {
    return async () =>
      new Response(JSON.stringify(responseData), {
        status,
        headers: { "Content-Type": "application/json" },
      });
  };

  const createGeminiResponse = (text: string) => ({
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  });

  describe("Configuration and Initialization", () => {
    it("throws CONFIGURATION_ERROR if apiKey is empty or missing", () => {
      expect(() => new GeminiLLMClient({ apiKey: "" })).toThrow(LLMClientError);
      try {
        new GeminiLLMClient({ apiKey: "   " });
      } catch (err) {
        expect(err).toBeInstanceOf(LLMClientError);
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
      }
    });

    it("initializes successfully with valid apiKey and default model", () => {
      const client = new GeminiLLMClient({
        apiKey: "test-gemini-key",
      });
      expect(client).toBeDefined();
    });
  });

  describe("Candidate Extraction (extractUpdates)", () => {
    it("successfully extracts valid single candidate update", async () => {
      const candidateJson = JSON.stringify({
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });

      const mockFetch = createMockFetch(
        200,
        createGeminiResponse(candidateJson),
      );
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates).toHaveLength(1);
      expect(result.updates[0]).toEqual({
        field: "fullName",
        value: "Arthur Dent",
        intent: "NEW",
        confidence: "CLEAR",
      });
    });

    it("successfully extracts multiple candidate updates", async () => {
      const candidateJson = JSON.stringify({
        updates: [
          {
            field: "executor.name",
            value: "Ford Prefect",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "executor.relationship",
            value: "friend",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });

      const mockFetch = createMockFetch(
        200,
        createGeminiResponse(candidateJson),
      );
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates).toHaveLength(2);
      expect(result.updates[0].field).toBe("executor.name");
      expect(result.updates[1].field).toBe("executor.relationship");
    });

    it("throws MALFORMED_OUTPUT when model returns invalid JSON", async () => {
      const mockFetch = createMockFetch(
        200,
        createGeminiResponse("NOT_JSON{broken"),
      );
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });

    it("throws MALFORMED_OUTPUT when model returns JSON without 'updates' array", async () => {
      const mockFetch = createMockFetch(
        200,
        createGeminiResponse(JSON.stringify({ result: [] })),
      );
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });

    it("throws MALFORMED_OUTPUT when Gemini response has empty candidates", async () => {
      const mockFetch = createMockFetch(200, { candidates: [] });
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });
  });

  describe("Error Normalization", () => {
    it("normalizes HTTP 401 to PROVIDER_AUTH_ERROR", async () => {
      const mockFetch = createMockFetch(401, {
        error: { message: "API key not valid" },
      });
      const client = new GeminiLLMClient({
        apiKey: "bad-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_AUTH_ERROR",
        status: 401,
      });
    });

    it("normalizes HTTP 429 to PROVIDER_RATE_LIMIT", async () => {
      const mockFetch = createMockFetch(429, {
        error: { message: "Quota exceeded" },
      });
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_RATE_LIMIT",
        status: 429,
      });
    });

    it("normalizes HTTP 500/503 to PROVIDER_UNAVAILABLE", async () => {
      const mockFetch = createMockFetch(503, {
        error: { message: "Service Unavailable" },
      });
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
        status: 503,
      });
    });

    it("normalizes timeout (AbortError) to PROVIDER_TIMEOUT", async () => {
      const timeoutFetch = async () => {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
      };

      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: timeoutFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_TIMEOUT",
      });
    });

    it("normalizes network error to PROVIDER_UNAVAILABLE", async () => {
      const networkFetch = async () => {
        throw new Error("Failed to fetch (ECONNREFUSED)");
      };

      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: networkFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
      });
    });
  });

  describe("Assistant Response Generation (generateResponse)", () => {
    it("returns natural language assistant message from model", async () => {
      const mockFetch = createMockFetch(
        200,
        createGeminiResponse(
          "Thank you, Arthur. Next, what is your permanent home address?",
        ),
      );
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const response = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Arthur Dent",
        nextQuestionPrompt: "What is your permanent home address?",
      });

      expect(response).toBe(
        "Thank you, Arthur. Next, what is your permanent home address?",
      );
    });

    it("falls back to nextQuestionPrompt if model returns empty string", async () => {
      const mockFetch = createMockFetch(200, createGeminiResponse("   "));
      const client = new GeminiLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const response = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Arthur Dent",
        nextQuestionPrompt: "What is your permanent home address?",
      });

      expect(response).toBe("What is your permanent home address?");
    });
  });
});
