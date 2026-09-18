import { PersonalWishesState } from "../state";
import { ValidatedCandidate } from "../validation";

/**
 * ValidatedCandidateUpdate is the validated input contract accepted by the state transition engine.
 */
export type ValidatedCandidateUpdate = ValidatedCandidate;

/**
 * Machine-readable error codes for state transition failures.
 */
export type TransitionErrorCode =
  | "UNSUPPORTED_OPERATION"
  | "INVALID_TRANSITION"
  | "INVARIANT_VIOLATION"
  | "TRANSITION_ERROR";

/**
 * Structured domain-level transition error representation.
 */
export interface TransitionError {
  readonly code: TransitionErrorCode;
  readonly message: string;
  readonly field?: string;
  readonly path?: readonly string[];
}

/**
 * Discriminated union representing the result of applying candidate updates to canonical state.
 */
export type TransitionResult =
  | {
      readonly success: true;
      readonly state: PersonalWishesState;
      readonly errors?: never;
    }
  | {
      readonly success: false;
      readonly state?: never;
      readonly errors: readonly TransitionError[];
    };
