import { z } from "zod";
import {
  ALLOWED_FIELDS,
  CONFIDENCE_LEVELS,
  UPDATE_INTENTS,
} from "../../domain/candidate";
import { fieldStatusSchema } from "../../domain/state";

/**
 * Wire-contract Zod schema describing the exact JSON the LLM must return
 * for candidate extraction.
 *
 * Rationale:
 * - Since generic providers (e.g. OpenRouter free models) do not reliably
 *   support native structured-output schemas, the contract is enforced
 *   defensively: the rendered JSON Schema is injected into the prompt AND the
 *   parsed response is validated with Zod, retrying once on failure.
 * - Field/intent/confidence enums are sourced from the authoritative domain
 *   constants so this contract cannot drift from the domain.
 */
export const llmCandidateOperationSchema = z
  .object({
    field: z.enum(ALLOWED_FIELDS),
    value: z.unknown(),
    intent: z.enum(UPDATE_INTENTS),
    confidence: z.enum(CONFIDENCE_LEVELS).optional().default("CLEAR"),
    status: fieldStatusSchema.optional(),
  })
  .strict();

export const llmExtractionOutputSchema = z
  .object({
    updates: z.array(llmCandidateOperationSchema),
  })
  .strict();

/**
 * JSON Schema (draft 2020-12) rendered from the Zod wire contract.
 * Injected verbatim into the extraction system prompt so the model sees the
 * exact expected structure before it generates anything.
 */
export const EXTRACTION_JSON_SCHEMA = JSON.stringify(
  llmExtractionOutputSchema.toJSONSchema(),
  null,
  2,
);