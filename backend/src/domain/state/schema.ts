import { z } from "zod";
import {
  FIELD_STATUSES,
  FieldStatus,
  Field,
  Executor,
  PersonalWishesState,
} from "./types";

/**
 * Runtime schema for FieldStatus enum.
 */
export const fieldStatusSchema = z.enum(FIELD_STATUSES);

/**
 * Factory for creating a runtime Zod schema for a Field<T>.
 * Enforces:
 * - value must match valueSchema or be null
 * - status must be a valid FieldStatus
 * - when status is UNKNOWN, value MUST be null (Principle 6: UNKNOWN != empty/false/inferred)
 * - when status is CONFIRMED, value MUST NOT be null (authoritative values must be defined)
 * - no arbitrary unknown keys (strict)
 */
export function createFieldSchema<T>(valueSchema: z.ZodType<T>) {
  return z
    .object({
      value: valueSchema.nullable(),
      status: fieldStatusSchema,
    })
    .strict()
    .superRefine((field, ctx) => {
      if (field.status === "UNKNOWN" && field.value !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Field with status UNKNOWN must have a null value",
          path: ["value"],
        });
      }
      if (field.status === "CONFIRMED" && field.value === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Field with status CONFIRMED must have a non-null value",
          path: ["value"],
        });
      }
    });
}

/**
 * Schema for non-empty string fields (semantic validation: no empty or blank strings).
 */
export const stringFieldSchema = createFieldSchema(
  z.string().trim().min(1, "String field value cannot be empty"),
);

/**
 * Schema for boolean fields.
 */
export const booleanFieldSchema = createFieldSchema(z.boolean());

/**
 * Schema for Executor.
 */
export const executorSchema = z
  .object({
    name: stringFieldSchema,
    relationship: stringFieldSchema,
  })
  .strict();

/**
 * Authoritative runtime schema for PersonalWishesState.
 * Validates the complete structure and rejects unknown fields.
 */
export const personalWishesStateSchema = z
  .object({
    fullName: stringFieldSchema,
    homeAddress: stringFieldSchema,
    coversWorldwideAssets: booleanFieldSchema,
    hasChildren: booleanFieldSchema,
    children: z.array(stringFieldSchema),
    executor: executorSchema,
    specificGifts: z.array(stringFieldSchema),
    additionalWishes: stringFieldSchema,
  })
  .strict();

/**
 * Validate untrusted data against the PersonalWishesState schema.
 * Throws ZodError on validation failure.
 */
export function validatePersonalWishesState(
  data: unknown,
): PersonalWishesState {
  return personalWishesStateSchema.parse(data) as PersonalWishesState;
}

/**
 * Safe runtime validation that returns a Zod SafeParseReturnType without throwing.
 */
export function safeValidatePersonalWishesState(
  data: unknown,
): ReturnType<typeof personalWishesStateSchema.safeParse> {
  return personalWishesStateSchema.safeParse(data);
}

/**
 * Type guard for PersonalWishesState backed by runtime Zod validation.
 */
export function isPersonalWishesState(
  data: unknown,
): data is PersonalWishesState {
  return personalWishesStateSchema.safeParse(data).success;
}
