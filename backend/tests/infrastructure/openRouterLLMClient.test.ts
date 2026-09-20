import { describe, expect, it } from "vitest";
import { createInitialState } from "../../src/domain";
import {
  LLMClientError,
  LLMExtractionInput,
  OpenRouterLLMClient,
} from "../../src/infrastructure/llm";

type CapturedChatBody = {
  model: string;
  messages: { role: string; content: string }[];
};

describe("Phase 14: OpenRouterLLMClient Adapter", () => {
  const baseInput: LLMExtractionInput = {
    currentState: createInitialState(),
    conversation: [],
    latestUserMessage: "My name is Arthur Dent and I have 2 children",
  };

  const createChatResponse = (text: string) => ({
    choices: [{ message: { content: text } }],
  });

  const createSequencedFetch = (
    handlers: readonly (() => Promise<Response>)[],
  ) => {
    let callIndex = 0;
    return async () => {
      const handler =
        handlers[Math.min(callIndex, handlers.length - 1)];
      callIndex += 1;
      return handler();
    };
  };

  const httpResponse = (status: number, data: unknown) =>
    async () =>
      new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });

  describe("Configuration and Initialization", () => {
    it("throws CONFIGURATION_ERROR if apiKey is empty or missing", () => {
      try {
        new OpenRouterLLMClient({ apiKey: "   " });
      } catch (err) {
        expect(err).toBeInstanceOf(LLMClientError);
        expect((err as LLMClientError).code).toBe("CONFIGURATION_ERROR");
      }
    });

    it("initializes successfully with valid apiKey and defaults to openrouter/free", () => {
      const client = new OpenRouterLLMClient({ apiKey: "sk-test-key" });
      expect(client).toBeDefined();
    });
  });

  describe("Candidate Extraction (extractUpdates)", () => {
    it("successfully extracts a valid single candidate update", async () => {
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

      const mockFetch = createSequencedFetch([
        httpResponse(200, createChatResponse(candidateJson)),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
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
          },
          {
            field: "childrenCount",
            value: 2,
            intent: "NEW",
          },
        ],
      });

      const mockFetch = createSequencedFetch([
        httpResponse(200, createChatResponse(candidateJson)),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates).toHaveLength(2);
      expect(result.updates[0].field).toBe("executor.name");
      expect(result.updates[1].field).toBe("childrenCount");
    });

    it("strips markdown code fences around JSON output", async () => {
      const fenced = "```json\n" + JSON.stringify({ updates: [] }) + "\n```";
      const mockFetch = createSequencedFetch([
        httpResponse(200, createChatResponse(fenced)),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates).toEqual([]);
    });

    it("retries once with validation feedback when JSON is malformed, then succeeds", async () => {
      const valid = JSON.stringify({
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
          },
        ],
      });
      let badCallResolved = false;

      const mockFetch = async () => {
        if (!badCallResolved) {
          badCallResolved = true;
          return httpResponse(200, createChatResponse("NOT_JSON{broken"))();
        }
        return httpResponse(200, createChatResponse(valid))();
      };

      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates[0]).toEqual({
        field: "fullName",
        value: "Arthur Dent",
        intent: "NEW",
        confidence: "CLEAR",
      });
      expect(badCallResolved).toBe(true);
    });

    it("retries once with feedback when output violates Zod schema, then succeeds", async () => {
      const schemaInvalid = JSON.stringify({
        updates: [{ field: "notARealField", value: "x" }],
      });
      const valid = JSON.stringify({
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
          },
        ],
      });
      let firstCall = true;

      const mockFetch = async () => {
        if (firstCall) {
          firstCall = false;
          return httpResponse(200, createChatResponse(schemaInvalid))();
        }
        return httpResponse(200, createChatResponse(valid))();
      };

      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      const result = await client.extractUpdates(baseInput);
      expect(result.updates[0].value).toBe("Arthur Dent");
    });

    it("throws MALFORMED_OUTPUT when output keeps failing validation", async () => {
      const broken = "NOT_JSON{broken";
      const mockFetch = createSequencedFetch([
        httpResponse(200, createChatResponse(broken)),
        httpResponse(200, createChatResponse(broken)),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });

    it("throws MALFORMED_OUTPUT when output misses the updates array", async () => {
      const missingUpdates = JSON.stringify({ result: [] });
      const mockFetch = createSequencedFetch([
        httpResponse(200, createChatResponse(missingUpdates)),
        httpResponse(200, createChatResponse(missingUpdates)),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });

    it("includes the Zod-rendered JSON schema and API key in the request", async () => {
      let capturedBody: CapturedChatBody | null = null;
      let capturedAuth: string | null = null;
      let capturedUrl: string | null = null;

      const mockFetch = async (url: Parameters<typeof fetch>[0], init?: RequestInit) => {
        capturedUrl = String(url);
        capturedBody = JSON.parse(String(init?.body)) as CapturedChatBody | null;
        capturedAuth =
          (init?.headers as { Authorization?: string })?.Authorization ??
          null;
        return new Response(
          JSON.stringify(createChatResponse(JSON.stringify({ updates: [] }))),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      const client = new OpenRouterLLMClient({
        apiKey: "sk-my-secret-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await client.extractUpdates(baseInput);

      expect(capturedUrl).toBe("https://openrouter.ai/api/v1/chat/completions");
      expect(capturedAuth).toBe("Bearer sk-my-secret-key");
      expect((capturedBody as CapturedChatBody | null)?.model).toBe("openrouter/free");
      const systemMessage = (capturedBody as CapturedChatBody | null)?.messages?.[0];
      expect(systemMessage?.role).toBe("system");
      expect(systemMessage?.content).toContain("TARGET JSON SCHEMA");
      expect(systemMessage?.content).toContain('"updates"');
      const userMessage = (capturedBody as CapturedChatBody | null)?.messages?.[1];
      expect(userMessage?.role).toBe("user");
      expect(userMessage?.content).toContain("LATEST USER MESSAGE");
    });
  it("sends requests to a custom baseUrl with a normalized chat completions path", async () => {
      let capturedUrl: string | null = null;

      const mockFetch = async (url: Parameters<typeof fetch>[0]) => {
        capturedUrl = String(url);
        return new Response(
          JSON.stringify(createChatResponse("hello")),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      };

      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        baseUrl: "http://localhost:20128/v1/",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "hi",
        nextQuestionPrompt: "What is your name?",
      });

      expect(capturedUrl).toBe("http://localhost:20128/v1/chat/completions");
    });
  });

  describe("Assistant Response Generation (generateResponse)", () => {
    it("returns natural language assistant message from model", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(
          200,
          createChatResponse(
            "Thank you, Arthur. Next, what is your permanent home address?",
          ),
        ),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
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
      const mockFetch = createSequencedFetch([
        httpResponse(200, createChatResponse("   ")),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
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

  describe("Error Normalization", () => {
    it("normalizes HTTP 401 to PROVIDER_AUTH_ERROR", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(401, { error: { message: "Invalid API key" } }),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "bad-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_AUTH_ERROR",
        status: 401,
      });
    });

    it("normalizes HTTP 403 to PROVIDER_AUTH_ERROR", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(403, { error: { message: "Forbidden" } }),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "bad-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_AUTH_ERROR",
        status: 403,
      });
    });

    it("normalizes HTTP 429 to PROVIDER_RATE_LIMIT", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(429, { error: { message: "Rate limited" } }),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_RATE_LIMIT",
        status: 429,
      });
    });

    it("normalizes HTTP 402 (insufficient credits) to PROVIDER_RATE_LIMIT", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(402, { error: { message: "Insufficient Credits" } }),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_RATE_LIMIT",
        status: 402,
      });
    });

    it("normalizes HTTP 503 to PROVIDER_UNAVAILABLE", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(503, { error: { message: "Service Unavailable" } }),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
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

      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
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

      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: networkFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "PROVIDER_UNAVAILABLE",
      });
    });

    it("throws MALFORMED_OUTPUT when choices list is empty", async () => {
      const mockFetch = createSequencedFetch([
        httpResponse(200, { choices: [] }),
      ]);
      const client = new OpenRouterLLMClient({
        apiKey: "sk-test-key",
        fetch: mockFetch as unknown as typeof fetch,
      });

      await expect(client.extractUpdates(baseInput)).rejects.toMatchObject({
        code: "MALFORMED_OUTPUT",
      });
    });
  });
});