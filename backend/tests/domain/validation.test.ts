import { describe, it, expect } from "vitest";
import {
  validateCandidate,
  parseCandidate,
  validateCandidateSchema,
  validateCandidateSemantics,
  createInitialState,
  createConfirmedField,
  PersonalWishesState,
} from "../../src/domain";

describe("Phase 3 — Validation Pipeline", () => {
  describe("Stage 1 — Parse Tests", () => {
    it("handles null and undefined safely without throwing", () => {
      const nullResult = parseCandidate(null);
      expect(nullResult.success).toBe(false);
      expect(nullResult.error.stage).toBe("PARSE");
      expect(nullResult.error.code).toBe("MALFORMED_JSON");

      const undefinedResult = parseCandidate(undefined);
      expect(undefinedResult.success).toBe(false);
      expect(undefinedResult.error.stage).toBe("PARSE");
      expect(undefinedResult.error.code).toBe("MALFORMED_JSON");
    });

    it("handles primitive values safely", () => {
      const numResult = parseCandidate(12345);
      expect(numResult.success).toBe(false);
      expect(numResult.error.stage).toBe("PARSE");

      const boolResult = parseCandidate(true);
      expect(boolResult.success).toBe(false);
      expect(boolResult.error.stage).toBe("PARSE");
    });

    it("handles array values safely by rejecting them as invalid candidate containers", () => {
      const arrayResult = parseCandidate([]);
      expect(arrayResult.success).toBe(false);
      expect(arrayResult.error.stage).toBe("PARSE");
      expect(arrayResult.error.code).toBe("MALFORMED_JSON");
    });

    it("parses valid JSON string candidate input", () => {
      const jsonStr = JSON.stringify({
        operations: [
          {
            field: "fullName",
            value: "Jane Doe",
            intent: "NEW",
          },
        ],
      });

      const result = parseCandidate(jsonStr);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty("operations");
    });

    it("rejects malformed JSON strings safely", () => {
      const badJson = '{"operations": [ invalid json';
      const result = parseCandidate(badJson);
      expect(result.success).toBe(false);
      expect(result.error.stage).toBe("PARSE");
      expect(result.error.code).toBe("MALFORMED_JSON");
    });

    it("accepts already-parsed candidate objects", () => {
      const obj = { operations: [] };
      const result = parseCandidate(obj);
      expect(result.success).toBe(true);
      expect(result.data).toBe(obj);
    });
  });

  describe("Stage 2 — Schema Validation Tests", () => {
    it("validates a well-formed CandidateUpdate schema", () => {
      const candidate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Doe",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      };

      const result = validateCandidateSchema(candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.candidate.operations.length).toBe(1);
      }
    });

    it("converts schema failures to domain ValidationError contract", () => {
      const invalid = {
        operations: [
          {
            field: "unknownField",
            value: "test",
            intent: "NEW",
          },
        ],
      };

      const result = validateCandidateSchema(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0].stage).toBe("SCHEMA");
        expect(result.errors[0].code).toBe("UNKNOWN_FIELD");
        expect(result.errors[0].field).toBe("unknownField");
      }
    });

    it("rejects missing operations / updates array", () => {
      const result = validateCandidateSchema({});
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SCHEMA");
        expect(result.errors[0].code).toBe("INVALID_RESPONSE_SCHEMA");
      }
    });

    it("rejects empty operations array", () => {
      const result = validateCandidateSchema({ operations: [] });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SCHEMA");
        expect(result.errors[0].code).toBe("INVALID_RESPONSE_SCHEMA");
      }
    });

    it("rejects invalid value types (e.g. string for boolean field)", () => {
      const result = validateCandidateSchema({
        operations: [
          {
            field: "hasChildren",
            value: "yes",
            intent: "NEW",
          },
        ],
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SCHEMA");
        expect(result.errors[0].code).toBe("INVALID_VALUE_TYPE");
      }
    });

    it("does not leak raw Zod internals in validation errors", () => {
      const result = validateCandidateSchema({ invalid: true });
      expect(result.success).toBe(false);
      if (!result.success) {
        for (const err of result.errors) {
          expect(err).toHaveProperty("code");
          expect(err).toHaveProperty("message");
          expect(err).toHaveProperty("stage", "SCHEMA");
          // No raw zod error properties
          expect(err).not.toHaveProperty("issues");
        }
      }
    });
  });

  describe("Stage 3 — Semantic Validation Tests", () => {
    it("passes semantically valid candidate updates", () => {
      const validCandidate = {
        operations: [
          {
            field: "fullName" as const,
            value: "Jane Doe",
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
          {
            field: "coversWorldwideAssets" as const,
            value: true,
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
        ],
        updates: [],
      };

      const result = validateCandidateSemantics(validCandidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.candidate.operations.length).toBe(2);
      }
    });

    it("rejects contradictory operations for the same scalar field in the same candidate", () => {
      const candidate = {
        operations: [
          {
            field: "fullName" as const,
            value: "Jane Doe",
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
          {
            field: "fullName" as const,
            value: "Alice Doe",
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
        ],
        updates: [],
      };

      const result = validateCandidateSemantics(candidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SEMANTIC");
        expect(result.errors[0].code).toBe("STATE_CONFLICT");
        expect(result.errors[0].field).toBe("fullName");
      }
    });

    it("rejects cross-field contradiction: hasChildren = false while proposing child names", () => {
      const candidate = {
        operations: [
          {
            field: "hasChildren" as const,
            value: false,
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
          {
            field: "children" as const,
            value: ["Sarah"],
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
        ],
        updates: [],
      };

      const result = validateCandidateSemantics(candidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SEMANTIC");
        expect(result.errors[0].code).toBe("STATE_CONFLICT");
        expect(result.errors[0].message).toContain(
          "cannot propose child names when hasChildren is false",
        );
      }
    });

    it("rejects state inconsistency when state hasChildren is confirmed false (ARCHITECTURE.md Section 8.7)", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);

      const candidate = {
        operations: [
          {
            field: "children" as const,
            value: ["Sarah"],
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
        ],
        updates: [],
      };

      const result = validateCandidateSemantics(candidate, state);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SEMANTIC");
        expect(result.errors[0].code).toBe("STATE_CONFLICT");
      }
    });

    it("allows child names if candidate also updates hasChildren to true", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);

      const candidate = {
        operations: [
          {
            field: "hasChildren" as const,
            value: true,
            intent: "CORRECTION" as const,
            confidence: "CLEAR" as const,
          },
          {
            field: "children" as const,
            value: ["Sarah"],
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
        ],
        updates: [],
      };

      const result = validateCandidateSemantics(candidate, state);
      expect(result.success).toBe(true);
    });

    it("rejects duplicate child names within candidate", () => {
      const candidate = {
        operations: [
          {
            field: "children" as const,
            value: ["Alice", "alice"],
            intent: "NEW" as const,
            confidence: "CLEAR" as const,
          },
        ],
        updates: [],
      };

      const result = validateCandidateSemantics(candidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors[0].stage).toBe("SEMANTIC");
        expect(result.errors[0].code).toBe("INVALID_VALUE");
        expect(result.errors[0].message).toContain("Duplicate child names");
      }
    });
  });

  describe("Full Pipeline Orchestration & Atomicity Tests", () => {
    it("validates a complete raw JSON candidate update from end to end", () => {
      const rawJson = JSON.stringify({
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
          },
        ],
      });

      const result = validateCandidate(rawJson);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.candidate.operations.length).toBe(2);
        expect(result.candidate.operations[0].field).toBe("fullName");
        expect(result.candidate.operations[1].field).toBe("homeAddress");
      }
    });

    it("enforces all-or-nothing atomicity: one invalid operation fails entire candidate", () => {
      const candidateWithOneBadOp = {
        operations: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
          {
            field: "hasChildren",
            value: "invalid-string-instead-of-bool",
            intent: "NEW",
          },
        ],
      };

      const result = validateCandidate(candidateWithOneBadOp);
      expect(result.success).toBe(false);
      expect(result.candidate).toBeUndefined();
      if (!result.success) {
        expect(result.errors.length).toBeGreaterThan(0);
      }
    });

    it("does not execute semantic validation if schema validation fails", () => {
      const schemaInvalidCandidate = {
        operations: [
          {
            field: "unknownField",
            value: "value",
            intent: "NEW",
          },
          // Contradiction that would fail semantics:
          {
            field: "hasChildren",
            value: false,
            intent: "NEW",
          },
          {
            field: "children",
            value: ["Sarah"],
            intent: "NEW",
          },
        ],
      };

      const result = validateCandidate(schemaInvalidCandidate);
      expect(result.success).toBe(false);
      if (!result.success) {
        // Must fail at SCHEMA stage first
        expect(result.errors[0].stage).toBe("SCHEMA");
      }
    });
  });

  describe("Immutability Tests", () => {
    it("never mutates canonical state during successful validation", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Jane Doe");
      const stateBeforeJson = JSON.stringify(state);

      const candidate = {
        operations: [
          {
            field: "homeAddress",
            value: "42 Park Street",
            intent: "NEW",
          },
        ],
      };

      const result = validateCandidate(candidate, state);
      expect(result.success).toBe(true);

      const stateAfterJson = JSON.stringify(state);
      expect(stateAfterJson).toBe(stateBeforeJson);
    });

    it("never mutates canonical state during failed validation", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);
      const stateBeforeJson = JSON.stringify(state);

      const invalidCandidate = {
        operations: [
          {
            field: "children",
            value: ["Sarah"],
            intent: "NEW",
          },
        ],
      };

      const result = validateCandidate(invalidCandidate, state);
      expect(result.success).toBe(false);

      const stateAfterJson = JSON.stringify(state);
      expect(stateAfterJson).toBe(stateBeforeJson);
    });

    it("never mutates the input candidate object", () => {
      const candidate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Doe",
            intent: "NEW",
          },
        ],
      };
      const candidateBeforeJson = JSON.stringify(candidate);

      validateCandidate(candidate);

      expect(JSON.stringify(candidate)).toBe(candidateBeforeJson);
    });

    it("produces a deep-frozen ValidatedCandidate", () => {
      const candidate = {
        operations: [
          {
            field: "fullName",
            value: "Jane Doe",
            intent: "NEW",
          },
        ],
      };

      const result = validateCandidate(candidate);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(Object.isFrozen(result.candidate)).toBe(true);
        expect(Object.isFrozen(result.candidate.operations)).toBe(true);
      }
    });
  });

  describe("Determinism & Pure Domain Tests", () => {
    it("produces identical validation results for repeated runs with identical input", () => {
      const input = {
        operations: [
          {
            field: "executor.name",
            value: "James",
            intent: "NEW",
          },
          {
            field: "executor.relationship",
            value: "Brother",
            intent: "NEW",
          },
        ],
      };

      const run1 = validateCandidate(input);
      const run2 = validateCandidate(input);

      expect(run1).toEqual(run2);
    });

    it("consistently rejects invalid input across repeated runs", () => {
      const badInput = {
        operations: [{ field: "badField", value: 123, intent: "NEW" }],
      };

      const run1 = validateCandidate(badInput);
      const run2 = validateCandidate(badInput);

      expect(run1).toEqual(run2);
    });
  });

  describe("Error Model & Code Stability Tests", () => {
    it("provides stable machine-readable codes and stage information", () => {
      // Parse stage
      const parseFail = validateCandidate("{ invalid json");
      expect(parseFail.success).toBe(false);
      if (!parseFail.success) {
        expect(parseFail.errors[0].stage).toBe("PARSE");
        expect(parseFail.errors[0].code).toBe("MALFORMED_JSON");
      }

      // Schema stage - Unknown field
      const unknownFieldFail = validateCandidate({
        operations: [{ field: "notAField", value: "test", intent: "NEW" }],
      });
      expect(unknownFieldFail.success).toBe(false);
      if (!unknownFieldFail.success) {
        expect(unknownFieldFail.errors[0].stage).toBe("SCHEMA");
        expect(unknownFieldFail.errors[0].code).toBe("UNKNOWN_FIELD");
      }

      // Schema stage - Invalid type
      const typeFail = validateCandidate({
        operations: [
          { field: "hasChildren", value: "not-bool", intent: "NEW" },
        ],
      });
      expect(typeFail.success).toBe(false);
      if (!typeFail.success) {
        expect(typeFail.errors[0].stage).toBe("SCHEMA");
        expect(typeFail.errors[0].code).toBe("INVALID_VALUE_TYPE");
      }

      // Semantic stage - Contradiction
      const conflictFail = validateCandidate({
        operations: [
          { field: "hasChildren", value: false, intent: "NEW" },
          { field: "children", value: ["Alice"], intent: "NEW" },
        ],
      });
      expect(conflictFail.success).toBe(false);
      if (!conflictFail.success) {
        expect(conflictFail.errors[0].stage).toBe("SEMANTIC");
        expect(conflictFail.errors[0].code).toBe("STATE_CONFLICT");
      }
    });
  });
});
