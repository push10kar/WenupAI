/**
 * Allowed fields for candidate updates according to ARCHITECTURE.md Section 7.4.
 * LLM output may only reference these fields; unknown fields must be rejected.
 */
export const ALLOWED_FIELDS = [
  "fullName",
  "homeAddress",
  "coversWorldwideAssets",
  "hasChildren",
  "childrenCount",
  "children",
  "executor.name",
  "executor.relationship",
  "specificGifts",
  "additionalWishes",
] as const;

export type AllowedField = (typeof ALLOWED_FIELDS)[number];
export type CandidateTargetField = AllowedField;

/**
 * Allowed operation types (UpdateIntent) according to ARCHITECTURE.md Section 7.5.
 */
export const UPDATE_INTENTS = ["NEW", "CORRECTION", "CLARIFICATION"] as const;
export type UpdateIntent = (typeof UPDATE_INTENTS)[number];
export type CandidateOperationType = UpdateIntent;

/**
 * Confidence level for candidate updates according to ARCHITECTURE.md Section 7.5.
 */
export const CONFIDENCE_LEVELS = ["CLEAR", "AMBIGUOUS"] as const;
export type CandidateConfidence = (typeof CONFIDENCE_LEVELS)[number];

import { FieldStatus } from "../state";

/**
 * CandidateOperation represents an individual proposed change to a single domain field.
 * Model output is untrusted runtime data and must pass schema and semantic validation.
 */
export interface CandidateOperation {
  field: AllowedField;
  value: unknown;
  intent: UpdateIntent;
  confidence: CandidateConfidence;
  status?: FieldStatus;
}

/**
 * CandidateUpdate represents the structured extraction contract of proposed changes
 * produced by an LLM before validation and state transition.
 *
 * Distinct from authoritative PersonalWishesState.
 */
export interface CandidateUpdate {
  operations: CandidateOperation[];
  updates: CandidateOperation[];
}
