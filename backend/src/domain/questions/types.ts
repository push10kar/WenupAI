import { AllowedField } from "../candidate";

/**
 * Stable, deterministic question identifiers corresponding to canonical intake fields.
 */
export const QUESTION_IDS = [
  "fullName",
  "homeAddress",
  "coversWorldwideAssets",
  "hasChildren",
  "children",
  "executor.name",
  "executor.relationship",
  "specificGifts",
  "additionalWishes",
] as const;

export type QuestionId = (typeof QUESTION_IDS)[number];

/**
 * Canonical Question representation in the domain model.
 */
export interface Question {
  readonly id: QuestionId;
  readonly field: AllowedField;
  readonly targetField: AllowedField;
  readonly prompt: string;
}

/**
 * Discriminated union representing the next step in the intake interview.
 */
export type NextQuestionResult =
  | {
      readonly status: "QUESTION_AVAILABLE";
      readonly question: Question;
    }
  | {
      readonly status: "COMPLETE";
    };
