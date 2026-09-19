import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Message as MessageType } from "../types";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "./ui/message";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

interface MessageListProps {
  messages: readonly MessageType[];
  isLoading?: boolean;
  onRetry?: (messageId: string) => void;
}

const ASSISTANT_AVATAR_URL =
  "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80";
const USER_AVATAR_URL =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

const formatTime = (value?: string) => {
  if (!value) return "";

  try {
    return new Date(value).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
};

const formatSendStatus = (status?: MessageType["status"]) => {
  switch (status) {
    case "sending":
      return "Sending";
    case "streaming":
      return "Streaming";
    case "error":
      return "Failed";
    default:
      return "Sent";
  }
};

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  isLoading,
  onRetry,
}) => {
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = async (value: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedId(messageId);
      window.setTimeout(
        () =>
          setCopiedId((current) => (current === messageId ? null : current)),
        1200,
      );
    } catch {
      setCopiedId(null);
    }
  };

  return (
    <div
      className="flex flex-col gap-4 py-4 px-2"
      role="log"
      aria-label="Interview conversation messages"
      aria-live="polite"
    >
      {groupedMessages.map((group) => {
        const isAssistantGroup = group.role === "assistant";

        return (
          <MessageGroup
            key={group.role + group.items[0]?.id}
            className="gap-2.5"
          >
            {group.items.map((msg, index) => {
              const isUser = msg.role === "user";
              const isSystem = msg.role === "system";
              const formattedTime = formatTime(msg.createdAt);
              const isError = msg.status === "error";
              const isStreaming = msg.status === "streaming";
              const showMeta = !!formattedTime || msg.status !== undefined;

              const bubbleClasses = isUser
                ? "rounded-2xl rounded-br-sm bg-[#4E1FBE] text-white shadow-[0_12px_24px_-14px_rgba(78,31,190,0.8)]"
                : isSystem
                  ? "rounded-2xl border border-dashed border-[#4E1FBE]/35 bg-[#F4EDFF] text-[#360097]"
                  : "rounded-2xl rounded-bl-sm border border-[#4E1FBE]/15 bg-white text-[#1D1A23] shadow-[0_8px_18px_-12px_rgba(36,0,103,0.45)]";

              return (
                <Message
                  key={msg.id}
                  align={isUser ? "end" : "start"}
                  className={isUser ? "gap-2" : "gap-2"}
                >
                  {!isUser && !isSystem && (
                    <MessageAvatar className="size-8 shrink-0">
                      {index === 0 ? (
                        <Avatar className="size-8 ring-1 ring-[#4E1FBE]/25 shadow-xs bg-[#E2D6FF]">
                          <AvatarImage
                            src={ASSISTANT_AVATAR_URL}
                            alt="Assistant"
                          />
                          <AvatarFallback className="bg-[#E2D6FF] text-[#360097] text-xs font-bold">
                            AI
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div className="size-8" aria-hidden="true" />
                      )}
                    </MessageAvatar>
                  )}

                  <MessageContent
                    className={isUser ? "items-end" : "items-start"}
                  >
                    {!isSystem && (
                      <MessageHeader className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold text-[#494454]">
                        <span>{isUser ? "You" : "Intake Assistant"}</span>
                        {!isUser && (
                          <span className="size-1.5 rounded-full bg-[#34c759]" />
                        )}
                      </MessageHeader>
                    )}

                    <div
                      className={`w-fit max-w-[min(80%,36rem)] break-words whitespace-pre-wrap ${bubbleClasses}`}
                      style={{
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                      }}
                    >
                      <div className="px-4 py-3 text-sm leading-relaxed md:text-[0.96rem]">
                        {msg.content}
                      </div>
                    </div>

                    {showMeta && (
                      <MessageFooter className="mt-1 flex items-center gap-2 px-1 text-[10px] text-[#797482]">
                        {formattedTime && <span>{formattedTime}</span>}
                        {msg.status && !isUser && (
                          <span className="font-medium text-[#494454]">
                            {formatSendStatus(msg.status)}
                          </span>
                        )}
                      </MessageFooter>
                    )}

                    {isAssistantGroup && (
                      <div className="mt-1 flex items-center justify-end gap-1 px-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#4E1FBE]/15 bg-white px-2 py-1 text-[10px] font-medium text-[#360097] transition hover:bg-[#F3ECFF]"
                          aria-label={`Copy assistant message ${msg.id}`}
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </button>

                        {isError && onRetry && (
                          <button
                            type="button"
                            onClick={() => onRetry(msg.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#4E1FBE]/15 bg-white px-2 py-1 text-[10px] font-medium text-[#360097] transition hover:bg-[#F3ECFF]"
                            aria-label={`Retry assistant message ${msg.id}`}
                          >
                            <RefreshCw className="size-3.5" />
                            Retry
                          </button>
                        )}

                        {!isError && !isStreaming && null}
                      </div>
                    )}

                    {isUser && (
                      <div className="mt-1 flex items-center justify-end gap-1 px-1">
                        <button
                          type="button"
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="inline-flex items-center gap-1 rounded-full border border-[#4E1FBE]/15 bg-white px-2 py-1 text-[10px] font-medium text-[#360097] transition hover:bg-[#F3ECFF]"
                          aria-label={`Copy user message ${msg.id}`}
                        >
                          {copiedId === msg.id ? (
                            <Check className="size-3.5" />
                          ) : (
                            <Copy className="size-3.5" />
                          )}
                          {copiedId === msg.id ? "Copied" : "Copy"}
                        </button>
                      </div>
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
          </MessageGroup>
        );
      })}

      {isLoading && (
        <MessageGroup className="gap-2.5">
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
              <MessageHeader className="mb-1 flex items-center gap-2 px-1 text-[11px] font-semibold text-[#494454]">
                <span>Intake Assistant</span>
                <span className="size-1.5 rounded-full bg-[#34c759]" />
              </MessageHeader>

              <div
                className="w-fit max-w-[min(80%,36rem)] rounded-2xl rounded-bl-sm border border-[#4E1FBE]/15 bg-white px-4 py-3 shadow-[0_8px_18px_-12px_rgba(36,0,103,0.45)]"
                aria-label="Assistant is analyzing your answer"
              >
                <div className="flex items-center gap-1.5" aria-live="polite">
                  <span className="size-1.5 animate-pulse rounded-full bg-[#4E1FBE]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#4E1FBE] [animation-delay:120ms]" />
                  <span className="size-1.5 animate-pulse rounded-full bg-[#4E1FBE] [animation-delay:240ms]" />
                </div>
              </div>
            </MessageContent>
          </Message>
        </MessageGroup>
      )}

      <div ref={scrollEndRef} />
    </div>
  );
};
