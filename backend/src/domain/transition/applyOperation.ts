import { Field, FieldStatus, PersonalWishesState } from "../state";
import {
  CandidateOperation,
  ALLOWED_FIELDS,
  UPDATE_INTENTS,
} from "../candidate";
import { TransitionError } from "./types";
import { createTransitionError } from "./errors";

type OperationResult =
  | { success: true; error?: never }
  | { success: false; error: TransitionError };

/**
 * Transitions a scalar field according to the lifecycle defined in ARCHITECTURE.md Section 6.1:
 *
 * UNKNOWN -> CONFIRMED (clear) / UNCONFIRMED (ambiguous)
 * UNCONFIRMED -> CONFIRMED (clarification / clear new)
 * CONFIRMED -> CONFIRMED (explicit correction)
 * CONFIRMED -> CONFLICTED (contradiction via new value without correction)
 * CONFLICTED -> CONFIRMED (clarification / correction)
 */
function transitionScalarField<T>(
  current: Field<T>,
  op: CandidateOperation,
): { field: Field<T> } {
  // If the candidate operation represents a non-answer or explicit refusal
  if (op.status === "NOT_PROVIDED" || op.status === "REFUSED") {
    if (current.status === "CONFIRMED" && op.intent === "NEW") {
      // Contradiction: proposing a non-answer with intent NEW on confirmed state
      return { field: { value: current.value, status: "CONFLICTED" } };
    }
    return { field: { value: null, status: op.status } };
  }

  const isAmbiguous = op.confidence === "AMBIGUOUS";
  const newValue = op.value as T;

  switch (current.status) {
    case "UNKNOWN":
    case "NOT_PROVIDED":
    case "REFUSED": {
      const status: FieldStatus = isAmbiguous ? "UNCONFIRMED" : "CONFIRMED";
      return { field: { value: newValue, status } };
    }

    case "UNCONFIRMED": {
      const status: FieldStatus = isAmbiguous ? "UNCONFIRMED" : "CONFIRMED";
      return { field: { value: newValue, status } };
    }

    case "CONFIRMED": {
      if (op.intent === "CORRECTION") {
        const status: FieldStatus = isAmbiguous ? "UNCONFIRMED" : "CONFIRMED";
        return { field: { value: newValue, status } };
      }

      if (op.intent === "CLARIFICATION") {
        return { field: { value: newValue, status: "CONFIRMED" } };
      }

      // op.intent === 'NEW' on already confirmed field
      if (current.value === newValue) {
        return { field: { value: current.value, status: "CONFIRMED" } };
      }

      // Contradiction detected: CONFIRMED -> CONFLICTED
      return { field: { value: current.value, status: "CONFLICTED" } };
    }

    case "CONFLICTED": {
      if (op.intent === "CLARIFICATION" || op.intent === "CORRECTION") {
        const status: FieldStatus = isAmbiguous ? "UNCONFIRMED" : "CONFIRMED";
        return { field: { value: newValue, status } };
      }

      if (op.intent === "NEW") {
        if (!isAmbiguous) {
          return { field: { value: newValue, status: "CONFIRMED" } };
        }
        return { field: { value: current.value, status: "CONFLICTED" } };
      }

      return { field: { value: current.value, status: "CONFLICTED" } };
    }

    default:
      return {
        field: {
          value: newValue,
          status: isAmbiguous ? "UNCONFIRMED" : "CONFIRMED",
        },
      };
  }
}

/**
 * Applies candidate array values (children or specificGifts).
 */
