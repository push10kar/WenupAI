import { describe, expect, it } from "vitest";
import {
  createConfirmedField,
  createConflictedField,
  createInitialState,
  createUnconfirmedField,
  createUnknownField,
  generateDocument,
  PersonalWishesState,
} from "../../src/domain";

function createCompleteStateWithChildren(): PersonalWishesState {
  return {
    fullName: createConfirmedField("Arthur Dent"),
    homeAddress: createConfirmedField("Cottington Lane, Cottington, UK"),
    coversWorldwideAssets: createConfirmedField(true),
    hasChildren: createConfirmedField(true),
    children: [
      createConfirmedField("Random Dent"),
      createConfirmedField("Gail Dent"),
    ],
    executor: {
      name: createConfirmedField("Ford Prefect"),
      relationship: createConfirmedField("Friend"),
    },
    specificGifts: [
      createConfirmedField("Sub-Etha Sens-O-Matic to Ford"),
      createConfirmedField("Towel collection to museum"),
    ],
    additionalWishes: createConfirmedField("Always know where your towel is."),
  };
}

function createCompleteStateWithoutChildren(): PersonalWishesState {
  return {
    fullName: createConfirmedField("Arthur Dent"),
    homeAddress: createConfirmedField("Cottington Lane, Cottington, UK"),
    coversWorldwideAssets: createConfirmedField(false),
    hasChildren: createConfirmedField(false),
    children: [],
    executor: {
      name: createConfirmedField("Ford Prefect"),
      relationship: createConfirmedField("Friend"),
    },
    specificGifts: [createConfirmedField("Sub-Etha Sens-O-Matic to Ford")],
    additionalWishes: createConfirmedField("None"),
  };
}

