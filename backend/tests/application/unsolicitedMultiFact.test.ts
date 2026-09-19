import { describe, it, expect } from "vitest";
import {
  PersonalWishesState,
  createInitialState,
  createConfirmedField,
  selectNextQuestion,
  detectConflicts,
  ValidatedCandidateUpdate,
  applyCandidateUpdate,
} from "../../src/domain";
import { InterviewService } from "../../src/application/interview";
import { MockLLMClient } from "../../src/infrastructure/llm";

describe("Unsolicited Multi-Fact Intake & Reliability Regression", () => {
  describe("Test 1 — Unsolicited child information", () => {
    it("extracts legal name, hasChildren = true, and childrenCount = 2 from 'Pushkar Gavade, I have 2 children.' and avoids asking 'Do you have any children?' later", async () => {
      const initialState = createInitialState();
      // First question is fullName
      const firstQ = selectNextQuestion(initialState);
      expect(firstQ.status).toBe("QUESTION_AVAILABLE");
      if (firstQ.status === "QUESTION_AVAILABLE") {
        expect(firstQ.question.id).toBe("fullName");
      }

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // Turn 1: User provides name + volunteered children count (lowercase input)
      const turn1 = await service.processMessage({
        currentState: initialState,
        conversation: [],
        userMessage: "pushkar gavade, i have 2 children",
      });

      expect(turn1.status).toBe("QUESTION");
      if (turn1.status === "QUESTION") {
        // 1. Candidate extraction & canonical state persistence
        const fullLegalName = turn1.state.fullName.value;
        expect(fullLegalName).not.toBe("pushkar gavade, i have 2 children");
        expect(fullLegalName).toBe("Pushkar Gavade");
        expect(turn1.state.fullName.status).toBe("CONFIRMED");

        expect(turn1.state.hasChildren.status).toBe("CONFIRMED");
        expect(turn1.state.hasChildren.value).toBe(true);

        expect(turn1.state.childrenCount).toBeDefined();
        expect(turn1.state.childrenCount?.status).toBe("CONFIRMED");
        expect(turn1.state.childrenCount?.value).toBe(2);

        // 2. Next question is home address
        expect(turn1.question.id).toBe("homeAddress");
        expect(turn1.question.prompt).toBe(
          "What is your current home address?",
        );
      }

      // Turn 2: Provide home address
      const turn2 = await service.processMessage({
        currentState: turn1.state,
        conversation: [
          { role: "assistant", content: "What is your full legal name?" },
          { role: "user", content: "Pushkar Gavade, I have 2 children." },
          {
            role: "assistant",
            content: "What is your current home address?",
          },
        ],
        userMessage: "42 Country Lane, Cottington",
      });

      expect(turn2.status).toBe("QUESTION");
      if (turn2.status === "QUESTION") {
        expect(turn2.state.homeAddress.status).toBe("CONFIRMED");
        expect(turn2.question.id).toBe("coversWorldwideAssets");
      }

      // Turn 3: Answer worldwide assets
      const turn3 = await service.processMessage({
        currentState: turn2.state,
        conversation: [
          { role: "assistant", content: "What is your current home address?" },
          { role: "user", content: "42 Country Lane, Cottington" },
          {
            role: "assistant",
            content:
              "Do you wish for this document to cover your worldwide assets?",
          },
        ],
        userMessage: "no",
      });

      expect(turn3.status).toBe("QUESTION");
      if (turn3.status === "QUESTION") {
        expect(turn3.state.coversWorldwideAssets.status).toBe("CONFIRMED");
        expect(turn3.state.coversWorldwideAssets.value).toBe(false);

        // 3. Assistant MUST NOT ask "Do you have any children?"
        expect(turn3.question.id).not.toBe("hasChildren");
        expect(turn3.question.prompt).not.toBe("Do you have any children?");

        // Instead, child names are asked because count = 2 but names are unstated
        expect(turn3.question.id).toBe("children");
        expect(turn3.question.prompt).toBe(
          "What are the names of your children?",
        );
      }
    });

    it("performs fact extraction (not answer copying) for natural language phrases like 'My full name is Pushkar Gavade and I have two children.'", async () => {
      const initialState = createInitialState();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const turn = await service.processMessage({
        currentState: initialState,
        conversation: [],
        userMessage: "My full name is Pushkar Gavade and I have two children.",
      });

      expect(turn.status).toBe("QUESTION");
      if (turn.status === "QUESTION") {
        const fullLegalName = turn.state.fullName.value;
        expect(fullLegalName).not.toBe(
          "My full name is Pushkar Gavade and I have two children.",
        );
        expect(fullLegalName).toBe("Pushkar Gavade");
        expect(turn.state.fullName.status).toBe("CONFIRMED");

        expect(turn.state.hasChildren.value).toBe(true);
        expect(turn.state.childrenCount?.value).toBe(2);
      }
    });
  });

  describe("Test 2 — Multiple unrelated facts volunteered in a single turn", () => {
    it("extracts legal name, children count, and executor simultaneously and skips both questions later", async () => {
      const initialState = createInitialState();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // Answer provides name, children count, and executor name
      const turn1 = await service.processMessage({
        currentState: initialState,
        conversation: [],
        userMessage:
          "Pushkar Gavade, I have 2 children and my executor is Jhawali Patil.",
      });

      expect(turn1.status).toBe("QUESTION");
      if (turn1.status === "QUESTION") {
        expect(turn1.state.fullName.value).toBe("Pushkar Gavade");
        expect(turn1.state.hasChildren.value).toBe(true);
        expect(turn1.state.childrenCount?.value).toBe(2);
        expect(turn1.state.executor.name.value).toBe("Jhawali Patil");
        expect(turn1.state.executor.name.status).toBe("CONFIRMED");

        // Next unresolved field is home address
        expect(turn1.question.id).toBe("homeAddress");
      }

      // Simulate state progressing through homeAddress and coversWorldwideAssets
      const stateAfterAssets: PersonalWishesState = {
        ...turn1.state,
        homeAddress: createConfirmedField("42 Country Lane"),
        coversWorldwideAssets: createConfirmedField(true),
      };

      // Since names were not given, next is children names
      const qAfterAssets = selectNextQuestion(stateAfterAssets);
      expect(qAfterAssets.status).toBe("QUESTION_AVAILABLE");
      if (qAfterAssets.status === "QUESTION_AVAILABLE") {
        expect(qAfterAssets.question.id).toBe("children");
      }

      // Once children names are confirmed, executor.name should be skipped, asking executor.relationship
      const stateWithChildrenNames: PersonalWishesState = {
        ...stateAfterAssets,
        children: [createConfirmedField("Sarah"), createConfirmedField("Bob")],
      };

      const qAfterChildren = selectNextQuestion(stateWithChildrenNames);
      expect(qAfterChildren.status).toBe("QUESTION_AVAILABLE");
      if (qAfterChildren.status === "QUESTION_AVAILABLE") {
        // executor.name is already CONFIRMED("Jhawali Patil"), so selector moves to executor.relationship
        expect(qAfterChildren.question.id).toBe("executor.relationship");
        expect(qAfterChildren.question.id).not.toBe("executor.name");
      }
    });
  });

  describe("Test 3 — Complete child info volunteered early", () => {
    it("confirms legal name, hasChildren = true, count = 2, and child names with relationships in turn 1, skipping both child questions later", async () => {
      const initialState = createInitialState();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const turn1 = await service.processMessage({
        currentState: initialState,
        conversation: [],
        userMessage:
          "I am Pushkar Gavade. I have two children, my daughter Sarah and my son Bob.",
      });

      expect(turn1.status).toBe("QUESTION");
      if (turn1.status === "QUESTION") {
        expect(turn1.state.fullName.value).toBe("Pushkar Gavade");
        expect(turn1.state.hasChildren.value).toBe(true);
        expect(turn1.state.childrenCount?.value).toBe(2);
        expect(turn1.state.children).toHaveLength(2);
        expect(turn1.state.children[0].value).toBe("Sarah (daughter)");
        expect(turn1.state.children[0].status).toBe("CONFIRMED");
        expect(turn1.state.children[1].value).toBe("Bob (son)");
        expect(turn1.state.children[1].status).toBe("CONFIRMED");

        // Next question is address
        expect(turn1.question.id).toBe("homeAddress");
      }

      // Fast-forward address and worldwide assets
      const stateAfterAssets: PersonalWishesState = {
        ...turn1.state,
        homeAddress: createConfirmedField("123 Street"),
        coversWorldwideAssets: createConfirmedField(true),
      };

      // Selector should skip BOTH hasChildren and children, proceeding to executor.name
      const nextQ = selectNextQuestion(stateAfterAssets);
      expect(nextQ.status).toBe("QUESTION_AVAILABLE");
      if (nextQ.status === "QUESTION_AVAILABLE") {
        expect(nextQ.question.id).toBe("executor.name");
        expect(nextQ.question.id).not.toBe("hasChildren");
        expect(nextQ.question.id).not.toBe("children");
      }
    });
  });

  describe("Test 4 — Partial volunteered info", () => {
    it("confirms hasChildren = true and childrenCount = 2 when user says 'I have two children.', leaves names unresolved, and asks for names later", async () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Gavade");
      state.homeAddress = createConfirmedField("123 Elm St");
      state.coversWorldwideAssets = createConfirmedField(true);

      // Active question is hasChildren
      const nextQ = selectNextQuestion(state);
      expect(nextQ.status).toBe("QUESTION_AVAILABLE");
      if (nextQ.status === "QUESTION_AVAILABLE") {
        expect(nextQ.question.id).toBe("hasChildren");
      }

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "I have two children.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.hasChildren.value).toBe(true);
        expect(result.state.childrenCount?.value).toBe(2);
        expect(result.state.children).toEqual([]);

        // "Do you have any children?" was resolved; now asks for names
        expect(result.question.id).toBe("children");
        expect(result.question.prompt).toBe(
          "What are the names of your children?",
        );
      }
    });
  });

  describe("Test 5 — Unsolicited conflicting information", () => {
    it("triggers STATE_VALUE_CONFLICT when state has childrenCount = 1 and new candidate proposes childrenCount = 2 with intent NEW", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.childrenCount = createConfirmedField(1);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "childrenCount",
            value: 2,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [
          {
            field: "childrenCount",
            value: 2,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };

      const conflictResult = detectConflicts(state, candidate);
      expect(conflictResult.hasConflicts).toBe(true);
      expect(conflictResult.conflicts).toHaveLength(1);
      expect(conflictResult.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");
      expect(conflictResult.conflicts[0].field).toBe("childrenCount");
      expect(conflictResult.conflicts[0].message).toContain(
        "conflicts with confirmed state value '1'",
      );
    });

    it("allows updating childrenCount when candidate explicitly specifies CORRECTION intent", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.childrenCount = createConfirmedField(1);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "childrenCount",
            value: 2,
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
        ],
        updates: [
          {
            field: "childrenCount",
            value: 2,
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
        ],
      };

      const conflictResult = detectConflicts(state, candidate);
      expect(conflictResult.hasConflicts).toBe(false);

      const transition = applyCandidateUpdate(state, candidate);
      expect(transition.success).toBe(true);
      if (transition.success) {
        expect(transition.state.childrenCount?.value).toBe(2);
        expect(transition.state.childrenCount?.status).toBe("CONFIRMED");
      }
    });
  });

  describe("Test 6 — Non-answer regression", () => {
    it("'I don't know.' for homeAddress produces NOT_PROVIDED with null value", async () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const result = await service.processMessage({
        currentState: state,
        conversation: [
          { role: "assistant", content: "What is your current home address?" },
        ],
        userMessage: "I don't know.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.homeAddress.status).toBe("NOT_PROVIDED");
        expect(result.state.homeAddress.value).toBeNull();
        expect(result.question.id).toBe("coversWorldwideAssets");
      }
    });
  });

  describe("Test 7 — Multi-operation CandidateUpdate atomic application", () => {
    it("applies multiple valid operations atomically into canonical state", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Pushkar Gavade",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "hasChildren",
            value: true,
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "childrenCount",
            value: 2,
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "executor.name",
            value: "Jhawali Patil",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const transitionResult = applyCandidateUpdate(state, candidate);
      expect(transitionResult.success).toBe(true);
      if (transitionResult.success) {
        expect(transitionResult.state.fullName.value).toBe("Pushkar Gavade");
        expect(transitionResult.state.hasChildren.value).toBe(true);
        expect(transitionResult.state.childrenCount?.value).toBe(2);
        expect(transitionResult.state.executor.name.value).toBe(
          "Jhawali Patil",
        );
      }
    });

    it("aborts all mutations atomically if any operation in the candidate update fails invariant validation", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Pushkar Gavade",
            intent: "NEW",
            confidence: "CLEAR",
          },
          // Invalid: proposing childrenCount > 0 when hasChildren is confirmed false
          {
            field: "hasChildren",
            value: false,
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "childrenCount",
            value: 2,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const transitionResult = applyCandidateUpdate(state, candidate);
      expect(transitionResult.success).toBe(false);
      // Original state must be completely untouched (atomic rollback)
      expect(state.fullName.status).toBe("UNKNOWN");
      expect(state.hasChildren.status).toBe("UNKNOWN");
    });
  });
});
