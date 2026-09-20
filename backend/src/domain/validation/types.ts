import { CandidateOperation } from "../candidate";

/**
 * Validation stage taxonomy distinguishing which pipeline stage failed.
 */
export type ValidationStage = "PARSE" | "SCHEMA" | "SEMANTIC";

/**
 * Standard error codes defined by ARCHITECTURE.md Section 8.10.
 */
export type ValidationErrorCode =
  | "MALFORMED_JSON"
  | "INVALID_RESPONSE_SCHEMA"
  | "UNKNOWN_FIELD"
  | "INVALID_VALUE_TYPE"
  | "INVALID_VALUE"
  | "AMBIGUOUS_VALUE"
  | "STATE_CONFLICT"
  | "INVALID_STATE_TRANSITION";

/**
 * Domain-level validation error contract.
 */
export interface ValidationError {
  readonly code: ValidationErrorCode;
  readonly message: string;
  readonly stage: ValidationStage;
  readonly field?: string;
  readonly path?: readonly string[];
}

/**
 * ValidatedCandidate represents a candidate update that has successfully
 * passed all validation pipeline stages (Parse, Schema, Semantic).
 * It is safe for consumption by the Phase 4 State Engine.
 */
export interface ValidatedCandidate {
  readonly operations: readonly CandidateOperation[];
  readonly updates: readonly CandidateOperation[];
}

/**
 * Deterministic validation result model distinguishing success from failure.
 */
export type ValidationResult =
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
