import React, { useEffect, useRef, useState } from "react";
import { useInterview } from "./hooks";
import {
  ErrorBanner,
  LandingView,
  StatePreview,
  DocumentPreview,
} from "./components";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from "@/components/ui/message";
import { Info, Moon, RotateCcw, Send, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

const isReloadNavigation = (): boolean => {
  if (typeof window === "undefined" || !window.performance) {
    return false;
  }
  const navEntries = window.performance.getEntriesByType?.("navigation");
  if (navEntries && navEntries.length > 0) {
    const nav = navEntries[0] as PerformanceNavigationTiming;
    return nav.type === "reload";
  }
  // Fallback for legacy performance.navigation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (window.performance as any)?.navigation?.type === 1;
};

const isWorkspaceFromUrl = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  // If page was reloaded via browser reload button/shortcut, always reset to landing page
  if (isReloadNavigation()) {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "workspace";
};

interface AppProps {
  initialShowOverview?: boolean;
}

export const App: React.FC<AppProps> = ({ initialShowOverview }) => {
  const {
    session,
    input,
    setInput,
    sendMessage,
    isLoading,
    error,
    clearError,
    startNewSession,
  } = useInterview();

  // Reloading the page or freshly entering always starts on the landing page.
  const [showOverview, setShowOverview] = useState<boolean>(() => {
    if (initialShowOverview !== undefined) {
      return initialShowOverview;
    }
    return !isWorkspaceFromUrl();
  });

  // If reloaded or landing view, clean any leftover view param from the URL
  useEffect(() => {
    if (typeof window !== "undefined" && isReloadNavigation()) {
      if (window.location.search) {
        const url = new URL(window.location.href);
        url.searchParams.delete("view");
        window.history.replaceState(
          { view: "landing" },
          "",
          url.pathname + (url.search || ""),
        );
      }
    }
  }, []);

  // Dark/light mode state for the conversation workspace (defaults to dark mode to match Screenshot 1)
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);

  // Auto-scroll ref for conversation messages
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Input ref to keep message box focused
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [session?.messages.length, isLoading]);

  // Keep message input focused when in workspace and when assistant finishes replying
  useEffect(() => {
    if (!showOverview && session && !isLoading) {
      messageInputRef.current?.focus();
    }
  }, [showOverview, session, isLoading]);

  // Synchronize view state with native browser navigation (back / forward arrows)
  useEffect(() => {
    const handlePopState = () => {
      setShowOverview(!isWorkspaceFromUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const enterWorkspace = () => {
    setShowOverview(false);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.set("view", "workspace");
    window.history.pushState({ view: "workspace" }, "", url);
  };

  const goToLanding = () => {
    setShowOverview(true);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("view");

    // If the workspace was entered via pushState in this browsing session,
    // window.history.back() cleanly pops the history so the forward arrow remains functional.
    if (window.history.state?.view === "workspace") {
      window.history.back();
    } else {
      window.history.pushState({ view: "landing" }, "", url);
    }
  };

  // Keyboard shortcut: pressing Escape while in the workspace returns to the overview
  useEffect(() => {
    if (showOverview) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        goToLanding();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showOverview]);

  if (showOverview) {
    return (
      <div className="min-h-screen w-full bg-background-cream">
        <LandingView onEnterWorkspace={enterWorkspace} />
      </div>
    );
  }

  return (
    <div
      className="app-container flex flex-col min-h-screen bg-[#FCF6EE]"
      style={{
        paddingTop: "32px",
        boxSizing: "border-box",
      }}
    >
      <ErrorBanner error={error} onDismiss={clearError} />

      {!session && isLoading ? (
        <div
          className="app-loading-state flex flex-col items-center justify-center flex-1 gap-4 text-[#797482]"
          role="status"
        >
          <div
            className="size-8 rounded-full border-2 border-[#4E1FBE]/20 border-t-[#4E1FBE] animate-spin"
            aria-hidden="true"
          />
          <p className="text-sm font-medium">
            Initializing interview session...
          </p>
        </div>
      ) : session ? (
        <>
          <main
            className="flex-1 px-4 md:px-6 pb-16 flex flex-col items-center gap-10 md:gap-12"
            style={{ paddingTop: "24px" }}
          >
            <div
              className="w-full max-w-[1100px] flex flex-col items-center justify-center shrink-0"
              style={{ marginTop: "16px", rowGap: "24px" }}
            >
              {/* Top Actions Bar outside and above the card */}
              <div
                className="w-full flex items-center justify-between shrink-0"
                style={{ columnGap: "16px" }}
              >
                <p
                  className="shrink-0 text-left text-3xl md:text-4xl font-bold text-[#240067]"
                  style={{ fontFamily: '"Onsite", sans-serif' }}
                >
                  Talk to our assistant
                </p>

                <div className="flex items-center gap-4 shrink-0">
                  {/* New Session Button */}
                  <button
                    type="button"
                    onClick={startNewSession}
                    disabled={isLoading}
                    aria-label="Start new session"
                    data-testid="new-session-button"
                    style={{
                      padding: "12px 24px",
                      border: "1px dashed rgba(78, 31, 190, 0.5)",
                      outline: "1px dashed rgba(78, 31, 190, 0.8)",
                      outlineOffset: "3px",
                      borderRadius: "12px",
                      boxSizing: "border-box",
                    }}
                    className="inline-flex items-center gap-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer select-none bg-[#eaff57] hover:bg-[#ddf83b] text-[#240067] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="size-3.5 text-[#240067]" />
                    <span>New session</span>
                  </button>

                  {/* Dark / Light Mode Toggle Button */}
                  <button
                    type="button"
                    onClick={() => setIsDarkMode((prev) => !prev)}
                    aria-label={
                      isDarkMode
                        ? "Switch to light mode"
                        : "Switch to dark mode"
                    }
                    data-testid="theme-toggle-button"
                    style={{
                      padding: "12px 26px",
                      border: "1px dashed rgba(78, 31, 190, 0.5)",
                      outline: "1px dashed rgba(78, 31, 190, 0.8)",
                      outlineOffset: "3px",
                      borderRadius: "12px",
                      boxSizing: "border-box",
                    }}
                    className="inline-flex items-center gap-2.5 rounded-xl text-xs font-bold tracking-wide transition-all shadow-sm cursor-pointer select-none bg-[#eaff57] hover:bg-[#ddf83b] text-[#240067]"
                  >
                    {isDarkMode ? (
                      <>
                        <Sun className="size-3.5 text-[#240067]" />
                        <span>Light mode</span>
                      </>
                    ) : (
                      <>
                        <Moon className="size-3.5 text-[#240067]" />
                        <span>Dark mode</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div
                className={cn(
                  "w-full h-[70vh] rounded-[16px] border-[6px] border-[#4E1FBE] shadow-[0_18px_40px_-18px_rgba(78,31,190,0.22)] relative flex flex-col transition-colors duration-200 overflow-hidden py-3 md:py-4",
                  isDarkMode ? "dark bg-[#0a0a0a]" : "bg-white",
                )}
                style={{ border: "6px solid #4E1FBE", borderRadius: "16px" }}
                data-testid="workspace-card"
              >
                {/* Conversation Messages Stream */}
                <div className="flex-1 overflow-y-auto px-4 md:px-8 flex flex-col items-center">
                  {/* Top margin/padding spacer so messages never stick to the top purple border */}
                  <div
                    style={{ height: "24px", minHeight: "24px", flexShrink: 0 }}
                    aria-hidden="true"
                  />

                  <div className="flex w-full max-w-3xl flex-col gap-6">
                    {session.messages.map((msg) =>
                      msg.role === "assistant" ? (
                        <Message key={msg.id} align="start">
                          <MessageAvatar>
                            <Avatar className="size-10 bg-white ring-1 ring-black/10 dark:ring-white/20 shrink-0">
                              <AvatarImage
                                src="/intake-assistant.png"
                                alt="Intake Assistant"
                                className="object-contain p-1"
                              />
                              <AvatarFallback>IA</AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <MessageHeader>Intake assistant</MessageHeader>
                            <Bubble variant="muted">
                              <BubbleContent>{msg.content}</BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      ) : (
                        <Message key={msg.id} align="end">
                          <MessageAvatar>
                            <Avatar className="size-10 bg-white ring-1 ring-black/10 dark:ring-white/20 shrink-0">
                              <AvatarImage
                                src="/You.png"
                                alt="You"
                                className="object-contain p-1"
                              />
                              <AvatarFallback>You</AvatarFallback>
                            </Avatar>
                          </MessageAvatar>
                          <MessageContent>
                            <MessageHeader>You</MessageHeader>
                            <Bubble>
                              <BubbleContent>{msg.content}</BubbleContent>
                            </Bubble>
                          </MessageContent>
                        </Message>
                      ),
                    )}

                    {isLoading && (
                      <Message align="start">
                        <MessageAvatar>
                          <Avatar className="size-10 bg-white ring-1 ring-black/10 dark:ring-white/20 shrink-0">
                            <AvatarImage
                              src="/intake-assistant.png"
                              alt="Intake Assistant"
                              className="object-contain p-1"
                            />
                            <AvatarFallback>IA</AvatarFallback>
                          </Avatar>
                        </MessageAvatar>
                        <MessageContent>
                          <MessageHeader>Intake assistant</MessageHeader>
                          <Bubble variant="muted">
                            <BubbleContent className="flex items-center gap-1.5 py-3">
                              <span className="size-2 rounded-full bg-current opacity-60 animate-bounce" />
                              <span className="size-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0.2s]" />
                              <span className="size-2 rounded-full bg-current opacity-60 animate-bounce [animation-delay:0.4s]" />
                            </BubbleContent>
                          </Bubble>
                        </MessageContent>
                      </Message>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Bottom stream spacing before input bar */}
                  <div
                    style={{ height: "16px", minHeight: "16px", flexShrink: 0 }}
                    aria-hidden="true"
                  />
                </div>

                {/* Bottom Minimal Send Message Component with guaranteed inner bottom margin/padding */}
                <div
                  className="w-full px-4 md:px-8 flex justify-center bg-inherit shrink-0"
                  style={{ paddingTop: "14px", paddingBottom: "28px" }}
                >
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!input.trim() || isLoading) return;
                      sendMessage();
                      messageInputRef.current?.focus();
                    }}
                    className="flex w-full max-w-3xl items-center gap-3"
                  >
                    <input
                      ref={messageInputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Message"
                      autoFocus
                      style={{
                        padding: "14px 24px",
                        borderRadius: "14px",
                        boxSizing: "border-box",
                      }}
                      className="flex-1 h-14 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] text-sm md:text-base text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-[#4E1FBE]/30 focus:border-[#4E1FBE] transition-colors shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isLoading}
                      aria-label="Send"
                      style={{
                        borderRadius: "14px",
                      }}
                      className="size-14 border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#18181b] hover:bg-neutral-50 dark:hover:bg-[#202024] flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      <Send className="size-5 text-neutral-500 dark:text-neutral-400 -translate-x-0.5" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Notice below conversation card explaining automatic mock fallback */}
              <p className="w-full flex items-center justify-center gap-1.5 text-center text-xs text-[#797482] font-medium tracking-wide -mt-2">
                <Info className="size-3.5 shrink-0 text-[#4E1FBE]" />
                <span>
                  Note: When the Gemini free-tier quota is reached, the
                  assistant automatically switches to MockLLM so your interview
                  continues uninterrupted.
                </span>
              </p>
            </div>

            {/* Two Side-by-Side Column Cards — Left: Live Structured State, Right: Draft Document */}
            <div className="w-full max-w-[1100px] flex flex-row items-start justify-between shrink-0">
              {/* Left Card — Collected Information (StatePreview) */}
              <div className="w-[46%] flex flex-col gap-4">
                <span
                  className="text-3xl md:text-4xl font-bold text-[#240067]"
                  style={{ fontFamily: '"Onsite", sans-serif' }}
                >
                  Structured Information
                </span>
                <div
                  className={cn(
                    "w-full h-[85vh] rounded-[16px] border-[6px] border-[#4E1FBE] shadow-[0_18px_40px_-18px_rgba(78,31,190,0.22)] relative flex flex-col transition-colors duration-200 overflow-hidden",
                    isDarkMode ? "dark bg-[#1a0933]" : "bg-[#1a0933]",
                  )}
                  style={{
                    border: "6px solid #4E1FBE",
                    borderRadius: "16px",
                    padding: "14px 22px",
                    boxSizing: "border-box",
                  }}
                  data-testid="column-card-left"
                >
                  {/* Accessible text preserving keywords for tests & accessibility without visual header bar */}
                  <span className="sr-only">Collected Information</span>
                  <span className="sr-only">Live State</span>

                  {/* Content */}
                  <div className="flex-1 w-full h-full overflow-hidden">
                    <StatePreview state={session.state} />
                  </div>
                </div>
              </div>

              {/* Right Card — Draft Document (DocumentPreview) */}
              <div className="w-[52%] flex flex-col gap-4">
                <span
                  className="text-3xl md:text-4xl font-bold text-[#240067]"
                  style={{ fontFamily: '"Onsite", sans-serif' }}
                >
                  Document Draft
                </span>
                <div
                  className={cn(
                    "w-full h-[85vh] rounded-[16px] border-[6px] border-[#4E1FBE] shadow-[0_18px_40px_-18px_rgba(78,31,190,0.22)] relative flex flex-col transition-colors duration-200 overflow-hidden",
                    isDarkMode ? "dark bg-[#0a0a0a]" : "bg-white",
                  )}
                  style={{ border: "6px solid #4E1FBE", borderRadius: "16px" }}
                  data-testid="column-card-right"
                >
                  {/* Scrollable content */}
                  <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-4 py-4">
                    <DocumentPreview
                      document={session.document}
                      state={session.state}
                    />
                  </div>
                </div>
              </div>
            </div>
          </main>
          <footer
            className="relative mt-space-xl w-full px-4 py-space-md sm:px-6 lg:px-10"
            style={{
              backgroundColor: "#4E1FBE",
              color: "#E9FF57",
            }}
          >
            <p
              className="m-0 text-center"
              style={{
                fontFamily: "Onsite",
                fontWeight: 700,
                color: "#E9FF57",
                fontSize: "1.05rem",
                lineHeight: 1.6,
              }}
            >
              *This is not a real product, but a solution to a problem provided
              by the Wenup Team. This is an assessment to test how I approach
              the problem.
            </p>
          </footer>
        </>
      ) : (
        <div className="app-loading-state flex flex-col items-center justify-center flex-1 gap-4 text-[#797482]">
          <p className="text-sm font-medium">
            Unable to load session. Please check connection and try again.
          </p>
          <button
            type="button"
            onClick={startNewSession}
            className="btn btn-primary text-xs font-semibold px-4 py-2 rounded-xl bg-[#4E1FBE] text-white"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
