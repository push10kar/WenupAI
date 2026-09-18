import { PersonalWishesState } from "../state";
import { AllowedField } from "../candidate";
import { getQuestion } from "./catalog";
import { NextQuestionResult, QuestionId } from "./types";

/**
 * Checks whether a scalar string field is resolved with a valid, confirmed non-blank string.
 */
function isStringFieldResolved(field: {
  value: string | null;
  status: string;
}): boolean {
  return (
    field.status === "CONFIRMED" &&
    typeof field.value === "string" &&
    field.value.trim().length > 0
  );
}

/**
 * Checks whether a scalar boolean field is resolved with a confirmed boolean value.
 */
function isBooleanFieldResolved(field: {
  value: boolean | null;
  status: string;
}): boolean {
  return field.status === "CONFIRMED" && typeof field.value === "boolean";
}

/**
 * Determines which domain fields are still unresolved in canonical state,
 * following the deterministic priority sequence defined in ARCHITECTURE.md Section 6.5.
 *
 * Sequence:
 * 1. fullName
 * 2. homeAddress
 * 3. coversWorldwideAssets
 * 4. hasChildren
 * 5. children (when hasChildren = true)
 * 6. executor.name
 * 7. executor.relationship
 * 8. specificGifts
 * 9. additionalWishes
 * 10. completion (when unresolved is empty)
 */
export function getUnresolvedFields(
  state: PersonalWishesState,
): readonly AllowedField[] {
  const unresolved: AllowedField[] = [];

  // 1. fullName
  if (!isStringFieldResolved(state.fullName)) {
    unresolved.push("fullName");
  }

  // 2. homeAddress
  if (!isStringFieldResolved(state.homeAddress)) {
    unresolved.push("homeAddress");
  }

  // 3. coversWorldwideAssets
  if (!isBooleanFieldResolved(state.coversWorldwideAssets)) {
    unresolved.push("coversWorldwideAssets");
  }

  // 4. hasChildren
  if (!isBooleanFieldResolved(state.hasChildren)) {
    unresolved.push("hasChildren");
  } else if (state.hasChildren.value === true) {
    // 5. children (when hasChildren = true)
    // ARCHITECTURE.md Section 13.6 & Section 6.5
    const hasResolvedChildren =
      state.children.length > 0 &&
      state.children.every(
        (c) =>
          c.status === "CONFIRMED" &&
          typeof c.value === "string" &&
          c.value.trim().length > 0,
      );

    if (!hasResolvedChildren) {
      unresolved.push("children");
    }
  }

  // 6. executor.name
  if (!isStringFieldResolved(state.executor.name)) {
    unresolved.push("executor.name");
  }

  // 7. executor.relationship
  if (!isStringFieldResolved(state.executor.relationship)) {
    unresolved.push("executor.relationship");
  }

  // 8. specificGifts
  const hasResolvedGifts =
    state.specificGifts.length > 0 &&
    state.specificGifts.every(
      (g) =>
        g.status === "CONFIRMED" &&
        typeof g.value === "string" &&
        g.value.trim().length > 0,
    );

  if (!hasResolvedGifts) {
    unresolved.push("specificGifts");
  }

  // 9. additionalWishes
  if (!isStringFieldResolved(state.additionalWishes)) {
    unresolved.push("additionalWishes");
  }

  return unresolved;
}

/**
 * Pure domain question selector.
 *
 * Evaluates canonical PersonalWishesState and deterministically decides
 * the next question to ask, or signals completion if all required information is resolved.
 *
 * Guarantees:
 * - Read-only: zero state mutation
 * - Pure: deterministic output for identical input
 * - Zero external dependencies (no LLM, DB, HTTP, time, randomness)
 */
export function selectNextQuestion(
  state: PersonalWishesState,
): NextQuestionResult {
  const unresolved = getUnresolvedFields(state);

  if (unresolved.length === 0) {
    return {
      status: "COMPLETE",
    };
  }

  const nextField = unresolved[0] as QuestionId;
  return {
    status: "QUESTION_AVAILABLE",
    question: getQuestion(nextField),
  };
}

/**
 * Helper to determine whether the intake interview has collected all required information.
 */
export function isInterviewComplete(state: PersonalWishesState): boolean {
  return selectNextQuestion(state).status === "COMPLETE";
}
