import React from "react";
import { DocumentPreview as DocumentPreviewType } from "../types";

interface DocumentPreviewProps {
  document: DocumentPreviewType;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  document,
}) => {
  return (
    <div className="document-preview-panel">
      <div className="document-sheet bg-white border border-[#4E1FBE]/15 rounded-xl p-6 shadow-xs">
        <header className="document-sheet-header border-b border-[#1D1A23]/10 pb-4 mb-5">
          <span className="document-badge inline-block font-mono text-[10px] font-bold tracking-wider px-2 py-0.5 rounded bg-[#E2D6FF] text-[#360097] border border-[#4E1FBE]/20 mb-2">
            DRAFT PROJECTION
          </span>
          <h2 className="document-title text-lg font-bold text-[#1D1A23] font-serif">
            {document.title}
          </h2>
          <p className="document-subtitle text-xs text-[#797482] italic mt-1">
            {document.subtitle}
          </p>
        </header>

        <div className="document-body flex flex-col gap-4 mb-6">
          {document.sections && document.sections.length > 0 ? (
            document.sections.map((section, idx) => (
              <section
                key={idx}
                className="document-section bg-[#FCF6EE]/30 p-3.5 rounded-lg border border-[#4E1FBE]/10"
              >
                <h3 className="document-section-title text-xs font-bold text-[#4E1FBE] tracking-tight mb-1">
                  {section.title}
                </h3>
                <p className="document-section-content text-xs leading-relaxed text-[#1D1A23]/90 whitespace-pre-wrap font-sans">
                  {section.content}
                </p>
              </section>
            ))
          ) : (
            <p className="document-empty-notice text-xs text-[#797482] italic py-6 text-center">
              Document sections will populate automatically as information is
              collected during the interview.
            </p>
          )}
        </div>

        <footer className="document-footer border-t border-[#4E1FBE]/10 pt-3 text-center">
          <small className="text-[10px] text-[#797482] font-mono">
            Deterministic projection of collected wishes. Generated
            automatically.
          </small>
        </footer>
      </div>
    </div>
  );
};
