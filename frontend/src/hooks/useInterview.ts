import { useState, useEffect, useCallback } from "react";
import { Session, ApiError } from "../types";
import { sessionApi, ApiClientError } from "../api";

export interface UseInterviewReturn {
  session: Session | null;
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isCompleted: boolean;
  error: ApiError | null;
  clearError: () => void;
  sendMessage: (customContent?: string) => Promise<void>;
  startNewSession: () => Promise<void>;
}

/**
 * Checks whether the current session represents a completed intake.
 */
export function checkIsComplete(session: Session | null): boolean {
  if (!session) return false;
  const s = session.state;
  const isAllRequiredConfirmed =
    s.fullName.status === "CONFIRMED" &&
    s.homeAddress.status === "CONFIRMED" &&
    s.coversWorldwideAssets.status === "CONFIRMED" &&
    s.hasChildren.status === "CONFIRMED" &&
    s.executor.name.status === "CONFIRMED" &&
    s.executor.relationship.status === "CONFIRMED" &&
    s.additionalWishes.status === "CONFIRMED";

  if (isAllRequiredConfirmed) return true;

  // Fallback: check if the assistant's latest message declares completion
  const lastMsg = session.messages[session.messages.length - 1];
  if (
    lastMsg &&
    lastMsg.role === "assistant" &&
    lastMsg.content.includes("All required information has been collected")
  ) {
    return true;
  }

  return false;
}

export function useInterview(): UseInterviewReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  const startNewSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setInput("");
    try {
      const newSession = await sessionApi.createSession();
      setSession(newSession);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError({ code: err.code, message: err.message });
      } else {
        setError({
          code: "INITIALIZATION_ERROR",
          message:
            err instanceof Error ? err.message : "Failed to initialize session",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    startNewSession();
  }, [startNewSession]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const sendMessage = useCallback(
    async (customContent?: string) => {
      const text = (customContent ?? input).trim();
      if (!text || isLoading || !session) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await sessionApi.sendMessage(session.id, text);
        setSession(response.session);
        setInput(""); // Only clear input on success
      } catch (err) {
        if (err instanceof ApiClientError) {
          setError({ code: err.code, message: err.message });
        } else {
          setError({
            code: "SEND_ERROR",
            message:
              err instanceof Error ? err.message : "Failed to send message",
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [input, isLoading, session],
  );

  const isCompleted = checkIsComplete(session);

  return {
    session,
    input,
    setInput,
    isLoading,
    isCompleted,
    error,
    clearError,
    sendMessage,
    startNewSession,
  };
}
