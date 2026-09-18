import React from "react";

interface HeaderProps {
  onNewSession: () => void;
  isLoading?: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onNewSession, isLoading }) => {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo" aria-hidden="true">
          PW
        </div>
        <div>
          <h1 className="header-title">Personal Wishes Intake</h1>
          <p className="header-subtitle">
            Reliable Conversational Document Preparation
          </p>
        </div>
      </div>
      <div className="header-actions">
        <button
          type="button"
          onClick={onNewSession}
          disabled={isLoading}
          className="btn btn-secondary"
          aria-label="Start a new interview session"
        >
          New Session
        </button>
      </div>
    </header>
  );
};
