import { useState, useEffect, useCallback, useRef } from "react";
import { Session, ApiError, Message } from "../types";
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
 * Checks whether the current session represents a completed intake based on
 * canonical domain state resolution (matching ARCHITECTURE.md Section 6.5).
 */
export function checkIsComplete(session: Session | null): boolean {
  if (!session) return false;
  const s = session.state;

  // Base required scalar fields
  const isBaseConfirmed =
    s.fullName.status === "CONFIRMED" &&
    s.homeAddress.status === "CONFIRMED" &&
    s.coversWorldwideAssets.status === "CONFIRMED" &&
    s.hasChildren.status === "CONFIRMED" &&
    s.executor.name.status === "CONFIRMED" &&
    s.executor.relationship.status === "CONFIRMED" &&
    s.additionalWishes.status === "CONFIRMED";

  if (!isBaseConfirmed) return false;

  // If user has children, ensure children names have been resolved
  if (s.hasChildren.value === true) {
    const hasResolvedChildren =
      s.children.length > 0 &&
      s.children.some(
        (c) =>
          c.status === "CONFIRMED" ||
          c.status === "NOT_PROVIDED" ||
          c.status === "REFUSED",
      );
    if (!hasResolvedChildren) {
      return false;
    }
  }

  // Ensure specific gifts field is resolved
  const hasResolvedGifts =
    s.specificGifts.length > 0 &&
    s.specificGifts.some(
      (g) =>
        g.status === "CONFIRMED" ||
        g.status === "NOT_PROVIDED" ||
        g.status === "REFUSED",
    );

  return hasResolvedGifts;
}

export function useInterview(): UseInterviewReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [input, setInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Guards against stale async work: every mutating operation bumps the counter,
  // so responses from superseded operations are ignored. `activeAbortRef` lets a
  // new operation cancel an in-flight one (e.g. session creation) at the network
  // layer instead of merely discarding its result.
  const operationIdRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);

  const startNewSession = useCallback(async () => {
    activeAbortRef.current?.abort();
    const controller = new AbortController();
    activeAbortRef.current = controller;
    const operationId = ++operationIdRef.current;

    setIsLoading(true);
    setError(null);
    setInput("");
    try {
      const newSession = await sessionApi.createSession(
        undefined,
        controller.signal,
      );
      if (operationId !== operationIdRef.current) {
        return;
      }
      setSession(newSession);
    } catch (err) {
      if (operationId !== operationIdRef.current) {
        return;
      }
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
      if (operationId === operationIdRef.current) {
        setIsLoading(false);
      }
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

      // Optimistically add the user's message immediately so it renders before the assistant's typing animation
      const optimisticMessage: Message = {
        id: `optimistic-${Date.now()}`,
        role: "user",
        content: text,
        createdAt: new Date().toISOString(),
      };

      const previousSession = session;
      setSession({
        ...session,
        messages: [...session.messages, optimisticMessage],
      });

      setInput("");
      setIsLoading(true);
      setError(null);

      try {
        const response = await sessionApi.sendMessage(session.id, text);
        setSession(response.session);
      } catch (err) {
        // Rollback optimistic message and restore typed input on error
        setSession(previousSession);
        setInput(text);

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
