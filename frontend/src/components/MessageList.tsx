import React, { useEffect, useRef } from "react";
import { Message as MessageType } from "../types";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
  MessageFooter,
} from "./ui/message";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface MessageListProps {
  messages: readonly MessageType[];
  isLoading?: boolean;
}

const ASSISTANT_AVATAR_URL =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80";
const USER_AVATAR_URL =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

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
      className="flex flex-col gap-4 py-2"
      role="log"
      aria-label="Interview conversation messages"
      aria-live="polite"
    >
      {messages.map((msg) => {
        const isUser = msg.role === "user";
        const formattedTime = msg.createdAt
          ? new Date(msg.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "";

        return (
          <Message
            key={msg.id}
            align={isUser ? "end" : "start"}
            className="gap-2"
          >
            {!isUser && (
              <MessageAvatar className="size-8 shrink-0">
                <Avatar className="size-8 ring-1 ring-border shadow-xs">
                  <AvatarImage src={ASSISTANT_AVATAR_URL} alt="Assistant" />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                    AI
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
            )}

            <MessageContent className={isUser ? "items-end" : "items-start"}>
              <MessageHeader className="text-xs font-medium text-muted-foreground px-1 mb-1">
                {isUser ? "You" : "Intake Assistant"}
              </MessageHeader>

              <div
                className={`w-fit max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-xs ${
                  isUser
                    ? "rounded-br-xs bg-primary text-primary-foreground font-normal"
                    : "rounded-bl-xs bg-muted text-foreground border border-border/50 font-normal"
                }`}
              >
                {msg.content}
              </div>

              {formattedTime && (
                <MessageFooter className="text-[10px] text-muted-foreground px-1 mt-0.5">
                  {formattedTime}
                </MessageFooter>
              )}
            </MessageContent>

            {isUser && (
              <MessageAvatar className="size-8 shrink-0">
                <Avatar className="size-8 ring-1 ring-primary/20 shadow-xs">
                  <AvatarImage src={USER_AVATAR_URL} alt="User" />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    U
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
            )}
          </Message>
        );
      })}

      {isLoading && (
        <Message align="start" className="gap-2">
          <MessageAvatar className="size-8 shrink-0">
            <Avatar className="size-8 ring-1 ring-border shadow-xs">
              <AvatarImage src={ASSISTANT_AVATAR_URL} alt="Assistant" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                AI
              </AvatarFallback>
            </Avatar>
          </MessageAvatar>

          <MessageContent className="items-start">
            <MessageHeader className="text-xs font-medium text-muted-foreground px-1 mb-1">
              Intake Assistant
            </MessageHeader>

            <div
              className="w-fit rounded-2xl rounded-bl-xs bg-muted px-4 py-3 border border-border/50 shadow-xs"
              aria-label="Assistant is analyzing your answer"
            >
              <div className="typing-indicator flex gap-1 items-center">
                <span />
                <span />
                <span />
              </div>
            </div>
          </MessageContent>
        </Message>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};
