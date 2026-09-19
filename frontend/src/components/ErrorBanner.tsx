import React from "react";
import { ApiError } from "../types";

interface ErrorBannerProps {
  error: ApiError | null;
  onDismiss: () => void;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  error,
  onDismiss,
}) => {
  if (!error) return null;

  const isConflict =
    error.code === "CONFLICT" || error.code === "CONCURRENCY_CONFLICT";

  return (
    <div
      role="alert"
      className={`error-banner mx-4 sm:mx-6 my-3 p-4 rounded-xl border flex items-start justify-between gap-4 shadow-sm transition-all ${
        isConflict
          ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
          : "bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]"
      }`}
    >
      <div className="error-banner-content flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-bold">{isConflict ? "✦" : "⚠"}</span>
          <strong className="error-banner-title text-xs font-bold uppercase tracking-wider">
            {isConflict ? "Clarification / Conflict Detected" : "Error"}
          </strong>
        </div>
        <p className="error-banner-message text-xs leading-relaxed opacity-95">
          {error.message}
          {isConflict && (
            <span className="conflict-guidance italic ml-1">
              If you intend to update or correct previous information, please
              specify that explicitly (e.g., &quot;Actually, my address changed
              to...&quot;).
            </span>
          )}
        </p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="error-banner-dismiss text-lg font-bold leading-none p-1 hover:opacity-100 opacity-60 transition-opacity cursor-pointer"
        aria-label="Dismiss error notification"
      >
        &times;
      </button>
    </div>
  );
};
