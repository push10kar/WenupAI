import React, { useState } from "react";
import {
  PersonalWishesState,
  DocumentPreview as DocumentPreviewType,
} from "../types";
import { StatePreview } from "./StatePreview";
import { DocumentPreview } from "./DocumentPreview";

interface InformationPanelProps {
  state: PersonalWishesState;
  document: DocumentPreviewType;
}

export const InformationPanel: React.FC<InformationPanelProps> = ({
  state,
  document,
}) => {
  const [activeTab, setActiveTab] = useState<"document" | "state">("document");

  return (
    <div className="information-panel">
      <div className="tab-bar" role="tablist" aria-label="Information views">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "document"}
          onClick={() => setActiveTab("document")}
          className={`tab-btn ${activeTab === "document" ? "tab-btn-active" : ""}`}
        >
          Document Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "state"}
          onClick={() => setActiveTab("state")}
          className={`tab-btn ${activeTab === "state" ? "tab-btn-active" : ""}`}
        >
          Structured State
        </button>
      </div>

      <div className="tab-content">
        {activeTab === "document" ? (
          <DocumentPreview document={document} />
        ) : (
          <StatePreview state={state} />
        )}
      </div>
    </div>
  );
};
