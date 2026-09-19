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
  cloneState,
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

  describe("State Isolation", () => {
    it("ensures two distinct calls to createInitialState return independent mutable objects", () => {
      const stateA = createInitialState();
      const stateB = createInitialState();

      // Mutate stateA scalar field
      stateA.fullName = createConfirmedField("Alice");
      expect(stateB.fullName).toEqual({ value: null, status: "UNKNOWN" });

      // Mutate stateA nested executor
      stateA.executor.name = createConfirmedField("Bob");
      stateA.executor.relationship = createConfirmedField("Brother");
      expect(stateB.executor.name).toEqual({ value: null, status: "UNKNOWN" });
      expect(stateB.executor.relationship).toEqual({
        value: null,
        status: "UNKNOWN",
      });

      // Mutate stateA array fields
      stateA.children.push(createConfirmedField("Child 1"));
      stateA.specificGifts.push(createConfirmedField("Gift 1"));
      expect(stateB.children).toEqual([]);
      expect(stateB.specificGifts).toEqual([]);
    });

    it("ensures cloneState produces completely isolated deep copy", () => {
      const state = createInitialState();
      state.fullName = createConfirmedField("Original Name");
      state.children.push(createConfirmedField("Original Child"));
      state.executor.relationship = createConfirmedField("Sister");

      const cloned = cloneState(state);

      // Mutate clone
      cloned.fullName = createConfirmedField("Mutated Name");
      cloned.children.push(createConfirmedField("Cloned Child"));
      cloned.executor.relationship = createConfirmedField("Aunt");

      expect(state.fullName.value).toBe("Original Name");
      expect(state.children.length).toBe(1);
      expect(state.children[0].value).toBe("Original Child");
      expect(state.executor.relationship.value).toBe("Sister");
    });
  });

  describe("State Serialization Round-Trip", () => {
    it("preserves all field values, statuses, and nulls through JSON serialization/deserialization", () => {
      const originalState: PersonalWishesState = {
        fullName: createConfirmedField("Jane Doe"),
        homeAddress: createUnconfirmedField("123 Elm St"),
        coversWorldwideAssets: { value: null, status: "UNKNOWN" },
        hasChildren: createConfirmedField(false),
        children: [],
        executor: {
          name: { value: null, status: "UNKNOWN" },
          relationship: createConfirmedField("Brother"),
        },
        specificGifts: [
          createConfirmedField("Gold watch to nephew"),
          createUnconfirmedField("Car to friend"),
        ],
        additionalWishes: { value: null, status: "NOT_PROVIDED" },
      };

      // Serialize
      const serialized = JSON.stringify(originalState);
      // Deserialize
      const parsed = JSON.parse(serialized);
      // Validate schema
      const validated = validatePersonalWishesState(parsed);

      expect(validated).toEqual(originalState);
      // Crucial: null remains null, not false
      expect(validated.coversWorldwideAssets.value).toBeNull();
      expect(validated.coversWorldwideAssets.status).toBe("UNKNOWN");
      // Confirmed false remains boolean false
      expect(validated.hasChildren.value).toBe(false);
      expect(validated.hasChildren.status).toBe("CONFIRMED");
      // Statuses are preserved
      expect(validated.additionalWishes.status).toBe("NOT_PROVIDED");
      expect(validated.homeAddress.status).toBe("UNCONFIRMED");
      expect(validated.executor.relationship.status).toBe("CONFIRMED");
      expect(validated.executor.name.status).toBe("UNKNOWN");
    });
  });

  describe("Domain Invariants", () => {
    it("Invariant A: UNKNOWN is not false (boolean fields initialize to null)", () => {
      const state = createInitialState();
      expect(state.hasChildren.value).not.toBe(false);
      expect(state.hasChildren.value).toBeNull();
      expect(state.hasChildren.status).toBe("UNKNOWN");

      expect(state.coversWorldwideAssets.value).not.toBe(false);
      expect(state.coversWorldwideAssets.value).toBeNull();
      expect(state.coversWorldwideAssets.status).toBe("UNKNOWN");
    });

    it("Invariant E: Executor name and relationship are independently representable", () => {
      const state = createInitialState();
      // Relationship known, name unknown
      state.executor.relationship = createConfirmedField("Brother");
      expect(state.executor.relationship.status).toBe("CONFIRMED");
      expect(state.executor.relationship.value).toBe("Brother");
      expect(state.executor.name.status).toBe("UNKNOWN");
      expect(state.executor.name.value).toBeNull();

      expect(isPersonalWishesState(state)).toBe(true);
    });

    it("Invariant F: Specific gifts and additional wishes are distinct concepts", () => {
      const state = createInitialState();
      state.specificGifts = [
        createConfirmedField("Vintage watch"),
        createConfirmedField("Painting"),
      ];
      state.additionalWishes = createConfirmedField("Scatter ashes at sea");

      expect(Array.isArray(state.specificGifts)).toBe(true);
      expect(state.specificGifts.length).toBe(2);
      expect(typeof state.additionalWishes).toBe("object");
      expect(state.additionalWishes.value).toBe("Scatter ashes at sea");
      expect(isPersonalWishesState(state)).toBe(true);
    });
  });
});
