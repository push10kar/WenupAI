import { Field, PersonalWishesState } from "../state";
import { AllowedField, CandidateOperation } from "../candidate";
import { ValidatedCandidateUpdate } from "../transition";
import { Conflict, ConflictDetectionResult } from "./types";

/**
 * Resolves a scalar field from PersonalWishesState by its AllowedField key.
 */
function getScalarFieldFromState(
  state: PersonalWishesState,
  field: AllowedField,
): Field<unknown> | undefined {
  switch (field) {
    case "fullName":
      return state.fullName;
    case "homeAddress":
      return state.homeAddress;
    case "coversWorldwideAssets":
      return state.coversWorldwideAssets;
    case "hasChildren":
      return state.hasChildren;
    case "childrenCount":
      return state.childrenCount;
    case "executor.name":
      return state.executor.name;
    case "executor.relationship":
      return state.executor.relationship;
    case "additionalWishes":
      return state.additionalWishes;
    default:
      return undefined;
  }
}

/**
 * Deep freezes an array of conflicts to prevent caller mutation.
 */
function freezeConflicts(conflicts: Conflict[]): readonly Conflict[] {
  return Object.freeze(conflicts.map((c) => Object.freeze({ ...c })));
}

/**
 * Deterministic Conflict Detector (ARCHITECTURE.md Section 6.1, 6.3, 8.7, 14.8, 18 Invariant 7)
 *
 * Evaluates whether a validated candidate update conflicts with canonical state
 * or contains mutually incompatible operations within the same candidate.
 *
 * Invariants:
 * 1. Read-only: never mutates canonical state or candidate update.
 * 2. Deterministic: same inputs produce identical conflicts in stable order.
 * 3. Does not call LLM, database, network, or external APIs.
 * 4. Distinct responsibility: answers "is this safe to apply?", not how to mutate state.
 */
