import { TransitionError, TransitionErrorCode } from "./types";

export function createTransitionError(
  code: TransitionErrorCode,
  message: string,
  field?: string,
  path?: string[],
): TransitionError {
  return {
    code,
    message,
    ...(field ? { field } : {}),
    ...(path ? { path: Object.freeze([...path]) } : {}),
  };
}
