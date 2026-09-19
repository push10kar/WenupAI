import {
  PersonalWishesState,
  isPersonalWishesState,
  cloneState,
} from "../state";
import { ValidatedCandidateUpdate, TransitionResult } from "./types";
import { createTransitionError } from "./errors";
import { applyOperation } from "./applyOperation";

export { cloneState };

/**
 * Deep freezes an object and all its nested properties.
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
 * Applies an already-validated candidate update to canonical PersonalWishesState.
 *
 * Enforces:
 * 1. Atomicity: either all operations apply, or zero mutations occur.
 * 2. Immutability: original state and candidate are never mutated.
 * 3. Invariant protection: resulting state must satisfy canonical state schema.
 * 4. Determinism: identical inputs produce identical canonical state.
 */
export function applyCandidateUpdate(
  state: PersonalWishesState,
  candidate: ValidatedCandidateUpdate,
): TransitionResult {
  if (!state || !isPersonalWishesState(state)) {
    return {
      success: false,
      errors: Object.freeze([
        createTransitionError(
          "INVALID_TRANSITION",
          "Invalid or missing canonical input state",
        ),
      ]),
    };
  }

  if (!candidate || !Array.isArray(candidate.operations)) {
    return {
      success: false,
      errors: Object.freeze([
        createTransitionError(
          "INVALID_TRANSITION",
          "Invalid or missing validated candidate update",
        ),
      ]),
    };
  }

  // Intermediate state for atomic transition execution
  const intermediate = cloneState(state);

  // Apply operations sequentially
  for (const op of candidate.operations) {
    const result = applyOperation(intermediate, op);
    if (!result.success) {
      // Discard intermediate state; original state remains untouched
      return {
        success: false,
        errors: Object.freeze([result.error]),
      };
    }
  }

  // Canonical invariant check: verify resulting state against state schema
  if (!isPersonalWishesState(intermediate)) {
    return {
      success: false,
      errors: Object.freeze([
        createTransitionError(
          "INVARIANT_VIOLATION",
          "Transition would produce an invalid canonical state",
        ),
      ]),
    };
  }

  return {
    success: true,
    state: deepFreeze(intermediate),
  };
}

export const transitionState = applyCandidateUpdate;
