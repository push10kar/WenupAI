import { PersonalWishesState } from "../state";
import { ValidationResult } from "./types";
import { parseCandidate } from "./parseCandidate";
import { validateCandidateSchema } from "./validateCandidateSchema";
import { validateCandidateSemantics } from "./validateCandidateSemantics";

/**
 * Validation Pipeline Orchestrator (ARCHITECTURE.md Section 8)
 *
 * Enforces the explicit stages:
 *   Raw Input
 *      ↓
 *   Stage 1: Parse
 *      ↓
 *   Stage 2: Schema Validation
 *      ↓
 *   Stage 3: Semantic Validation
 *      ↓
 *   ValidatedCandidate
 *
 * Invariants:
 * 1. Invalid candidate update → validation failure → ZERO state mutation
 * 2. Schema-invalid candidates never reach semantic validation
 * 3. Fail-closed: all-or-nothing validation (no partial acceptance)
 * 4. Deterministic with zero side effects
 * 5. Input candidate and state are never mutated
 */
export function validateCandidate(
  rawInput: unknown,
  currentState?: PersonalWishesState,
): ValidationResult {
  // Stage 1: Parse
  const parseResult = parseCandidate(rawInput);
  if (!parseResult.success) {
    return {
      success: false,
      errors: Object.freeze([parseResult.error]),
    };
  }

  // Stage 2: Schema Validation
  const schemaResult = validateCandidateSchema(parseResult.data);
  if (!schemaResult.success) {
    return {
      success: false,
      errors: schemaResult.errors,
    };
  }

  // Stage 3: Semantic Validation
  const semanticResult = validateCandidateSemantics(
    schemaResult.candidate,
    currentState,
  );
  if (!semanticResult.success) {
    return {
      success: false,
      errors: semanticResult.errors,
    };
  }

  return {
    success: true,
    candidate: semanticResult.candidate,
  };
}

export const validateCandidatePipeline = validateCandidate;
