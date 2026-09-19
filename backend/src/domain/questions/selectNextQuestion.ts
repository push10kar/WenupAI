import { PersonalWishesState } from "../state";
import { AllowedField } from "../candidate";
import { getQuestion } from "./catalog";
import { NextQuestionResult, QuestionId } from "./types";

/**
 * Checks whether a scalar field is addressed (confirmed with valid value, or explicitly not provided/refused).
 */
function isScalarFieldAddressed(field: {
  value: unknown;
  status: string;
}): boolean {
  if (field.status === "CONFIRMED" && field.value !== null) {
    if (typeof field.value === "string") {
      return field.value.trim().length > 0;
    }
    return true;
  }
  return field.status === "NOT_PROVIDED" || field.status === "REFUSED";
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
  if (!isScalarFieldAddressed(state.fullName)) {
    unresolved.push("fullName");
  }

  // 2. homeAddress
  if (!isScalarFieldAddressed(state.homeAddress)) {
    unresolved.push("homeAddress");
  }

  // 3. coversWorldwideAssets
  if (!isScalarFieldAddressed(state.coversWorldwideAssets)) {
    unresolved.push("coversWorldwideAssets");
  }

  // 4. hasChildren
  const hasChildrenAddressed =
    isScalarFieldAddressed(state.hasChildren) ||
    (state.childrenCount !== undefined &&
      state.childrenCount.status === "CONFIRMED" &&
      typeof state.childrenCount.value === "number");

  const hasChildrenTrue =
    (state.hasChildren.status === "CONFIRMED" &&
      state.hasChildren.value === true) ||
    (state.childrenCount !== undefined &&
      state.childrenCount.status === "CONFIRMED" &&
      typeof state.childrenCount.value === "number" &&
      state.childrenCount.value > 0);

  if (!hasChildrenAddressed) {
    unresolved.push("hasChildren");
  } else if (hasChildrenTrue) {
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
    const hasNotProvidedChildren = state.children.some(
      (c) => c.status === "NOT_PROVIDED" || c.status === "REFUSED",
    );

    if (!hasResolvedChildren && !hasNotProvidedChildren) {
      unresolved.push("children");
    }
  }

  // 6. executor.name
  if (!isScalarFieldAddressed(state.executor.name)) {
    unresolved.push("executor.name");
  }

  // 7. executor.relationship
  if (!isScalarFieldAddressed(state.executor.relationship)) {
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
  const hasNotProvidedGifts = state.specificGifts.some(
    (g) => g.status === "NOT_PROVIDED" || g.status === "REFUSED",
  );

  if (!hasResolvedGifts && !hasNotProvidedGifts) {
    unresolved.push("specificGifts");
  }

  // 9. additionalWishes
  if (!isScalarFieldAddressed(state.additionalWishes)) {
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
