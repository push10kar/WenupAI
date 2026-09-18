/**
 * Standard API error response shape matching ARCHITECTURE.md Section 9.4.
 */
export interface ApiErrorResponse {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

export const API_ERROR_CODES = {
  BAD_REQUEST: "BAD_REQUEST",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  CONCURRENCY_CONFLICT: "CONCURRENCY_CONFLICT",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  TRANSITION_ERROR: "TRANSITION_ERROR",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  PERSISTENCE_ERROR: "PERSISTENCE_ERROR",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
} as const;

export type ApiErrorCode =
  (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
