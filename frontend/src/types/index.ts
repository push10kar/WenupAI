export type FieldStatus =
  | "UNKNOWN"
  | "UNCONFIRMED"
  | "CONFIRMED"
  | "CONFLICTED"
  | "NOT_PROVIDED"
  | "REFUSED";

export interface Field<T> {
  readonly value: T | null;
  readonly status: FieldStatus;
}

export interface ExecutorState {
  readonly name: Field<string>;
  readonly relationship: Field<string>;
}

export interface PersonalWishesState {
  readonly fullName: Field<string>;
  readonly homeAddress: Field<string>;
  readonly coversWorldwideAssets: Field<boolean>;
  readonly hasChildren: Field<boolean>;
  readonly children: readonly Field<string>[];
  readonly executor: ExecutorState;
  readonly specificGifts: readonly Field<string>[];
  readonly additionalWishes: Field<string>;
}

export interface DocumentSection {
  readonly title: string;
  readonly content: string;
}

export interface DocumentPreview {
  readonly title: string;
  readonly subtitle: string;
  readonly status: "draft";
  readonly sections: readonly DocumentSection[];
  readonly content: string;
}

export interface Message {
  readonly id: string;
  readonly role: "user" | "assistant";
  readonly content: string;
  readonly createdAt: string;
}

export interface Session {
  readonly id: string;
  readonly state: PersonalWishesState;
  readonly messages: readonly Message[];
  readonly document: DocumentPreview;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ApiError {
  readonly code: string;
  readonly message: string;
}

export type UIState =
  | "initializing"
  | "ready"
  | "submitting"
  | "error"
  | "conflict"
  | "completed";
