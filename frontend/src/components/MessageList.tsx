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
      className="flex flex-col gap-4 py-4 px-2"
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
            className="gap-2.5"
          >
            {!isUser && (
              <MessageAvatar className="size-8 shrink-0">
                <Avatar className="size-8 ring-1 ring-[#4E1FBE]/25 shadow-xs bg-[#E2D6FF]">
                  <AvatarImage src={ASSISTANT_AVATAR_URL} alt="Assistant" />
                  <AvatarFallback className="bg-[#E2D6FF] text-[#360097] text-xs font-bold">
                    AI
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
            )}

            <MessageContent className={isUser ? "items-end" : "items-start"}>
              <MessageHeader className="text-[11px] font-semibold text-[#494454] px-1 mb-1 flex items-center gap-1.5">
                <span>{isUser ? "You" : "Intake Assistant"}</span>
                {!isUser && (
                  <span className="size-1 rounded-full bg-[#34c759]" />
                )}
              </MessageHeader>

              <div
                className={`w-fit max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  isUser
                    ? "rounded-br-xs bg-[#4E1FBE] text-white font-medium shadow-aura"
                    : "rounded-bl-xs bg-white text-[#1D1A23] border border-[#4E1FBE]/15 font-normal shadow-xs"
                }`}
              >
                {msg.content}
              </div>

              {formattedTime && (
                <MessageFooter className="text-[10px] text-[#797482] px-1 mt-0.5 font-mono">
                  {formattedTime}
                </MessageFooter>
              )}
            </MessageContent>

            {isUser && (
              <MessageAvatar className="size-8 shrink-0">
                <Avatar className="size-8 ring-1 ring-[#4E1FBE]/30 shadow-xs bg-[#FCF6EE]">
                  <AvatarImage src={USER_AVATAR_URL} alt="User" />
                  <AvatarFallback className="bg-[#4E1FBE] text-white text-xs font-bold">
                    U
                  </AvatarFallback>
                </Avatar>
              </MessageAvatar>
            )}
          </Message>
        );
      })}

      {isLoading && (
        <Message align="start" className="gap-2.5">
          <MessageAvatar className="size-8 shrink-0">
            <Avatar className="size-8 ring-1 ring-[#4E1FBE]/25 shadow-xs bg-[#E2D6FF]">
              <AvatarImage src={ASSISTANT_AVATAR_URL} alt="Assistant" />
              <AvatarFallback className="bg-[#E2D6FF] text-[#360097] text-xs font-bold">
                AI
              </AvatarFallback>
            </Avatar>
          </MessageAvatar>

          <MessageContent className="items-start">
            <MessageHeader className="text-[11px] font-semibold text-[#494454] px-1 mb-1">
              Intake Assistant
            </MessageHeader>

            <div
              className="w-fit rounded-2xl rounded-bl-xs bg-white px-4 py-3 border border-[#4E1FBE]/15 shadow-xs"
              aria-label="Assistant is analyzing your answer"
            >
              <div className="typing-indicator flex gap-1.5 items-center">
                <span className="size-1.5 rounded-full bg-[#4E1FBE]" />
                <span className="size-1.5 rounded-full bg-[#4E1FBE]" />
                <span className="size-1.5 rounded-full bg-[#4E1FBE]" />
              </div>
            </div>
          </MessageContent>
        </Message>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};
