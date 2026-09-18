import { AllowedField, CandidateOperation } from "../candidate";
import { FieldStatus } from "../state";

/**
 * Machine-readable conflict classification codes derived from ARCHITECTURE.md:
 *
 * STATE_VALUE_CONFLICT: New information contradicts confirmed state without explicit correction (ARCHITECTURE.md Section 6.1 & 14.8).
 * CROSS_FIELD_CONFLICT: Inconsistency between related fields (e.g., hasChildren = false with child names, Section 8.7).
 * SAME_CANDIDATE_CONFLICT: Candidate contains contradictory operations for the same field within the same turn.
 * UNRESOLVED_STATE_CONFLICT: Field is already in CONFLICTED status and requires clarification/correction (Section 5.2).
 */
export type ConflictType =
  | "STATE_VALUE_CONFLICT"
  | "CROSS_FIELD_CONFLICT"
  | "SAME_CANDIDATE_CONFLICT"
  | "UNRESOLVED_STATE_CONFLICT";

/**
 * Structured representation of a detected domain conflict.
 */
export interface Conflict {
  readonly code: ConflictType;
  readonly message: string;
  readonly field: AllowedField;
  readonly operationIndex: number;
  readonly candidateOperation: CandidateOperation;
  readonly conflictingState?: {
    readonly value: unknown;
    readonly status: FieldStatus;
  };
}

/**
 * Deterministic conflict detection result.
 */
export type ConflictDetectionResult =
  | {
      readonly hasConflicts: false;
      readonly conflicts: readonly [];
    }
  | {
      readonly hasConflicts: true;
      readonly conflicts: readonly Conflict[];
    };
