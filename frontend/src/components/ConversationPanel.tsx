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
    <div
      className="conversation-panel flex flex-col h-full bg-[#09090b] rounded-[28px] border-[6px] border-[#4E1FBE] shadow-[0_18px_40px_-18px_rgba(78,31,190,0.22)] overflow-hidden"
      style={{ border: "6px solid #4E1FBE", backgroundColor: "#09090b" }}
    >
      <div className="conversation-messages-container flex-1 overflow-y-auto bg-[#09090b] p-3 sm:p-5">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <div className="border-t border-zinc-800/80 bg-[#09090b] p-3 sm:p-4 shrink-0">
        <div className="flex flex-col gap-3">
          <textarea
            value={input}
            onChange={(e) => onInputChange?.(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            disabled={isLoading}
            rows={2}
            className="w-full resize-none rounded-2xl border border-zinc-700/80 bg-[#18181b] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 shadow-sm outline-none transition-all focus:border-[#4E1FBE] focus:ring-2 focus:ring-[#4E1FBE]/25 disabled:opacity-60"
          />

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onRestart}
              disabled={isLoading}
              className="flex-1 rounded-xl border border-zinc-700/80 bg-[#18181b] hover:bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              New session
            </button>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!input.trim() || isLoading}
              className="flex-1 rounded-xl bg-[#2563eb] hover:bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_12px_20px_-10px_rgba(37,99,235,0.7)] transition disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {isLoading ? "Sending..." : "Send"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
