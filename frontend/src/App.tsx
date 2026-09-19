import React, { useEffect, useState } from "react";
import { useInterview } from "./hooks";
import { ErrorBanner, ConversationPanel, LandingView } from "./components";

const getViewFromUrl = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "overview";
};

export const App: React.FC = () => {
  const {
    session,
    input,
    setInput,
    isLoading,
    isCompleted,
    error,
    clearError,
    sendMessage,
    startNewSession,
  } = useInterview();

  // Default to the workspace/chat UI so the implemented container, messaging card,
  // and centered layout are visible immediately in the browser. Browser history is
  // kept in sync so the back / forward buttons can move between the overview and
  // workspace views naturally.
  const [showOverview, setShowOverview] = useState<boolean>(() =>
    getViewFromUrl(),
  );

  useEffect(() => {
    const handlePopState = () => {
      setShowOverview(getViewFromUrl());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const setView = (nextShowOverview: boolean) => {
    setShowOverview(nextShowOverview);

    if (typeof window === "undefined") {
      return;
    }

    const url = new URL(window.location.href);
    if (nextShowOverview) {
      url.searchParams.set("view", "overview");
    } else {
      url.searchParams.delete("view");
    }

    window.history.pushState({}, "", url);
  };

  if (showOverview) {
    return (
      <div className="min-h-screen w-full bg-background-cream">
        <LandingView onEnterWorkspace={() => setView(false)} />
      </div>
    );
  }

  return (
    <div className="app-container flex flex-col h-screen overflow-hidden bg-[#FCF6EE]">
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
        <main className="flex-1 overflow-hidden p-4 md:p-6">
          <div className="mx-auto mt-[10vh] h-[70vh] w-full max-w-[1100px]">
            <ConversationPanel
              messages={session.messages}
              input={input}
              onInputChange={setInput}
              onSendMessage={() => sendMessage()}
              onRestart={startNewSession}
              isLoading={isLoading}
              isCompleted={isCompleted}
            />
          </div>
        </main>
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
