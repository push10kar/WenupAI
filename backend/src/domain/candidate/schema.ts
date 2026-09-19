import { z } from "zod";
import { fieldStatusSchema, FieldStatus } from "../state";
import {
  ALLOWED_FIELDS,
  AllowedField,
  UPDATE_INTENTS,
  UpdateIntent,
  CONFIDENCE_LEVELS,
  CandidateConfidence,
  CandidateOperation,
  CandidateUpdate,
} from "./types";

/**
 * Runtime schema for allowed fields.
 */
export const allowedFieldSchema = z.enum(ALLOWED_FIELDS);

/**
 * Runtime schema for operation types / update intent.
 */
export const updateIntentSchema = z.enum(UPDATE_INTENTS);
export const candidateOperationTypeSchema = updateIntentSchema;

/**
 * Runtime schema for confidence level.
 */
export const confidenceSchema = z.enum(CONFIDENCE_LEVELS);

/**
 * Helper to validate value type conformance for each allowed target field.
 * Enforces strict domain typing without unsafe coercion.
 */
function validateFieldValueByType(
  field: AllowedField,
  value: unknown,
): { valid: boolean; message: string } {
  if (value === undefined) {
    return {
      valid: false,
      message: `Field '${field}' requires a defined value`,
    };
  }

  switch (field) {
    case "coversWorldwideAssets":
    case "hasChildren":
      if (typeof value !== "boolean") {
        return {
          valid: false,
          message: `Field '${field}' expects a boolean value, received ${typeof value}`,
        };
      }
      return { valid: true, message: "" };

    case "childrenCount":
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
        return {
          valid: false,
          message: `Field '${field}' expects a non-negative integer, received ${typeof value === "number" ? value : typeof value}`,
        };
      }
      return { valid: true, message: "" };

    case "fullName":
    case "homeAddress":
    case "executor.name":
    case "executor.relationship":
    case "additionalWishes":
      if (typeof value !== "string") {
        return {
          valid: false,
          message: `Field '${field}' expects a string value, received ${typeof value}`,
        };
      }
      if (value.trim().length === 0) {
        return {
          valid: false,
          message: `Field '${field}' value cannot be empty or blank`,
        };
      }
      return { valid: true, message: "" };

    case "children":
    case "specificGifts":
      if (typeof value === "string") {
        if (value.trim().length === 0) {
          return {
            valid: false,
            message: `Field '${field}' value cannot be empty or blank`,
          };
        }
        return { valid: true, message: "" };
      }
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return {
            valid: false,
            message: `Field '${field}' array cannot be empty`,
          };
        }
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] !== "string" || value[i].trim().length === 0) {
            return {
              valid: false,
              message: `Field '${field}' array elements must be non-empty strings`,
            };
          }
        }
        return { valid: true, message: "" };
      }
      return {
        valid: false,
        message: `Field '${field}' expects a string or array of strings, received ${typeof value}`,
      };

    default:
      return { valid: false, message: `Unknown field '${field}'` };
  }
}

/**
 * Schema for an individual CandidateOperation.
 * Rejects unknown fields, invalid operation types, missing values, and type mismatches.
 */
export const candidateOperationSchema = z
  .object({
    field: allowedFieldSchema,
    value: z.unknown(),
    intent: updateIntentSchema.optional(),
    operation: updateIntentSchema.optional(),
    confidence: confidenceSchema.optional().default("CLEAR"),
    status: fieldStatusSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // Ensure either intent or operation type is provided
    const intent = data.intent ?? data.operation;
    if (!intent) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate operation requires an operation type/intent",
        path: ["intent"],
      });
    }

    // Ensure value is present (undefined is rejected, null is allowed for non-answers)
    if (data.value === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Candidate operation requires a value",
        path: ["value"],
      });
      return;
    }

    // Non-answer handling: NOT_PROVIDED and REFUSED require null value
    if (data.status === "NOT_PROVIDED" || data.status === "REFUSED") {
      if (data.value !== null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Candidate operation with status '${data.status}' must have a null value`,
          path: ["value"],
        });
      }
      return;
    }

    // Validate value type conformance for the target domain field
    const check = validateFieldValueByType(data.field, data.value);
    if (!check.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: check.message,
        path: ["value"],
      });
    }
  })
  .transform(
    (data): CandidateOperation => ({
      field: data.field,
      value: data.value,
      intent: (data.intent ?? data.operation) as UpdateIntent,
      confidence: data.confidence as CandidateConfidence,
      ...(data.status ? { status: data.status as FieldStatus } : {}),
    }),
  );

/**
 * Authoritative runtime schema for CandidateUpdate.
 * Accepts either `operations` or `updates` array, requires at least one operation,
 * and rejects unknown properties.
 */
export const candidateUpdateSchema = z
  .object({
    operations: z.array(candidateOperationSchema).optional(),
    updates: z.array(candidateOperationSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const ops = data.operations ?? data.updates;
    if (!ops) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CandidateUpdate must contain an operations or updates array",
        path: ["operations"],
      });
      return;
    }

    if (ops.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "CandidateUpdate operations array cannot be empty",
        path: ["operations"],
      });
    }
  })
  .transform((data): CandidateUpdate => {
    const ops = data.operations ?? data.updates ?? [];
    return {
      operations: ops,
      updates: ops,
    };
  });

/**
 * Validate untrusted candidate update data. Throws ZodError on validation failure.
 */
export function validateCandidateUpdate(data: unknown): CandidateUpdate {
  return candidateUpdateSchema.parse(data);
}

/**
 * Safe runtime validation for CandidateUpdate returning a safe parse result.
 */
export function safeValidateCandidateUpdate(
  data: unknown,
): ReturnType<typeof candidateUpdateSchema.safeParse> {
  return candidateUpdateSchema.safeParse(data);
}

/**
 * Type guard for CandidateUpdate using runtime validation.
 */
export function isCandidateUpdate(data: unknown): data is CandidateUpdate {
  return candidateUpdateSchema.safeParse(data).success;
}

/**
 * Validate an individual candidate operation. Throws ZodError on failure.
 */
export function validateCandidateOperation(data: unknown): CandidateOperation {
  return candidateOperationSchema.parse(data);
}

/**
 * Safe runtime validation for an individual CandidateOperation.
 */
export function safeValidateCandidateOperation(
  data: unknown,
): ReturnType<typeof candidateOperationSchema.safeParse> {
  return candidateOperationSchema.safeParse(data);
}

/**
 * Type guard for an individual CandidateOperation.
 */
export function isCandidateOperation(
  data: unknown,
): data is CandidateOperation {
  return candidateOperationSchema.safeParse(data).success;
}
