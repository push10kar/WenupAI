import { ValidationError, ValidationErrorCode, ValidationStage } from "./types";

export function createValidationError(
  stage: ValidationStage,
  code: ValidationErrorCode,
  message: string,
  field?: string,
  path?: string[],
): ValidationError {
  return {
    stage,
    code,
    message,
    ...(field ? { field } : {}),
    ...(path ? { path: Object.freeze([...path]) } : {}),
  };
}

export function createParseError(message: string): ValidationError {
  return createValidationError("PARSE", "MALFORMED_JSON", message);
}

export function createSchemaError(
  code: ValidationErrorCode,
  message: string,
  field?: string,
  path?: string[],
): ValidationError {
  return createValidationError("SCHEMA", code, message, field, path);
}

export function createSemanticError(
  code: ValidationErrorCode,
  message: string,
  field?: string,
  path?: string[],
): ValidationError {
  return createValidationError("SEMANTIC", code, message, field, path);
}
