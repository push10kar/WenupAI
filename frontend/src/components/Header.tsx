import React from "react";

interface HeaderProps {
  onNewSession: () => void;
  isLoading?: boolean;
  onToggleOverview?: () => void;
  isOverviewActive?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onNewSession,
  isLoading,
  onToggleOverview,
  isOverviewActive = false,
}) => {
  return (
    <header className="app-header bg-[#FCF6EE]/90 backdrop-blur-md border-b border-[#4E1FBE]/15 px-4 sm:px-6 py-3 flex items-center justify-between z-20 shrink-0">
      <div className="header-brand flex items-center gap-3 sm:gap-4">
        {/* Aura Minimalist Brand Icon */}
        <div
          className="brand-logo size-9 rounded-xl bg-[#4E1FBE] text-white flex items-center justify-center font-bold text-sm shadow-sm relative overflow-hidden group"
          aria-hidden="true"
        >
          <span className="relative z-10 font-bold tracking-tight">PW</span>
          <div className="absolute inset-0 bg-gradient-to-tr from-[#360097] to-[#6d36e8] opacity-80" />
          <div className="absolute -bottom-1 -right-1 size-3 bg-[#EAFF57] rounded-full" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="header-title font-bold text-base sm:text-lg text-[#1D1A23] tracking-tight">
              Personal Wishes Intake
            </h1>
            <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#E2D6FF] text-[#360097] border border-[#4E1FBE]/20">
              Aura v2.0
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#494454] mt-0.5">
            <span className="hidden sm:inline">Workspace</span>
            <span className="hidden sm:inline text-xs text-[#4E1FBE]/40">
              /
            </span>
            <span className="hidden sm:inline">Document Intake</span>
            <span className="hidden sm:inline text-xs text-[#4E1FBE]/40">
              /
            </span>
            <span className="font-medium text-[#4E1FBE]">Active Session</span>
          </div>
        </div>
      </div>

      <div className="header-actions flex items-center gap-3">
        {/* Pulsing Sync Indicator */}
        <div
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/80 border border-[#4E1FBE]/15 shadow-xs text-xs font-medium text-[#494454]"
          aria-live="polite"
        >
          <span
            className="size-2 rounded-full bg-[#34c759] ring-2 ring-[#34c759]/30 animate-pulse"
            aria-hidden="true"
          />
          <span>Auto-saved · Synced</span>
        </div>

        {/* View Toggle (Overview / Workspace) */}
        {onToggleOverview && (
          <button
            type="button"
            onClick={onToggleOverview}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#4E1FBE]/20 bg-white/60 hover:bg-white text-[#1D1A23] transition-colors"
            aria-label={
              isOverviewActive
                ? "Switch to Intake Workspace"
                : "Switch to Landing Overview"
            }
          >
            {isOverviewActive ? "Return to Workspace" : "Landing Overview"}
          </button>
        )}

        {/* New Session Button */}
        <button
          type="button"
          onClick={onNewSession}
          disabled={isLoading}
          className="btn btn-secondary text-xs font-semibold px-3.5 py-1.5 rounded-lg border border-[#4E1FBE]/25 bg-white hover:bg-[#F6EFE5] text-[#1D1A23] shadow-xs active:scale-[0.98] transition-all"
          aria-label="Start a new interview session"
        >
          New Session
        </button>
      </div>
    </header>
  );
};
