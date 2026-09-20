import { describe, expect, it } from "vitest";
import {
  createConfirmedField,
  createConflictedField,
  createInitialState,
  createUnconfirmedField,
  createUnknownField,
  getAllQuestions,
  getQuestion,
  getUnresolvedFields,
  isInterviewComplete,
  PersonalWishesState,
  QUESTION_CATALOG,
  QUESTION_IDS,
  QUESTION_ORDER,
  selectNextQuestion,
} from "../../src/domain";

function createCompleteStateWithChildren(): PersonalWishesState {
  return {
    fullName: createConfirmedField("Arthur Dent"),
    homeAddress: createConfirmedField("Cottington, Cottington Lane, UK"),
    coversWorldwideAssets: createConfirmedField(true),
    hasChildren: createConfirmedField(true),
    children: [createConfirmedField("Random Dent")],
    executor: {
      name: createConfirmedField("Ford Prefect"),
      relationship: createConfirmedField("Friend"),
    },
    specificGifts: [createConfirmedField("Sub-Etha Sens-O-Matic to Ford")],
    additionalWishes: createConfirmedField("Always know where your towel is."),
  };
}

function createCompleteStateWithoutChildren(): PersonalWishesState {
  return {
    fullName: createConfirmedField("Arthur Dent"),
    homeAddress: createConfirmedField("Cottington, Cottington Lane, UK"),
    coversWorldwideAssets: createConfirmedField(true),
    hasChildren: createConfirmedField(false),
    children: [],
    executor: {
      name: createConfirmedField("Ford Prefect"),
      relationship: createConfirmedField("Friend"),
    },
    specificGifts: [createConfirmedField("Sub-Etha Sens-O-Matic to Ford")],
    additionalWishes: createConfirmedField("Always know where your towel is."),
  };
}

