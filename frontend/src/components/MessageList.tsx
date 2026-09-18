import React, { useEffect, useRef } from "react";
import { Message } from "../types";

interface MessageListProps {
  messages: readonly Message[];
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  return (
    <div
      className="message-list"
      role="log"
      aria-label="Interview conversation messages"
      aria-live="polite"
    >
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        return (
          <div
            key={msg.id}
            className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}
          >
            <div
              className={`message-bubble ${isUser ? "bubble-user" : "bubble-assistant"}`}
            >
              <div className="message-sender">
                {isUser ? "You" : "Intake Assistant"}
              </div>
              <div className="message-content">{msg.content}</div>
              {msg.createdAt && (
                <div className="message-timestamp">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="message-row message-row-assistant">
          <div className="message-bubble bubble-assistant bubble-loading">
            <div
              className="typing-indicator"
              aria-label="Assistant is analyzing your answer"
            >
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};
