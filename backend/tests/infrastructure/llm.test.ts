import { describe, expect, it } from "vitest";
import {
  applyCandidateUpdate,
  createConfirmedField,
  createInitialState,
  detectConflicts,
  validateCandidate,
} from "../../src/domain";
import {
  LLMClient,
  LLMClientError,
  LLMExtractionInput,
  LLMExtractionResult,
  Message,
  MockLLMClient,
  ResponseGenerationInput,
} from "../../src/infrastructure";

describe("Phase 8: Deterministic Mock LLM Client", () => {
  const baseMessage: Message = {
    id: "msg-1",
    role: "user",
    content: "My name is Arthur Dent",
    createdAt: "2026-09-19T00:00:00.000Z",
  };

  const createBaseInput = (): LLMExtractionInput => ({
    currentState: createInitialState(),
    conversation: [baseMessage],
    latestUserMessage: "My name is Arthur Dent",
  });

  describe("Contract Implementation & Interface Satisfaction", () => {
    it("satisfies the provider-neutral LLMClient interface", async () => {
      const client: LLMClient = new MockLLMClient();
      expect(typeof client.extractUpdates).toBe("function");
      expect(typeof client.generateResponse).toBe("function");

      const extraction = await client.extractUpdates(createBaseInput());
      expect(extraction).toBeDefined();
      expect(Array.isArray(extraction.updates)).toBe(true);

      const response = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Hello",
      });
      expect(typeof response).toBe("string");
    });
  });

  describe("Configured Responses & Determinism", () => {
    it("returns configured valid single-operation response", async () => {
      const mockResult: LLMExtractionResult = {
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };

      const client = new MockLLMClient({
        extractionResponses: [mockResult],
      });

      const result = await client.extractUpdates(createBaseInput());
      expect(result).toEqual(mockResult);
    });

    it("returns configured multiple-operation response (Section 7.7)", async () => {
      const mockResult: LLMExtractionResult = {
        updates: [
          {
            field: "executor.name",
            value: "James",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "executor.relationship",
            value: "brother",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };

      const client = new MockLLMClient({
        extractionResponses: [mockResult],
      });

      const result = await client.extractUpdates({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "My brother James will be my executor.",
      });

      expect(result.updates.length).toBe(2);
      expect(result.updates[0].field).toBe("executor.name");
      expect(result.updates[1].field).toBe("executor.relationship");
    });

    it("supports sequential queueing of extraction results", async () => {
      const client = new MockLLMClient();
      client.queueExtractionResult({
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      client.queueExtractionResult({
        updates: [
          {
            field: "homeAddress",
            value: "Cottington Lane",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });

      const res1 = await client.extractUpdates(createBaseInput());
      expect(res1.updates[0].field).toBe("fullName");

      const res2 = await client.extractUpdates(createBaseInput());
      expect(res2.updates[0].field).toBe("homeAddress");

      // Subsequent call falls back to default empty updates
      const res3 = await client.extractUpdates(createBaseInput());
      expect(res3.updates).toEqual([]);
    });

    it("returns configured natural-language assistant responses", async () => {
      const client = new MockLLMClient({
        textResponses: [
          "Hello Arthur, what is your home address?",
          "Got it. Do you have any children?",
        ],
      });

      const text1 = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Arthur Dent",
      });
      expect(text1).toBe("Hello Arthur, what is your home address?");

      const text2 = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Cottington Lane",
      });
      expect(text2).toBe("Got it. Do you have any children?");
    });

    it("defaults to nextQuestionPrompt when text queue is empty", async () => {
      const client = new MockLLMClient();
      const response = await client.generateResponse({
        currentState: createInitialState(),
        conversation: [],
        latestUserMessage: "Hi",
        nextQuestionPrompt: "What is your full legal name?",
      });

      expect(response).toBe("What is your full legal name?");
    });
  });

  describe("Provider Failures and Malformed Outputs", () => {
    it("simulates provider errors on extraction (PROVIDER_UNAVAILABLE)", async () => {
      const client = new MockLLMClient({
        extractionError: new LLMClientError(
          "Upstream model service unavailable",
          "PROVIDER_UNAVAILABLE",
        ),
      });

      let thrownError: unknown;
      try {
        await client.extractUpdates(createBaseInput());
      } catch (err) {
        thrownError = err;
      }
      expect(thrownError).toBeInstanceOf(LLMClientError);
      expect((thrownError as LLMClientError).code).toBe("PROVIDER_UNAVAILABLE");
      expect((thrownError as LLMClientError).message).toBe(
        "Upstream model service unavailable",
      );
    });

    it("simulates provider timeout on response generation (PROVIDER_TIMEOUT)", async () => {
      const client = new MockLLMClient({
        textError: new LLMClientError("Request timed out", "PROVIDER_TIMEOUT"),
      });

      await expect(
        client.generateResponse({
          currentState: createInitialState(),
          conversation: [],
          latestUserMessage: "Hello",
        }),
      ).rejects.toThrow(LLMClientError);
    });

    it("returns malformed candidate outputs when configured, without throwing internally", async () => {
      const malformedData = {
        updates: [{ field: "INVALID_FIELD", value: 12345, intent: "NOT_REAL" }],
      };

      const client = new MockLLMClient({
        extractionResponses: [malformedData],
      });

      // The mock faithfully returns the untrusted data as a provider would
      const output = await client.extractUpdates(createBaseInput());
      expect(output).toEqual(malformedData);
    });
  });

  describe("Immutability, Determinism & Call History", () => {
    it("does not mutate input state, conversation, or message strings", async () => {
      const state = createInitialState();
      const stateSnapshot = JSON.parse(JSON.stringify(state));
      const conversation: Message[] = [{ ...baseMessage }];
      const conversationSnapshot = JSON.parse(JSON.stringify(conversation));

      const client = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Arthur Dent",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      await client.extractUpdates({
        currentState: state,
        conversation,
        latestUserMessage: "Arthur Dent",
      });

      expect(state).toEqual(stateSnapshot);
      expect(conversation).toEqual(conversationSnapshot);
    });

    it("records call history for inspection without altering inputs", async () => {
      const client = new MockLLMClient();
      const input = createBaseInput();

      await client.extractUpdates(input);
      expect(client.getExtractionCalls().length).toBe(1);
      expect(client.getExtractionCalls()[0].latestUserMessage).toBe(
        input.latestUserMessage,
      );

      await client.generateResponse({
        currentState: input.currentState,
        conversation: input.conversation,
        latestUserMessage: "Test",
      });
      expect(client.getTextCalls().length).toBe(1);

      client.reset();
      expect(client.getExtractionCalls().length).toBe(0);
      expect(client.getTextCalls().length).toBe(0);
    });

    it("isolates different MockLLMClient instances completely", async () => {
      const client1 = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Client 1",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });
      const client2 = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Client 2",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const res1 = await client1.extractUpdates(createBaseInput());
      const res2 = await client2.extractUpdates(createBaseInput());

      expect(res1.updates[0].value).toBe("Client 1");
      expect(res2.updates[0].value).toBe("Client 2");
    });

    it("does not share mutable object references with callers", async () => {
      const mockResult: LLMExtractionResult = {
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };

      const client = new MockLLMClient({
        defaultExtractionResult: mockResult,
      });

      const res1 = await client.extractUpdates(createBaseInput());
      // Caller modifies returned candidate
      (res1.updates as unknown as Array<{ value: string }>)[0].value =
        "MODIFIED";

      const res2 = await client.extractUpdates(createBaseInput());
      expect(res2.updates[0].value).toBe("Arthur Dent");
    });
  });

  describe("Integration: Provider Boundary Through Domain Pipeline", () => {
    it("successfully transitions canonical state when MockLLM output passes validation and conflict detection", async () => {
      const client = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Arthur Dent",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const state = createInitialState();
      const rawExtraction = await client.extractUpdates({
        currentState: state,
        conversation: [],
        latestUserMessage: "My name is Arthur Dent",
      });

      // 1. Pipeline Validation
      const validationResult = validateCandidate(rawExtraction, state);
      expect(validationResult.success).toBe(true);
      if (!validationResult.success) return;

      // 2. Conflict Detection
      const conflictResult = detectConflicts(state, validationResult.candidate);
      expect(conflictResult.hasConflicts).toBe(false);

      // 3. State Transition
      const transitionResult = applyCandidateUpdate(
        state,
        validationResult.candidate,
      );
      expect(transitionResult.success).toBe(true);
      if (transitionResult.success) {
        expect(transitionResult.state.fullName.value).toBe("Arthur Dent");
        expect(transitionResult.state.fullName.status).toBe("CONFIRMED");
      }
    });

    it("blocks state mutation when MockLLM returns malformed output", async () => {
      const client = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "unsupportedField",
                value: "Bad",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const state = createInitialState();
      const rawExtraction = await client.extractUpdates({
        currentState: state,
        conversation: [],
        latestUserMessage: "Bad data",
      });

      const validationResult = validateCandidate(rawExtraction, state);
      expect(validationResult.success).toBe(false);

      // Invariant: Zero state mutation occurs
      expect(state.fullName.status).toBe("UNKNOWN");
    });

    it("blocks state mutation when MockLLM produces conflicting candidate update", async () => {
      const client = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Ford Prefect",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");

      const rawExtraction = await client.extractUpdates({
        currentState: state,
        conversation: [],
        latestUserMessage: "I am Ford Prefect",
      });

      const validationResult = validateCandidate(rawExtraction, state);
      expect(validationResult.success).toBe(true);
      if (!validationResult.success) return;

      const conflictResult = detectConflicts(state, validationResult.candidate);
      expect(conflictResult.hasConflicts).toBe(true);
      expect(conflictResult.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");

      // Invariant: Zero state mutation on conflict
      expect(state.fullName.value).toBe("Arthur Dent");
    });
  });
});
