/**
 * FieldStatus defines the authoritative lifecycle status for any field in the domain state.
 *
 * UNKNOWN: No usable information has been collected (value must be null).
 * UNCONFIRMED: Candidate value exists, but its meaning or correctness is ambiguous or unverified.
 * CONFIRMED: Value has passed validation and is authoritative.
 * CONFLICTED: Existing state conflicts with newly supplied information and requires clarification.
 */
export const FIELD_STATUS = {
  UNKNOWN: "UNKNOWN",
  UNCONFIRMED: "UNCONFIRMED",
  CONFIRMED: "CONFIRMED",
  CONFLICTED: "CONFLICTED",
} as const;

export const FIELD_STATUSES = [
  FIELD_STATUS.UNKNOWN,
  FIELD_STATUS.UNCONFIRMED,
  FIELD_STATUS.CONFIRMED,
  FIELD_STATUS.CONFLICTED,
] as const;

export type FieldStatus = (typeof FIELD_STATUSES)[number];

/**
 * Field represents an explicit, structured domain property with value and lifecycle status.
 */
export interface Field<T> {
  value: T | null;
  status: FieldStatus;
}

/**
 * Executor represents executor information collected for the personal wishes document.
 */
export interface Executor {
  name: Field<string>;
  relationship: Field<string>;
}

/**
 * PersonalWishesState is the authoritative domain model and single source of truth
 * for the Document Intake Assistant.
 */
export interface PersonalWishesState {
  fullName: Field<string>;
  homeAddress: Field<string>;
  coversWorldwideAssets: Field<boolean>;
  hasChildren: Field<boolean>;
  children: Field<string>[];
  executor: Executor;
  specificGifts: Field<string>[];
  additionalWishes: Field<string>;
}
