import { ValidationError } from "./types";
import { createParseError } from "./errors";

export type ParseCandidateResult =
  | {
      readonly success: true;
      readonly data: unknown;
      readonly error?: never;
    }
  | {
      readonly success: false;
      readonly data?: never;
      readonly error: ValidationError;
    };

/**
 * Stage 1 — Parse
 * Safely parses untrusted raw input into an in-memory representation.
 * Handles strings (JSON parse), objects, and rejects primitives/null/undefined/arrays.
 * Never throws an uncontrolled exception.
 */
export function parseCandidate(rawInput: unknown): ParseCandidateResult {
  if (rawInput === null || rawInput === undefined) {
    return {
      success: false,
      error: createParseError(
        "Raw candidate input cannot be null or undefined",
      ),
    };
  }

  // If input is a JSON string, attempt parsing
  if (typeof rawInput === "string") {
    const trimmed = rawInput.trim();
    if (trimmed.length === 0) {
      return {
        success: false,
        error: createParseError("Raw candidate input cannot be empty string"),
      };
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (
        parsed === null ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return {
          success: false,
          error: createParseError(
            "Parsed JSON candidate input must be an object",
          ),
        };
      }
      return {
        success: true,
        data: parsed,
      };
    } catch {
      return {
        success: false,
        error: createParseError(
          "Failed to parse malformed JSON candidate input",
        ),
      };
    }
  }

  // If input is not an object or is an array
  if (typeof rawInput !== "object" || Array.isArray(rawInput)) {
    return {
      success: false,
      error: createParseError(
        "Raw candidate input must be a non-null object or JSON string",
      ),
    };
  }

  return {
    success: true,
    data: rawInput,
  };
}
