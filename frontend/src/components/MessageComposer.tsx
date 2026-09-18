import React from "react";

interface MessageComposerProps {
  input: string;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

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

  return (
    <form onSubmit={handleSubmit} className="message-composer">
      <label htmlFor="user-answer-input" className="sr-only">
        Your Answer
      </label>
      <div className="composer-input-wrapper">
        <textarea
          id="user-answer-input"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your response here..."
          disabled={isLoading || disabled}
          rows={2}
          className="composer-textarea"
          aria-required="true"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading || disabled}
          className="btn btn-primary composer-submit-btn"
          aria-label="Send response"
        >
          {isLoading ? (
            <span className="spinner-border" aria-hidden="true" />
          ) : (
            "Send"
          )}
        </button>
      </div>
    </form>
  );
};
