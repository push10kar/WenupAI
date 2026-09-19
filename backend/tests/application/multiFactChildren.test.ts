import { describe, it, expect } from "vitest";
import {
  PersonalWishesState,
  createInitialState,
  createConfirmedField,
  selectNextQuestion,
  detectConflicts,
  ValidatedCandidateUpdate,
} from "../../src/domain";
import { InterviewService } from "../../src/application/interview";
import { MockLLMClient } from "../../src/infrastructure/llm";

describe("Multi-Fact Children Intake & Reliability Bug Regression", () => {
  const createBaseStateWithPriorFieldsConfirmed = (): PersonalWishesState => {
    const state = createInitialState();
    state.fullName = createConfirmedField("Arthur Dent");
    state.homeAddress = createConfirmedField("Cottington Lane");
    state.coversWorldwideAssets = createConfirmedField(true);
    return state;
  };

  describe("Test 1 — Complete multi-fact answer", () => {
    it("captures both hasChildren and child names/relationships in one turn and avoids redundant children question", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      // Ensure the active question is hasChildren ("Do you have any children?")
      const nextQ = selectNextQuestion(state);
      expect(nextQ.status).toBe("QUESTION_AVAILABLE");
      if (nextQ.status === "QUESTION_AVAILABLE") {
        expect(nextQ.question.id).toBe("hasChildren");
        expect(nextQ.question.prompt).toBe("Do you have any children?");
      }

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // User answer: "yes i have 2 children, the daughters name is sarah, the sons name is bob"
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage:
          "yes i have 2 children, the daughters name is sarah, the sons name is bob",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        // 1. All explicitly stated child facts reach canonical state
        expect(result.state.hasChildren.status).toBe("CONFIRMED");
        expect(result.state.hasChildren.value).toBe(true);

        expect(result.state.children).toHaveLength(2);
        expect(result.state.children[0]).toEqual({
          value: "Sarah (daughter)",
          status: "CONFIRMED",
        });
        expect(result.state.children[1]).toEqual({
          value: "Bob (son)",
          status: "CONFIRMED",
        });

        // 2. No redundant "What are the names of your children?" question
        expect(result.question.id).toBe("executor.name");
        expect(result.question.id).not.toBe("children");
        expect(result.question.prompt).toBe(
          "What is the full name of your appointed executor?",
        );
        expect(result.assistantMessage).toContain("appointed executor");
        expect(result.assistantMessage).not.toContain("names of your children");
      }
    });

    it("works identically with punctuation and capitalization ('Yes, I have 2 children. My daughter is Sarah and my son is Bob.')", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage:
          "Yes, I have 2 children. My daughter is Sarah and my son is Bob.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.hasChildren.value).toBe(true);
        expect(result.state.children).toHaveLength(2);
        expect(result.state.children[0].value).toBe("Sarah (daughter)");
        expect(result.state.children[1].value).toBe("Bob (son)");
        expect(result.question.id).toBe("executor.name");
      }
    });
  });

  describe("Test 2 — Partial information", () => {
    it("confirms hasChildren but leaves child names unresolved and asks for names when names are omitted", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // User answer only establishes count / existence, not names
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Yes, I have two children.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        // hasChildren is confirmed true
        expect(result.state.hasChildren.status).toBe("CONFIRMED");
        expect(result.state.hasChildren.value).toBe(true);

        // names remain unresolved (empty array in canonical state)
        expect(result.state.children).toEqual([]);

        // selector correctly asks for child names
        expect(result.question.id).toBe("children");
        expect(result.question.prompt).toBe(
          "What are the names of your children?",
        );
      }
    });
  });

  describe("Test 3 — Names without relationships", () => {
    it("populates names without inventing daughter or son relationships", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // User provides names but no relationship tags
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Yes, I have two children, Sarah and Bob.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.hasChildren.value).toBe(true);
        expect(result.state.children).toHaveLength(2);

        // Names are populated exactly as stated, without inventing daughter/son
        expect(result.state.children[0].value).toBe("Sarah");
        expect(result.state.children[0].status).toBe("CONFIRMED");
        expect(result.state.children[1].value).toBe("Bob");
        expect(result.state.children[1].status).toBe("CONFIRMED");

        // Relationships remain unstated, but names are satisfied so children question is skipped
        expect(result.question.id).toBe("executor.name");
      }
    });
  });

  describe("Test 4 — Explicit relationships", () => {
    it("populates relationships when answering the children question with explicit daughter/son roles", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      state.hasChildren = createConfirmedField(true);
      state.children = [];

      // Current question is children
      const nextQ = selectNextQuestion(state);
      expect(nextQ.status).toBe("QUESTION_AVAILABLE");
      if (nextQ.status === "QUESTION_AVAILABLE") {
        expect(nextQ.question.id).toBe("children");
      }

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "My daughter is Sarah and my son is Bob.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.children).toHaveLength(2);
        expect(result.state.children[0].value).toBe("Sarah (daughter)");
        expect(result.state.children[1].value).toBe("Bob (son)");

        // Selector advances to executor.name; no follow-up question asking for known children
        expect(result.question.id).toBe("executor.name");
      }
    });
  });

  describe("Test 5 — Existing state", () => {
    it("skips children question if canonical state already contains confirmed child names", () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      state.hasChildren = createConfirmedField(true);
      state.children = [createConfirmedField("Sarah")];

      // Question selector must inspect state and not ask for children again
      const nextQ = selectNextQuestion(state);
      expect(nextQ.status).toBe("QUESTION_AVAILABLE");
      if (nextQ.status === "QUESTION_AVAILABLE") {
        expect(nextQ.question.id).toBe("executor.name");
        expect(nextQ.question.id).not.toBe("children");
      }
    });
  });

  describe("Test 6 — Contradiction", () => {
    it("detects STATE_VALUE_CONFLICT when new candidate proposes different children than confirmed state", () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      state.hasChildren = createConfirmedField(true);
      state.children = [createConfirmedField("Sarah")]; // One child: Sarah

      // Later candidate proposes "two children: Sarah and Bob" with intent 'NEW'
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "children",
            value: ["Sarah", "Bob"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const conflictResult = detectConflicts(state, candidate);
      expect(conflictResult.hasConflicts).toBe(true);
      expect(conflictResult.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");
      expect(conflictResult.conflicts[0].field).toBe("children");
    });

    it("prevents silent state overwrite and returns CONFLICT status through InterviewService", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      state.hasChildren = createConfirmedField(true);
      state.children = [createConfirmedField("Sarah")];

      const conflictingLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "children",
                value: ["Sarah", "Bob"],
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });
      const service = new InterviewService({ llmClient: conflictingLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Actually I have two children, Sarah and Bob",
      });

      expect(result.status).toBe("CONFLICT");
      if (result.status === "CONFLICT") {
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");
        // State remains strictly unchanged
        expect(result.state.children).toHaveLength(1);
        expect(result.state.children[0].value).toBe("Sarah");
      }
    });

    it("allows updating children when candidate explicitly uses CORRECTION intent", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      state.hasChildren = createConfirmedField(true);
      state.children = [createConfirmedField("Sarah")];

      const correctingLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "children",
                value: ["Sarah", "Bob"],
                intent: "CORRECTION",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });
      const service = new InterviewService({ llmClient: correctingLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Correction: I have two children, Sarah and Bob",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.children).toHaveLength(2);
        expect(result.state.children.map((c) => c.value)).toEqual([
          "Sarah",
          "Bob",
        ]);
      }
    });
  });

  describe("Test 7 — Invalid candidate", () => {
    it("fails validation, preserves state without mutation, and does not advance interview state", async () => {
      const state = createBaseStateWithPriorFieldsConfirmed();
      const snapshot = JSON.parse(JSON.stringify(state));

      const invalidLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "children",
                value: [12345 as any], // Invalid element type (schema failure)
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });
      const service = new InterviewService({ llmClient: invalidLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Invalid data",
      });

      expect(result.status).toBe("VALIDATION_ERROR");
      if (result.status === "VALIDATION_ERROR") {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.state).toEqual(snapshot);
      }
      expect(state).toEqual(snapshot);
    });
  });
});
