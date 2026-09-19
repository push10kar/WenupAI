import { describe, it, expect } from "vitest";
import {
  PersonalWishesState,
  createInitialState,
  validatePersonalWishesState,
  safeValidatePersonalWishesState,
  isPersonalWishesState,
  createUnknownField,
  createConfirmedField,
  createUnconfirmedField,
  createConflictedField,
  FIELD_STATUSES,
} from "../../src/domain";

describe("Domain Foundation — PersonalWishesState", () => {
  describe("Initial State", () => {
    it("creates an initial state matching the canonical specification", () => {
      const state = createInitialState();

      // Scalar fields must start as UNKNOWN with value null
      expect(state.fullName).toEqual({ value: null, status: "UNKNOWN" });
      expect(state.homeAddress).toEqual({ value: null, status: "UNKNOWN" });
      expect(state.coversWorldwideAssets).toEqual({
        value: null,
        status: "UNKNOWN",
      });
      expect(state.hasChildren).toEqual({ value: null, status: "UNKNOWN" });
      expect(state.additionalWishes).toEqual({
        value: null,
        status: "UNKNOWN",
      });

      // Nested executor fields must start as UNKNOWN with value null
      expect(state.executor).toEqual({
        name: { value: null, status: "UNKNOWN" },
        relationship: { value: null, status: "UNKNOWN" },
      });

      // Array fields must start as empty arrays
      expect(state.children).toEqual([]);
      expect(state.specificGifts).toEqual([]);
    });

    it("passes schema validation for the initial state", () => {
      const state = createInitialState();
      const validated = validatePersonalWishesState(state);

      expect(validated).toEqual(state);
      expect(isPersonalWishesState(state)).toBe(true);
    });
  });

  describe("Valid States", () => {
    it("validates a fully confirmed state with children and gifts", () => {
      const validState: PersonalWishesState = {
        fullName: createConfirmedField("Jane Doe"),
        homeAddress: createConfirmedField("42 Park Street, London"),
        coversWorldwideAssets: createConfirmedField(true),
        hasChildren: createConfirmedField(true),
        children: [
          createConfirmedField("Alice Doe"),
          createConfirmedField("Bob Doe"),
        ],
        executor: {
          name: createConfirmedField("James Smith"),
          relationship: createConfirmedField("Brother"),
        },
        specificGifts: [
          createConfirmedField("Family heirloom watch to Alice"),
          createConfirmedField("Book collection to local library"),
        ],
        additionalWishes: createConfirmedField("Scatter ashes in Cornwall"),
      };

      const result = safeValidatePersonalWishesState(validState);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.fullName.value).toBe("Jane Doe");
        expect(result.data.children.length).toBe(2);
        expect(result.data.coversWorldwideAssets.value).toBe(true);
      }
    });

    it("validates a partially confirmed state with unconfirmed and conflicted fields", () => {
      const intermediateState: PersonalWishesState = {
        fullName: createConfirmedField("John Arthur Smith"),
        homeAddress: createUnconfirmedField("Near Baker Street, London"),
        coversWorldwideAssets: createConflictedField(null),
        hasChildren: createConfirmedField(false),
        children: [],
        executor: {
          name: createUnconfirmedField("Mary"),
          relationship: createUnknownField(),
        },
        specificGifts: [],
        additionalWishes: createUnknownField(),
      };

      expect(isPersonalWishesState(intermediateState)).toBe(true);
    });

    it("validates boolean fields with value false and status CONFIRMED", () => {
      const state = createInitialState();
      state.hasChildren = createConfirmedField(false);
      state.coversWorldwideAssets = createConfirmedField(false);

      const result = safeValidatePersonalWishesState(state);
      expect(result.success).toBe(true);
    });

    it("supports helper constructors for field lifecycle", () => {
      expect(createUnknownField()).toEqual({ value: null, status: "UNKNOWN" });
      expect(createConfirmedField("test")).toEqual({
        value: "test",
        status: "CONFIRMED",
      });
      expect(createUnconfirmedField("maybe")).toEqual({
        value: "maybe",
        status: "UNCONFIRMED",
      });
      expect(createUnconfirmedField()).toEqual({
        value: null,
        status: "UNCONFIRMED",
      });
      expect(createConflictedField("disputed")).toEqual({
        value: "disputed",
        status: "CONFLICTED",
      });
    });
  });

  describe("Malformed State Rejection (Schema Invariants)", () => {
    it("rejects non-object or null input", () => {
      expect(isPersonalWishesState(null)).toBe(false);
      expect(isPersonalWishesState(undefined)).toBe(false);
      expect(isPersonalWishesState("state string")).toBe(false);
      expect(isPersonalWishesState(12345)).toBe(false);
      expect(isPersonalWishesState([])).toBe(false);
    });

    it("rejects state missing required root fields", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const incomplete: any = { ...state };
      delete incomplete.fullName;

      expect(isPersonalWishesState(incomplete)).toBe(false);

      const result = safeValidatePersonalWishesState(incomplete);
      expect(result.success).toBe(false);
    });

    it("rejects state with extra unknown properties (strict boundary)", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withExtra: any = {
        ...state,
        assistantMood: "friendly",
        conversationTopic: "intro",
      };

      expect(isPersonalWishesState(withExtra)).toBe(false);
    });

    it("rejects executor with extra unknown properties", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const withExtra: any = {
        ...state,
        executor: {
          ...state.executor,
          phoneNumber: "555-1234",
        },
      };

      expect(isPersonalWishesState(withExtra)).toBe(false);
    });

    it("rejects fields with invalid status values", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.fullName as any).status = "PENDING";

      expect(isPersonalWishesState(state)).toBe(false);
    });

    it("rejects UNKNOWN status with non-null value (Principle 6: Unknown is explicit)", () => {
      const state = createInitialState();
      state.fullName = { value: "Jane Doe", status: "UNKNOWN" };

      const result = safeValidatePersonalWishesState(state);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "status UNKNOWN must have a null value",
        );
      }
    });

    it("rejects CONFIRMED status with null value (Invariant: confirmed must be authoritative)", () => {
      const state = createInitialState();
      state.fullName = { value: null, status: "CONFIRMED" };

      const result = safeValidatePersonalWishesState(state);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain(
          "status CONFIRMED must have a non-null value",
        );
      }
    });

    it("rejects empty or whitespace-only string values in string fields", () => {
      const state = createInitialState();
      state.fullName = { value: "", status: "CONFIRMED" };

      expect(isPersonalWishesState(state)).toBe(false);

      state.fullName = { value: "   ", status: "CONFIRMED" };
      expect(isPersonalWishesState(state)).toBe(false);
    });

    it("rejects type mismatches on boolean fields", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.hasChildren as any) = { value: "yes", status: "CONFIRMED" };

      expect(isPersonalWishesState(state)).toBe(false);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.coversWorldwideAssets as any) = { value: 1, status: "CONFIRMED" };
      expect(isPersonalWishesState(state)).toBe(false);
    });

    it("rejects raw string arrays in children instead of Field<string>[]", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.children as any) = ["Alice", "Bob"];

      expect(isPersonalWishesState(state)).toBe(false);
    });

    it("rejects malformed items inside children array", () => {
      const state = createInitialState();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state.children as any) = [{ value: null, status: "CONFIRMED" }];

      expect(isPersonalWishesState(state)).toBe(false);
    });

    it("throws ZodError on validatePersonalWishesState for malformed data", () => {
      expect(() => validatePersonalWishesState({})).toThrow();
    });
  });

  describe("Runtime Validation Independence", () => {
    it("ensures type guard uses runtime schema rather than blind TypeScript casting", () => {
      const untrustedData = JSON.parse(
        '{"fullName": {"value": 42, "status": "CONFIRMED"}}',
      );
      expect(isPersonalWishesState(untrustedData)).toBe(false);
    });

    it("exports all standard FIELD_STATUSES", () => {
      expect(FIELD_STATUSES).toEqual([
        "UNKNOWN",
        "UNCONFIRMED",
        "CONFIRMED",
        "CONFLICTED",
        "NOT_PROVIDED",
        "REFUSED",
      ]);
    });
  });
});
