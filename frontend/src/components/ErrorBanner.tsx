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
      className={`error-banner ${isConflict ? "error-banner-conflict" : "error-banner-general"}`}
    >
      <div className="error-banner-content">
        <strong className="error-banner-title">
          {isConflict ? "Clarification / Conflict Detected" : "Error"}
        </strong>
        <p className="error-banner-message">
          {error.message}
          {isConflict && (
            <span className="conflict-guidance">
              {" "}
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
        className="error-banner-dismiss"
        aria-label="Dismiss error notification"
      >
        &times;
      </button>
    </div>
  );
};