describe("Phase 6: Deterministic Question Selection", () => {
  describe("Question Catalog & Stability", () => {
    it("has exactly 9 canonical questions in the catalog", () => {
      expect(QUESTION_IDS.length).toBe(9);
      expect(Object.keys(QUESTION_CATALOG).length).toBe(9);
    });

    it("defines stable, unique identifiers matching ALLOWED_FIELDS", () => {
      const ids = new Set<string>();
      for (const id of QUESTION_IDS) {
        expect(ids.has(id)).toBe(false);
        ids.add(id);

        const question = QUESTION_CATALOG[id];
        expect(question).toBeDefined();
        expect(question.id).toBe(id);
        expect(question.field).toBe(id);
        expect(question.targetField).toBe(id);
        expect(typeof question.prompt).toBe("string");
        expect(question.prompt.trim().length).toBeGreaterThan(0);
      }
    });

    it("preserves the deterministic question ordering defined in ARCHITECTURE.md §6.5", () => {
      expect(QUESTION_ORDER).toEqual([
        "fullName",
        "homeAddress",
        "coversWorldwideAssets",
        "hasChildren",
        "children",
        "executor.name",
        "executor.relationship",
        "specificGifts",
        "additionalWishes",
      ]);
    });

    it("retrieves defensive question copies via getQuestion and getAllQuestions", () => {
      const q = getQuestion("fullName");
      expect(q.id).toBe("fullName");
      expect(q.prompt).toBe("What is your full legal name?");

      const all = getAllQuestions();
      expect(all.length).toBe(9);
      expect(all.map((item) => item.id)).toEqual(QUESTION_ORDER);
    });
  });

  describe("Initial State", () => {
    it("returns fullName as the first question on initial state", () => {
      const state = createInitialState();
      const result = selectNextQuestion(state);

      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("fullName");
        expect(result.question.field).toBe("fullName");
      }
    });

    it("reports interview is not complete on initial state", () => {
      const state = createInitialState();
      expect(isInterviewComplete(state)).toBe(false);
      expect(getUnresolvedFields(state).length).toBeGreaterThan(0);
      expect(getUnresolvedFields(state)[0]).toBe("fullName");
    });
  });

  describe("Sequential Progression (Happy Path)", () => {
    it("progresses through all questions in exact canonical priority", () => {
      const state = createInitialState();

      // Step 1: fullName
      let result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("fullName");
      }

      // Answer fullName
      state.fullName = createConfirmedField("Arthur Dent");
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("homeAddress");
      }

      // Answer homeAddress
      state.homeAddress = createConfirmedField("Cottington Lane");
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("coversWorldwideAssets");
      }

      // Answer coversWorldwideAssets
      state.coversWorldwideAssets = createConfirmedField(true);
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("hasChildren");
      }

      // Answer hasChildren = true
      state.hasChildren = createConfirmedField(true);
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("children");
      }

      // Answer children
      state.children = [createConfirmedField("Random Dent")];
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("executor.name");
      }

      // Answer executor.name
      state.executor.name = createConfirmedField("Ford Prefect");
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("executor.relationship");
      }

      // Answer executor.relationship
      state.executor.relationship = createConfirmedField("Friend");
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("specificGifts");
      }

      // Answer specificGifts
      state.specificGifts = [createConfirmedField("Towel")];
      result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("additionalWishes");
      }

      // Answer additionalWishes
      state.additionalWishes = createConfirmedField("None");
      result = selectNextQuestion(state);
      expect(result.status).toBe("COMPLETE");
      expect(isInterviewComplete(state)).toBe(true);
    });
  });

  describe("Conditional Branching: hasChildren", () => {
    it("skips children question when hasChildren is confirmed false", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(false);
      state.hasChildren = createConfirmedField(false);

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        // Direct jump to executor.name, skipping children!
        expect(result.question.id).toBe("executor.name");
      }
    });

    it("requires children question when hasChildren is confirmed true and children is empty", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(true);
      state.children = [];

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("children");
      }
    });

    it("requires children question if any child entry is UNCONFIRMED or blank", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(true);
      state.children = [
        createConfirmedField("Sarah"),
        createUnconfirmedField("Maybe John"),
      ];

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("children");
      }
    });

    it("does not require children before hasChildren is confirmed", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(true);
      // hasChildren remains UNKNOWN
      state.hasChildren = createUnknownField<boolean>();

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("hasChildren");
      }
    });
  });

  describe("Out-of-Order / Partially Completed States", () => {
    it("skips already-confirmed fields when later fields were collected first", () => {
      const state = createInitialState();
      // User provided executor info early, but fullName is still unknown
      state.executor.name = createConfirmedField("Trillian Astra");
      state.executor.relationship = createConfirmedField("Friend");
      state.additionalWishes = createConfirmedField("Don't Panic");

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("fullName");
      }

      // Now confirm fullName
      state.fullName = createConfirmedField("Arthur Dent");
      const nextResult = selectNextQuestion(state);
      expect(nextResult.status).toBe("QUESTION_AVAILABLE");
      if (nextResult.status === "QUESTION_AVAILABLE") {
        expect(nextResult.question.id).toBe("homeAddress");
      }
    });

    it("skips confirmed executor fields and proceeds to specificGifts", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.homeAddress = createConfirmedField("Cottington Lane");
      state.coversWorldwideAssets = createConfirmedField(true);
      state.hasChildren = createConfirmedField(false);
      state.executor.name = createConfirmedField("Ford Prefect");
      state.executor.relationship = createConfirmedField("Friend");
      // specificGifts is still empty

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("specificGifts");
      }
    });
  });

  describe("Completion Status", () => {
    it("returns COMPLETE when all required fields are confirmed (with children)", () => {
      const state = createCompleteStateWithChildren();
      const result = selectNextQuestion(state);

      expect(result.status).toBe("COMPLETE");
      expect(isInterviewComplete(state)).toBe(true);
      expect(getUnresolvedFields(state)).toEqual([]);
    });

    it("returns COMPLETE when all required fields are confirmed (without children)", () => {
      const state = createCompleteStateWithoutChildren();
      const result = selectNextQuestion(state);

      expect(result.status).toBe("COMPLETE");
      expect(isInterviewComplete(state)).toBe(true);
      expect(getUnresolvedFields(state)).toEqual([]);
    });

    it("returns QUESTION_AVAILABLE if even one required field is missing from complete state", () => {
      const state = createCompleteStateWithChildren();
      state.additionalWishes = createUnknownField<string>();

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("additionalWishes");
      }
      expect(isInterviewComplete(state)).toBe(false);
    });
  });

  describe("Handling UNCONFIRMED, CONFLICTED, and Invalid Values", () => {
    it("treats UNCONFIRMED scalar field as unresolved", () => {
      const state = createCompleteStateWithoutChildren();
      state.homeAddress = createUnconfirmedField("Unclear Address");

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("homeAddress");
      }
    });

    it("treats CONFLICTED scalar field as unresolved", () => {
      const state = createCompleteStateWithoutChildren();
      state.executor.relationship = createConflictedField("Friend vs Brother");

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("executor.relationship");
      }
    });

    it("treats CONFIRMED field with null or blank string as unresolved", () => {
      const state = createCompleteStateWithoutChildren();
      state.fullName = { value: "   ", status: "CONFIRMED" };

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("fullName");
      }
    });

    it("treats specificGifts with UNCONFIRMED item as unresolved", () => {
      const state = createCompleteStateWithoutChildren();
      state.specificGifts = [createUnconfirmedField("Maybe car")];

      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");
      if (result.status === "QUESTION_AVAILABLE") {
        expect(result.question.id).toBe("specificGifts");
      }
    });
  });

  describe("Immutability, Determinism & Caller Safety", () => {
    it("does not mutate canonical state during question selection", () => {
      const state = createInitialState();
      const snapshot = JSON.parse(JSON.stringify(state));

      selectNextQuestion(state);
      expect(state).toEqual(snapshot);

      getUnresolvedFields(state);
      expect(state).toEqual(snapshot);

      isInterviewComplete(state);
      expect(state).toEqual(snapshot);
    });

    it("produces strictly identical results across multiple invocations with same state", () => {
      const state = createInitialState();
      const first = selectNextQuestion(state);

      for (let i = 0; i < 10; i++) {
        const subsequent = selectNextQuestion(state);
        expect(subsequent).toEqual(first);
      }
    });

    it("protects catalog and future calls against mutation of returned question objects", () => {
      const state = createInitialState();
      const result = selectNextQuestion(state);
      expect(result.status).toBe("QUESTION_AVAILABLE");

      if (result.status === "QUESTION_AVAILABLE") {
        // Caller mutates the returned question object
        const mutableQuestion = result.question as unknown as {
          prompt: string;
        };
        mutableQuestion.prompt = "MUTATED PROMPT";

        // Subsequent call must return untouched catalog prompt
        const freshResult = selectNextQuestion(state);
        expect(freshResult.status).toBe("QUESTION_AVAILABLE");
        if (freshResult.status === "QUESTION_AVAILABLE") {
          expect(freshResult.question.prompt).toBe(
            "What is your full legal name?",
          );
        }
      }
    });
  });
});
