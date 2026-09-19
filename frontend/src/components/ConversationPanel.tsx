import React from "react";
import { Message } from "../types";
import { MessageList } from "./MessageList";

interface ConversationPanelProps {
  messages: readonly Message[];
  input?: string;
  onInputChange?: (val: string) => void;
  onSendMessage?: () => void;
  isLoading: boolean;
  isCompleted?: boolean;
  onRestart?: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  input = "",
  onInputChange,
  onSendMessage,
  onRestart,
  isLoading,
}) => {
  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !onSendMessage) return;
    onSendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="conversation-panel flex flex-col h-full bg-white rounded-[28px] border-[3px] border-[#4E1FBE] shadow-[0_18px_40px_-18px_rgba(78,31,190,0.22)] overflow-hidden">
      <div className="conversation-messages-container flex-1 overflow-y-auto bg-[#FCF6EE]/40 bg-dot-grid p-3 sm:p-4">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <div className="border-t border-[#4E1FBE]/15 bg-[#FCF6EE]/60 p-3 sm:p-4 shrink-0">
        <div className="flex flex-col gap-3">
          <textarea
            value={input}
            onChange={(e) => onInputChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            rows={3}
            className="w-full resize-none rounded-2xl border border-[#4E1FBE]/20 bg-white px-3 py-3 text-sm text-[#1D1A23] placeholder:text-[#797482] shadow-sm outline-none transition-all focus:border-[#4E1FBE] focus:ring-2 focus:ring-[#4E1FBE]/15 disabled:opacity-60"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRestart}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-[#4E1FBE]/30 bg-white px-4 py-2.5 text-sm font-semibold text-[#4E1FBE] transition hover:bg-[#F3ECFF] disabled:cursor-not-allowed disabled:opacity-60"
            >
              New session
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="flex-1 rounded-xl bg-[#4E1FBE] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_-10px_rgba(78,31,190,0.7)] transition hover:bg-[#3d1796] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
