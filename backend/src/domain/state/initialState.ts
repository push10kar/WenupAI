import { Field, PersonalWishesState } from "./types";

/**
 * Creates an empty Field in UNKNOWN status.
 */
export function createUnknownField<T>(): Field<T> {
  return { value: null, status: "UNKNOWN" };
}

/**
 * Creates a Field in CONFIRMED status with an authoritative value.
 */
export function createConfirmedField<T>(value: T): Field<T> {
  return { value, status: "CONFIRMED" };
}

/**
 * Creates a Field in UNCONFIRMED status with an optional candidate value.
 */
export function createUnconfirmedField<T>(value: T | null = null): Field<T> {
  return { value, status: "UNCONFIRMED" };
}

/**
 * Creates a Field in CONFLICTED status with an optional conflicting value.
 */
export function createConflictedField<T>(value: T | null = null): Field<T> {
  return { value, status: "CONFLICTED" };
}

/**
 * Creates the initial, canonical PersonalWishesState according to ARCHITECTURE.md Section 5.4.
 *
 * All scalar fields start as UNKNOWN with value null.
 * Array fields (children, specificGifts) start as empty arrays.
 */
export function createInitialState(): PersonalWishesState {
  return {
    fullName: createUnknownField<string>(),
    homeAddress: createUnknownField<string>(),
    coversWorldwideAssets: createUnknownField<boolean>(),
    hasChildren: createUnknownField<boolean>(),
    children: [],
    executor: {
      name: createUnknownField<string>(),
      relationship: createUnknownField<string>(),
    },
    specificGifts: [],
    additionalWishes: createUnknownField<string>(),
  };
}

/**
 * Creates a deep copy of a PersonalWishesState ensuring no shared references.
 */
export function cloneState(state: PersonalWishesState): PersonalWishesState {
  return {
    fullName: { ...state.fullName },
    homeAddress: { ...state.homeAddress },
    coversWorldwideAssets: { ...state.coversWorldwideAssets },
    hasChildren: { ...state.hasChildren },
    ...(state.childrenCount
      ? { childrenCount: { ...state.childrenCount } }
      : {}),
    children: state.children.map((c) => ({ ...c })),
    executor: {
      name: { ...state.executor.name },
      relationship: { ...state.executor.relationship },
    },
    specificGifts: state.specificGifts.map((g) => ({ ...g })),
    additionalWishes: { ...state.additionalWishes },
  };
}
