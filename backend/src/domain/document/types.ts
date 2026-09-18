/**
 * A single structured section of the generated document.
 */
export interface DocumentSection {
  readonly title: string;
  readonly content: string;
}

/**
 * Deterministic preview projection of canonical PersonalWishesState
 * defined in ARCHITECTURE.md Section 12.3.
 */
export interface DocumentPreview {
  readonly title: string;
  readonly subtitle: string;
  readonly status: "draft";
  readonly sections: readonly DocumentSection[];
  readonly content: string;
}

/**
 * GeneratedDocument is a type alias for DocumentPreview representing the authoritative document projection.
 */
export type GeneratedDocument = DocumentPreview;
