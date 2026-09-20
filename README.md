# Document Intake Assistant

A conversational web application that conducts an interview with a user, extracts structured personal wishes data into an authoritative application domain state, and produces a deterministic draft Personal Wishes Document.

> **Current Status: Milestone 01 — Foundation**
>
> This project is being constructed incrementally according to the architecture defined in [`ARCHITECTURE.md`](./ARCHITECTURE.md).
> Milestone 01 establishes the repository structure, backend Express baseline, frontend React/Vite shell, environment configuration, and Vitest test suite.
> Subsequent milestones will implement the domain state machine, LLM integration, persistence, and interview UI.

---

## Prerequisites

- **Node.js**: `v20` or later (tested on `v22.x`)
- **npm**: `v10` or later

---

## Project Structure

```text
document-intake-assistant/
├── ARCHITECTURE.md          # Architectural source of truth
├── README.md                # Project documentation
├── .env.example             # Template environment configuration
├── .gitignore               # Git ignore rules
├── package.json             # Root workspace package configuration
├── vitest.config.ts         # Vitest test configuration
├── backend/                 # Backend Node.js/TypeScript Express application
│   ├── src/
│   │   ├── app.ts           # Express application setup & middleware
│   │   ├── config.ts        # Typed environment configuration
│   │   └── index.ts         # Server entry point
│   ├── tests/
│   │   └── health.test.ts   # Backend health endpoint tests
│   ├── package.json
│   └── tsconfig.json
├── frontend/                # Frontend React/Vite/TypeScript application
│   ├── src/
│   │   ├── App.tsx          # Application shell component
│   │   ├── index.css        # Base stylesheet
│   │   └── main.tsx         # React entry point
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── tests/                   # Top-level smoke and integration tests
    └── foundation.smoke.test.ts
```

---

## Installation

Install all workspace dependencies from the root directory:

```bash
npm install
```

---

## Environment Configuration

Copy the sample environment file:

```bash
cp .env.example .env
```

Key environment variables:

- `PORT`: Port for the backend server (default: `3000`).
- `NODE_ENV`: Application environment (`development` | `production` | `test`).
- `LLM_PROVIDER`: LLM provider setting (`mock` | `gemini`). Defaults to `mock`; Gemini is the only external model provider.

---

## Running the Application

### Backend

To start the backend in development mode (with hot reloading via `tsx`):

```bash
npm run dev:backend
```

The backend starts at `http://localhost:3000`. You can verify it with:

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "..." }
```

### Frontend

To start the frontend development server:

```bash
npm run dev:frontend
```

The frontend will be available at `http://localhost:5173`.

---

## Running Tests

Run the test suite across the workspaces:

```bash
npm test
```

---

## Building the Project

To compile both backend and frontend for production:

```bash
npm run build
```

To run TypeScript type checks across all workspaces:

```bash
npm run typecheck
```
