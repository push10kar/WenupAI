import { describe, it, expect } from "vitest";
import {
  detectConflicts,
  createInitialState,
  createConfirmedField,
  createUnconfirmedField,
  createConflictedField,
  ValidatedCandidateUpdate,
} from "../../src/domain";

describe("Phase 5 — Conflict Detection", () => {
  describe("No-Conflict Candidates", () => {
    it("returns hasConflicts: false for an empty candidate update", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toEqual([]);
    });

    it("returns hasConflicts: false for clean new information targeting UNKNOWN fields", () => {
      const state = createInitialState();
      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "homeAddress",
            value: "Cottington Lane",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
      expect(result.conflicts).toHaveLength(0);
    });

    it("returns hasConflicts: false for explicit user corrections on confirmed fields (Invariant 8)", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Philip Dent",
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
    });

    it("returns hasConflicts: false when restating the same value on a confirmed field", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");

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

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
    });

    it("returns hasConflicts: false for clarifications resolving unconfirmed fields", () => {
      const state = createInitialState();
      state.homeAddress = createUnconfirmedField("Near London");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "homeAddress",
            value: "42 Park Street, London",
            intent: "CLARIFICATION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
    });

    it("returns hasConflicts: false for clarifications resolving conflicted fields", () => {
      const state = createInitialState();
      state.fullName = createConflictedField("Arthur Dent");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "CLARIFICATION",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
    });

    it("does not flag unrelated operations", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "coversWorldwideAssets",
            value: true,
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
    });
  });

  describe("Architecture-Defined Conflict Types", () => {
    it("detects STATE_VALUE_CONFLICT when new info contradicts confirmed state without correction (§6.1, 14.8, Invariant 7)", () => {
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

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts).toHaveLength(1);
        const conflict = result.conflicts[0];
        expect(conflict.code).toBe("STATE_VALUE_CONFLICT");
        expect(conflict.field).toBe("fullName");
        expect(conflict.operationIndex).toBe(0);
        expect(conflict.conflictingState).toEqual({
          value: "Jane Smith",
          status: "CONFIRMED",
        });
        expect(conflict.message).toContain(
          "conflicts with confirmed state value",
        );
      }
    });

    it("detects CROSS_FIELD_CONFLICT when state has hasChildren=false and candidate proposes children (§8.7)", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "children",
            value: ["Sarah"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts).toHaveLength(1);
        const conflict = result.conflicts[0];
        expect(conflict.code).toBe("CROSS_FIELD_CONFLICT");
        expect(conflict.field).toBe("children");
        expect(conflict.operationIndex).toBe(0);
        expect(conflict.message).toContain(
          "Cannot add children when 'hasChildren' is confirmed false",
        );
      }
    });

    it("does not flag CROSS_FIELD_CONFLICT if candidate also updates hasChildren to true", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "hasChildren",
            value: true,
            intent: "CORRECTION",
            confidence: "CLEAR",
          },
          {
            field: "children",
            value: ["Sarah"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(false);
    });

    it("detects SAME_CANDIDATE_CONFLICT when candidate has multiple conflicting ops for same scalar field", () => {
      const state = createInitialState();

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Doe",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "fullName",
            value: "Alice Doe",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts).toHaveLength(1);
        const conflict = result.conflicts[0];
        expect(conflict.code).toBe("SAME_CANDIDATE_CONFLICT");
        expect(conflict.field).toBe("fullName");
        expect(conflict.operationIndex).toBe(1);
        expect(conflict.message).toContain("contradictory operations");
      }
    });

    it("detects CROSS_FIELD_CONFLICT when candidate proposes hasChildren=false and children in same turn", () => {
      const state = createInitialState();

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "hasChildren",
            value: false,
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "children",
            value: ["Sarah"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts).toHaveLength(1);
        expect(result.conflicts[0].code).toBe("CROSS_FIELD_CONFLICT");
      }
    });

    it("detects UNRESOLVED_STATE_CONFLICT when new info is applied to a CONFLICTED field without clarification (§5.2)", () => {
      const state = createInitialState();
      state.fullName = createConflictedField("Disputed Name");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Another Name",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts[0].code).toBe("UNRESOLVED_STATE_CONFLICT");
        expect(result.conflicts[0].field).toBe("fullName");
      }
    });
  });

  describe("Multiple Conflicts & Deterministic Ordering", () => {
    it("detects multiple simultaneous conflicts in stable, predictable candidate operation order", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Jane Smith");
      state.hasChildren = createConfirmedField(false);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Alice Johnson",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "children",
            value: ["Sarah"],
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts).toHaveLength(2);
        expect(result.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");
        expect(result.conflicts[0].field).toBe("fullName");
        expect(result.conflicts[0].operationIndex).toBe(0);

        expect(result.conflicts[1].code).toBe("CROSS_FIELD_CONFLICT");
        expect(result.conflicts[1].field).toBe("children");
        expect(result.conflicts[1].operationIndex).toBe(1);
      }
    });
  });

  describe("Nested Data & Structured Targets", () => {
    it("detects conflict on nested executor fields", () => {
      const state = createInitialState();
      state.executor.name = createConfirmedField("James Smith");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "executor.name",
            value: "John Smith",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const result = detectConflicts(state, candidate);
      expect(result.hasConflicts).toBe(true);
      if (result.hasConflicts) {
        expect(result.conflicts[0].code).toBe("STATE_VALUE_CONFLICT");
        expect(result.conflicts[0].field).toBe("executor.name");
      }
    });
  });

  describe("Immutability & Determinism Invariants", () => {
    it("never mutates canonical state or candidate update", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");
      state.executor.name = createConfirmedField("Slartibartfast");
      const stateBefore = JSON.stringify(state);

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Ford Prefect",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };
      const candidateBefore = JSON.stringify(candidate);

      detectConflicts(state, candidate);

      expect(JSON.stringify(state)).toBe(stateBefore);
      expect(JSON.stringify(candidate)).toBe(candidateBefore);
    });

    it("is purely deterministic: repeated executions produce identical results", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Arthur Dent");

      const candidate: ValidatedCandidateUpdate = {
        operations: [
          {
            field: "fullName",
            value: "Ford Prefect",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
        updates: [],
      };

      const run1 = detectConflicts(state, candidate);
      const run2 = detectConflicts(state, candidate);

      expect(run1).toEqual(run2);
    });
  });
});