function transitionArrayField(
  current: Field<string>[],
  op: CandidateOperation,
): Field<string>[] {
  if (op.status === "NOT_PROVIDED" || op.status === "REFUSED") {
    return [{ value: null, status: op.status }];
  }
  const isAmbiguous = op.confidence === "AMBIGUOUS";
  const status: FieldStatus = isAmbiguous ? "UNCONFIRMED" : "CONFIRMED";
  const incoming = Array.isArray(op.value)
    ? (op.value as string[])
    : [op.value as string];

  if (op.intent === "CORRECTION") {
    return incoming.map((item) => ({ value: item, status }));
  }

  // op.intent === 'NEW' or 'CLARIFICATION': append new items or update existing status
  const existingValues = new Set(
    current.map((item) => item.value?.toLowerCase()),
  );
  const result: Field<string>[] = current.map((item) => ({ ...item }));

  for (const name of incoming) {
    if (!existingValues.has(name.toLowerCase())) {
      result.push({ value: name, status });
      existingValues.add(name.toLowerCase());
    } else if (op.intent === "CLARIFICATION") {
      // Clarify matching item to confirmed
      const idx = result.findIndex(
        (i) => i.value?.toLowerCase() === name.toLowerCase(),
      );
      if (idx !== -1 && result[idx].status === "UNCONFIRMED") {
        result[idx] = { value: result[idx].value, status };
      }
    }
  }

  return result;
}

/**
 * Applies a single CandidateOperation to mutable intermediate state.
 */
export function applyOperation(
  state: PersonalWishesState,
  op: CandidateOperation,
): OperationResult {
  // Validate field allowlist
  if (!ALLOWED_FIELDS.includes(op.field)) {
    return {
      success: false,
      error: createTransitionError(
        "UNSUPPORTED_OPERATION",
        `Unsupported field: '${op.field}'`,
        op.field,
        ["field"],
      ),
    };
  }

  // Validate operation intent
  if (!UPDATE_INTENTS.includes(op.intent)) {
    return {
      success: false,
      error: createTransitionError(
        "UNSUPPORTED_OPERATION",
        `Unsupported operation intent: '${op.intent}'`,
        op.field,
        ["intent"],
      ),
    };
  }

  switch (op.field) {
    case "fullName": {
      const res = transitionScalarField(state.fullName, op);
      state.fullName = res.field;
      break;
    }

    case "homeAddress": {
      const res = transitionScalarField(state.homeAddress, op);
      state.homeAddress = res.field;
      break;
    }

    case "coversWorldwideAssets": {
      const res = transitionScalarField(state.coversWorldwideAssets, op);
      state.coversWorldwideAssets = res.field;
      break;
    }

    case "hasChildren": {
      const res = transitionScalarField(state.hasChildren, op);
      state.hasChildren = res.field;
      // Invariant 3: if hasChildren is confirmed false, child names are not relevant
      if (
        state.hasChildren.status === "CONFIRMED" &&
        state.hasChildren.value === false
      ) {
        state.children = [];
      }
      break;
    }

    case "children": {
      // Invariant check: cannot add children if hasChildren is confirmed false
      if (
        state.hasChildren.status === "CONFIRMED" &&
        state.hasChildren.value === false
      ) {
        return {
          success: false,
          error: createTransitionError(
            "INVARIANT_VIOLATION",
            "Cannot add child names when hasChildren is confirmed false",
            "children",
            ["children"],
          ),
        };
      }
      state.children = transitionArrayField(state.children, op);
      break;
    }

    case "executor.name": {
      const res = transitionScalarField(state.executor.name, op);
      state.executor.name = res.field;
      break;
    }

    case "executor.relationship": {
      const res = transitionScalarField(state.executor.relationship, op);
      state.executor.relationship = res.field;
      break;
    }

    case "specificGifts": {
      state.specificGifts = transitionArrayField(state.specificGifts, op);
      break;
    }

    case "additionalWishes": {
      const res = transitionScalarField(state.additionalWishes, op);
      state.additionalWishes = res.field;
      break;
    }

    default:
      return {
        success: false,
        error: createTransitionError(
          "UNSUPPORTED_OPERATION",
          `Unhandled target field: '${op.field}'`,
          op.field,
        ),
      };
  }

  return { success: true };
}
