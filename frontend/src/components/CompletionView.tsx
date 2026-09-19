import React from "react";

interface CompletionViewProps {
  onRestart: () => void;
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  onRestart,
}) => {
  return (
    <div
      className="completion-card p-6 bg-white rounded-2xl border border-[#EAFF57] shadow-aura flex flex-col items-center text-center justify-center gap-4 h-full"
      role="region"
      aria-label="Interview complete summary"
    >
      <div
        className="completion-icon size-14 rounded-2xl bg-[#EAFF57] text-[#213300] flex items-center justify-center text-2xl font-bold shadow-sm"
        aria-hidden="true"
      >
        ✓
      </div>

      <div>
        <span className="text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#EAFF57]/40 text-[#213300] border border-[#EAFF57]">
          Session Finalized
        </span>
        <h3 className="completion-title text-xl font-bold text-[#1D1A23] mt-2 mb-1">
          Intake Complete
        </h3>
        <p className="completion-description text-xs sm:text-sm text-[#494454] leading-relaxed max-w-xs">
          All necessary personal wishes information has been collected. Your
          draft document is available in the preview panel.
        </p>
      </div>

      <div className="completion-actions mt-2 w-full">
        <button
          type="button"
          onClick={onRestart}
          className="btn btn-primary w-full py-3 px-4 rounded-xl text-xs font-semibold bg-[#4E1FBE] hover:bg-[#3c159a] text-white shadow-aura transition-all active:scale-[0.98]"
          aria-label="Start another interview"
        >
          Start New Intake
        </button>
      </div>
    </div>
  );
};
