import React from "react";

export const App: React.FC = () => {
  return (
    <div
      style={{
        maxWidth: 800,
        margin: "60px auto",
        padding: "0 20px",
        fontFamily: "inherit",
      }}
    >
      <header
        style={{
          borderBottom: "1px solid #e2e8f0",
          paddingBottom: "20px",
          marginBottom: "24px",
        }}
      >
        <h1 style={{ fontSize: "2rem", color: "#2d3748" }}>
          Document Intake Assistant
        </h1>
        <p style={{ color: "#718096", marginTop: "6px" }}>
          Conversational Personal Wishes Intake & Structured State System
        </p>
      </header>

      <main>
        <div
          style={{
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            padding: "24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "16px",
            }}
          >
            <span
              style={{
                display: "inline-block",
                width: "12px",
                height: "12px",
                borderRadius: "50%",
                backgroundColor: "#38a169",
              }}
            />
            <strong style={{ color: "#2d3748", fontSize: "1.1rem" }}>
              Milestone 01 — Foundation Active
            </strong>
          </div>
          <p style={{ color: "#4a5568", lineHeight: 1.6 }}>
            The Document Intake Assistant foundation has been established. The
            frontend shell is connected to the Vite development environment and
            ready for subsequent milestones.
          </p>
          <div
            style={{
              marginTop: "20px",
              padding: "12px 16px",
              backgroundColor: "#edf2f7",
              borderRadius: "6px",
              fontSize: "0.9rem",
              color: "#4a5568",
            }}
          >
            Backend Health Endpoint: <code>/health</code>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
