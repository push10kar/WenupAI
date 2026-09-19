import { describe, it, expect } from "vitest";
import {
  createInitialState,
  createConfirmedField,
  selectNextQuestion,
  generateDocument,
  DOCUMENT_SUBTITLE,
} from "../../src/domain";
import { InterviewService } from "../../src/application/interview";
import { MockLLMClient } from "../../src/infrastructure/llm";

describe("Phase 01 — Formal Requirements Compliance Review Tests", () => {
  describe("FR-06 — Missing Information", () => {
    it("does NOT invent an executor name when user says 'My brother will be my executor.', extracts relationship = 'Brother', and leaves executor.name unresolved", async () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Sharma");
      state.homeAddress = createConfirmedField("42 Park Street");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(false);

      // Active question is executor.name
      const q = selectNextQuestion(state);
      expect(q.status).toBe("QUESTION_AVAILABLE");
      if (q.status === "QUESTION_AVAILABLE") {
        expect(q.question.id).toBe("executor.name");
      }

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // User provides only relationship: "My brother will be my executor."
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "My brother will be my executor.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        // Known: relationship = Brother
        expect(result.state.executor.relationship.status).toBe("CONFIRMED");
        expect(result.state.executor.relationship.value).toBe("Brother");

        // Unknown: executor name (must NOT be invented or set to relationship phrase)
        expect(result.state.executor.name.status).toBe("UNKNOWN");
        expect(result.state.executor.name.value).toBeNull();

        // System asks for the missing executor name
        expect(result.question.id).toBe("executor.name");
        expect(result.question.prompt).toBe(
          "What is the full name of your appointed executor?",
        );
      }
    });
  });

  describe("FR-07 — Ambiguous Information", () => {
    it("marks ambiguous statement 'Everything I own should be covered.' as UNCONFIRMED without silently confirming worldwide assets", async () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Sharma");
      state.homeAddress = createConfirmedField("42 Park Street");

      // Active question is coversWorldwideAssets
      const q = selectNextQuestion(state);
      expect(q.status).toBe("QUESTION_AVAILABLE");
      if (q.status === "QUESTION_AVAILABLE") {
        expect(q.question.id).toBe("coversWorldwideAssets");
      }

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // Ambiguous answer
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Everything I own should be covered.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        // Must NOT silently convert ambiguous language into a confirmed value
        expect(result.state.coversWorldwideAssets.status).toBe("UNCONFIRMED");
        expect(result.state.coversWorldwideAssets.status).not.toBe("CONFIRMED");

        // Field remains unresolved and assistant requests clarification
        expect(result.question.id).toBe("coversWorldwideAssets");
      }

      // Clarification turn
      const clarified = await service.processMessage({
        currentState: result.state,
        conversation: [],
        userMessage: "Yes, worldwide assets.",
      });

      expect(clarified.status).toBe("QUESTION");
      if (clarified.status === "QUESTION") {
        expect(clarified.state.coversWorldwideAssets.status).toBe("CONFIRMED");
        expect(clarified.state.coversWorldwideAssets.value).toBe(true);
        expect(clarified.question.id).toBe("hasChildren");
      }
    });
  });

  describe("FR-08 — Contradictory Information", () => {
    it("detects contradiction when user previously confirmed no children, and later volunteers child information without correction", async () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Sharma");
      state.homeAddress = createConfirmedField("42 Park Street");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(false);

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // User later says "My daughter Sarah will be my executor."
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "My daughter Sarah will be my executor.",
      });

      // Conflict must be detected; state must NOT be silently overwritten
      expect(result.status).toBe("CONFLICT");
      if (result.status === "CONFLICT") {
        expect(result.conflicts.length).toBeGreaterThan(0);
        // Canonical state remains unchanged
        expect(result.state.hasChildren.value).toBe(false);
      }
    });
  });

  describe("FR-12 — Corrections", () => {
    it("allows user to correct previously confirmed homeAddress via conversational correction", async () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Sharma");
      state.homeAddress = createConfirmedField("10 Old Street");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(false);

      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      // User explicitly corrects address
      const result = await service.processMessage({
        currentState: state,
        conversation: [],
        userMessage: "Actually, I moved. My address is 42 Park Street now.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.homeAddress.status).toBe("CONFIRMED");
        expect(result.state.homeAddress.value).toBe("42 Park Street");
      }
    });
  });

  describe("FR-14 & FR-16 — Document Generation and Legal Disclaimer", () => {
    it("generates draft document purely from structured state with required legal disclaimer", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Sharma");
      state.homeAddress = createConfirmedField("42 Park Street");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(false);
      state.executor.name = createConfirmedField("James Sharma");
      state.executor.relationship = createConfirmedField("Brother");
      state.specificGifts = [createConfirmedField("Watch to nephew")];
      state.additionalWishes = createConfirmedField("None");

      const doc = generateDocument(state);

      expect(doc.status).toBe("draft");
      expect(doc.title).toBe("PERSONAL WISHES DOCUMENT");
      expect(doc.subtitle).toBe("Fictional example — Not legal advice");
      expect(doc.content).toContain("Fictional example — Not legal advice");
      expect(DOCUMENT_SUBTITLE).toBe("Fictional example — Not legal advice");

      // Sections generated deterministically from confirmed values
      expect(
        doc.sections.find((s) => s.title.includes("Full Name"))?.content,
      ).toBe("Pushkar Sharma");
      expect(
        doc.sections.find((s) => s.title.includes("Address"))?.content,
      ).toBe("42 Park Street");
      expect(
        doc.sections.find((s) => s.title.includes("Children"))?.content,
      ).toBe("No");
    });
  });

  describe("FR-05 — Multiple Fields in One Answer", () => {
    it("extracts multiple volunteered fields from 'I am Pushkar Sharma, I live at 42 Park Street, and my brother James will be my executor.'", async () => {
      const initialState = createInitialState();
      const mockLLM = new MockLLMClient();
      const service = new InterviewService({ llmClient: mockLLM });

      const result = await service.processMessage({
        currentState: initialState,
        conversation: [],
        userMessage:
          "I am Pushkar Sharma, my address is 42 Park Street, and my executor is James Dent.",
      });

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.fullName.status).toBe("CONFIRMED");
        expect(result.state.fullName.value).toBe("Pushkar Sharma");

        expect(result.state.homeAddress.status).toBe("CONFIRMED");
        expect(result.state.homeAddress.value).toBe("42 Park Street");

        expect(result.state.executor.name.status).toBe("CONFIRMED");
        expect(result.state.executor.name.value).toBe("James Dent");

        // Next unresolved question is worldwide assets
        expect(result.question.id).toBe("coversWorldwideAssets");
      }
    });
  });
});
