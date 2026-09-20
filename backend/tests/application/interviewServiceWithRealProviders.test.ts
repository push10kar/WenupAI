import { describe, expect, it } from "vitest";
import { InterviewService } from "../../src/application/interview";
import { createInitialState } from "../../src/domain";
import { GeminiLLMClient } from "../../src/infrastructure/llm";

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
    if (result.status !== "QUESTION") {
      throw new Error("expected QUESTION");
    }
    expect(result.state.fullName.status).toBe("CONFIRMED");
    expect(result.state.fullName.value).toBe("John Watson");
    expect(result.assistantMessage).toContain("address");
    expect(result.document).toBeDefined();
    expect(result.document?.content).toContain("John Watson");
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
