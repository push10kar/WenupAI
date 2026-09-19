import { describe, expect, it } from "vitest";
import { InterviewService } from "../../src/application/interview";
import { createInitialState } from "../../src/domain";
import { GeminiLLMClient, GroqLLMClient } from "../../src/infrastructure/llm";

describe("Phase 13: InterviewService with Real Provider Adapters", () => {
  const createGeminiResponse = (text: string) => ({
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  });

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

  it("processes a full turn with GeminiLLMClient: extracts candidates, validates, transitions state, and selects next question", async () => {
    // 1. Candidate update JSON
    const extractionJson = JSON.stringify({
      updates: [
        {
          field: "fullName",
          value: "John Watson",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        // extractUpdates call
        return new Response(
          JSON.stringify(createGeminiResponse(extractionJson)),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      // generateResponse call
      return new Response(
        JSON.stringify(
          createGeminiResponse(
            "Thank you, John Watson. What is your permanent residential address?",
          ),
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = new GeminiLLMClient({
      apiKey: "test-gemini-key",
      fetch: mockFetch as unknown as typeof fetch,
    });

    const service = new InterviewService({ llmClient: client });
    const initialState = createInitialState();

    const result = await service.processMessage({
      currentState: initialState,
      conversation: [],
      userMessage: "My name is John Watson",
    });

    expect(result.status).toBe("QUESTION");
    expect(result.state.fullName.status).toBe("CONFIRMED");
    expect(result.state.fullName.value).toBe("John Watson");
    expect(result.assistantMessage).toContain("address");
    expect(result.document).toBeDefined();
    expect(result.document?.content).toContain("John Watson");
  });

  it("processes a full turn with GroqLLMClient: extracts candidates, validates, transitions state, and selects next question", async () => {
    const extractionJson = JSON.stringify({
      updates: [
        {
          field: "homeAddress",
          value: "221B Baker Street, London",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    let callCount = 0;
    const mockFetch = async () => {
      callCount++;
      if (callCount === 1) {
        return new Response(
          JSON.stringify(createGroqResponse(extractionJson)),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(
        JSON.stringify(
          createGroqResponse(
            "Address noted! Do you wish this document to cover worldwide assets?",
          ),
        ),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = new GroqLLMClient({
      apiKey: "test-groq-key",
      fetch: mockFetch as unknown as typeof fetch,
    });

    const service = new InterviewService({ llmClient: client });
    const initialState = createInitialState();

    const result = await service.processMessage({
      currentState: initialState,
      conversation: [],
      userMessage: "I live at 221B Baker Street, London",
    });

    expect(result.status).toBe("QUESTION");
    expect(result.state.homeAddress.status).toBe("CONFIRMED");
    expect(result.state.homeAddress.value).toBe("221B Baker Street, London");
    expect(result.assistantMessage).toContain("worldwide assets");
    expect(result.document?.content).toContain("221B Baker Street, London");
  });

  it("preserves canonical state untouched when Gemini adapter fails with 503", async () => {
    const errorFetch = async () => {
      return new Response(
        JSON.stringify({ error: { message: "Service Unavailable" } }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    };

    const client = new GeminiLLMClient({
      apiKey: "test-gemini-key",
      fetch: errorFetch as unknown as typeof fetch,
    });

    const service = new InterviewService({ llmClient: client });
    const stateBefore = createInitialState();

    const result = await service.processMessage({
      currentState: stateBefore,
      conversation: [],
      userMessage: "My name is Sherlock Holmes",
    });

    expect(result.status).toBe("PROVIDER_ERROR");
    // Invariant: domain state is completely untouched!
    expect(result.state).toEqual(stateBefore);
    expect(result.state.fullName.status).toBe("UNKNOWN");
  });
});
