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

  // Calculate confirmed progress metrics
  const coreFields = [
    state?.fullName,
    state?.homeAddress,
    state?.coversWorldwideAssets,
    state?.hasChildren,
    state?.executor?.name,
  ];
  const confirmedCount = coreFields.filter(
    (f) => f && f.status === "CONFIRMED",
  ).length;
  const progressPercent = Math.round((confirmedCount / 5) * 100);

  return (
    <div className="information-panel flex flex-col h-full bg-white rounded-2xl border border-[#4E1FBE]/15 shadow-aura overflow-hidden">
      {/* Studio Specs Header */}
      <div className="p-4 border-b border-[#4E1FBE]/10 bg-[#FCF6EE]/60 shrink-0">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-[#4E1FBE]" />
            <h2 className="text-sm font-bold text-[#1D1A23] tracking-tight">
              Studio Telemetry
            </h2>
          </div>
          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#E2D6FF] text-[#360097] border border-[#4E1FBE]/20">
            {confirmedCount}/5 Confirmed
          </span>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-medium text-[#494454]">
            <span>Intake Completion</span>
            <span className="font-mono text-[#4E1FBE] font-bold">
              {progressPercent}%
            </span>
          </div>
          <div className="h-2 w-full bg-[#FCF6EE] rounded-full overflow-hidden border border-[#4E1FBE]/10">
            <div
              className="h-full bg-gradient-to-r from-[#4E1FBE] to-[#EAFF57] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div
        className="tab-bar flex border-b border-[#4E1FBE]/10 bg-[#FCF6EE]/40 px-2 pt-2 gap-2 shrink-0"
        role="tablist"
        aria-label="Information views"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "document"}
          onClick={() => setActiveTab("document")}
          className={`tab-btn flex-1 py-2 px-3 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === "document"
              ? "tab-btn-active bg-white text-[#4E1FBE] border-[#4E1FBE] shadow-xs"
              : "text-[#797482] hover:text-[#1D1A23] border-transparent"
          }`}
        >
          Document Preview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "state"}
          onClick={() => setActiveTab("state")}
          className={`tab-btn flex-1 py-2 px-3 text-xs font-semibold rounded-t-xl transition-all border-b-2 ${
            activeTab === "state"
              ? "tab-btn-active bg-white text-[#4E1FBE] border-[#4E1FBE] shadow-xs"
              : "text-[#797482] hover:text-[#1D1A23] border-transparent"
          }`}
        >
          Structured State
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content flex-1 overflow-y-auto p-4 bg-white">
        {activeTab === "document" ? (
          <DocumentPreview document={document} />
        ) : (
          <StatePreview state={state} />
        )}
      </div>
    </div>
  );
};
