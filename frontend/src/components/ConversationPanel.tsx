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
  isLoading,
  isCompleted,
}) => {
  return (
    <div className="conversation-panel flex flex-col h-full bg-white rounded-2xl border border-[#4E1FBE]/15 shadow-aura overflow-hidden">
      {/* Canvas Top Bar */}
      <div className="px-5 py-3.5 border-b border-[#4E1FBE]/10 bg-[#FCF6EE]/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="size-2 rounded-full bg-[#34c759] ring-2 ring-[#34c759]/20 animate-pulse" />
          <h2 className="text-sm font-bold text-[#1D1A23] tracking-tight">
            Active Intake Canvas
          </h2>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white border border-[#4E1FBE]/15 text-[#494454]">
            {messages.length} node{messages.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs text-[#797482]">
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-[#213300] bg-[#EAFF57] px-2 py-0.5 rounded-full border border-[#EAFF57]">
              ✓ Ready for Final Review
            </span>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 font-mono text-[11px]">
              <span className="size-1.5 rounded-full bg-[#4E1FBE]" />
              Deterministic State
            </span>
          )}
        </div>
      </div>

      {/* Canvas Viewport with Dot Grid */}
      <div className="conversation-messages-container flex-1 overflow-y-auto bg-[#FCF6EE]/40 bg-dot-grid p-3 sm:p-4">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>
    </div>
  );
};
