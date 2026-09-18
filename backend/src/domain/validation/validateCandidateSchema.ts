import {
  CandidateUpdate,
  safeValidateCandidateUpdate,
  ALLOWED_FIELDS,
} from "../candidate";
import { ValidationError, ValidationErrorCode } from "./types";
import { createSchemaError } from "./errors";

export type ValidateSchemaResult =
  | {
      readonly success: true;
      readonly candidate: CandidateUpdate;
      readonly errors?: never;
    }
  | {
      readonly success: false;
      readonly candidate?: never;
      readonly errors: readonly ValidationError[];
    };

/**
 * Safely resolves a nested value from an object given a path.
 */
function getValueAtPath(data: unknown, path: readonly PropertyKey[]): unknown {
  let current: unknown = data;
  for (const segment of path) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }
    current = (current as Record<PropertyKey, unknown>)[segment];
  }
  return current;
}

/**
 * Maps a Zod issue into a domain-level ValidationError without leaking Zod internals.
 */
function mapZodIssueToDomainError(
  issue: {
    path: readonly PropertyKey[];
    message: string;
    code?: string;
  },
  data: unknown,
): ValidationError {
  const path = issue.path.map(String);
  const pathStr = path.join(".");
  const lastSegment = path[path.length - 1];

  let code: ValidationErrorCode = "INVALID_RESPONSE_SCHEMA";
  let field: string | undefined;

  // Determine if error relates to a specific allowed field from path
  for (const part of path) {
    if (ALLOWED_FIELDS.includes(part as (typeof ALLOWED_FIELDS)[number])) {
      field = part;
      break;
    }
  }

  // If path is on an operation, attempt to resolve the target field name
  if (!field && issue.path.length >= 2) {
    const opPath = issue.path.slice(0, 2);
    const fieldVal = getValueAtPath(data, [...opPath, "field"]);
    if (typeof fieldVal === "string") {
      field = fieldVal;
    }
  }

  const msg = issue.message.toLowerCase();

  if (
    pathStr === "operations" ||
    pathStr === "updates" ||
    (path.length === 1 && (path[0] === "operations" || path[0] === "updates"))
  ) {
    // Structural container errors
    code = "INVALID_RESPONSE_SCHEMA";
  } else if (
    lastSegment === "field" ||
    msg.includes("unknown field") ||
    msg.includes("unrecognized key") ||
    msg.includes("invalid option")
  ) {
    code = "UNKNOWN_FIELD";
    const rawVal = getValueAtPath(data, issue.path);
    if (typeof rawVal === "string") {
      field = rawVal;
    }
  } else if (
    msg.includes("expects a boolean") ||
    msg.includes("expects a string") ||
    msg.includes("expected boolean") ||
    msg.includes("expected string") ||
    msg.includes("invalid_type")
  ) {
    code = "INVALID_VALUE_TYPE";
  } else if (
    msg.includes("empty or blank") ||
    msg.includes("cannot be empty")
  ) {
    code = "INVALID_VALUE";
  }

  return createSchemaError(code, issue.message, field, path);
}

/**
 * Stage 2 — Schema Validation
 * Validates the parsed structure against CandidateUpdate schema.
 * Reuses existing domain schema and translates errors into domain ValidationErrors.
 */
export function validateCandidateSchema(data: unknown): ValidateSchemaResult {
  const parseResult = safeValidateCandidateUpdate(data);

  if (!parseResult.success) {
    const errors: ValidationError[] = parseResult.error.issues.map((issue) =>
      mapZodIssueToDomainError(issue, data),
    );
    return {
      success: false,
      errors: Object.freeze(errors),
    };
  }

  return {
    success: true,
    candidate: parseResult.data,
  };
}
