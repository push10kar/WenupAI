import { describe, it, expect } from "vitest";
import {
  applyCandidateUpdate,
  createInitialState,
  createConfirmedField,
  createUnconfirmedField,
  createConflictedField,
  isPersonalWishesState,
  PersonalWishesState,
  ValidatedCandidateUpdate,
} from "../../src/domain";

describe("Phase 4 — State Transition Engine", () => {
  describe("Empty Candidate Behavior", () => {
    it("produces an equivalent canonical state without mutating the original", () => {
      const state = createInitialState();
      const stateBefore = JSON.stringify(state);

      const candidate: ValidatedCandidateUpdate = {
        operations: [],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state).not.toBe(state); // Fresh state object
        expect(result.state).toEqual(state);
        expect(isPersonalWishesState(result.state)).toBe(true);
      }

      expect(JSON.stringify(state)).toBe(stateBefore);
    });
  });

  describe("Field Lifecycle Transitions (ARCHITECTURE.md Section 6.1 & 13.3)", () => {
    it("executes UNKNOWN → CONFIRMED for clear new information", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Doe",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Jane Doe",
          status: "CONFIRMED",
        });
      }
    });

    it("executes UNKNOWN → UNCONFIRMED for ambiguous candidate", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "homeAddress",
            value: "Near Baker Street",
            intent: "NEW",
            confidence: "AMBIGUOUS",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.homeAddress).toEqual({
          value: "Near Baker Street",
          status: "UNCONFIRMED",
        });
      }
    });

    it("executes UNCONFIRMED → CONFIRMED via clarification", () => {
      const state = createInitialState();
      state.homeAddress = createUnconfirmedField("Near Baker Street");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "homeAddress",
            value: "221B Baker Street, London",
            intent: "CLARIFICATION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.homeAddress).toEqual({
          value: "221B Baker Street, London",
          status: "CONFIRMED",
        });
      }
    });

    it("executes CONFIRMED → CONFIRMED via explicit correction", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Jane Smith");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Doe-Smith",
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Jane Doe-Smith",
          status: "CONFIRMED",
        });
      }
    });

    it("executes CONFIRMED → CONFLICTED when new information contradicts existing confirmed value without correction", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Jane Smith");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Alice Johnson",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Jane Smith",
          status: "CONFLICTED",
        });
      }
    });

    it("executes CONFLICTED → CONFIRMED via clarification or correction", () => {
      const state = createInitialState();
      state.fullName = createConflictedField("Jane Smith");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Smith",
            intent: "CLARIFICATION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Jane Smith",
          status: "CONFIRMED",
        });
      }
    });
  });

  describe("Multiple Operations & Preservation", () => {
    it("applies multiple operations in sequence (Section 13.4 Multiple Field Test)", () => {
      const state = createInitialState();

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Smith",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "homeAddress",
            value: "42 Park Street",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "executor.name",
            value: "James",
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
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Jane Smith",
          status: "CONFIRMED",
        });
        expect(result.state.homeAddress).toEqual({
          value: "42 Park Street",
          status: "CONFIRMED",
        });
        expect(result.state.executor.name).toEqual({
          value: "James",
          status: "CONFIRMED",
        });
        expect(result.state.executor.relationship).toEqual({
          value: "Brother",
          status: "CONFIRMED",
        });
        // Unrelated fields preserved
        expect(result.state.coversWorldwideAssets).toEqual({
          value: null,
          status: "UNKNOWN",
        });
        expect(result.state.hasChildren).toEqual({
          value: null,
          status: "UNKNOWN",
        });
        expect(result.state.children).toEqual([]);
        expect(result.state.specificGifts).toEqual([]);
      }
    });

    it("preserves unaffected state fields across updates", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.coversWorldwideAssets = createConfirmedField(true);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "homeAddress",
            value: "Cottington Lane",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Arthur Dent",
          status: "CONFIRMED",
        });
        expect(result.state.coversWorldwideAssets).toEqual({
          value: true,
          status: "CONFIRMED",
        });
        expect(result.state.homeAddress).toEqual({
          value: "Cottington Lane",
          status: "CONFIRMED",
        });
      }
    });
  });

  describe("Nested Data & Collection Transitions", () => {
    it("appends children in array format", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "children",
            value: ["Alice", "Bob"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.children.length).toBe(2);
        expect(result.state.children[0]).toEqual({
          value: "Alice",
          status: "CONFIRMED",
        });
        expect(result.state.children[1]).toEqual({
          value: "Bob",
          status: "CONFIRMED",
        });
      }
    });

    it("corrects/replaces children array on CORRECTION intent", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.children = [createConfirmedField("Alice")];

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "children",
            value: ["Charlie", "David"],
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.children.length).toBe(2);
        expect(result.state.children.map((c) => c.value)).toEqual([
          "Charlie",
          "David",
        ]);
      }
    });

    it("clears children when hasChildren transitions to confirmed false (Invariant 3)", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(true);
      state.children = [createConfirmedField("Alice")];

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "hasChildren",
            value: false,
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.hasChildren).toEqual({
          value: false,
          status: "CONFIRMED",
        });
        expect(result.state.children).toEqual([]);
      }
    });

    it("transitions specificGifts collection", () => {
      const state = createInitialState();

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "specificGifts",
            value: ["Vintage watch to Alice", "Book collection to library"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.specificGifts.length).toBe(2);
        expect(result.state.specificGifts[0]).toEqual({
          value: "Vintage watch to Alice",
          status: "CONFIRMED",
        });
      }
    });
  });

  describe("Atomicity & Failure Protection", () => {
    it("fails atomically when any operation violates an invariant, leaving original state unchanged", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);
      const stateBefore = JSON.stringify(state);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Valid Name",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "children",
            value: ["Cannot add child when hasChildren is false"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(false);
      expect(result.state).toBeUndefined();
      if (!result.success) {
        expect(result.errors[0].code).toBe("INVARIANT_VIOLATION");
      }

      // Original state was never mutated
      expect(JSON.stringify(state)).toBe(stateBefore);
      expect(state.fullName.value).toBeNull();
    });

    it("rejects unsupported target fields safely", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidate: any = {
        operations: [
          {
            field: "unknownField",
            value: "test",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe("UNSUPPORTED_OPERATION");
      }
    });

    it("rejects unsupported operation intents safely", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const candidate: any = {
        operations: [
          {
            field: "fullName",
            value: "test",
            intent: "DELETE",
            confidence: "CLEAR",
          },
        ],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].code).toBe("UNSUPPORTED_OPERATION");
      }
    });
  });

  describe("Immutability & Determinism", () => {
    it("never mutates original canonical state or nested objects", () => {
      const state = createInitialState();
      state.executor.name = createConfirmedField("Slartibartfast");
      state.children = [createConfirmedField("Trillian")];
      const stateBefore = JSON.stringify(state);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      applyCandidateUpdate(state, candidate);

      expect(JSON.stringify(state)).toBe(stateBefore);
    });

    it("never mutates the input candidate update", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };
      const candidateBefore = JSON.stringify(candidate);

      applyCandidateUpdate(state, candidate);

      expect(JSON.stringify(candidate)).toBe(candidateBefore);
    });

    it("produces deep-frozen new state object", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.state)).toBe(true);
        expect(Object.isFrozen(result.state.fullName)).toBe(true);
        expect(Object.isFrozen(result.state.executor)).toBe(true);
      }
    });

    it("is purely deterministic: same inputs produce identical canonical state", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Smith",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "coversWorldwideAssets",
            value: true,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const run1 = applyCandidateUpdate(state, candidate);
      const run2 = applyCandidateUpdate(state, candidate);

      expect(run1).toEqual(run2);
    });

    it("resulting state satisfies canonical PersonalWishesState schema", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Smith",
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
            value: ["Alice"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(isPersonalWishesState(result.state)).toBe(true);
      }
    });

    it("handles mixed multi-field updates where field A is clear, field B is ambiguous, and field C is clear", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Pushkar Patil",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "homeAddress",
            value: "Somewhere in Pune",
            intent: "NEW",
            confidence: "AMBIGUOUS",
          },
          {
            field: "hasChildren",
            value: false,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        // Clear field A is CONFIRMED
        expect(result.state.fullName).toEqual({
          value: "Pushkar Patil",
          status: "CONFIRMED",
        });
        // Ambiguous field B is UNCONFIRMED (not silently confirmed)
        expect(result.state.homeAddress).toEqual({
          value: "Somewhere in Pune",
          status: "UNCONFIRMED",
        });
        // Clear field C is CONFIRMED (and false is a valid boolean value)
        expect(result.state.hasChildren).toEqual({
          value: false,
          status: "CONFIRMED",
        });
      }
    });

    it("transitions NOT_PROVIDED → CONFIRMED and REFUSED → CONFIRMED cleanly when user later provides information", () => {
      const state = createInitialState();
      state.homeAddress = { value: null, status: "NOT_PROVIDED" };
      state.additionalWishes = { value: null, status: "REFUSED" };

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "homeAddress",
            value: "42 Park Street",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "additionalWishes",
            value: "Scatter ashes at sea",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.homeAddress).toEqual({
          value: "42 Park Street",
          status: "CONFIRMED",
        });
        expect(result.state.additionalWishes).toEqual({
          value: "Scatter ashes at sea",
          status: "CONFIRMED",
        });
      }
    });

    it("idempotency: restating identical information on confirmed field preserves confirmation without conflict", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Pushkar Patil");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Pushkar Patil",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = applyCandidateUpdate(state, candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.state.fullName).toEqual({
          value: "Pushkar Patil",
          status: "CONFIRMED",
        });
      }
    });
  });
});
