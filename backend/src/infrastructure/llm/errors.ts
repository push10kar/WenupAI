/**
 * Machine-readable error codes for LLM provider failures.
 */
export type LLMErrorCode =
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_TIMEOUT"
  | "PROVIDER_ERROR"
  | "MALFORMED_OUTPUT";

/**
 * Structured domain-level error representing an LLM provider failure.
 * Ensures external SDK errors or HTTP network details do not leak into application logic.
 */
export class LLMClientError extends Error {
  readonly code: LLMErrorCode;

  constructor(message: string, code: LLMErrorCode = "PROVIDER_ERROR") {
    super(message);
    this.name = "LLMClientError";
    this.code = code;
    Object.setPrototypeOf(this, LLMClientError.prototype);
  }
}
