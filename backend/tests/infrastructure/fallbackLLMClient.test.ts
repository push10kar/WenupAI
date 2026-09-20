import { describe, expect, it, vi } from "vitest";
import {
  FallbackLLMClient,
  LLMClient,
  LLMClientError,
  LLMExtractionInput,
  MockLLMClient,
  ResponseGenerationInput,
} from "../../src/infrastructure/llm";
import { createInitialState } from "../../src/domain";

describe("FallbackLLMClient (Resilient Provider Fallback)", () => {
  const dummyInput: LLMExtractionInput = {
    currentState: createInitialState(),
    conversation: [],
    latestUserMessage: "My name is John Doe",
  };

  const dummyResponseInput: ResponseGenerationInput = {
    currentState: createInitialState(),
    conversation: [],
    latestUserMessage: "My name is John Doe",
    nextQuestionPrompt: "What is your home address?",
  };

  it("delegates to primary client when primary succeeds", async () => {
    const primary: LLMClient = {
      extractUpdates: vi.fn().mockResolvedValue({
        updates: [
          {
            field: "fullName",
            value: "John Doe",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      }),
      generateResponse: vi
        .fn()
        .mockResolvedValue("Hello John! What is your address?"),
    };

    const fallback: LLMClient = {
      extractUpdates: vi.fn(),
      generateResponse: vi.fn(),
    };

    const client = new FallbackLLMClient({ primary, fallback });

    const result = await client.extractUpdates(dummyInput);
    expect(result.updates[0].value).toBe("John Doe");
    expect(primary.extractUpdates).toHaveBeenCalledOnce();
    expect(fallback.extractUpdates).not.toHaveBeenCalled();

    const response = await client.generateResponse(dummyResponseInput);
    expect(response).toBe("Hello John! What is your address?");
    expect(primary.generateResponse).toHaveBeenCalledOnce();
    expect(fallback.generateResponse).not.toHaveBeenCalled();
  });

  it("automatically falls back to secondary when primary throws PROVIDER_RATE_LIMIT", async () => {
    const primary: LLMClient = {
      extractUpdates: vi.fn().mockRejectedValue(
        new LLMClientError(
          "Gemini rate limit exceeded",
          "PROVIDER_RATE_LIMIT",
          {
            status: 429,
          },
        ),
      ),
      generateResponse: vi.fn().mockRejectedValue(
        new LLMClientError("Quota exceeded", "PROVIDER_RATE_LIMIT", {
          status: 429,
        }),
      ),
    };

    const fallbackMock = new MockLLMClient();
    const onFallbackSpy = vi.fn();

    const client = new FallbackLLMClient({
      primary,
      fallback: fallbackMock,
      onFallback: onFallbackSpy,
    });

    // 1. extractUpdates
    const result = await client.extractUpdates(dummyInput);
    expect(result.updates.length).toBeGreaterThan(0);
    expect(result.updates[0].field).toBe("fullName");
    expect(result.updates[0].value).toBe("John Doe");
    expect(onFallbackSpy).toHaveBeenCalledWith(
      expect.any(Error),
      "extractUpdates",
    );

    // 2. generateResponse
    const response = await client.generateResponse(dummyResponseInput);
    expect(response.length).toBeGreaterThan(0);
    expect(onFallbackSpy).toHaveBeenCalledWith(
      expect.any(Error),
      "generateResponse",
    );
  });

  it("does NOT fall back on CONFIGURATION_ERROR (fails fast as required by architecture)", async () => {
    const primary: LLMClient = {
      extractUpdates: vi
        .fn()
        .mockRejectedValue(
          new LLMClientError("Missing API key", "CONFIGURATION_ERROR"),
        ),
      generateResponse: vi.fn(),
    };

    const fallback: LLMClient = {
      extractUpdates: vi.fn(),
      generateResponse: vi.fn(),
    };

    const client = new FallbackLLMClient({ primary, fallback });

    await expect(client.extractUpdates(dummyInput)).rejects.toThrow(
      /Missing API key/,
    );
    expect(fallback.extractUpdates).not.toHaveBeenCalled();
  });
});
