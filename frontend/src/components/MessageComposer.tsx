import React from "react";

interface MessageComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const PRESET_HINTS = [
  "Cover worldwide assets",
  "I have 2 children",
  "Designate executor",
  "Add specific gifts",
];

export const MessageComposer: React.FC<MessageComposerProps> = ({
  input,
  onInputChange,
  onSubmit,
  isLoading,
  disabled = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || disabled) return;
    onSubmit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleHintClick = (hint: string) => {
    if (disabled || isLoading) return;
    onInputChange(input ? `${input} · ${hint}` : hint);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-[#4E1FBE]/15 shadow-aura overflow-hidden">
      {/* Panel Header */}
      <div className="px-5 py-4 border-b border-[#4E1FBE]/10 bg-[#FCF6EE]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-[#4E1FBE]" />
          <h2 className="text-sm font-bold text-[#1D1A23] tracking-tight">
            Intake Directive
          </h2>
        </div>
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EAFF57] text-[#213300] border border-[#EAFF57]/40">
          Multi-Fact Extraction
        </span>
      </div>

      {/* Directive Body */}
      <div className="p-5 flex-1 flex flex-col justify-between overflow-y-auto gap-4">
        {/* Guidance Note */}
        <div className="p-3.5 rounded-xl bg-[#E2D6FF]/35 border border-[#4E1FBE]/15 text-xs text-[#494454] leading-relaxed">
          <p className="font-semibold text-[#360097] mb-1 flex items-center gap-1.5">
            <span className="text-sm">✦</span> Conversational Freedom
          </p>
          Answer in natural language. You can share multiple facts at once (e.g.
          your full name, children, or executor) — the system extracts all
          information deterministically.
        </div>

        {/* Quick Suggestion Pills */}
        <div>
          <label className="text-[11px] font-semibold text-[#797482] uppercase tracking-wider mb-2 block">
            Suggested Context
          </label>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_HINTS.map((hint) => (
              <button
                key={hint}
                type="button"
                onClick={() => handleHintClick(hint)}
                disabled={isLoading || disabled}
                className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-[#FCF6EE] hover:bg-[#E2D6FF]/50 border border-[#4E1FBE]/15 text-[#360097] transition-colors disabled:opacity-50"
              >
                + {hint}
              </button>
            ))}
          </div>
        </div>

        {/* Form Container */}
        <form
          onSubmit={handleSubmit}
          className="message-composer mt-auto flex flex-col gap-3"
        >
          <label htmlFor="user-answer-input" className="sr-only">
            Your Answer
          </label>

          <div className="composer-input-wrapper relative flex flex-col">
            <textarea
              id="user-answer-input"
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your response here..."
              disabled={isLoading || disabled}
              rows={4}
              className="composer-textarea w-full resize-none p-3.5 rounded-xl border border-[#4E1FBE]/20 focus:border-[#4E1FBE] focus:ring-2 focus:ring-[#4E1FBE]/15 outline-none text-sm text-[#1D1A23] bg-[#FCF6EE]/30 leading-relaxed transition-all"
              aria-required="true"
            />
          </div>

          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[11px] text-[#797482] font-mono">
              ↵ Enter to send
            </span>

            <button
              type="submit"
              disabled={!input.trim() || isLoading || disabled}
              className="btn btn-primary composer-submit-btn text-xs font-semibold px-5 py-2.5 rounded-xl bg-[#4E1FBE] hover:bg-[#3c159a] text-white shadow-aura transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
              aria-label="Send response"
            >
              {isLoading ? (
                <>
                  <span
                    className="size-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <span>Send response</span>
                  <span className="text-xs">→</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Bottom Telemetry Mini-card */}
      <div className="px-5 py-3 border-t border-[#4E1FBE]/10 bg-[#FCF6EE]/40 flex items-center justify-between text-[11px] text-[#494454] font-mono shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-[#34c759]" />
          Validation Active
        </span>
        <span className="text-[#797482]">Deterministic Intake</span>
      </div>
    </div>
  );
};
