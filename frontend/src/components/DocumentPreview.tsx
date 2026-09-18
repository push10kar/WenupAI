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
      <div className="document-sheet">
        <header className="document-sheet-header">
          <span className="document-badge">DRAFT PROJECTION</span>
          <h2 className="document-title">{document.title}</h2>
          <p className="document-subtitle">{document.subtitle}</p>
        </header>

        <div className="document-body">
          {document.sections && document.sections.length > 0 ? (
            document.sections.map((section, idx) => (
              <section key={idx} className="document-section">
                <h3 className="document-section-title">{section.title}</h3>
                <p className="document-section-content">{section.content}</p>
              </section>
            ))
          ) : (
            <p className="document-empty-notice">
              Document sections will populate automatically as information is
              collected during the interview.
            </p>
          )}
        </div>

        <footer className="document-footer">
          <small>
            Deterministic projection of collected wishes. Generated
            automatically.
          </small>
        </footer>
      </div>
    </div>
  );
};
