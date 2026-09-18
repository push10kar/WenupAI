import { describe, it, expect } from "vitest";
import {
  createInitialState,
  isPersonalWishesState,
  validatePersonalWishesState,
} from "../../backend/src/domain/state";

describe("Root Domain Integration Smoke Test", () => {
  it("imports and validates canonical initial state from backend domain module", () => {
    const initialState = createInitialState();
    expect(isPersonalWishesState(initialState)).toBe(true);
    expect(validatePersonalWishesState(initialState)).toBeDefined();
  });
});
