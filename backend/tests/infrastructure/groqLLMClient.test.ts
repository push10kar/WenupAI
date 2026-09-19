import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/domain";
import {
  GroqLLMClient,
  LLMClientError,
  LLMExtractionInput,
} from "../../src/infrastructure/llm";

describe("Phase 13: GroqLLMClient Adapter", () => {
  const baseInput: LLMExtractionInput = {
    currentState: createInitialState(),
    conversation: [],
    latestUserMessage: "I live at 42 Park Street",
  };

  const createMockFetch = (status: number, responseData: unknown) => {
    return async () =>
      new Response(JSON.stringify(responseData), {
        status,
        headers: { "Content-Type": "application/json" },
      });
  };

  const createGroqResponse = (content: string) => ({
    choices: [
      {
        message: {
          role: "assistant",
          content,
        },
      },
    ],
  });

  describe("Configuration and Initialization", () => {
    it("throws CONFIGURATION_ERROR if apiKey is empty or missing", () => {
      expect(() => new GroqLLMClient({ apiKey: "" })).toThrow(LLMClientError);
      try {
        new GroqLLMClient({ apiKey: "   " });
      } catch (err) {
        expect(err).toBeInstanceOf(LLMClientError);
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
      }
    });

    it("initializes successfully with valid apiKey and default model", () => {
      const client = new GroqLLMClient({
        apiKey: "test-groq-key",
      });
      expect(client).toBeDefined();
    });
  });

  describe("Candidate Extraction (extractUpdates)", () => {
    it("successfully extracts valid single candidate update", async () => {
      const candidateJson = JSON.stringify({
        updates: [
          {
            field: "homeAddress",
            value: "42 Park Street",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });

      const mockFetch = createMockFetch(200, createGroqResponse(candidateJson));
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates).toHaveLength(1);
      expect(result.updates[0]).toEqual({
        field: "homeAddress",
        value: "42 Park Street",
        intent: "NEW",
        confidence: "CLEAR",
      });
    });

    it("successfully extracts multiple candidate updates", async () => {
      const candidateJson = JSON.stringify({
        updates: [
          {
            field: "hasChildren",
            value: true,
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "children",
            value: ["Sarah", "Tom"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });

      const mockFetch = createMockFetch(200, createGroqResponse(candidateJson));
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates).toHaveLength(2);
      expect(result.updates[0].field).toBe("hasChildren");
      expect(result.updates[1].field).toBe("children");
    });

    it("throws MALFORMED_OUTPUT when Groq returns invalid JSON", async () => {
      const mockFetch = createMockFetch(
        200,
        createGroqResponse("NOT_JSON{broken"),
      );
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });

    it("throws MALFORMED_OUTPUT when Groq returns JSON without 'updates' array", async () => {
      const mockFetch = createMockFetch(
        200,
        createGroqResponse(JSON.stringify({ data: [] })),
      );
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });

    it("throws MALFORMED_OUTPUT when Groq response has empty choices", async () => {
      const mockFetch = createMockFetch(200, { choices: [] });
      const client = new GroqLLMClient({
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
        error: { message: "Invalid API Key" },
      });
      const client = new GroqLLMClient({
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
        error: { message: "Rate limit reached" },
      });
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_RATE_LIMIT",
        status: 429,
      });
    });

    it("normalizes HTTP 500/503 to PROVIDER_UNAVAILABLE", async () => {
      const mockFetch = createMockFetch(500, {
        error: { message: "Internal server error" },
      });
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
        status: 500,
      });
    });

    it("normalizes timeout (AbortError) to PROVIDER_TIMEOUT", async () => {
      const timeoutFetch = async () => {
        const error = new Error("The operation was aborted due to timeout");
        error.name = "TimeoutError";
        throw error;
      };

      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: timeoutFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_TIMEOUT",
      });
    });

    it("normalizes network error to PROVIDER_UNAVAILABLE", async () => {
      const networkFetch = async () => {
        throw new Error("connect ECONNREFUSED");
      };

      const client = new GroqLLMClient({
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
        createGroqResponse("Got it! Do you have any children?"),
      );
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const response = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Yes, worldwide assets",
        nextQuestionPrompt: "Do you have any children?",
      });

      expect(response).toBe("Got it! Do you have any children?");
    });

    it("falls back to nextQuestionPrompt if model returns empty string", async () => {
      const mockFetch = createMockFetch(200, createGroqResponse("   "));
      const client = new GroqLLMClient({
        apiKey: "test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const response = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Yes",
        nextQuestionPrompt: "Do you have any children?",
      });

      expect(response).toBe("Do you have any children?");
    });
  });
});
