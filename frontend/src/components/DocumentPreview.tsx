import React from "react";
import {
  DocumentPreview as DocumentPreviewType,
  Field,
  PersonalWishesState,
} from "../types";

interface DocumentPreviewProps {
  document: DocumentPreviewType;
  state: PersonalWishesState;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
  state,
}) => {
  const slot = <T,>(field: Field<T>, placeholder: string) => {
    if (field.status === "UNCONFIRMED" || field.status === "CONFLICTED") {
      return (
        <span className="rounded bg-[#fef3c7] px-1.5 text-[#92400e] border-b border-dashed border-[#f59e0b]">
          [Needs clarification: {placeholder}]
        </span>
      );
    }
    if (
      field.status !== "CONFIRMED" ||
      field.value === null ||
      field.value === undefined ||
      field.value === ""
    ) {
      return (
        <span className="rounded bg-[#eaeef3] px-1.5 text-[#5f6b78] border-b border-dashed border-[#8894a3]">
          [{placeholder}]
        </span>
      );
    }
    return <span className="text-[#1d2129]">{String(field.value)}</span>;
  };

  const confirmedChildren = state.children
    .filter((child) => child.status === "CONFIRMED")
    .map((child) => child.value)
    .filter((value): value is string => Boolean(value))
    .join(", ");
  const gifts = state.specificGifts
    .filter((gift) => gift.status === "CONFIRMED")
    .map((gift) => gift.value)
    .filter((value): value is string => Boolean(value));
  const documentTitle =
    document.title.replace(/^Draft\s+/i, "") || "Personal Wishes Document";

  return (
    <div className="document-preview-panel min-h-full min-w-0 bg-[#dde2e8] px-3 py-4 md:px-5 md:py-6">
      <article
        className="document-sheet relative mx-auto flex min-h-full max-w-[680px] flex-col overflow-hidden bg-[#fffefa] px-6 py-10 text-[15px] leading-[1.75] text-[#1d2129] shadow-[0_12px_32px_rgba(10,20,30,0.16)] md:px-10 md:py-14"
        style={{
          aspectRatio: "210 / 297",
          fontFamily: '"Latin Modern Roman", "Times New Roman", Times, serif',
        }}
      >
        <div className="relative flex min-h-full flex-1 flex-col">
          <div
            role="note"
            aria-label="Fictional document disclaimer"
            className="mb-6 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-[#7d2e00]"
          >
            Fictional document - not legal advice
          </div>
          <h1 className="mb-1 text-center text-2xl font-semibold leading-tight tracking-[0.01em] md:text-3xl">
            {documentTitle}
          </h1>
          <p
            className="text-center text-sm italic text-[#5f6b78]"
            style={{ marginBottom: "56px" }}
          >
            A record of my wishes, to be carried out after my death
          </p>

          <p style={{ marginBottom: "48px" }}>
            I, {slot(state.fullName, "full name")}, of{" "}
            {slot(state.homeAddress, "home address")}, being of sound mind,
            record the following wishes.
          </p>

          <div
            className="flex flex-1 flex-col justify-between"
            style={{ rowGap: "20px" }}
          >
            <section>
              <h2 className="mb-4 text-base font-semibold">1. Executor</h2>
              <p>
                I name {slot(state.executor.name, "executor name")}, my{" "}
                {slot(state.executor.relationship, "relationship")}, as the
                executor of these wishes.
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold">
                2. Scope of assets
              </h2>
              <p>
                These wishes apply to{" "}
                {state.coversWorldwideAssets.status === "UNCONFIRMED" ||
                state.coversWorldwideAssets.status === "CONFLICTED"
                  ? slot(
                      state.coversWorldwideAssets,
                      "worldwide or home country only",
                    )
                  : state.coversWorldwideAssets.status !== "CONFIRMED" ||
                      state.coversWorldwideAssets.value === null
                    ? slot(
                        state.coversWorldwideAssets,
                        "worldwide or home country only",
                      )
                    : state.coversWorldwideAssets.value
                      ? "all of my assets, wherever in the world they are located"
                      : "only those assets located in my home country"}
                .
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold">3. Family</h2>
              <p>
                {state.hasChildren.status === "UNCONFIRMED" ||
                state.hasChildren.status === "CONFLICTED" ? (
                  slot(state.hasChildren, "whether you have children")
                ) : state.hasChildren.status !== "CONFIRMED" ||
                  state.hasChildren.value === null ? (
                  slot(state.hasChildren, "whether you have children")
                ) : state.hasChildren.value ? (
                  <>
                    I have children:{" "}
                    {confirmedChildren ? (
                      <span className="text-[#1d2129]">{confirmedChildren}</span>
                    ) : (
                      slot(
                        { value: null, status: "UNKNOWN" },
                        "names of children",
                      )
                    )}
                    .
                  </>
                ) : (
                  "I have no children."
                )}
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold">
                4. Specific gifts
              </h2>
              <p className="whitespace-pre-wrap">
                {gifts.length > 0 ? gifts.join("\n") : "None specified"}
              </p>
            </section>

            <section>
              <h2 className="mb-2 text-base font-semibold">
                5. Additional wishes
              </h2>
              <p className="whitespace-pre-wrap">
                {state.additionalWishes.status === "CONFIRMED" &&
                state.additionalWishes.value
                  ? state.additionalWishes.value
                  : state.additionalWishes.status === "UNCONFIRMED" ||
                      state.additionalWishes.status === "CONFLICTED"
                    ? "[Needs clarification: additional wishes]"
                    : "None specified"}
              </p>
            </section>

            <div className="grid grid-cols-[1.6fr_1fr] gap-6 pt-8 md:gap-9">
              <div>
                <div className="h-9 border-b border-[#1d2129]" />
                <span className="mt-1 block text-xs text-[#5f6b78]">
                  Signature of{" "}
                  {state.fullName.status === "CONFIRMED" && state.fullName.value
                    ? state.fullName.value
                    : "full name"}
                </span>
              </div>
              <div>
                <div className="h-9 border-b border-[#1d2129]" />
                <span className="mt-1 block text-xs text-[#5f6b78]">Date</span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  );
};
