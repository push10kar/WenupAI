/**
 * Machine-readable error codes for persistence failures.
 */
export type PersistenceErrorCode =
  | "NOT_FOUND"
  | "DATABASE_ERROR"
  | "INVALID_STATE"
  | "INVALID_PERSISTED_STATE"
  | "CONCURRENCY_CONFLICT";

/**
 * Structured persistence error ensuring database implementation details
 * do not leak into the application layer.
 */
export class PersistenceError extends Error {
  readonly code: PersistenceErrorCode;

  constructor(message: string, code: PersistenceErrorCode = "DATABASE_ERROR") {
    super(message);
    this.name = "PersistenceError";
    this.code = code;
    Object.setPrototypeOf(this, PersistenceError.prototype);
  }
}
