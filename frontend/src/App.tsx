import React from "react";
import { useInterview } from "./hooks";
import {
  Header,
  ErrorBanner,
  ConversationPanel,
  InformationPanel,
} from "./components";

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

  return (
    <div className="app-container">
      <Header
        onNewSession={startNewSession}
        isLoading={isLoading && !session}
      />

      <ErrorBanner error={error} onDismiss={clearError} />

      {!session && isLoading ? (
        <div className="app-loading-state" role="status">
          <div className="spinner" aria-hidden="true" />
          <p>Initializing interview session...</p>
        </div>
      ) : session ? (
        <main className="interview-layout">
          <ConversationPanel
            messages={session.messages}
            input={input}
            onInputChange={setInput}
            onSendMessage={() => sendMessage()}
            isLoading={isLoading}
            isCompleted={isCompleted}
            onRestart={startNewSession}
          />

          <InformationPanel state={session.state} document={session.document} />
        </main>
      ) : (
        <div className="app-loading-state">
          <p>Unable to load session. Please check connection and try again.</p>
          <button
            type="button"
            onClick={startNewSession}
            className="btn btn-primary"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
};

export default App;
