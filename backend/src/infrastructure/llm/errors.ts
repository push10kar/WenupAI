/**
 * Machine-readable error codes for LLM provider failures (ARCHITECTURE.md Section 14.3).
 */
export type LLMErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "PROVIDER_AUTH_ERROR"
  | "PROVIDER_RATE_LIMIT"
  | "MALFORMED_OUTPUT"
  | "CONFIGURATION_ERROR";

/**
 * Structured application-level error representing an LLM provider failure.
 * Ensures external SDK errors, HTTP network details, or API keys do not leak into application logic.
 */
export class LLMClientError extends Error {
  readonly code: LLMErrorCode;
  readonly status?: number;

  constructor(
    message: string,
    code: LLMErrorCode = "PROVIDER_ERROR",
    options?: { status?: number; cause?: unknown },
  ) {
    super(message);
    this.name = "LLMClientError";
    this.code = code;
    this.status = options?.status;
    if (options?.cause) {
      this.cause = options.cause;
    }
    Object.setPrototypeOf(this, LLMClientError.prototype);
  }
}
