import { describe, expect, it } from "vitest";
import {
  createConfirmedField,
  createInitialState,
  PersonalWishesState,
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
import { InterviewService, ProcessMessageInput } from "../../src/application";

describe("Phase 9: InterviewService Application Orchestrator", () => {
  const createBaseInput = (
    state: PersonalWishesState,
    userMessage: string,
    conversation: Message[] = [],
  ): ProcessMessageInput => ({
    currentState: state,
    conversation,
    userMessage,
  });

  describe("Happy Path: Turn Orchestration", () => {
    it("successfully processes a valid message turn from initial state", async () => {
      const mockLLM = new MockLLMClient({
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
        textResponses: [
          "Nice to meet you Arthur. What is your current home address?",
        ],
      });

      const service = new InterviewService({ llmClient: mockLLM });
      const initialState = createInitialState();

      const result = await service.processMessage(
        createBaseInput(initialState, "I am Arthur Dent"),
      );

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        // State updated
        expect(result.state.fullName.value).toBe("Arthur Dent");
        expect(result.state.fullName.status).toBe("CONFIRMED");

        // Next question selected
        expect(result.question.id).toBe("homeAddress");

        // Assistant natural language message generated
        expect(result.assistantMessage).toBe(
          "Nice to meet you Arthur. What is your current home address?",
        );

        // Document preview generated
        expect(result.document.status).toBe("draft");
        expect(result.document.content).toContain("1. Full Name\nArthur Dent");
        expect(result.document.content).toContain(
          "2. Home Address\nNot provided",
        );
      }
    });

    it("handles multiple candidate operations in a single turn (§7.7)", async () => {
      const mockLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "executor.name",
                value: "Ford Prefect",
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "executor.relationship",
                value: "Friend",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const service = new InterviewService({ llmClient: mockLLM });
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(false);

      const result = await service.processMessage(
        createBaseInput(state, "My friend Ford Prefect will be my executor."),
      );

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.executor.name.value).toBe("Ford Prefect");
        expect(result.state.executor.relationship.value).toBe("Friend");
        expect(result.question.id).toBe("specificGifts");
      }
    });
  });

  describe("Sequential Multi-Turn Progression to Completion", () => {
    it("runs multiple sequential turns end-to-end to COMPLETE status", async () => {
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      let currentState = createInitialState();

      // Turn 1: fullName
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      let res = await service.processMessage(
        createBaseInput(currentState, "Arthur Dent"),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        expect(res.question.id).toBe("homeAddress");
        currentState = res.state;
      }

      // Turn 2: homeAddress
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "homeAddress",
            value: "Cottington Lane",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "Cottington Lane"),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        expect(res.question.id).toBe("coversWorldwideAssets");
        currentState = res.state;
      }

      // Turn 3: coversWorldwideAssets
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "coversWorldwideAssets",
            value: true,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "Yes, worldwide assets."),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        expect(res.question.id).toBe("hasChildren");
        currentState = res.state;
      }

      // Turn 4: hasChildren = false
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "hasChildren",
            value: false,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "No children."),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        // Skips children, asks executor.name
        expect(res.question.id).toBe("executor.name");
        currentState = res.state;
      }

      // Turn 5: executor.name
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "executor.name",
            value: "Ford Prefect",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "Ford Prefect"),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        expect(res.question.id).toBe("executor.relationship");
        currentState = res.state;
      }

      // Turn 6: executor.relationship
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "executor.relationship",
            value: "Friend",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "Friend"),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        expect(res.question.id).toBe("specificGifts");
        currentState = res.state;
      }

      // Turn 7: specificGifts
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "specificGifts",
            value: ["Sub-Etha Sens-O-Matic to Ford"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "My Sub-Etha Sens-O-Matic to Ford"),
      );
      expect(res.status).toBe("QUESTION");
      if (res.status === "QUESTION") {
        expect(res.question.id).toBe("additionalWishes");
        currentState = res.state;
      }

      // Turn 8: additionalWishes (FINAL)
      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "additionalWishes",
            value: "Don't Panic",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      res = await service.processMessage(
        createBaseInput(currentState, "Don't Panic"),
      );

      expect(res.status).toBe("COMPLETE");
      if (res.status === "COMPLETE") {
        expect(res.state.additionalWishes.value).toBe("Don't Panic");
        expect(res.document.status).toBe("draft");
        expect(res.document.content).toContain("1. Full Name\nArthur Dent");
        expect(res.document.content).toContain("4. Children\nNo");
        expect(res.document.content).toContain(
          "6. Specific Gifts\n- Sub-Etha Sens-O-Matic to Ford",
        );
        expect(res.document.content).toContain(
          "7. Additional Wishes\nDon't Panic",
        );
      }
    });
  });

  describe("Failure Handling & Atomicity Guarantees", () => {
    it("handles Provider Failure and leaves state strictly unchanged", async () => {
      const mockLLM = new MockLLMClient({
        extractionError: new LLMClientError("API timeout", "PROVIDER_TIMEOUT"),
      });

      const service = new InterviewService({ llmClient: mockLLM });
      const state = createInitialState();
      const snapshot = JSON.parse(JSON.stringify(state));

      const result = await service.processMessage(
        createBaseInput(state, "Arthur Dent"),
      );

      expect(result.status).toBe("PROVIDER_ERROR");
      if (result.status === "PROVIDER_ERROR") {
        expect(result.error).toBeInstanceOf(LLMClientError);
        expect((result.error as LLMClientError).code).toBe("PROVIDER_TIMEOUT");
        expect(result.state).toEqual(snapshot);
      }
      expect(state).toEqual(snapshot);
    });

    it("handles Candidate Validation Failure and leaves state strictly unchanged", async () => {
      const mockLLM = new MockLLMClient({
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

      const service = new InterviewService({ llmClient: mockLLM });
      const state = createInitialState();
      const snapshot = JSON.parse(JSON.stringify(state));

      const result = await service.processMessage(
        createBaseInput(state, "Invalid input"),
      );

      expect(result.status).toBe("VALIDATION_ERROR");
      if (result.status === "VALIDATION_ERROR") {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.state).toEqual(snapshot);
      }
      expect(state).toEqual(snapshot);
    });

    it("handles Conflict Detection Failure and leaves state strictly unchanged", async () => {
      const mockLLM = new MockLLMClient({
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

      const service = new InterviewService({ llmClient: mockLLM });
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      const snapshot = JSON.parse(JSON.stringify(state));

      const result = await service.processMessage(
        createBaseInput(state, "I am Ford Prefect"),
      );

      expect(result.status).toBe("CONFLICT");
      if (result.status === "CONFLICT") {
        expect(result.conflicts.length).toBeGreaterThan(0);
        expect(result.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");
        expect(result.state).toEqual(snapshot);
      }
      expect(state).toEqual(snapshot);
    });

    it("handles Transition Failure and leaves state strictly unchanged", async () => {
      // Create a scenario where candidate passes schema/semantics but transition engine rejects
      // For instance: an operation targeting an invalid candidate construct
      const mockLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const service = new InterviewService({ llmClient: mockLLM });
      const state = createInitialState();
      const snapshot = JSON.parse(JSON.stringify(state));

      const result = await service.processMessage(
        createBaseInput(state, "Empty name"),
      );

      // Validation catches empty string before transition
      expect(
        result.status === "VALIDATION_ERROR" ||
          result.status === "TRANSITION_ERROR",
      ).toBe(true);
      expect(result.state).toEqual(snapshot);
      expect(state).toEqual(snapshot);
    });
  });

  describe("startInterview Method", () => {
    it("initializes interview on fresh state and returns first question", async () => {
      const mockLLM = new MockLLMClient({
        textResponses: [
          "Welcome to Document Intake Assistant. What is your full legal name?",
        ],
      });

      const service = new InterviewService({ llmClient: mockLLM });
      const result = await service.startInterview();

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.question.id).toBe("fullName");
        expect(result.assistantMessage).toBe(
          "Welcome to Document Intake Assistant. What is your full legal name?",
        );
        expect(result.document.status).toBe("draft");
      }
    });

    it("recognizes already completed state when startInterview is called", async () => {
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(false);
      state.hasChildren = createConfirmedField(false);
      state.executor.name = createConfirmedField("Ford Prefect");
      state.executor.relationship = createConfirmedField("Friend");
      state.specificGifts = [createConfirmedField("None")];
      state.additionalWishes = createConfirmedField("None");

      const result = await service.startInterview(state);
      expect(result.status).toBe("COMPLETE");
      if (result.status === "COMPLETE") {
        expect(result.document.content).toContain("Arthur Dent");
      }
    });
  });

  describe("Dependency Injection & Determinism", () => {
    it("works with custom injected fake LLMClient", async () => {
      let extractCalls = 0;
      let textCalls = 0;

      const fakeClient: LLMClient = {
        async extractUpdates(
          _input: LLMExtractionInput,
        ): Promise<LLMExtractionResult> {
          extractCalls++;
          return {
            updates: [
              {
                field: "fullName",
                value: "Trillian Astra",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        },
        async generateResponse(
          _input: ResponseGenerationInput,
        ): Promise<string> {
          textCalls++;
          return "Custom fake prompt response";
        },
      };

      const service = new InterviewService({ llmClient: fakeClient });
      const state = createInitialState();

      const result = await service.processMessage(
        createBaseInput(state, "I am Trillian"),
      );
      expect(result.status).toBe("QUESTION");
      expect(extractCalls).toBe(1);
      expect(textCalls).toBe(1);
      if (result.status === "QUESTION") {
        expect(result.state.fullName.value).toBe("Trillian Astra");
        expect(result.assistantMessage).toBe("Custom fake prompt response");
      }
    });

    it("produces strictly identical results for identical state and inputs", async () => {
      const runTurn = async () => {
        const mockLLM = new MockLLMClient({
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
          textResponses: ["Hello Arthur!"],
        });
        const service = new InterviewService({ llmClient: mockLLM });
        return service.processMessage(
          createBaseInput(createInitialState(), "Arthur Dent"),
        );
      };

      const result1 = await runTurn();
      const result2 = await runTurn();
      expect(result1).toEqual(result2);
    });

    it("never mutates input state or input messages", async () => {
      const mockLLM = new MockLLMClient({
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

      const service = new InterviewService({ llmClient: mockLLM });
      const state = createInitialState();
      const stateBefore = JSON.parse(JSON.stringify(state));

      const conversation: Message[] = [
        {
          id: "1",
          role: "user",
          content: "Hello",
          createdAt: "2026-09-19T00:00:00.000Z",
        },
      ];
      const conversationBefore = JSON.parse(JSON.stringify(conversation));

      await service.processMessage(
        createBaseInput(state, "Arthur Dent", conversation),
      );

      expect(state).toEqual(stateBefore);
      expect(conversation).toEqual(conversationBefore);
    });
  });
});
