import { Field, PersonalWishesState } from "../state";
import { DocumentPreview, DocumentSection } from "./types";

export const DOCUMENT_TITLE = "PERSONAL WISHES DOCUMENT";
export const DOCUMENT_SUBTITLE = "Fictional example — Not legal advice";

const NOT_PROVIDED = "Not provided";
const NEEDS_CLARIFICATION = "Needs clarification";
const NONE_PROVIDED = "None provided";

/**
 * Renders a scalar string field according to ARCHITECTURE.md Section 12.5.
 */
function renderStringField(field: Field<string>): string {
  switch (field.status) {
    case "CONFIRMED":
      return field.value !== null && field.value.trim().length > 0
        ? field.value
        : NOT_PROVIDED;
    case "UNCONFIRMED":
    case "CONFLICTED":
      return NEEDS_CLARIFICATION;
    case "UNKNOWN":
    default:
      return NOT_PROVIDED;
  }
}

/**
 * Renders a scalar boolean field according to ARCHITECTURE.md Section 12.5.
 */
function renderBooleanField(field: Field<boolean>): string {
  switch (field.status) {
    case "CONFIRMED":
      if (typeof field.value === "boolean") {
        return field.value ? "Yes" : "No";
      }
      return NOT_PROVIDED;
    case "UNCONFIRMED":
    case "CONFLICTED":
      return NEEDS_CLARIFICATION;
    case "UNKNOWN":
    default:
      return NOT_PROVIDED;
  }
}

/**
 * Renders the Children section according to ARCHITECTURE.md Section 12.6.
 *
 * hasChildren = CONFIRMED(false) -> "No"
 * hasChildren = CONFIRMED(true)  -> render confirmed child names (or "Not provided" / "Needs clarification")
 * hasChildren = UNKNOWN          -> "Not provided"
 * hasChildren = UNCONFIRMED/CONFLICTED -> "Needs clarification"
 */
function renderChildren(state: PersonalWishesState): string {
  switch (state.hasChildren.status) {
    case "CONFIRMED": {
      if (state.hasChildren.value === false) {
        return "No";
      }

      // hasChildren = true: render confirmed child names
      const confirmedChildren = state.children.filter(
        (c) =>
          c.status === "CONFIRMED" &&
          c.value !== null &&
          c.value.trim().length > 0,
      );

      if (confirmedChildren.length > 0) {
        return confirmedChildren.map((c) => `- ${c.value}`).join("\n");
      }

      // If there are unconfirmed or conflicted children
      const hasUnresolved = state.children.some(
        (c) => c.status === "UNCONFIRMED" || c.status === "CONFLICTED",
      );
      if (hasUnresolved) {
        return NEEDS_CLARIFICATION;
      }

      return NOT_PROVIDED;
    }
    case "UNCONFIRMED":
    case "CONFLICTED":
      return NEEDS_CLARIFICATION;
    case "UNKNOWN":
    default:
      return NOT_PROVIDED;
  }
}

/**
 * Renders the Executor section according to ARCHITECTURE.md Section 12.7.
 * Executor fields are independently resolved.
 */
function renderExecutor(executor: PersonalWishesState["executor"]): string {
  const nameValue = renderStringField(executor.name);
  const relValue = renderStringField(executor.relationship);

  return `Name: ${nameValue}\nRelationship: ${relValue}`;
}

/**
 * Renders Specific Gifts according to ARCHITECTURE.md Section 12.8.
 * Confirmed specific gifts are rendered as a list. If none: "None provided".
 */
function renderSpecificGifts(specificGifts: Field<string>[]): string {
  const confirmedGifts = specificGifts.filter(
    (g) =>
      g.status === "CONFIRMED" && g.value !== null && g.value.trim().length > 0,
  );

  if (confirmedGifts.length > 0) {
    return confirmedGifts.map((g) => `- ${g.value}`).join("\n");
  }

  // If there are unconfirmed or conflicted gifts and no confirmed gifts
  const hasUnresolved = specificGifts.some(
    (g) => g.status === "UNCONFIRMED" || g.status === "CONFLICTED",
  );
  if (hasUnresolved) {
    return NEEDS_CLARIFICATION;
  }

  return NONE_PROVIDED;
}

/**
 * Deterministic document generator.
 *
 * Converts canonical PersonalWishesState into a DocumentPreview without side effects.
 *
 * Invariants (ARCHITECTURE.md Section 12.11):
 * 1. Document generation reads only structured state.
 * 2. Document generation does not modify state.
 * 3. Document generation does not call an LLM.
 * 4. Document generation does not infer missing information.
 * 5. Unresolved information is represented honestly.
 * 6. The document is a projection of the latest authoritative state.
 */
export function generateDocument(state: PersonalWishesState): DocumentPreview {
  const sections: readonly DocumentSection[] = Object.freeze([
    {
      title: "1. Full Name",
      content: renderStringField(state.fullName),
    },
    {
      title: "2. Home Address",
      content: renderStringField(state.homeAddress),
    },
    {
      title: "3. Worldwide Asset Coverage",
      content: renderBooleanField(state.coversWorldwideAssets),
    },
    {
      title: "4. Children",
      content: renderChildren(state),
    },
    {
      title: "5. Executor",
      content: renderExecutor(state.executor),
    },
    {
      title: "6. Specific Gifts",
      content: renderSpecificGifts(state.specificGifts),
    },
    {
      title: "7. Additional Wishes",
      content: renderStringField(state.additionalWishes),
    },
  ]);

  const sectionBlocks = sections
    .map((s) => `${s.title}\n${s.content}`)
    .join("\n\n");

  const content = `${DOCUMENT_TITLE}\n\n${DOCUMENT_SUBTITLE}\n\n${sectionBlocks}`;

  return {
    title: DOCUMENT_TITLE,
    subtitle: DOCUMENT_SUBTITLE,
    status: "draft",
    sections,
    content,
  };
}
