import React from "react";

interface CompletionViewProps {
  onRestart: () => void;
}

export const CompletionView: React.FC<CompletionViewProps> = ({
  onRestart,
}) => {
  return (
    <div
      className="completion-card"
      role="region"
      aria-label="Interview complete summary"
    >
      <div className="completion-icon" aria-hidden="true">
        ✓
      </div>
      <h3 className="completion-title">Intake Complete</h3>
      <p className="completion-description">
        All necessary personal wishes information has been collected. Your draft
        document is available in the preview panel.
      </p>
      <div className="completion-actions">
        <button
          type="button"
          onClick={onRestart}
          className="btn btn-primary"
          aria-label="Start another interview"
        >
          Start New Intake
        </button>
      </div>
    </div>
  );
};
