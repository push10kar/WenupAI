# WenupAI — Document Intake Assistant

A web app that interviews users through a conversational UI to collect their personal wishes (name, address, executor, children, gifts, etc.) and automatically generates a draft Personal Wishes Document.

Built with **React + Vite** on the frontend and a **Fastify + TypeScript** backend. Uses **OpenRouter** (free-tier models) as the LLM provider by default, with **Gemini** and a deterministic **MockLLM** available as alternatives.

## How It Works

1. User opens the app and starts a new session.
2. The assistant asks questions one by one (full name → address → worldwide assets → children → executor → gifts → additional wishes).
3. Each user response is sent to the backend, where the LLM extracts structured data from the message.
4. The extracted data goes through validation and conflict detection before updating the session state.
5. Two live preview panels show the collected information (left) and the auto-generated draft document (right) in real time.
6. When all required fields are filled, the interview is marked complete.

## Tech Stack

| Layer    | Tech                                             |
| -------- | ------------------------------------------------ |
| Frontend | React, Vite, TypeScript, Tailwind CSS, shadcn/ui |
| Backend  | Fastify, TypeScript, Zod, SQLite                 |
| LLM      | OpenRouter (free-tier) — Gemini & MockLLM options |
| Testing  | Vitest                                           |

## Prerequisites

- **Node.js** v20+ (tested on v22)
- **npm** v10+
- A **provider key** — either an [OpenRouter API key](https://openrouter.ai/keys) (default) or a [Gemini API key](https://aistudio.google.com) — or run with the `mock` provider and no key at all

## Setup

1. **Clone the repo**

   ```bash
   git clone https://github.com/push10kar/WenupAI.git
   cd WenupAI
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment**

   ```bash
   cp .env.example .env
   ```

   Open `.env` and fill in your values:

   ```env
   # Server
   PORT=3000
   NODE_ENV=development

   # LLM — "openrouter" (default) | "gemini" | "mock" (no key required)
   LLM_PROVIDER=openrouter
   LLM_TIMEOUT_MS=60000

   # OpenRouter (OpenAI-compatible chat completions; free-tier models supported)
   OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
   OPENROUTER_API_KEY=your_api_key_here
   OPENROUTER_MODEL=openrouter/free

   # Gemini (alternative provider)
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-1.5-flash

   # Optionally point at a local OpenAI-compatible gateway (e.g. OmniRoute) instead:
   # OPENROUTER_BASE_URL=http://localhost:20128/v1

   # Database
   DATABASE_PATH=./dev.sqlite
   ```

   > **Tip:** If you don't have a provider key yet, set `LLM_PROVIDER=mock` and the app will work with deterministic mock responses — no API key needed.

## Running the App

Start both servers in separate terminals:

```bash
# Terminal 1 — Backend (runs on http://localhost:3000)
npm run dev:backend

# Terminal 2 — Frontend (runs on http://localhost:5173)
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Running Tests

```bash
# Run everything (backend + frontend + integration)
npm test

# Or run them individually
npm --prefix backend run test     # 380 tests
npm --prefix frontend run test    # 24 tests
npx vitest run                    # root foundation smoke tests
```

## Building for Production

```bash
npm run build
```

This compiles the backend TypeScript and builds the frontend with Vite.

## Type Checking

```bash
npm run typecheck
```

## Project Structure

```
WenupAI/
├── backend/
│   ├── src/
│   │   ├── domain/           # State machine, validation, conflict detection
│   │   ├── application/      # Interview service, session management
│   │   └── infrastructure/   # LLM clients (OpenRouter, Gemini, Mock, Fallback), DB, routes
│   └── tests/                # 380 tests (unit, integration, e2e scenarios)
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (chat, previews, editor)
│   │   ├── hooks/            # useInterview hook
│   │   └── api/              # Backend API client
│   └── tests/                # 24 tests
├── .env.example              # Environment template
└── ARCHITECTURE.md           # Detailed architecture doc
```

## Environment Variables

| Variable              | Description                                | Default            |
| --------------------- | ------------------------------------------ | ------------------ |
| `PORT`                | Backend server port                        | `3000`             |
| `NODE_ENV`            | `development` / `production` / `test`      | `development`      |
| `LLM_PROVIDER`        | `openrouter` or `gemini` or `mock`         | `mock`             |
| `OPENROUTER_BASE_URL` | OpenAI-compatible base URL (or local gateway like OmniRoute) | `https://openrouter.ai/api/v1` |
| `OPENROUTER_API_KEY`  | Your OpenRouter / gateway API key          | —                  |
| `OPENROUTER_MODEL`    | Model to use (free tier: `openrouter/free`) | `openrouter/free` |
| `GEMINI_API_KEY`      | Your Gemini API key                        | —                  |
| `GEMINI_MODEL`        | Gemini model to use                        | `gemini-1.5-flash` |
| `LLM_TIMEOUT_MS`      | Request timeout for LLM calls (ms)         | `60000`            |
| `ENABLE_LLM_FALLBACK` | Auto-switch to MockLLM on provider failure | `true` (dev)       |
| `DATABASE_PATH`       | Path to SQLite database file               | `./dev.sqlite`     |

## About the Fallback System

An optional `ENABLE_LLM_FALLBACK` flag lets the app switch to MockLLM if the primary provider fails
(timeout, outage, quota). When enabled, failed requests are converted into deterministic mock
responses so the interview can continue without errors. When disabled, a provider failure surfaces as
a clear, safe error with **no state mutation**.

> **Note for the Wenup team:** in this submission, `.env` has `ENABLE_LLM_FALLBACK=false`, so the
> app never substitutes fabricated mock data if the LLM provider fails — it fails safely instead.

MockLLM is deterministic: zero network calls, zero randomness, canned responses designed for tests
and local development.

## What Could Be Better

- **Streaming responses** — right now it waits for the full LLM response before showing anything. Streaming would feel faster.
- **Auth** — sessions are UUIDs and aren't yet restored across page reloads. Real auth would let users resume across devices.
- **Better database** — SQLite works fine for dev but Postgres would be needed for production.
- **PDF export** — people probably want to print or share their document.
- **Retry with backoff** — the fallback handles quota errors, but a proper retry strategy with exponential backoff would be more robust.

---

Made with ☕ and too many late nights.
