import React from "react";
import { Message } from "../types";
import { MessageList } from "./MessageList";
import { MessageComposer } from "./MessageComposer";
import { CompletionView } from "./CompletionView";

interface ConversationPanelProps {
  messages: readonly Message[];
  input: string;
  onInputChange: (val: string) => void;
  onSendMessage: () => void;
  isLoading: boolean;
  isCompleted: boolean;
  onRestart: () => void;
}

export const ConversationPanel: React.FC<ConversationPanelProps> = ({
  messages,
  input,
  onInputChange,
  onSendMessage,
  isLoading,
  isCompleted,
  onRestart,
}) => {
  return (
    <div className="conversation-panel">
      <div className="conversation-messages-container">
        <MessageList messages={messages} isLoading={isLoading} />
      </div>

      <div className="conversation-footer">
        {isCompleted ? (
          <CompletionView onRestart={onRestart} />
        ) : (
          <MessageComposer
            input={input}
            onInputChange={onInputChange}
            onSubmit={onSendMessage}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};
