# WenupAI — Document Intake Assistant

A web app that interviews users through a conversational UI to collect their personal wishes (name, address, executor, children, gifts, etc.) and automatically generates a draft Personal Wishes Document.

Built with **React + Vite** on the frontend and **Express + TypeScript** on the backend. Uses **Google Gemini** as the LLM provider, with an automatic fallback to a mock LLM when the free-tier quota runs out.

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
| Backend  | Express, TypeScript, Zod, SQLite                 |
| LLM      | Google Gemini (with MockLLM fallback)            |
| Testing  | Vitest                                           |

## Prerequisites

- **Node.js** v20+ (tested on v22)
- **npm** v10+
- A **Gemini API key** (free tier works — get one at [aistudio.google.com](https://aistudio.google.com))

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

   # LLM — set to "gemini" to use Gemini, or "mock" to skip the API entirely
   LLM_PROVIDER=gemini
   LLM_TIMEOUT_MS=15000

   # Gemini
   GEMINI_API_KEY=your_api_key_here
   GEMINI_MODEL=gemini-2.0-flash

   # Auto-fallback to MockLLM when Gemini quota is exhausted (true/false)
   ENABLE_LLM_FALLBACK=true

   # Database
   DATABASE_PATH=./dev.sqlite
   ```

   > **Tip:** If you don't have a Gemini key yet, set `LLM_PROVIDER=mock` and the app will work with deterministic mock responses — no API key needed.

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
npm --prefix backend run test     # 348 tests
npm --prefix frontend run test    # 23 tests
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
│   │   └── infrastructure/   # LLM clients (Gemini, Mock, Fallback), DB, routes
│   └── tests/                # 348 tests (unit, integration, e2e scenarios)
├── frontend/
│   ├── src/
│   │   ├── components/       # UI components (chat, previews, editor)
│   │   ├── hooks/            # useInterview hook
│   │   └── api/              # Backend API client
│   └── tests/                # 23 tests
├── .env.example              # Environment template
└── ARCHITECTURE.md           # Detailed architecture doc
```

## Environment Variables

| Variable              | Description                                | Default            |
| --------------------- | ------------------------------------------ | ------------------ |
| `PORT`                | Backend server port                        | `3000`             |
| `NODE_ENV`            | `development` / `production` / `test`      | `development`      |
| `LLM_PROVIDER`        | `gemini` or `mock`                         | `mock`             |
| `GEMINI_API_KEY`      | Your Gemini API key                        | —                  |
| `GEMINI_MODEL`        | Gemini model to use                        | `gemini-2.0-flash` |
| `LLM_TIMEOUT_MS`      | Request timeout for LLM calls (ms)         | `15000`            |
| `ENABLE_LLM_FALLBACK` | Auto-switch to MockLLM on quota exhaustion | `true`             |
| `DATABASE_PATH`       | Path to SQLite database file               | `./dev.sqlite`     |

## About the Fallback System

When using the Gemini free tier, the API quota can run out pretty fast. Instead of crashing, the app automatically detects quota errors (HTTP 429) and switches to MockLLM so the interview can continue. When the quota resets, it goes right back to using Gemini — no restart needed.

The UI shows a small note when this happens so the user knows.

## What Could Be Better

- **Streaming responses** — right now it waits for the full LLM response before showing anything. Streaming would feel faster.
- **Auth** — sessions are just UUIDs in localStorage. Real auth would let users resume across devices.
- **Better database** — SQLite works fine for dev but Postgres would be needed for production.
- **PDF export** — people probably want to print or share their document.
- **Retry with backoff** — the fallback handles quota errors, but a proper retry strategy with exponential backoff would be more robust.

---

Made with ☕ and too many late nights.
