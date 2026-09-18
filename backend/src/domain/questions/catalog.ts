import { AllowedField } from "../candidate";
import { Question, QuestionId } from "./types";

/**
 * Deterministic question priority sequence defined in ARCHITECTURE.md Section 6.5:
 * 1. fullName
 * 2. homeAddress
 * 3. coversWorldwideAssets
 * 4. hasChildren
 * 5. children (when hasChildren = true)
 * 6. executor.name
 * 7. executor.relationship
 * 8. specificGifts
 * 9. additionalWishes
 * 10. completion
 */
export const QUESTION_ORDER: readonly QuestionId[] = [
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

/**
 * Static, deterministic question catalog with canonical prompts.
 */
export const QUESTION_CATALOG: Readonly<
  Record<QuestionId, Readonly<Question>>
> = Object.freeze({
  fullName: Object.freeze({
    id: "fullName",
    field: "fullName" as AllowedField,
    targetField: "fullName" as AllowedField,
    prompt: "What is your full legal name?",
  }),
  homeAddress: Object.freeze({
    id: "homeAddress",
    field: "homeAddress" as AllowedField,
    targetField: "homeAddress" as AllowedField,
    prompt: "What is your current home address?",
  }),
  coversWorldwideAssets: Object.freeze({
    id: "coversWorldwideAssets",
    field: "coversWorldwideAssets" as AllowedField,
    targetField: "coversWorldwideAssets" as AllowedField,
    prompt: "Do you wish for this document to cover your worldwide assets?",
  }),
  hasChildren: Object.freeze({
    id: "hasChildren",
    field: "hasChildren" as AllowedField,
    targetField: "hasChildren" as AllowedField,
    prompt: "Do you have any children?",
  }),
  children: Object.freeze({
    id: "children",
    field: "children" as AllowedField,
    targetField: "children" as AllowedField,
    prompt: "What are the names of your children?",
  }),
  "executor.name": Object.freeze({
    id: "executor.name",
    field: "executor.name" as AllowedField,
    targetField: "executor.name" as AllowedField,
    prompt: "What is the full name of your appointed executor?",
  }),
  "executor.relationship": Object.freeze({
    id: "executor.relationship",
    field: "executor.relationship" as AllowedField,
    targetField: "executor.relationship" as AllowedField,
    prompt: "What is your relationship to your appointed executor?",
  }),
  specificGifts: Object.freeze({
    id: "specificGifts",
    field: "specificGifts" as AllowedField,
    targetField: "specificGifts" as AllowedField,
    prompt:
      "Do you have any specific gifts you would like to distribute, and to whom?",
  }),
  additionalWishes: Object.freeze({
    id: "additionalWishes",
    field: "additionalWishes" as AllowedField,
    targetField: "additionalWishes" as AllowedField,
    prompt:
      "Do you have any additional wishes, instructions, or funeral arrangements to include?",
  }),
});

/**
 * Returns a safe, cloned copy of a Question from the catalog by its ID.
 */
export function getQuestion(id: QuestionId): Question {
  const item = QUESTION_CATALOG[id];
  return {
    id: item.id,
    field: item.field,
    targetField: item.targetField,
    prompt: item.prompt,
  };
}

/**
 * Returns all catalog questions in deterministic order as defensive clones.
 */
export function getAllQuestions(): readonly Question[] {
  return QUESTION_ORDER.map((id) => getQuestion(id));
}