export function detectConflicts(
  state: PersonalWishesState,
  candidate: ValidatedCandidateUpdate,
): ConflictDetectionResult {
  if (
    !state ||
    !candidate ||
    !Array.isArray(candidate.operations) ||
    candidate.operations.length === 0
  ) {
    return {
      hasConflicts: false,
      conflicts: Object.freeze([]) as readonly [],
    };
  }

  const conflicts: Conflict[] = [];
  const operations = candidate.operations;

  // Track operations seen within this candidate to detect intra-candidate conflicts
  const seenScalarOps = new Map<
    AllowedField,
    { op: CandidateOperation; index: number }
  >();

  // Check if candidate contains hasChildren operation
  const candidateHasChildrenOp = operations.find(
    (o: CandidateOperation) => o.field === "hasChildren",
  );
  const candidateSetsHasChildrenTrue =
    candidateHasChildrenOp && candidateHasChildrenOp.value === true;
  const candidateSetsHasChildrenFalse =
    candidateHasChildrenOp && candidateHasChildrenOp.value === false;

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];

    // --- Check 1: Same-Candidate Contradictions (Scalar Fields) ---
    if (op.field !== "children" && op.field !== "specificGifts") {
      const existing = seenScalarOps.get(op.field);
      if (existing) {
        if (
          existing.op.value !== op.value ||
          existing.op.intent !== op.intent
        ) {
          conflicts.push({
            code: "SAME_CANDIDATE_CONFLICT",
            message: `Candidate contains contradictory operations for field '${op.field}' within the same update`,
            field: op.field,
            operationIndex: i,
            candidateOperation: op,
          });
        }
      } else {
        seenScalarOps.set(op.field, { op, index: i });
      }
    }

    // --- Check 2: Same-Candidate Cross-Field Contradiction ---
    if (op.field === "children" && candidateSetsHasChildrenFalse) {
      conflicts.push({
        code: "CROSS_FIELD_CONFLICT",
        message:
          "Candidate cannot propose child names when 'hasChildren' is set to false in the same update",
        field: "children",
        operationIndex: i,
        candidateOperation: op,
      });
    }

    if (
      op.field === "childrenCount" &&
      candidateSetsHasChildrenFalse &&
      typeof op.value === "number" &&
      op.value > 0
    ) {
      conflicts.push({
        code: "CROSS_FIELD_CONFLICT",
        message:
          "Candidate cannot propose childrenCount > 0 when 'hasChildren' is set to false in the same update",
        field: "childrenCount",
        operationIndex: i,
        candidateOperation: op,
      });
    }

    // --- Check 3: State-Dependent Value Contradiction (ARCHITECTURE.md Section 6.1, 14.8, Invariant 7) ---
    const currentStateField = getScalarFieldFromState(state, op.field);
    if (currentStateField) {
      // If field is currently CONFIRMED, new information with intent 'NEW' differing from confirmed value is a conflict
      if (currentStateField.status === "CONFIRMED" && op.intent === "NEW") {
        if (currentStateField.value !== op.value) {
          conflicts.push({
            code: "STATE_VALUE_CONFLICT",
            message: `New information for '${op.field}' conflicts with confirmed state value '${String(
              currentStateField.value,
            )}'. Requires explicit correction or clarification.`,
            field: op.field,
            operationIndex: i,
            candidateOperation: op,
            conflictingState: {
              value: currentStateField.value,
              status: currentStateField.status,
            },
          });
        }
      }

      // If field is currently CONFLICTED, it requires clarification or correction before new information can apply
      if (currentStateField.status === "CONFLICTED" && op.intent === "NEW") {
        conflicts.push({
          code: "UNRESOLVED_STATE_CONFLICT",
          message: `Field '${op.field}' is currently CONFLICTED in state and requires clarification or correction`,
          field: op.field,
          operationIndex: i,
          candidateOperation: op,
          conflictingState: {
            value: currentStateField.value,
            status: currentStateField.status,
          },
        });
      }
    }

    // --- Check 3b: State-Dependent Array Value Contradiction for 'children' ---
    if (op.field === "children") {
      const confirmedChildren = state.children.filter(
        (c) => c.status === "CONFIRMED" && c.value !== null,
      );
      if (confirmedChildren.length > 0 && op.intent === "NEW") {
        const existingNames = confirmedChildren.map((c) => c.value as string);
        const incomingNames = Array.isArray(op.value)
          ? (op.value as string[])
          : [String(op.value)];

        // Check if incoming names differ from existing confirmed names
        const isIdentical =
          existingNames.length === incomingNames.length &&
          existingNames.every(
            (val, idx) =>
              val.toLowerCase() === (incomingNames[idx] || "").toLowerCase(),
          );

        if (!isIdentical) {
          conflicts.push({
            code: "STATE_VALUE_CONFLICT",
            message: `New information for 'children' conflicts with confirmed state children [${existingNames.join(
              ", ",
            )}]. Requires explicit correction or clarification.`,
            field: "children",
            operationIndex: i,
            candidateOperation: op,
            conflictingState: {
              value: existingNames,
              status: "CONFIRMED",
            },
          });
        }
      }

      // If children has conflicted items, new information requires clarification or correction
      const hasConflictedChildren = state.children.some(
        (c) => c.status === "CONFLICTED",
      );
      if (hasConflictedChildren && op.intent === "NEW") {
        conflicts.push({
          code: "UNRESOLVED_STATE_CONFLICT",
          message:
            "Field 'children' is currently CONFLICTED in state and requires clarification or correction",
          field: "children",
          operationIndex: i,
          candidateOperation: op,
          conflictingState: {
            value: state.children.map((c) => c.value),
            status: "CONFLICTED",
          },
        });
      }
    }

    // --- Check 4: State-Dependent Cross-Field Conflict (ARCHITECTURE.md Section 8.7) ---
    if (op.field === "children") {
      const stateHasChildrenConfirmedFalse =
        state.hasChildren.status === "CONFIRMED" &&
        state.hasChildren.value === false;

      if (stateHasChildrenConfirmedFalse && !candidateSetsHasChildrenTrue) {
        conflicts.push({
          code: "CROSS_FIELD_CONFLICT",
          message:
            "Cannot add children when 'hasChildren' is confirmed false in state without also correcting 'hasChildren' to true",
          field: "children",
          operationIndex: i,
          candidateOperation: op,
          conflictingState: {
            value: state.hasChildren.value,
            status: state.hasChildren.status,
          },
        });
      }
    }
  }

  if (conflicts.length > 0) {
    return {
      hasConflicts: true,
      conflicts: freezeConflicts(conflicts),
    };
  }

  return {
    hasConflicts: false,
    conflicts: Object.freeze([]) as readonly [],
  };
}
