import React, { useEffect, useMemo, useRef } from "react";
import { Message as MessageType } from "../types";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
} from "./ui/message";
import { Bubble, BubbleContent } from "./ui/bubble";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface MessageListProps {
  messages: readonly MessageType[];
  isLoading?: boolean;
}

const OLIVER_AVATAR_IMG =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80";
const USER_AVATAR_IMG =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

const OliverAvatar: React.FC = () => (
  <Avatar className="size-8 ring-1 ring-white/20 bg-white overflow-hidden shadow-xs shrink-0">
    <AvatarImage src={OLIVER_AVATAR_IMG} alt="Oliver" />
    <AvatarFallback className="bg-white text-zinc-900 p-0.5">
      <svg viewBox="0 0 36 36" fill="none" className="size-full">
        <circle cx="18" cy="18" r="17" fill="#ffffff" />
        <path
          d="M10 14C10 10 13 8 18 8C23 8 26 10 26 14C26 16 25 18 25 18H11C11 18 10 16 10 14Z"
          fill="#18181b"
        />
        <circle
          cx="15.5"
          cy="18"
          r="2.5"
          stroke="#18181b"
          strokeWidth="1.5"
          fill="#ffffff"
        />
        <circle
          cx="20.5"
          cy="18"
          r="2.5"
          stroke="#18181b"
          strokeWidth="1.5"
          fill="#ffffff"
        />
        <line
          x1="18"
          y1="18"
          x2="18"
          y2="18"
          stroke="#18181b"
          strokeWidth="1.5"
        />
        <path
          d="M16 22C16.8 22.8 19.2 22.8 20 22"
          stroke="#18181b"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </AvatarFallback>
  </Avatar>
);

const UserAvatar: React.FC = () => (
  <Avatar className="size-8 ring-1 ring-white/20 bg-zinc-900 overflow-hidden shadow-xs shrink-0">
    <AvatarImage src={USER_AVATAR_IMG} alt="User" />
    <AvatarFallback className="bg-zinc-950 text-white p-0.5">
      <svg viewBox="0 0 36 36" fill="none" className="size-full">
        <circle cx="18" cy="18" r="17" fill="#18181b" />
        <path
          d="M10 17C10 10 13 8 18 8C23 8 26 10 26 17C26 23 24 25 24 25C23 22 23 18 23 18C23 18 22 13 18 13C14 13 13 18 13 18C13 18 13 22 12 25C12 25 10 23 10 17Z"
          fill="#ffffff"
        />
        <ellipse
          cx="18"
          cy="18"
          rx="4.5"
          ry="5.5"
          fill="#18181b"
          stroke="#ffffff"
          strokeWidth="1.2"
        />
        <circle cx="16.5" cy="17.5" r="0.8" fill="#ffffff" />
        <circle cx="19.5" cy="17.5" r="0.8" fill="#ffffff" />
      </svg>
    </AvatarFallback>
  </Avatar>
);

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const groupedMessages = useMemo(() => {
    const groups: Array<{ role: MessageType["role"]; items: MessageType[] }> =
      [];

    for (const message of messages) {
      const currentGroup = groups[groups.length - 1];

      if (currentGroup && currentGroup.role === message.role) {
        currentGroup.items.push(message);
      } else {
        groups.push({ role: message.role, items: [message] });
      }
    }

    return groups;
  }, [messages]);

  return (
    <div
      className="flex flex-col gap-6 py-4 px-2 max-w-2xl mx-auto min-h-full justify-end"
      role="log"
      aria-label="Conversation messages"
      aria-live="polite"
    >
      {groupedMessages.map((group, groupIndex) => {
        const isUser = group.role === "user";

        return (
          <MessageGroup
            key={`group-${groupIndex}-${group.items[0]?.id}`}
            className="gap-2"
          >
            {group.items.map((msg, index) => {
              const isLastInGroup = index === group.items.length - 1;

              if (isUser) {
                return (
                  <div key={msg.id} className="flex flex-col items-end">
                    <Message align="end" className="gap-2.5 items-end">
                      <MessageContent className="items-end max-w-[85%]">
                        <Bubble className="rounded-[22px] rounded-br-[4px] bg-[#2563eb] text-white shadow-sm transition-all">
                          <BubbleContent className="px-4 py-2.5 text-[15px] font-normal leading-relaxed text-white">
                            {msg.content}
                          </BubbleContent>
                        </Bubble>
                      </MessageContent>

                      <MessageAvatar className="size-8 shrink-0 self-end">
                        {isLastInGroup ? (
                          <UserAvatar />
                        ) : (
                          <div className="size-8" aria-hidden="true" />
                        )}
                      </MessageAvatar>
                    </Message>

                    {isLastInGroup && (
                      <MessageFooter className="text-zinc-400 text-xs mt-1 mr-10 justify-end font-normal">
                        Delivered
                      </MessageFooter>
                    )}
                  </div>
                );
              }

              // Assistant / other incoming message
              return (
                <Message
                  key={msg.id}
                  align="start"
                  className="gap-2.5 items-end"
                >
                  <MessageAvatar className="size-8 shrink-0 self-end">
                    {isLastInGroup ? (
                      <OliverAvatar />
                    ) : (
                      <div className="size-8" aria-hidden="true" />
                    )}
                  </MessageAvatar>

                  <MessageContent className="items-start max-w-[85%]">
                    <div className="relative group">
                      <Bubble className="rounded-[22px] rounded-bl-[4px] bg-[#27272a] text-white shadow-sm">
                        <BubbleContent className="px-4 py-2.5 text-[15px] font-normal leading-relaxed text-white">
                          {msg.content}
                        </BubbleContent>
                      </Bubble>

                      {/* Optional reaction indicator on later confirmed assistant messages */}
                      {isLastInGroup && groupIndex > 0 && (
                        <span
                          className="absolute -bottom-2.5 right-2 inline-flex items-center bg-[#27272a] border border-[#3f3f46] rounded-full px-1.5 py-0.5 text-xs shadow-md select-none"
                          role="img"
                          aria-label="Reaction thumbs up"
                        >
                          👍
                        </span>
                      )}
                    </div>
                  </MessageContent>
                </Message>
              );
            })}
          </MessageGroup>
        );
      })}

      {/* Typing indicator matching screenshot: "Oliver is typing..." */}
      {isLoading && (
        <div
          className="text-zinc-400 text-sm pl-11 pt-1 flex items-center gap-1.5 font-normal select-none"
          aria-live="polite"
        >
          <span>Oliver is typing...</span>
        </div>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};
