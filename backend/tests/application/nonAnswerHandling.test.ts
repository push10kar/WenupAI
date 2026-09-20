import { describe, it, expect, beforeEach } from "vitest";
import { InterviewService } from "../../src/application/interview/InterviewService";
import { MockLLMClient } from "../../src/infrastructure/llm/MockLLMClient";
import {
  SQLiteSessionRepository,
  createDatabase,
} from "../../src/infrastructure/db";
import { createInitialState } from "../../src/domain/state";
import { generateDocument } from "../../src/domain/document";

describe("Reliability: Non-Answer & Refusal Handling", () => {
  let mockLLM: MockLLMClient;
  let sessionRepo: SQLiteSessionRepository;
  let service: InterviewService;

  beforeEach(() => {
    mockLLM = new MockLLMClient();
    const db = createDatabase(":memory:");
    sessionRepo = new SQLiteSessionRepository(db);
    service = new InterviewService({
      llmClient: mockLLM,
      sessionRepository: sessionRepo,
    });
  });

  // Test 1 — "I don't know"
  it("Test 1 — 'I don't know' for home address does not mark confirmed and sets NOT_PROVIDED with null value", async () => {
    const session = await service.createSession();
    // Turn 1: Provide full name
    await service.processSessionMessage(session.id, "Arthur Dent");

    // Turn 2: "I don't know" for homeAddress
    const turn2 = await service.processSessionMessage(
      session.id,
      "I don't know",
    );

    expect(turn2.status).toBe("QUESTION");
    if (turn2.status !== "QUESTION") {
      throw new Error("expected QUESTION");
    }
    expect(turn2.state.homeAddress.status).toBe("NOT_PROVIDED");
    expect(turn2.state.homeAddress.value).toBeNull();
    expect(turn2.state.homeAddress.status).not.toBe("CONFIRMED");

    // Document does not render "I don't know"
    expect(turn2.document.content).not.toContain("i don't know");
    expect(turn2.document.content).not.toContain("I don't know");
    const addressSection = turn2.document.sections.find(
      (s) => s.title === "2. Home Address",
    );
    expect(addressSection).toBeDefined();
    expect(addressSection!.content).toBe("Not provided");
  });

  // Test 2 — Capitalization & punctuation variations
  it("Test 2 — handles capitalization and punctuation variations identically", async () => {
    const variations = ["I DON'T KNOW.", "i dont know", "I don't know."];

    for (const phrase of variations) {
      const sess = await service.createSession();
      await service.processSessionMessage(sess.id, "Arthur Dent");

      const result = await service.processSessionMessage(sess.id, phrase);
      expect(result.status).toBe("QUESTION");
      if (result.status !== "QUESTION") {
        throw new Error("expected QUESTION");
      }
      expect(result.state.homeAddress.status).toBe("NOT_PROVIDED");
      expect(result.state.homeAddress.value).toBeNull();
      expect(result.state.homeAddress.status).not.toBe("CONFIRMED");

      const addressSection = result.document.sections.find(
        (s) => s.title === "2. Home Address",
      );
      expect(addressSection!.content).toBe("Not provided");
    }
  });

  // Test 3 — Memory-related non-answer
  it("Test 3 — 'I don't remember my address.' maps to NOT_PROVIDED with null value", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "Arthur Dent");

    const result = await service.processSessionMessage(
      session.id,
      "I don't remember my address.",
    );

    expect(result.status).toBe("QUESTION");
    if (result.status !== "QUESTION") {
      throw new Error("expected QUESTION");
    }
    expect(result.state.homeAddress.status).toBe("NOT_PROVIDED");
    expect(result.state.homeAddress.value).toBeNull();
    expect(result.state.homeAddress.status).not.toBe("CONFIRMED");

    const addressSection = result.document.sections.find(
      (s) => s.title === "2. Home Address",
    );
    expect(addressSection!.content).toBe("Not provided");
  });

  // Test 4 — Explicit refusal
  it("Test 4 — 'I'd rather not provide my address.' maps to REFUSED with null value", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "Arthur Dent");

    const result = await service.processSessionMessage(
      session.id,
      "I'd rather not provide my address.",
    );

    expect(result.status).toBe("QUESTION");
    if (result.status !== "QUESTION") {
      throw new Error("expected QUESTION");
    }
    expect(result.state.homeAddress.status).toBe("REFUSED");
    expect(result.state.homeAddress.value).toBeNull();
    expect(result.state.homeAddress.status).not.toBe("CONFIRMED");

    const addressSection = result.document.sections.find(
      (s) => s.title === "2. Home Address",
    );
    expect(addressSection!.content).toBe("Not provided");
  });

  // Test 5 — Valid negative boolean
  it("Test 5 — 'No.' to boolean question (Do you have any children?) populates hasChildren = false and does not become NOT_PROVIDED", async () => {
    const session = await service.createSession();
    // Turn 1: Name
    await service.processSessionMessage(session.id, "Arthur Dent");
    // Turn 2: Address
    await service.processSessionMessage(
      session.id,
      "42 Country Lane, Cottington",
    );
    // Turn 3: Worldwide assets
    await service.processSessionMessage(session.id, "Yes");

    // Turn 4: "No." to "Do you have any children?"
    const result = await service.processSessionMessage(session.id, "No.");

    expect(result.status).toBe("QUESTION");
    expect(result.state.hasChildren.status).toBe("CONFIRMED");
    expect(result.state.hasChildren.value).toBe(false);
    expect(result.state.hasChildren.status).not.toBe("NOT_PROVIDED");
    expect(result.state.children).toEqual([]);

    // Question selector should skip children names and advance to executor
    if (result.status === "QUESTION") {
      expect(result.question.id).toBe("executor.name");
    }
  });

  // Test 6 — Valid factual answer
  it("Test 6 — valid factual answer populates and confirms address", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "Arthur Dent");

    const result = await service.processSessionMessage(
      session.id,
      "123 Main Street, Pune, Maharashtra.",
    );

    expect(result.status).toBe("QUESTION");
    if (result.status !== "QUESTION") {
      throw new Error("expected QUESTION");
    }
    expect(result.state.homeAddress.status).toBe("CONFIRMED");
    expect(result.state.homeAddress.value).toBe(
      "123 Main Street, Pune, Maharashtra.",
    );

    const addressSection = result.document.sections.find(
      (s) => s.title === "2. Home Address",
    );
    expect(addressSection!.content).toBe("123 Main Street, Pune, Maharashtra.");
  });

  // Test 7 — No state mutation from invalid candidate proposing non-answer string as factual value
  it("Test 7 — invalid candidate proposing non-answer string fails validation with zero state mutation", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "Arthur Dent");

    const stateBefore = (await sessionRepo.getState(session.id))!;
    expect(stateBefore.homeAddress.status).toBe("UNKNOWN");
    expect(stateBefore.homeAddress.value).toBeNull();

    // Directly queue an invalid candidate proposing "i dont know" as the literal string value
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "homeAddress",
          value: "i dont know",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    const result = await service.processSessionMessage(
      session.id,
      "i dont know",
    );

    expect(result.status).toBe("VALIDATION_ERROR");

    // Canonical state in persistence must remain untouched
    const stateAfter = (await sessionRepo.getState(session.id))!;
    expect(stateAfter.homeAddress.status).toBe("UNKNOWN");
    expect(stateAfter.homeAddress.value).toBeNull();
  });

  // Test 8 — Final document rendering with NOT_PROVIDED address
  it("Test 8 — final document renders 'Not provided' for NOT_PROVIDED address", () => {
    const state = createInitialState();
    state.fullName = { value: "Arthur Dent", status: "CONFIRMED" };
    state.homeAddress = { value: null, status: "NOT_PROVIDED" };

    const doc = generateDocument(state);
    const addressSection = doc.sections.find(
      (s) => s.title === "2. Home Address",
    );

    expect(addressSection).toBeDefined();
    expect(addressSection!.content).toBe("Not provided");
    expect(doc.content).not.toContain("i don't know");
    expect(doc.content).not.toContain("NOT_PROVIDED");
  });

  // Test 9 — End-to-end multi-turn interview flow
  it("Test 9 — advances smoothly without repeating question when user doesn't know, and multi-fact children answers still function", async () => {
    const session = await service.createSession();

    // Turn 1: Full name
    const turn1 = await service.processSessionMessage(
      session.id,
      "Arthur Dent",
    );
    expect(turn1.status).toBe("QUESTION");
    if (turn1.status === "QUESTION") {
      expect(turn1.question.id).toBe("homeAddress");
    }

    // Turn 2: Non-answer to homeAddress
    const turn2 = await service.processSessionMessage(
      session.id,
      "i dont know",
    );
    expect(turn2.status).toBe("QUESTION");
    expect(turn2.state.homeAddress.status).toBe("NOT_PROVIDED");
    expect(turn2.state.homeAddress.value).toBeNull();

    // Must NOT ask homeAddress again!
    if (turn2.status === "QUESTION") {
      expect(turn2.question.id).toBe("coversWorldwideAssets");
    }

    // Turn 3: Worldwide assets
    const turn3 = await service.processSessionMessage(session.id, "Yes");
    expect(turn3.status).toBe("QUESTION");
    if (turn3.status === "QUESTION") {
      expect(turn3.question.id).toBe("hasChildren");
    }

    // Turn 4: Multi-fact children answer from Phase 13 fix
    const turn4 = await service.processSessionMessage(
      session.id,
      "yes i have 2 children, the daughters name is sarah, the sons name is bob",
    );
    expect(turn4.status).toBe("QUESTION");
    if (turn4.status !== "QUESTION") {
      throw new Error("expected QUESTION");
    }
    expect(turn4.state.hasChildren.status).toBe("CONFIRMED");
    expect(turn4.state.hasChildren.value).toBe(true);
    expect(turn4.state.children).toEqual([
      { value: "Sarah (daughter)", status: "CONFIRMED" },
      { value: "Bob (son)", status: "CONFIRMED" },
    ]);

    // Children question must be skipped and executor requested next
    if (turn4.status === "QUESTION") {
      expect(turn4.question.id).toBe("executor.name");
    }

    // Verify document contains both Not provided for address and child names
    const doc = turn4.document;
    const addressSec = doc.sections.find((s) => s.title === "2. Home Address");
    const childrenSec = doc.sections.find((s) => s.title === "4. Children");

    expect(addressSec!.content).toBe("Not provided");
    expect(childrenSec!.content).toContain("- Sarah (daughter)");
    expect(childrenSec!.content).toContain("- Bob (son)");
  });
});
