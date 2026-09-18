import { CandidateUpdate, CandidateOperation } from "../candidate";
import { PersonalWishesState } from "../state";
import { ValidationError, ValidatedCandidate } from "./types";
import { createSemanticError } from "./errors";

export type ValidateSemanticsResult =
  | {
      readonly success: true;
      readonly candidate: ValidatedCandidate;
      readonly errors?: never;
    }
  | {
      readonly success: false;
      readonly candidate?: never;
      readonly errors: readonly ValidationError[];
    };

/**
 * Deep freezes an object or array to ensure immutability.
 */
function deepFreeze<T>(obj: T): T {
  if (obj === null || typeof obj !== "object") {
    return obj;
  }
  Object.freeze(obj);
  for (const key of Object.keys(obj)) {
    const val = (obj as Record<string, unknown>)[key];
    if (val !== null && typeof val === "object" && !Object.isFrozen(val)) {
      deepFreeze(val);
    }
  }
  return obj;
}

/**
 * Stage 3 — Semantic Validation
 * Evaluates semantic consistency, internal contradictions, and state domain invariants.
 * Does not mutate candidate or currentState.
 */
export function validateCandidateSemantics(
  candidate: CandidateUpdate,
  currentState?: PersonalWishesState,
): ValidateSemanticsResult {
  const errors: ValidationError[] = [];
  const operations = candidate.operations;

  // 1. Check for contradictory operations within the same candidate
  const seenScalarFields = new Map<string, CandidateOperation>();

  for (const op of operations) {
    // Scalar fields should not have multiple conflicting operations in the same turn
    if (op.field !== "children" && op.field !== "specificGifts") {
      const existing = seenScalarFields.get(op.field);
      if (existing) {
        if (existing.value !== op.value || existing.intent !== op.intent) {
          errors.push(
            createSemanticError(
              "STATE_CONFLICT",
              `Contradictory operations for field '${op.field}' in the same candidate update`,
              op.field,
              ["operations", op.field],
            ),
          );
        }
      } else {
        seenScalarFields.set(op.field, op);
      }
    }
  }

  // 2. Logical cross-field contradiction within the candidate:
  // hasChildren = false while proposing child names in children
  const hasChildrenOp = operations.find((op) => op.field === "hasChildren");
  const childrenOp = operations.find((op) => op.field === "children");

  if (hasChildrenOp && childrenOp) {
    if (hasChildrenOp.value === false) {
      errors.push(
        createSemanticError(
          "STATE_CONFLICT",
          "Candidate cannot propose child names when hasChildren is false",
          "children",
          ["operations", "children"],
        ),
      );
    }
  }

  // 3. State consistency validation against currentState (ARCHITECTURE.md Section 8.7)
  // If currentState has hasChildren = CONFIRMED(false), candidate cannot propose children
  // without also updating hasChildren to true.
  if (currentState) {
    const stateHasChildrenConfirmedFalse =
      currentState.hasChildren.status === "CONFIRMED" &&
      currentState.hasChildren.value === false;

    if (stateHasChildrenConfirmedFalse && childrenOp) {
      const isUpdatingHasChildrenToTrue =
        hasChildrenOp && hasChildrenOp.value === true;
      if (!isUpdatingHasChildrenToTrue) {
        errors.push(
          createSemanticError(
            "STATE_CONFLICT",
            "Cannot add child names when hasChildren is confirmed false in state without correcting hasChildren",
            "children",
            ["operations", "children"],
          ),
        );
      }
    }
  }

  // 4. Collection semantics: check for duplicate items within children list
  if (childrenOp && Array.isArray(childrenOp.value)) {
    const names = childrenOp.value as string[];
    const normalized = names.map((n) => n.trim().toLowerCase());
    const duplicates = normalized.filter(
      (item, index) => normalized.indexOf(item) !== index,
    );
    if (duplicates.length > 0) {
      errors.push(
        createSemanticError(
          "INVALID_VALUE",
          `Duplicate child names found in candidate: ${duplicates.join(", ")}`,
          "children",
          ["operations", "children"],
        ),
      );
    }
  }

  // If any semantic error occurred, fail-closed
  if (errors.length > 0) {
    return {
      success: false,
      errors: Object.freeze(errors),
    };
  }

  // Produce immutable ValidatedCandidate
  const validatedOps = deepFreeze([...operations]);
  const validatedCandidate: ValidatedCandidate = deepFreeze({
    operations: validatedOps,
    updates: validatedOps,
  });

  return {
    success: true,
    candidate: validatedCandidate,
  };
}
