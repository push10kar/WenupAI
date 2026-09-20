import { describe, it, expect, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import {
  createDatabase,
  SQLiteSessionRepository,
} from "../../src/infrastructure/db";
import { InterviewService } from "../../src/application/interview";
import { MockLLMClient } from "../../src/infrastructure/llm";
import {
  createInitialState,
  createConfirmedField,
  generateDocument,
} from "../../src/domain";

describe("Phase 12: Comprehensive 40-Scenario End-to-End Suite", () => {
  let db: DatabaseSync;
  let repo: SQLiteSessionRepository;
  let mockLLM: MockLLMClient;
  let service: InterviewService;

  beforeEach(() => {
    db = createDatabase(":memory:");
    repo = new SQLiteSessionRepository(db);
    mockLLM = new MockLLMClient();
    service = new InterviewService({
      llmClient: mockLLM,
      sessionRepository: repo,
    });
  });

  it("TEST 01 — Happy Path, One Field at a Time", async () => {
    const session = await service.createSession();
    expect(session.state.fullName.status).toBe("UNKNOWN");

    // Turn 1: Name
    await service.processSessionMessage(
      session.id,
      "My full name is Rahul Sharma.",
    );
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Rahul Sharma");
    expect(curr.state.fullName.status).toBe("CONFIRMED");

    // Turn 2: Address
    await service.processSessionMessage(
      session.id,
      "I live at 42 MG Road, Pune, Maharashtra.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.homeAddress.value).toBe("42 MG Road, Pune, Maharashtra");
    expect(curr.state.homeAddress.status).toBe("CONFIRMED");

    // Turn 3: Worldwide Assets
    await service.processSessionMessage(
      session.id,
      "Yes, my document should cover assets worldwide.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.coversWorldwideAssets.value).toBe(true);
    expect(curr.state.coversWorldwideAssets.status).toBe("CONFIRMED");

    // Turn 4: Has Children count
    await service.processSessionMessage(session.id, "I have two children.");
    curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(true);

    // Turn 5: Child names
    await service.processSessionMessage(
      session.id,
      "Their names are Aarav and Ananya.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.children.map((c) => c.value)).toEqual([
      "Aarav",
      "Ananya",
    ]);

    // Turn 6: Executor
    await service.processSessionMessage(
      session.id,
      "My executor is my brother James Sharma.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("James Sharma");
    expect(curr.state.executor.relationship.value).toBe("Brother");

    // Turn 7: Specific gifts 1
    await service.processSessionMessage(
      session.id,
      "I want my laptop to go to Aarav.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.specificGifts.length).toBe(1);
    expect(curr.state.specificGifts[0].value).toBe(
      "I want my laptop to go to Aarav.",
    );

    // Turn 8: Specific gifts 2
    await service.processSessionMessage(
      session.id,
      "I want my watch to go to James.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.specificGifts.length).toBe(2);
    expect(curr.state.specificGifts.map((g) => g.value)).toEqual([
      "I want my laptop to go to Aarav.",
      "I want my watch to go to James.",
    ]);

    // Turn 9: Additional Wishes
    await service.processSessionMessage(
      session.id,
      "Please keep the family photographs together.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.additionalWishes.value).toBe(
      "Please keep the family photographs together.",
    );

    // Final Document check
    const doc = curr.document;
    expect(doc.content).toContain("Rahul Sharma");
    expect(doc.content).toContain("42 MG Road, Pune, Maharashtra");
    expect(doc.content).toContain("Aarav");
    expect(doc.content).toContain("Ananya");
    expect(doc.content).toContain("James Sharma");
    expect(doc.content).toContain("Brother");
    expect(doc.content).toContain("I want my laptop to go to Aarav.");
    expect(doc.content).toContain("I want my watch to go to James.");
    expect(doc.content).toContain(
      "Please keep the family photographs together.",
    );
  });

  it("TEST 02 — Multiple Fields in ONE Message", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "My name is Priya Mehta, I live at 17 FC Road, Pune, I don't have any children, and my executor is my sister Neha Mehta.",
    );
    const curr = (await service.getSession(session.id))!;

    expect(curr.state.fullName.value).toBe("Priya Mehta");
    expect(curr.state.homeAddress.value).toBe("17 FC Road, Pune");
    expect(curr.state.hasChildren.value).toBe(false);
    expect(curr.state.executor.name.value).toBe("Neha Mehta");
    expect(curr.state.executor.relationship.value).toBe("Sister");
  });

  it("TEST 03 — Multiple Fields + Worldwide Assets", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "I'm Daniel Wilson. I live at 12 King Street, London. I don't have children, and I want this document to cover assets I own worldwide.",
    );
    const curr = (await service.getSession(session.id))!;

    expect(curr.state.fullName.value).toBe("Daniel Wilson");
    expect(curr.state.homeAddress.value).toBe("12 King Street, London");
    expect(curr.state.hasChildren.value).toBe(false);
    expect(curr.state.hasChildren.status).toBe("CONFIRMED");
    expect(curr.state.coversWorldwideAssets.value).toBe(true);
    expect(curr.state.coversWorldwideAssets.status).toBe("CONFIRMED");
  });

  it("TEST 04 — Boolean False Test", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Arjun Patel.");
    await service.processSessionMessage(session.id, "I live at 10 MG Road.");
    await service.processSessionMessage(
      session.id,
      "I do not want the document to cover assets outside India.",
    );

    const curr = (await service.getSession(session.id))!;
    expect(curr.state.coversWorldwideAssets.value).toBe(false);
    expect(curr.state.coversWorldwideAssets.status).toBe("CONFIRMED");
    expect(curr.document.content).toContain("3. Worldwide Asset Coverage\nNo");
  });

  it("TEST 05 — Children Conditional Branch", async () => {
    // Session A: No children
    const sessionA = await service.createSession();
    await service.processSessionMessage(
      sessionA.id,
      "My name is Sameer Joshi.",
    );
    await service.processSessionMessage(sessionA.id, "I live at 1 Main St.");
    await service.processSessionMessage(sessionA.id, "Yes worldwide.");
    const turnResA = await service.processSessionMessage(
      sessionA.id,
      "I don't have any children.",
    );
    expect(turnResA.state.hasChildren.value).toBe(false);
    expect(turnResA.state.children).toEqual([]);
    if (turnResA.status === "QUESTION") {
      expect(turnResA.question.id).not.toBe("children");
    }

    // Session B: Has children
    const sessionB = await service.createSession();
    await service.processSessionMessage(
      sessionB.id,
      "My name is Sameer Joshi.",
    );
    await service.processSessionMessage(sessionB.id, "I live at 1 Main St.");
    await service.processSessionMessage(sessionB.id, "Yes worldwide.");
    const turnResB = await service.processSessionMessage(
      sessionB.id,
      "I have children.",
    );
    expect(turnResB.state.hasChildren.value).toBe(true);

    const childNamesTurn = await service.processSessionMessage(
      sessionB.id,
      "Their names are Riya and Kabir.",
    );
    expect(childNamesTurn.state.children.map((c) => c.value)).toEqual([
      "Riya",
      "Kabir",
    ]);
  });

  it("TEST 06 — Three Children in Natural Language", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "I have three children: Maya, Rohan, and Tara.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(true);
    expect(curr.state.children.map((c) => c.value)).toEqual([
      "Maya",
      "Rohan",
      "Tara",
    ]);
  });

  it("TEST 07 — Executor Split Across Messages", async () => {
    const session = await service.createSession();
    // Advance to executor
    session.state.fullName = createConfirmedField("Test User");
    session.state.homeAddress = createConfirmedField("123 Street");
    session.state.coversWorldwideAssets = createConfirmedField(true);
    session.state.hasChildren = createConfirmedField(false);
    await repo.saveTurn(
      session.id,
      { id: "m1", role: "user", content: "setup" },
      session.state,
      null,
      1,
    );

    await service.processSessionMessage(session.id, "My executor is James.");
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("James");
    expect(curr.state.executor.relationship.status).toBe("UNKNOWN");

    await service.processSessionMessage(session.id, "He is my brother.");
    curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("James");
    expect(curr.state.executor.relationship.value).toBe("Brother");
  });

  it("TEST 08 — Executor Given Completely in One Message", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "My executor will be my sister Neha Patel.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("Neha Patel");
    expect(curr.state.executor.relationship.value).toBe("Sister");
  });

  it("TEST 09 — Correction: Name", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Rahul Sharma.");
    await service.processSessionMessage(
      session.id,
      "Actually, my name is Rohan Sharma.",
    );
    const curr = (await service.getSession(session.id))!;

    expect(curr.state.fullName.value).toBe("Rohan Sharma");
    expect(curr.state.fullName.status).toBe("CONFIRMED");
    expect(curr.document.content).toContain("Rohan Sharma");
    expect(curr.document.content).not.toContain("Rahul Sharma");
    expect(curr.messages.length).toBeGreaterThanOrEqual(4);
  });

  it("TEST 10 — Correction: Address", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Rahul Sharma.");
    await service.processSessionMessage(
      session.id,
      "My address is 10 Park Street, Pune.",
    );
    await service.processSessionMessage(
      session.id,
      "Correction: I moved. My address is now 25 River Road, Pune.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.homeAddress.value).toBe("25 River Road, Pune");
    expect(curr.document.content).toContain("25 River Road, Pune");
    expect(curr.document.content).not.toContain("10 Park Street, Pune");
  });

  it("TEST 11 — Correction: Boolean", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Rahul Sharma.");
    await service.processSessionMessage(
      session.id,
      "My address is 10 Park Street, Pune.",
    );
    await service.processSessionMessage(
      session.id,
      "Yes, my assets worldwide should be covered.",
    );
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.coversWorldwideAssets.value).toBe(true);

    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "coversWorldwideAssets",
          value: false,
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "Actually, no. Only my assets in India should be covered.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.coversWorldwideAssets.value).toBe(false);
    expect(curr.state.coversWorldwideAssets.status).toBe("CONFIRMED");
    expect(curr.document.content).toContain("3. Worldwide Asset Coverage\nNo");
  });

  it("TEST 12 — Correction: Children", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "I have two children, Aisha and Kabir.",
    );
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.children.map((c) => c.value)).toEqual(["Aisha", "Kabir"]);

    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "children",
          value: ["Aisha", "Kabir", "Rohan"],
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "Sorry, I forgot to mention another child, Rohan.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.children.map((c) => c.value)).toEqual([
      "Aisha",
      "Kabir",
      "Rohan",
    ]);
  });

  it("TEST 13 — Ambiguous Executor", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My executor is Alex.");
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("Alex");
    expect(curr.state.executor.relationship.status).toBe("UNKNOWN");

    await service.processSessionMessage(session.id, "Alex is my cousin.");
    curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("Alex");
    expect(curr.state.executor.relationship.value).toBe("Cousin");
  });

  it("TEST 14 — Ambiguous Address", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Alex.");
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "homeAddress",
          value: "Pune",
          intent: "NEW",
          confidence: "AMBIGUOUS",
        },
      ],
    });
    await service.processSessionMessage(session.id, "I live in Pune.");
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.homeAddress.status).toBe("UNCONFIRMED");

    await service.processSessionMessage(
      session.id,
      "My address is 42 Baner Road, Pune, Maharashtra.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.homeAddress.status).toBe("CONFIRMED");
    expect(curr.state.homeAddress.value).toMatch(
      /^42 Baner Road, Pune, Maharashtra\.?$/,
    );
  });

  it("TEST 15 — 'I Don't Know' (Non-Answer)", async () => {
    const session = await service.createSession();
    session.state.fullName = createConfirmedField("Test User");
    session.state.homeAddress = createConfirmedField("123 Street");
    session.state.coversWorldwideAssets = createConfirmedField(true);
    session.state.hasChildren = createConfirmedField(false);
    await repo.saveTurn(
      session.id,
      { id: "m1", role: "user", content: "setup" },
      session.state,
      null,
      1,
    );

    await service.processSessionMessage(
      session.id,
      "I don't know who should be my executor yet.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.status).toBe("NOT_PROVIDED");
    expect(curr.state.executor.name.value).toBeNull();
    expect(curr.document.content).toContain("Name: Not provided");
  });

  it("TEST 16 — Refusal / Not Providing Information", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is John Doe.");
    await service.processSessionMessage(
      session.id,
      "I don't want to provide my home address right now.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.homeAddress.status).toBe("REFUSED");
    expect(curr.state.homeAddress.value).toBeNull();
    expect(curr.document.content).toContain("2. Home Address\nNot provided");
  });

  it("TEST 17 — Contradictory Children Information with Correction", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "I don't have any children.",
    );
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(false);

    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "hasChildren",
          value: true,
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
        {
          field: "children",
          value: ["Maya", "Rohan"],
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "Actually, I have two children, Maya and Rohan.",
    );
    curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(true);
    expect(curr.state.children.map((c) => c.value)).toEqual(["Maya", "Rohan"]);
  });

  it("TEST 18 — Contradiction Without Correction Language", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "I have two children.");
    let curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(true);

    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "hasChildren",
          value: false,
          intent: "NEW", // NEW intent triggers conflict detection against CONFIRMED state!
          confidence: "CLEAR",
        },
      ],
    });

    const res = await service.processSessionMessage(
      session.id,
      "I have no children.",
    );
    expect(res.status).toBe("CONFLICT");
    // Authoritative state unchanged
    curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(true);
  });

  it("TEST 19 — Same Information Repeated", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Ananya Rao.");
    await service.processSessionMessage(
      session.id,
      "As I mentioned, my name is Ananya Rao.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Ananya Rao");
    expect(curr.state.fullName.status).toBe("CONFIRMED");
  });

  it("TEST 20 — Repeated Executor", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "My executor is my brother James.",
    );
    await service.processSessionMessage(
      session.id,
      "Just to confirm, James is my brother and he's my executor.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("James");
    expect(curr.state.executor.relationship.value).toBe("Brother");
  });

  it("TEST 21 — Information in Weird Order", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "My executor is my sister Neha.",
    );
    await service.processSessionMessage(
      session.id,
      "I have two children, Aarav and Riya.",
    );
    await service.processSessionMessage(
      session.id,
      "My address is 15 Hill Road, Pune.",
    );
    await service.processSessionMessage(session.id, "My name is Vikram Shah.");
    await service.processSessionMessage(
      session.id,
      "No, I don't want worldwide assets covered.",
    );

    const curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.name.value).toBe("Neha");
    expect(curr.state.executor.relationship.value).toBe("Sister");
    expect(curr.state.hasChildren.value).toBe(true);
    expect(curr.state.children.map((c) => c.value)).toEqual(["Aarav", "Riya"]);
    expect(curr.state.homeAddress.value).toBe("15 Hill Road, Pune");
    expect(curr.state.fullName.value).toBe("Vikram Shah");
    expect(curr.state.coversWorldwideAssets.value).toBe(false);
  });

  it("TEST 22 — Answer Several Previously Asked Questions at Once", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "My name is Aditya Rao, I live at 22 MG Road Pune, I don't have children, and my executor is my brother Karan.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Aditya Rao");
    expect(curr.state.homeAddress.value).toBe("22 MG Road Pune");
    expect(curr.state.hasChildren.value).toBe(false);
    expect(curr.state.executor.name.value).toBe("Karan");
    expect(curr.state.executor.relationship.value).toBe("Brother");
  });

  it("TEST 23 — Correction Buried Inside a Long Message", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Amit Patel.");
    await service.processSessionMessage(
      session.id,
      "My address is 10 FC Road.",
    );

    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "homeAddress",
          value: "84 University Road, Pune",
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "Just going back to something I said earlier, I initially gave the wrong address. The address I gave before was 10 FC Road, but that's old. Please use 84 University Road, Pune as my current home address. Everything else I told you is unchanged.",
    );

    const curr = (await service.getSession(session.id))!;
    expect(curr.state.homeAddress.value).toBe("84 University Road, Pune");
    expect(curr.state.fullName.value).toBe("Amit Patel");
  });

  it("TEST 24 — Natural Conversational Filler", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "Yeah, so basically, my full name is Arjun Deshmukh, and yeah, I live at 18 Model Colony in Pune.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Arjun Deshmukh");
    expect(curr.state.homeAddress.value).toBe("18 Model Colony in Pune");
  });

  it("TEST 25 — Compound Gift Information", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "specificGifts",
          value: [
            "car to brother James",
            "watch to daughter Emma",
            "laptop to son Noah",
          ],
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "I want my car to go to my brother James, my watch to my daughter Emma, and my laptop to my son Noah.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.specificGifts.length).toBe(3);
    expect(curr.state.specificGifts.map((g) => g.value)).toEqual([
      "car to brother James",
      "watch to daughter Emma",
      "laptop to son Noah",
    ]);
  });

  it("TEST 26 — Additional Wishes as Free Text", async () => {
    const session = await service.createSession();
    const wish =
      "One additional wish is that my family should keep all of my old photographs together and not separate them between different homes.";
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "additionalWishes",
          value: wish,
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(session.id, wish);
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.additionalWishes.value).toBe(wish);
  });

  it("TEST 27 — Mixed Structured + Free-Text Information", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "fullName",
          value: "Rahul Mehta",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "hasChildren",
          value: false,
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "executor.name",
          value: "Priya",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "executor.relationship",
          value: "Sister",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "additionalWishes",
          value: "The family should meet every year on my birthday.",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "I'm Rahul Mehta, I don't have children, my executor is my sister Priya, and one additional wish is that the family should meet every year on my birthday.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Rahul Mehta");
    expect(curr.state.hasChildren.value).toBe(false);
    expect(curr.state.executor.name.value).toBe("Priya");
    expect(curr.state.executor.relationship.value).toBe("Sister");
    expect(curr.state.additionalWishes.value).toBe(
      "The family should meet every year on my birthday.",
    );
  });

  it("TEST 28 — Information That Should NOT Become a Field", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(
      session.id,
      "My name is Rahul Sharma. I really hope this process doesn't take too long.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Rahul Sharma");
    expect(curr.state.additionalWishes.status).toBe("UNKNOWN");
    expect(curr.state.additionalWishes.value).toBeNull();
  });

  it("TEST 29 — Question Already Answered Not Repeated", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is John Doe.");
    await service.processSessionMessage(
      session.id,
      "My address is 10 Main St.",
    );
    await service.processSessionMessage(
      session.id,
      "Worldwide assets covered.",
    );
    const turnRes = await service.processSessionMessage(
      session.id,
      "No, I don't.",
    ); // children: false
    expect(turnRes.state.hasChildren.value).toBe(false);
    if (turnRes.status === "QUESTION") {
      expect(turnRes.question.id).not.toBe("hasChildren");
      expect(turnRes.question.id).not.toBe("children");
    }
  });

  it("TEST 30 — Document Must Never Invent", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Arjun Patel.");
    const curr = (await service.getSession(session.id))!;
    const doc = curr.document;

    expect(doc.content).toContain("1. Full Name\nArjun Patel");
    expect(doc.content).toContain("2. Home Address\nNot provided");
    expect(doc.content).toContain("3. Worldwide Asset Coverage\nNot provided");
    expect(doc.content).toContain("4. Children\nNot provided");
    expect(doc.content).toContain(
      "Name: Not provided\nRelationship: Not provided",
    );
  });

  it("TEST 31 — Document Must Follow State, Not Conversation", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My executor is James.");
    await service.processSessionMessage(session.id, "James is my brother.");

    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "executor.relationship",
          value: "Cousin",
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "Actually, James is my cousin.",
    );
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.executor.relationship.value).toBe("Cousin");
    expect(curr.document.content).toContain("Relationship: Cousin");
    expect(curr.document.content).not.toContain("Relationship: Brother");
  });

  it("TEST 32 — Refresh Mid-Conversation", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Rahul Sharma.");
    await service.processSessionMessage(
      session.id,
      "I live at 25 MG Road, Pune.",
    );

    // Simulate browser refresh / GET /api/sessions/:id
    const refreshed = (await service.getSession(session.id))!;
    expect(refreshed.messages.length).toBeGreaterThanOrEqual(4);
    expect(refreshed.state.fullName.value).toBe("Rahul Sharma");
    expect(refreshed.state.homeAddress.value).toBe("25 MG Road, Pune");

    // Continue conversation
    await service.processSessionMessage(session.id, "I don't have children.");
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.hasChildren.value).toBe(false);
  });

  it("TEST 33 — Refresh After Correction", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Rahul Sharma.");
    await service.processSessionMessage(
      session.id,
      "Actually, my name is Rohan Sharma.",
    );

    // Refresh
    const refreshed = (await service.getSession(session.id))!;
    expect(refreshed.state.fullName.value).toBe("Rohan Sharma");
    expect(refreshed.document.content).toContain("Rohan Sharma");
    expect(refreshed.document.content).not.toContain("Rahul Sharma");
  });

  it("TEST 34 — LLM Failure After Valid State", async () => {
    const session = await service.createSession();
    await service.processSessionMessage(session.id, "My name is Rahul Sharma.");

    // Force LLM error
    mockLLM.queueExtractionError(new Error("LLM Rate Limited"));

    const failResult = await service.processSessionMessage(
      session.id,
      "I live at 42 MG Road, Pune.",
    );
    expect(failResult.status).toBe("PROVIDER_ERROR");

    // Authoritative state untouched
    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Rahul Sharma");
    expect(curr.state.homeAddress.value).toBeNull();
  });

  it("TEST 35 — Malformed LLM Response", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult("MALFORMED_NON_OBJECT_JSON");

    const failResult = await service.processSessionMessage(
      session.id,
      "My name is Rahul Sharma.",
    );
    expect(failResult.status).toBe("VALIDATION_ERROR");

    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBeNull();
  });

  it("TEST 36 — Invalid Field From MockLLM", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "bankAccountNumber",
          value: "123456",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    const res = await service.processSessionMessage(session.id, "Hello");
    expect(res.status).toBe("VALIDATION_ERROR");
  });

  it("TEST 37 — Wrong Type", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "coversWorldwideAssets",
          value: "yes", // should be boolean!
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    const res = await service.processSessionMessage(
      session.id,
      "Yes worldwide",
    );
    expect(res.status).toBe("VALIDATION_ERROR");
  });

  it("TEST 38 — Cross-Field Conflict", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "hasChildren",
          value: false,
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "children",
          value: ["Emma"],
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    const res = await service.processSessionMessage(
      session.id,
      "No children but Emma",
    );
    expect(res.status).toBe("VALIDATION_ERROR");
  });

  it("TEST 39 — Massive Multi-Field Turn", async () => {
    const session = await service.createSession();
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "fullName",
          value: "Neel Kapoor",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "homeAddress",
          value: "91 Koregaon Park, Pune, Maharashtra",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "coversWorldwideAssets",
          value: true,
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
          field: "children",
          value: ["Aanya", "Kabir", "Meera"],
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "executor.name",
          value: "Radhika Kapoor",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "executor.relationship",
          value: "Sister",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "specificGifts",
          value: ["car to Kabir", "watch to Radhika"],
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "additionalWishes",
          value: "family photographs should remain together",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "My full name is Neel Kapoor. I live at 91 Koregaon Park, Pune, Maharashtra. I want the document to cover my assets worldwide. I have three children named Aanya, Kabir, and Meera. My executor is my sister Radhika Kapoor. I want my car to go to Kabir and my watch to go to Radhika. One additional wish is that my family photographs should remain together.",
    );

    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Neel Kapoor");
    expect(curr.state.homeAddress.value).toBe(
      "91 Koregaon Park, Pune, Maharashtra",
    );
    expect(curr.state.coversWorldwideAssets.value).toBe(true);
    expect(curr.state.hasChildren.value).toBe(true);
    expect(curr.state.children.map((c) => c.value)).toEqual([
      "Aanya",
      "Kabir",
      "Meera",
    ]);
    expect(curr.state.executor.name.value).toBe("Radhika Kapoor");
    expect(curr.state.executor.relationship.value).toBe("Sister");
    expect(curr.state.specificGifts.map((g) => g.value)).toEqual([
      "car to Kabir",
      "watch to Radhika",
    ]);
    expect(curr.state.additionalWishes.value).toBe(
      "family photographs should remain together",
    );
  });

  it("TEST 40 — The Ultimate Correction Test", async () => {
    const session = await service.createSession();
    // 1. Initial complete state
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "fullName",
          value: "Arjun Mehta",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "homeAddress",
          value: "10 Park Street, Pune",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "coversWorldwideAssets",
          value: true,
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
          field: "children",
          value: ["Riya", "Kabir"],
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "executor.name",
          value: "Rahul",
          intent: "NEW",
          confidence: "CLEAR",
        },
        {
          field: "executor.relationship",
          value: "Brother",
          intent: "NEW",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "My name is Arjun Mehta, I live at 10 Park Street, Pune, I have two children Riya and Kabir, my executor is my brother Rahul, and my assets should be covered worldwide.",
    );

    // 2. Correct everything in a single turn
    mockLLM.queueExtractionResult({
      updates: [
        {
          field: "fullName",
          value: "Arjun Malhotra",
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
        {
          field: "homeAddress",
          value: "55 University Road, Mumbai",
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
        {
          field: "coversWorldwideAssets",
          value: false,
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
        {
          field: "children",
          value: ["Riya", "Kabir", "Tara"],
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
        {
          field: "executor.name",
          value: "Priya",
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
        {
          field: "executor.relationship",
          value: "Sister",
          intent: "CORRECTION",
          confidence: "CLEAR",
        },
      ],
    });

    await service.processSessionMessage(
      session.id,
      "I need to correct several things. My name is actually Arjun Malhotra, my address is 55 University Road, Mumbai, I have three children Riya, Kabir and Tara, my executor is actually my sister Priya, and I do not want worldwide assets covered.",
    );

    const curr = (await service.getSession(session.id))!;
    expect(curr.state.fullName.value).toBe("Arjun Malhotra");
    expect(curr.state.homeAddress.value).toBe("55 University Road, Mumbai");
    expect(curr.state.coversWorldwideAssets.value).toBe(false);
    expect(curr.state.children.map((c) => c.value)).toEqual([
      "Riya",
      "Kabir",
      "Tara",
    ]);
    expect(curr.state.executor.name.value).toBe("Priya");
    expect(curr.state.executor.relationship.value).toBe("Sister");

    // Verify document contains NO stale values
    const doc = curr.document.content;
    expect(doc).toContain("Arjun Malhotra");
    expect(doc).not.toContain("Arjun Mehta");
    expect(doc).toContain("55 University Road, Mumbai");
    expect(doc).not.toContain("10 Park Street");
    expect(doc).toContain("3. Worldwide Asset Coverage\nNo");
    expect(doc).toContain("Priya");
    expect(doc).not.toContain("Name: Rahul");
  });
});