describe("Phase 7: Deterministic Document Generator", () => {
  describe("Document Contract & Header", () => {
    it('returns a DocumentPreview with status "draft" and canonical title & subtitle', () => {
      const state = createInitialState();
      const doc = generateDocument(state);

      expect(doc.status).toBe("draft");
      expect(doc.title).toBe("PERSONAL WISHES DOCUMENT");
      expect(doc.subtitle).toBe("Fictional example — Not legal advice");
      expect(doc.content).toContain("PERSONAL WISHES DOCUMENT");
      expect(doc.content).toContain("Fictional example — Not legal advice");
    });

    it("contains exactly 7 ordered sections matching ARCHITECTURE.md §12.4", () => {
      const state = createInitialState();
      const doc = generateDocument(state);

      expect(doc.sections.length).toBe(7);
      expect(doc.sections.map((s) => s.title)).toEqual([
        "1. Full Name",
        "2. Home Address",
        "3. Worldwide Asset Coverage",
        "4. Children",
        "5. Executor",
        "6. Specific Gifts",
        "7. Additional Wishes",
      ]);
    });
  });

  describe("Initial / Empty State Rendering", () => {
    it("renders initial state with honest unknown representations according to ARCHITECTURE.md §12.5–12.8", () => {
      const state = createInitialState();
      const doc = generateDocument(state);

      expect(doc.sections[0].content).toBe("Not provided");
      expect(doc.sections[1].content).toBe("Not provided");
      expect(doc.sections[2].content).toBe("Not provided");
      expect(doc.sections[3].content).toBe("Not provided");
      expect(doc.sections[4].content).toBe(
        "Name: Not provided\nRelationship: Not provided",
      );
      expect(doc.sections[5].content).toBe("None provided");
      expect(doc.sections[6].content).toBe("Not provided");
    });
  });

  describe("Fully Populated State", () => {
    it("renders all fields as authoritative fact when fully confirmed (with children)", () => {
      const state = createCompleteStateWithChildren();
      const doc = generateDocument(state);

      expect(doc.sections[0].content).toBe("Arthur Dent");
      expect(doc.sections[1].content).toBe("Cottington Lane, Cottington, UK");
      expect(doc.sections[2].content).toBe("Yes");
      expect(doc.sections[3].content).toBe("- Random Dent\n- Gail Dent");
      expect(doc.sections[4].content).toBe(
        "Name: Ford Prefect\nRelationship: Friend",
      );
      expect(doc.sections[5].content).toBe(
        "- Sub-Etha Sens-O-Matic to Ford\n- Towel collection to museum",
      );
      expect(doc.sections[6].content).toBe("Always know where your towel is.");

      // Full content check
      expect(doc.content).toBe(
        "PERSONAL WISHES DOCUMENT\n\n" +
          "Fictional example — Not legal advice\n\n" +
          "1. Full Name\nArthur Dent\n\n" +
          "2. Home Address\nCottington Lane, Cottington, UK\n\n" +
          "3. Worldwide Asset Coverage\nYes\n\n" +
          "4. Children\n- Random Dent\n- Gail Dent\n\n" +
          "5. Executor\nName: Ford Prefect\nRelationship: Friend\n\n" +
          "6. Specific Gifts\n- Sub-Etha Sens-O-Matic to Ford\n- Towel collection to museum\n\n" +
          "7. Additional Wishes\nAlways know where your towel is.",
      );
    });

    it('renders coversWorldwideAssets = false as "No"', () => {
      const state = createCompleteStateWithoutChildren();
      const doc = generateDocument(state);

      expect(doc.sections[2].content).toBe("No");
    });
  });

  describe("Children Rules (§12.6)", () => {
    it('renders "No" when hasChildren = CONFIRMED(false)', () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);

      const doc = generateDocument(state);
      expect(doc.sections[3].content).toBe("No");
    });

    it("renders confirmed child names when hasChildren = CONFIRMED(true)", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.children = [
        createConfirmedField("Sarah"),
        createConfirmedField("James"),
      ];

      const doc = generateDocument(state);
      expect(doc.sections[3].content).toBe("- Sarah\n- James");
    });

    it('renders "Not provided" when hasChildren = UNKNOWN', () => {
      const state = createInitialState();
      state.hasChildren = createUnknownField<boolean>();

      const doc = generateDocument(state);
      expect(doc.sections[3].content).toBe("Not provided");
    });

    it('renders "Needs clarification" when hasChildren is UNCONFIRMED or CONFLICTED', () => {
      const unconfirmedState = createInitialState();
      unconfirmedState.hasChildren = createUnconfirmedField(true);
      expect(generateDocument(unconfirmedState).sections[3].content).toBe(
        "Needs clarification",
      );

      const conflictedState = createInitialState();
      conflictedState.hasChildren = createConflictedField(true);
      expect(generateDocument(conflictedState).sections[3].content).toBe(
        "Needs clarification",
      );
    });

    it('renders "Needs clarification" when hasChildren = true but child entries are unconfirmed', () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.children = [createUnconfirmedField("Maybe Sarah")];

      const doc = generateDocument(state);
      expect(doc.sections[3].content).toBe("Needs clarification");
    });

    it('renders "Not provided" when hasChildren = true but children array is empty', () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.children = [];

      const doc = generateDocument(state);
      expect(doc.sections[3].content).toBe("Not provided");
    });
  });

  describe("Executor Rules (§12.7)", () => {
    it("supports independently resolved executor fields (exact example from §12.7: Name: James, Relationship: Needs clarification)", () => {
      const state = createInitialState();
      state.executor.name = createConfirmedField("James");
      state.executor.relationship = createUnconfirmedField("Brother?");

      const doc = generateDocument(state);
      expect(doc.sections[4].content).toBe(
        "Name: James\nRelationship: Needs clarification",
      );
    });

    it("renders both executor fields as Needs clarification when both are conflicted", () => {
      const state = createInitialState();
      state.executor.name = createConflictedField("Alice vs Bob");
      state.executor.relationship = createConflictedField("Friend vs Sister");

      const doc = generateDocument(state);
      expect(doc.sections[4].content).toBe(
        "Name: Needs clarification\nRelationship: Needs clarification",
      );
    });
  });

  describe("Specific Gifts Rules (§12.8)", () => {
    it('renders "None provided" when specificGifts is empty', () => {
      const state = createInitialState();
      state.specificGifts = [];

      const doc = generateDocument(state);
      expect(doc.sections[5].content).toBe("None provided");
    });

    it("renders confirmed specific gifts as a list", () => {
      const state = createInitialState();
      state.specificGifts = [
        createConfirmedField("Grand piano to nephew"),
        createConfirmedField("Watch to niece"),
      ];

      const doc = generateDocument(state);
      expect(doc.sections[5].content).toBe(
        "- Grand piano to nephew\n- Watch to niece",
      );
    });

    it('renders "Needs clarification" when specific gifts only have unconfirmed items', () => {
      const state = createInitialState();
      state.specificGifts = [createUnconfirmedField("Unclear watch")];

      const doc = generateDocument(state);
      expect(doc.sections[5].content).toBe("Needs clarification");
    });
  });

  describe("Unconfirmed & Conflicted Fields (§12.5)", () => {
    it('renders "Needs clarification" for scalar UNCONFIRMED values without selecting one', () => {
      const state = createInitialState();
      state.fullName = createUnconfirmedField("John Doe?");
      state.homeAddress = createUnconfirmedField("Maybe 42 Park St");

      const doc = generateDocument(state);
      expect(doc.sections[0].content).toBe("Needs clarification");
      expect(doc.sections[1].content).toBe("Needs clarification");
    });

    it('renders "Needs clarification" for scalar CONFLICTED values without picking a winner', () => {
      const state = createInitialState();
      state.coversWorldwideAssets = createConflictedField(true);
      state.additionalWishes = createConflictedField("Burial vs Cremation");

      const doc = generateDocument(state);
      expect(doc.sections[2].content).toBe("Needs clarification");
      expect(doc.sections[6].content).toBe("Needs clarification");
    });
  });

  describe("Determinism & Immutability", () => {
    it("never mutates canonical PersonalWishesState", () => {
      const state = createCompleteStateWithChildren();
      const snapshot = JSON.parse(JSON.stringify(state));

      generateDocument(state);
      expect(state).toEqual(snapshot);
    });

    it("produces identical output across repeated calls with same state", () => {
      const state = createCompleteStateWithChildren();
      const first = generateDocument(state);

      for (let i = 0; i < 10; i++) {
        const subsequent = generateDocument(state);
        expect(subsequent).toEqual(first);
        expect(subsequent.content).toBe(first.content);
      }
    });

    it("does not share mutable references with canonical state", () => {
      const state = createCompleteStateWithChildren();
      const doc = generateDocument(state);

      // Mutating returned sections array or objects does not corrupt state
      const mutableSections = [...doc.sections];
      mutableSections[0] = { title: "Corrupted", content: "Hacked" };

      const freshDoc = generateDocument(state);
      expect(freshDoc.sections[0].title).toBe("1. Full Name");
      expect(freshDoc.sections[0].content).toBe("Arthur Dent");
    });
  });
});
