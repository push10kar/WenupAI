# Document Intake Assistant — Architecture

> **Engineering Candidate Technical Test — LLM Application — September 2026**

---

## Table of Contents

1. [Overview](#1-overview)
2. [Formal Requirements](#2-formal-requirements)
3. [Scope and Priorities](#3-scope-and-priorities)
4. [Architecture Principles](#4-architecture-principles)
5. [Domain Model and State Schema](#5-domain-model-and-state-schema)
6. [State Machine and Ambiguity Rules](#6-state-machine-and-ambiguity-rules)
7. [LLM Input/Output Contract](#7-llm-inputoutput-contract)
8. [Validation Pipeline](#8-validation-pipeline)
9. [Backend API Architecture](#9-backend-api-architecture)
10. [Persistence and Database Design](#10-persistence-and-database-design)
11. [React UI Architecture](#11-react-ui-architecture)
12. [Document Generation](#12-document-generation)
13. [Test Strategy](#13-test-strategy)
14. [Failure Modes and Error Handling](#14-failure-modes-and-error-handling)
15. [End-to-End Request Flow](#15-end-to-end-request-flow)
16. [Implementation Plan](#16-implementation-plan)
17. [Non-Goals and Deferred Work](#17-non-goals-and-deferred-work)
18. [Architectural Invariants](#18-architectural-invariants)
19. [Production Considerations](#19-production-considerations)

---

# 1. Overview

## 1.1 Problem

The Document Intake Assistant is a small conversational web application that conducts an interview with a user, extracts relevant information from the conversation, maintains structured information as authoritative application state, and produces a draft Personal Wishes Document from the collected information.

The fictional document contains information such as:

- Full name
- Home address
- Whether the document covers worldwide assets
- Whether the user has children
- Children's names when applicable
- Executor name
- Executor relationship
- Specific gifts
- Additional wishes

The assessment is primarily evaluating reliable LLM application design, state management, ambiguity handling, validation, and conventional software engineering combined with generative AI.

---

## 1.2 Core Architectural Idea

The most important design decision in this application is the separation between:

```text
Conversation
     ≠
Authoritative Domain State
     ≠
Generated Document
```

The system has three distinct representations:

### Conversation

Contains what the user and assistant have said.

Used for:

- conversational context
- UI rendering
- LLM context
- audit/debugging

The conversation is **not** the authoritative source of structured information.

### Domain State

Contains validated, structured information collected during the interview.

This is the **single source of truth** for the application.

### Document

A deterministic projection generated from the current domain state.

The document is **derived**, not authoritative.

Therefore:

```text
Conversation
     ↓
LLM extraction
     ↓
Candidate updates
     ↓
Validation
     ↓
State transition
     ↓
AUTHORITATIVE DOMAIN STATE
     ↓
Deterministic document
```

---

## 1.3 System Boundary

### In Scope

The system is responsible for:

- conducting a multi-turn interview
- maintaining conversation history
- extracting structured candidate information
- validating LLM output
- handling missing information
- handling ambiguity
- handling contradictions
- handling corrections
- maintaining structured domain state
- determining unresolved information
- generating assistant responses
- generating a draft Personal Wishes Document
- providing live state/document previews
- persisting sessions
- handling model and application failures
- automated testing

### Out of Scope

The system is not intended to:

- create a legally valid will
- provide legal advice
- determine legal consequences
- verify legal identities
- verify physical addresses
- provide legal document certification
- infer information not supplied by the user
- act as a legal professional

The generated document must therefore be clearly labeled:

> **Fictional example — Not legal advice**

---

# 2. Formal Requirements

The requirements below are derived from the technical assessment and form the implementation contract.

---

## 2.1 Functional Requirements

### FR-01 — Create Interview Session

The system shall allow a user to start a new interview session.

A session contains:

- unique session ID
- conversation history
- structured domain state
- generated document projection

---

### FR-02 — Multi-Turn Conversation

The system shall support a multi-turn conversation between the user and assistant.

Conversation history shall be maintained separately from authoritative domain state.

---

### FR-03 — Collect Required Information

The system shall collect:

- full name
- home address
- worldwide asset coverage
- children status
- child names when applicable
- executor name
- executor relationship
- specific gifts
- additional wishes

---

### FR-04 — Conditional Child Information

If the user confirms that they have children, the system shall collect children's names.

If the user confirms that they do not have children, child names should not be requested.

---

### FR-05 — Multiple Fields Per Message

A single user response may provide information for multiple fields.

The system shall process all relevant fields rather than assuming one field per message.

Example:

> "I'm Jane Smith, I live at 42 Park Street, and my brother James will be my executor."

May update:

```text
fullName
homeAddress
executor.name
executor.relationship
```

---

### FR-06 — Missing Information

If required information is missing, the system shall request the missing information.

The system must not invent missing facts.

---

### FR-07 — Ambiguous Information

If information is ambiguous, the system shall not silently choose an interpretation.

The information remains unresolved and the assistant requests clarification.

---

### FR-08 — Contradictory Information

If new information conflicts with confirmed state, the system shall detect the conflict and request clarification.

---

### FR-09 — Avoid Repeated Questions

The assistant shall not repeatedly ask for information that is already confirmed unless:

- the user corrects it
- new information creates a contradiction
- the existing information becomes invalid/unresolved

---

### FR-10 — Structured State as Source of Truth

The application shall maintain explicit structured state.

Conversation history alone shall not be treated as the source of truth.

---

### FR-11 — Validate LLM Output

LLM output shall be validated before being applied to domain state.

Malformed or invalid model output shall never directly mutate state.

---

### FR-12 — Corrections

Users shall be able to correct previously supplied information conversationally.

Example:

> "Actually, I moved. My address is now 42 Park Street."

The application should update the corresponding confirmed state after validation.

---

### FR-13 — Live State Preview

The UI shall show the current structured information collected during the conversation.

---

### FR-14 — Document Generation

The system shall generate a draft Personal Wishes Document from structured state.

The document shall not be generated from conversation history.

---

### FR-15 — Document Synchronization

The document preview shall represent the latest confirmed domain state.

---

### FR-16 — Legal Disclaimer

The generated document shall clearly state:

> **Fictional example — Not legal advice**

---

### FR-17 — LLM Error Handling

The system shall gracefully handle:

- timeouts
- network failures
- rate limits
- provider failures
- authentication/configuration failures

---

### FR-18 — Malformed Model Responses

Malformed or schema-invalid LLM responses shall be rejected safely.

---

### FR-19 — Missing Configuration

Missing model configuration shall result in a clear configuration error.

A deterministic mock provider shall be available for local development and testing.

---

### FR-20 — API Contract

The backend shall expose a defined API contract between the React frontend and application layer.

---

### FR-21 — Separation of Concerns

The application shall maintain separation between:

- UI
- application logic
- domain/state logic
- LLM interaction
- persistence
- document generation

---

### FR-22 — Automated Tests

The application shall contain meaningful automated tests covering:

- valid model responses
- ambiguous responses
- malformed responses
- state updates
- corrections
- validation
- conflicts
- failures
- document generation

---

### FR-23 — Local Setup

The application shall provide straightforward local setup instructions.

Secrets shall not be committed to source control.

---

# 3. Scope and Priorities

Because this is a time-boxed technical assessment, implementation priority is explicit.

---

## 3.1 P0 — Required

```text
Conversational interview
Structured state
State machine
Ambiguity handling
Validation
LLM abstraction
Mock LLM
Real LLM provider
SQLite persistence
Backend API
React UI
Live state preview
Document preview
Error handling
Automated tests
README
AI log
```

---

## 3.2 P1 — Useful Polish

Only after P0 works:

```text
Loading states
Empty states
Better error UX
Responsive UI
New session button
Improved document formatting
Additional fixtures
Architecture documentation
```

---

## 3.3 P2 — Deferred

Only if the entire P0/P1 system is already stable:

```text
PDF download
Authentication
Multiple LLM providers
Streaming
Advanced animations
RAG
Vector database
Agent workflows
Advanced analytics
Production deployment infrastructure
```

These features are deliberately deferred because the assessment emphasizes sound engineering judgment rather than the number of features implemented.

---

# 4. Architecture Principles

## Principle 1 — Conversation Is Not Truth

Conversation history provides context but does not directly determine the document.

---

## Principle 2 — LLM Output Is Untrusted

The LLM is an interpretation component.

It proposes candidate updates.

The application decides whether those updates are valid.

---

## Principle 3 — Application Owns State

The LLM does not own:

- domain state
- state transitions
- next-question logic
- conflict resolution
- document generation

---

## Principle 4 — Validate Before Mutation

No candidate update may mutate authoritative state before passing validation.

---

## Principle 5 — Deterministic Document Generation

The document generator is a pure function over structured state.

No LLM is required for document generation.

---

## Principle 6 — Explicit Unknowns

Unknown information must remain unknown.

```text
UNKNOWN ≠ false
UNKNOWN ≠ empty string
UNKNOWN ≠ inferred value
```

---

## Principle 7 — Smallest Reliable Architecture

Use the simplest architecture capable of satisfying the requirements.

Avoid introducing infrastructure that does not directly improve assessment requirements.

---

# 5. Domain Model and State Schema

## 5.1 Domain Model

```text
PersonalWishesState
├── fullName
├── homeAddress
├── coversWorldwideAssets
├── hasChildren
├── children[]
├── executor
│   ├── name
│   └── relationship
├── specificGifts[]
└── additionalWishes
```

---

## 5.2 Field Status

Every scalar field has an explicit status:

```typescript
type FieldStatus = "UNKNOWN" | "UNCONFIRMED" | "CONFIRMED" | "CONFLICTED";
```

### UNKNOWN

No usable information has been collected.

```text
value = null
status = UNKNOWN
```

---

### UNCONFIRMED

A candidate value exists, but its meaning or correctness has not been sufficiently established.

Typically caused by ambiguity or incomplete information.

---

### CONFIRMED

The value has passed validation and is sufficiently clear to be treated as authoritative.

"Confirmed" does not necessarily mean that the user clicked a confirmation button.

A clear statement can become confirmed after validation.

---

### CONFLICTED

Existing state conflicts with newly supplied information and the application cannot safely choose between the values.

The system must request clarification.

---

## 5.3 Core Types

```typescript
type FieldStatus = "UNKNOWN" | "UNCONFIRMED" | "CONFIRMED" | "CONFLICTED";

type Field<T> = {
  value: T | null;
  status: FieldStatus;
};

type Executor = {
  name: Field<string>;
  relationship: Field<string>;
};

type PersonalWishesState = {
  fullName: Field<string>;
  homeAddress: Field<string>;
  coversWorldwideAssets: Field<boolean>;
  hasChildren: Field<boolean>;
  children: Field<string>[];
  executor: Executor;
  specificGifts: Field<string>[];
  additionalWishes: Field<string>;
};
```

---

## 5.4 Initial State

```typescript
createInitialState();
```

returns:

```text
fullName:
  value: null
  status: UNKNOWN

homeAddress:
  value: null
  status: UNKNOWN

coversWorldwideAssets:
  value: null
  status: UNKNOWN

hasChildren:
  value: null
  status: UNKNOWN

children:
  []

executor.name:
  value: null
  status: UNKNOWN

executor.relationship:
  value: null
  status: UNKNOWN

specificGifts:
  []

additionalWishes:
  value: null
  status: UNKNOWN
```

---

## 5.5 Conversation Model

Conversation is represented separately:

```typescript
type MessageRole = "user" | "assistant";

type Message = {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
};
```

The domain state does not contain arbitrary conversational information.

For example, fields such as:

```text
assistantMood
conversationTopic
lastLLMThought
```

do not belong in `PersonalWishesState`.

---

## 5.6 State Invariants

### Invariant 1

`UNKNOWN` must never be treated as a confirmed value.

### Invariant 2

Only validated state may be committed.

### Invariant 3

`hasChildren` controls whether child names are relevant.

### Invariant 4

Conflicted values cannot silently become confirmed.

### Invariant 5

Document generation never reads conversation history.

### Invariant 6

LLM output never directly writes to persistence.

### Invariant 7

The application, not the LLM, controls state transitions.

---

# 6. State Machine and Ambiguity Rules

## 6.1 State Transitions

The practical field lifecycle is:

```text
                    clear candidate
UNKNOWN ───────────────────────────────→ CONFIRMED
   │
   │ ambiguous
   ▼
UNCONFIRMED ───── clarification ───────→ CONFIRMED


CONFIRMED ───── explicit correction ───→ CONFIRMED
                                      (new value)


CONFIRMED ───── contradiction ─────────→ CONFLICTED
                                             │
                                             │ clarification
                                             ▼
                                         CONFIRMED
```

---

## 6.2 Information Categories

Each user message can contain:

### New Information

A field previously unknown receives valid information.

### Correction

The user explicitly changes previously confirmed information.

### Clarification

The user resolves previously ambiguous or conflicted information.

One message may contain several categories simultaneously.

---

## 6.3 Ambiguity Taxonomy

### Missing

No relevant information was supplied.

Example:

> "I don't know."

Result:

```text
UNKNOWN
```

---

### Incomplete

Only part of a required concept is supplied.

Example:

> "My brother..."

Relationship may be known, but executor name is missing.

---

### Ambiguous

Multiple interpretations are possible.

Example:

> "Everything I own should be covered."

This should not automatically become:

```text
coversWorldwideAssets = true
```

The assistant should clarify what "covered" means in the context of worldwide assets.

---

### Contradictory

New information conflicts with confirmed state.

Example:

```text
Existing:
hasChildren = false
```

Then:

> "My daughter Sarah..."

This requires clarification.

---

## 6.4 Ambiguity Rules

1. Never invent missing information.
2. Missing fields remain `UNKNOWN`.
3. Clear statements can become `CONFIRMED` after validation.
4. Ambiguous values become `UNCONFIRMED`.
5. Contradictions become `CONFLICTED`.
6. Explicit corrections replace previous values after validation.
7. Multiple fields in one message must be processed together.
8. The application determines unresolved fields.
9. The LLM does not control workflow state.
10. Confirmed fields should not be repeatedly requested.
11. Invalid LLM output cannot mutate state.

---

## 6.5 Question Selection

The next question is determined by deterministic application logic.

The LLM may generate the wording of a question, but does not decide which field is unresolved.

Suggested priority:

```text
1. fullName
2. homeAddress
3. coversWorldwideAssets
4. hasChildren
5. children (when hasChildren = true)
6. executor.name
7. executor.relationship
8. specificGifts
9. additionalWishes
10. completion
```

This is not a rigid conversation script.

If the user supplies information out of order, the application processes it and skips already-confirmed fields.

---

# 7. LLM Input/Output Contract

## 7.1 Core Principle

> **The LLM does not return authoritative state. It returns candidate proposals for state changes.**

This prevents the model from becoming the source of truth.

---

## 7.2 LLM Responsibilities

The LLM is responsible for:

- understanding natural language
- extracting explicit information
- identifying ambiguity
- interpreting corrections
- producing natural-language assistant responses

The LLM is not responsible for:

- persistence
- state ownership
- state transitions
- conflict resolution
- deciding authoritative values
- document generation

---

## 7.3 Extraction Input

```typescript
type LLMExtractionInput = {
  currentState: PersonalWishesState;
  conversation: Message[];
  latestUserMessage: string;
};
```

The current state provides context, while the latest message is the primary new input.

---

## 7.4 Allowed Fields

LLM output may only reference:

```text
fullName
homeAddress
coversWorldwideAssets
hasChildren
children
executor.name
executor.relationship
specificGifts
additionalWishes
```

Unknown fields are rejected.

---

## 7.5 Candidate Update

```typescript
type UpdateIntent = "NEW" | "CORRECTION" | "CLARIFICATION";

type CandidateUpdate = {
  field: AllowedField;
  value: unknown;
  intent: UpdateIntent;
  confidence: "CLEAR" | "AMBIGUOUS";
};
```

`value` intentionally uses `unknown`.

The model output is untrusted runtime data and must be validated before entering the domain model.

---

## 7.6 Extraction Result

```typescript
type LLMExtractionResult = {
  updates: CandidateUpdate[];
};
```

---

## 7.7 Example

User:

> "My brother James will be my executor."

LLM may return:

```json
{
  "updates": [
    {
      "field": "executor.name",
      "value": "James",
      "intent": "NEW",
      "confidence": "CLEAR"
    },
    {
      "field": "executor.relationship",
      "value": "brother",
      "intent": "NEW",
      "confidence": "CLEAR"
    }
  ]
}
```

The LLM must not infer:

```text
James's full legal name
James's address
James's age
```

---

## 7.8 Provider Interface

```typescript
interface LLMClient {
  extractUpdates(input: LLMExtractionInput): Promise<LLMExtractionResult>;

  generateResponse(input: ResponseGenerationInput): Promise<string>;
}
```

Implementation:

```text
Application
     ↓
LLMClient interface
     ↓
┌──────────────┬──────────────┐
│              │              │
MockLLM     RealLLMClient   Future provider
```

The application remains independent of the specific LLM provider.

---

## 7.9 Separation of Extraction and Response Generation

Conceptually:

```text
extractUpdates()
generateResponse()
```

are separate responsibilities.

The provider may internally use the same model, but the application should treat them as different operations.

The extraction operation produces structured candidates.

The response operation produces natural language.

---

# 8. Validation Pipeline

## 8.1 Principle

> **If validation fails, authoritative domain state remains untouched.**

---

## 8.2 Pipeline

```text
Raw LLM Response
       ↓
1. Parse
       ↓
2. Schema Validation
       ↓
3. Field/Type Validation
       ↓
4. Semantic Validation
       ↓
5. State Consistency Validation
       ↓
6. State Transition
       ↓
7. Atomic Commit
```

---

## 8.3 Stage 1 — Parse

The raw provider response must be valid JSON where structured output is expected.

Malformed JSON:

```text
REJECT
```

No state mutation occurs.

---

## 8.4 Stage 2 — Schema Validation

The parsed object must conform to:

```text
LLMExtractionResult
```

Invalid shape is rejected.

---

## 8.5 Stage 3 — Field and Type Validation

The field must belong to the allowlist.

Expected types must match.

Examples:

```text
hasChildren → boolean
coversWorldwideAssets → boolean
fullName → string
homeAddress → string
children → string[]
```

The system must not perform unsafe coercion such as:

```text
"probably" → true
```

---

## 8.6 Stage 4 — Semantic Validation

Values must be meaningful.

Examples:

```text
fullName = ""        → invalid
homeAddress = ""    → invalid
executor.name = ""  → invalid
```

Semantic validation should remain appropriate to the assessment scope.

For example, the application does not need to verify that an address physically exists.

---

## 8.7 Stage 5 — State Consistency Validation

Candidate updates are evaluated against existing state.

Example:

```text
Current:
hasChildren = CONFIRMED(false)

Candidate:
children = ["Sarah"]
```

This is inconsistent and requires conflict handling.

---

## 8.8 Stage 6 — State Transition

Once a candidate is valid, the state engine determines whether it represents:

```text
NEW
CORRECTION
CLARIFICATION
CONFLICT
```

The application owns this decision.

---

## 8.9 Stage 7 — Atomic Commit

Build a candidate next state first.

Validate the complete candidate state.

Only then replace the current state.

Conceptually:

```text
currentState
     ↓
candidateState
     ↓
validate
     ↓
valid?
  /     \
yes      no
 |        |
commit   reject
```

Related dependent updates should be committed together.

---

## 8.10 Validation Error Model

```typescript
type ValidationErrorCode =
  | "MALFORMED_JSON"
  | "INVALID_RESPONSE_SCHEMA"
  | "UNKNOWN_FIELD"
  | "INVALID_VALUE_TYPE"
  | "INVALID_VALUE"
  | "AMBIGUOUS_VALUE"
  | "STATE_CONFLICT"
  | "INVALID_STATE_TRANSITION";

type ValidationError = {
  code: ValidationErrorCode;
  message: string;
  field?: string;
};
```

Internal validation errors should not be exposed directly to users.

---

# 9. Backend API Architecture

## 9.1 Principle

The frontend communicates with the application through a small API.

The frontend does not own interview logic.

---

## 9.2 API Endpoints

### Create Session

```http
POST /api/sessions
```

Creates a new interview session.

---

### Get Session

```http
GET /api/sessions/:id
```

Returns the complete current session snapshot.

---

### Send Message

```http
POST /api/sessions/:id/messages
```

Request:

```typescript
type SendMessageRequest = {
  content: string;
};
```

---

## 9.3 Session Response

```typescript
type SendMessageResponse = {
  session: {
    id: string;
    state: PersonalWishesState;
    messages: Message[];
    document: DocumentPreview;
  };
  assistantMessage: Message;
};
```

---

## 9.4 API Error Contract

```typescript
type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
```

Suggested HTTP semantics:

```text
400 → invalid request
404 → session not found
503 → LLM unavailable
500 → unexpected server error
```

---

## 9.5 Thin Routes

Routes should remain thin.

Example:

```text
POST /sessions/:id/messages
           ↓
InterviewService.processMessage()
```

The route should not contain:

- extraction logic
- state transition logic
- document generation logic
- database implementation details

---

## 9.6 Interview Service

The application orchestration layer contains:

```text
InterviewService
├── LLMClient
├── StateValidator
├── StateTransitionEngine
├── QuestionSelector
├── DocumentGenerator
└── SessionRepository
```

Conceptually:

```text
HTTP Request
     ↓
InterviewService
     ↓
Load session
     ↓
Append user message
     ↓
Extract candidates
     ↓
Validate
     ↓
Transition state
     ↓
Select unresolved field
     ↓
Generate assistant response
     ↓
Generate document
     ↓
Persist
     ↓
Return session snapshot
```

---

# 10. Persistence and Database Design

## 10.1 Source-of-Truth Hierarchy

```text
DOMAIN STATE
     ↑
authoritative

CONVERSATION
     ↑
context/audit

DOCUMENT
     ↑
derived projection
```

---

## 10.2 Database Choice

SQLite is preferred for the assessment because:

- minimal setup
- no external database service
- relational structure fits the domain
- easy local development
- sufficient for a small assessment application

The repository abstraction allows a different database to be introduced later without changing the domain layer.

---

## 10.3 Tables

### sessions

```sql
CREATE TABLE sessions (
    id TEXT PRIMARY KEY,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### messages

```sql
CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

### session_state

```sql
CREATE TABLE session_state (
    session_id TEXT PRIMARY KEY,
    state_json TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
);
```

---

## 10.4 Why Store State as JSON?

The domain model is already explicitly structured.

Using JSON in the persistence layer avoids unnecessarily creating separate database columns for every domain field while retaining a strongly defined application schema.

This is:

```text
structured domain model
+
JSON persistence representation
```

not:

```text
unstructured application state
```

---

## 10.5 Repository Interface

```typescript
interface SessionRepository {
  createSession(): Promise<Session>;

  getSession(sessionId: string): Promise<Session | null>;

  getMessages(sessionId: string): Promise<Message[]>;

  addMessage(sessionId: string, message: Message): Promise<void>;

  getState(sessionId: string): Promise<PersonalWishesState>;

  updateState(sessionId: string, state: PersonalWishesState): Promise<void>;
}
```

The application layer depends on this abstraction rather than directly depending on SQLite.

---

## 10.6 Transaction Strategy

Successful message processing should persist related changes transactionally where practical:

```text
BEGIN

save user message
save updated domain state
save assistant message

COMMIT
```

If a required operation fails:

```text
ROLLBACK
```

The application must never claim successful persistence when persistence actually failed.

---

## 10.7 LLM Failure and Persistence

A user's message may be preserved in conversation history even when an LLM request fails.

For example:

```text
Conversation:
"My name is Jane Smith."

Domain state:
fullName = UNKNOWN
```

This is valid because:

```text
conversation ≠ domain state
```

The message has been observed, but it has not been successfully converted into authoritative structured state.

---

## 10.8 Document Persistence

The generated document should not be stored as an independent source of truth.

Instead:

```typescript
generateDocument(state);
```

produces the current projection.

This prevents stale document/state divergence.

---

# 11. React UI Architecture

## 11.1 Principle

React is a rendering and interaction layer over the backend session.

It is not a second implementation of the domain state machine.

---

## 11.2 Main Layout

Desktop:

```text
┌──────────────────────────────────────────────────────────┐
│ Header                                                   │
├────────────────────────┬─────────────────────────────────┤
│                        │                                 │
│ Conversation           │ Information                     │
│                        │                                 │
│ Message list           │ Structured State                │
│                        │                                 │
│                        │ Document Preview                 │
│                        │                                 │
│ Input                  │                                 │
└────────────────────────┴─────────────────────────────────┘
```

Mobile:

```text
Header
   ↓
Conversation
   ↓
Structured State
   ↓
Document Preview
```

---

## 11.3 Component Tree

```text
App
└── InterviewPage
    ├── Header
    │   ├── Logo / Title
    │   └── NewSessionButton
    │
    ├── InterviewLayout
    │   ├── ConversationPanel
    │   │   ├── MessageList
    │   │   │   └── MessageBubble
    │   │   └── MessageComposer
    │   │
    │   └── InformationPanel
    │       ├── StatePreview
    │       │   ├── PersonalInfoSection
    │       │   ├── ChildrenSection
    │       │   ├── ExecutorSection
    │       │   └── WishesSection
    │       │
    │       └── DocumentPreview
    │
    └── ErrorBanner
```

---

## 11.4 Frontend Session Model

```typescript
type Session = {
  id: string;
  messages: Message[];
  state: PersonalWishesState;
  document: DocumentPreview;
};
```

UI-only state:

```text
input
isSending
error
```

The frontend should not create separate domain state for:

```text
fullName
homeAddress
hasChildren
executor
```

The backend session is the source used for rendering.

---

## 11.5 API Client

```text
src/api/sessionApi.ts

createSession()
getSession(sessionId)
sendMessage(sessionId, content)
```

The UI interacts with the backend through this abstraction.

---

## 11.6 Interview Hook

```typescript
useInterview();
```

may expose:

```typescript
const {
  session,
  input,
  setInput,
  sendMessage,
  startNewSession,
  isLoading,
  error,
} = useInterview();
```

The hook manages UI interaction, not domain rules.

---

## 11.7 State Display

Internal statuses should be translated into user-friendly language.

```text
UNKNOWN
→ Not provided

UNCONFIRMED
→ Needs clarification

CONFLICTED
→ Needs clarification

CONFIRMED
→ Confirmed
```

Engineering terminology should not unnecessarily leak into the user experience.

---

## 11.8 Corrections

Corrections should primarily happen conversationally.

Example:

> "Actually, I moved. My address is now 42 Park Street."

A direct field editor is intentionally not required for P0 because it introduces another synchronization path between UI state and backend state.

---

## 11.9 Document Preview

The preview should clearly display:

```text
Draft Personal Wishes Document

Fictional example — Not legal advice
```

---

## 11.10 Frontend Responsibilities

React SHOULD:

- collect user input
- send API requests
- render messages
- render structured state
- render document
- display loading states
- display errors
- start new sessions

React MUST NOT:

- call the LLM directly
- parse LLM extraction responses
- determine ambiguity
- determine state transitions
- determine authoritative state
- decide next questions
- generate the authoritative document
- treat conversation as structured truth

---

# 12. Document Generation

## 12.1 Principle

> **The document generator is a deterministic renderer of structured state, not an LLM feature.**

---

## 12.2 Input

```typescript
function generateDocument(state: PersonalWishesState): DocumentPreview;
```

The generator accepts only structured state.

It does not accept:

```text
conversation
raw user input
LLM output
database connection
HTTP request
```

---

## 12.3 Output

```typescript
type DocumentPreview = {
  status: "draft";
  content: string;
};
```

---

## 12.4 Document Structure

The document contains:

```text
PERSONAL WISHES DOCUMENT

Fictional example — Not legal advice

1. Full Name
2. Home Address
3. Worldwide Asset Coverage
4. Children
5. Executor
6. Specific Gifts
7. Additional Wishes
```

---

## 12.5 State Rendering Rules

### Confirmed

Render the value as fact.

### Unknown

Render:

```text
Not provided
```

### Unconfirmed

Render:

```text
Needs clarification
```

### Conflicted

Render:

```text
Needs clarification
```

Do not select one conflicting value.

---

## 12.6 Children Rules

```text
hasChildren = CONFIRMED(false)
```

→

```text
Children: No
```

```text
hasChildren = CONFIRMED(true)
```

→ render confirmed child names.

```text
hasChildren = UNKNOWN
```

→

```text
Children: Not provided
```

Do not interpret unknown as false.

---

## 12.7 Executor Rules

Executor fields may be independently resolved.

Example:

```text
Name: James
Relationship: Needs clarification
```

is preferable to inventing or hiding the unresolved relationship.

---

## 12.8 Specific Gifts

Confirmed specific gifts are rendered as a list.

If none are supplied:

```text
None provided
```

---

## 12.9 Additional Wishes

Additional wishes should be represented as supplied.

The generator should not creatively rewrite or reinterpret their meaning.

---

## 12.10 Determinism

For identical state:

```text
generateDocument(state)
```

must produce identical output.

The generator must contain:

```text
No LLM
No randomness
No network calls
No database access
No global mutable state
```

---

## 12.11 Document Invariants

1. Document generation reads only structured state.
2. Document generation does not modify state.
3. Document generation does not call the LLM.
4. Document generation does not infer missing information.
5. Unresolved information is represented honestly.
6. The document is a projection of the latest authoritative state.

---

# 13. Test Strategy

## 13.1 Testing Principle

Testing focuses on reliability boundaries rather than subjective chatbot quality.

The primary invariant is:

> **Untrusted LLM output must never directly corrupt authoritative domain state.**

---

## 13.2 Test Layers

### Unit Tests

Test:

- state creation
- validation
- state transitions
- ambiguity
- conflict detection
- question selection
- document generation

### LLM Contract Tests

Test:

- valid responses
- multiple-field responses
- ambiguous responses
- malformed JSON
- invalid schemas
- unknown fields
- wrong types

### Integration Tests

Test:

- session creation
- session retrieval
- message submission
- persistence
- LLM failure handling
- API errors

---

## 13.3 State Transition Tests

Must cover:

```text
UNKNOWN → CONFIRMED
UNKNOWN → UNCONFIRMED
CONFIRMED → CONFIRMED correction
CONFIRMED → CONFLICTED
CONFLICTED → CONFIRMED
```

---

## 13.4 Multiple Field Test

Input:

> "I'm Jane Smith, I live at 42 Park Street, and my brother James will be my executor."

Expected:

```text
fullName = Jane Smith
homeAddress = 42 Park Street
executor.name = James
executor.relationship = brother
```

All clear values should become confirmed.

The application should not subsequently ask for already-confirmed fields.

---

## 13.5 No Mutation on Failure

Given:

```text
stateBefore
```

and malformed or invalid LLM output:

```text
result = process(output)
```

assert:

```text
stateAfter === stateBefore
```

when processing fails before a valid state transition.

This test directly protects the primary reliability invariant.

---

## 13.6 Conditional Children Tests

Test:

```text
hasChildren = false
```

does not request child names.

Test:

```text
hasChildren = true
```

causes child names to become unresolved information.

Test:

```text
hasChildren = false
children = ["Sarah"]
```

produces a conflict.

---

## 13.7 Duplicate Information

Already confirmed information supplied again should not cause unnecessary state changes or clarification.

---

## 13.8 Document Tests

Test:

1. Complete state.
2. Missing fields.
3. Unknown values.
4. Unconfirmed values.
5. Conflicted values.
6. Children conditionality.
7. Executor partial information.
8. Deterministic output.

---

## 13.9 Failure Tests

Mock LLM behavior:

```text
success
ambiguous
malformed
timeout
unavailable
```

Verify:

```text
LLM failure
    ↓
safe error
    ↓
state preserved
```

---

## 13.10 Test Fixtures

Suggested structure:

```text
backend/
└── tests/
    ├── fixtures/
    │   ├── llm/
    │   │   ├── valid-single-field.json
    │   │   ├── valid-multiple-fields.json
    │   │   ├── ambiguous.json
    │   │   ├── malformed.json
    │   │   ├── unknown-field.json
    │   │   └── wrong-type.json
    │   │
    │   └── states/
    │       ├── initial.json
    │       ├── complete.json
    │       ├── has-children.json
    │       └── conflicted.json
    │
    ├── validation.test.ts
    ├── state-transition.test.ts
    ├── document-generator.test.ts
    └── interview.test.ts
```

---

# 14. Failure Modes and Error Handling

## 14.1 Failure Philosophy

The application assumes:

```text
Users can be unexpected.
LLMs can be wrong.
Providers can fail.
Networks can fail.
Databases can fail.
Configuration can be missing.
```

Every failure should therefore have defined behavior.

---

## 14.2 User/Input Failures

### Empty Message

```text
400 Bad Request
```

No LLM call.

No state mutation.

### Oversized Message

Reject with a safe validation error.

### "I Don't Know"

This is not an infrastructure error.

The system simply lacks sufficient information.

The corresponding field remains unresolved.

---

## 14.3 LLM Failures

Possible failures:

```text
timeout
network failure
rate limit
authentication failure
provider outage
unexpected provider error
```

Behavior:

```text
LLM failure
     ↓
state unchanged
     ↓
safe application error
```

Example:

```json
{
  "error": {
    "code": "LLM_UNAVAILABLE",
    "message": "The assistant is temporarily unavailable. Please try again."
  }
}
```

---

## 14.4 Malformed Output

Example:

```text
{ "updates": [
```

Behavior:

```text
parse failure
     ↓
reject
     ↓
state unchanged
```

---

## 14.5 Unknown Field

Example:

```json
{
  "field": "userAge",
  "value": 21
}
```

Reject because `userAge` is not part of the domain contract.

---

## 14.6 Wrong Type

Example:

```json
{
  "field": "hasChildren",
  "value": "probably"
}
```

Reject.

Do not coerce it into a boolean.

---

## 14.7 Ambiguous Information

Ambiguity is not necessarily an error.

```text
candidate
    ↓
AMBIGUOUS
    ↓
UNCONFIRMED
    ↓
clarification
```

---

## 14.8 Contradiction

```text
existing confirmed value
          +
new conflicting information
          ↓
       CONFLICTED
          ↓
     clarification
```

The system never silently selects one interpretation.

---

## 14.9 Database Failure

If database persistence fails:

```text
BEGIN
 ↓
operations
 ↓
failure
 ↓
ROLLBACK
```

The API returns a safe server error.

The user must not be told that data was saved if it was not.

---

## 14.10 Missing Configuration

For a real provider:

```text
LLM_PROVIDER=...
API_KEY=missing
```

should be detected during startup/configuration validation.

The application should fail clearly rather than producing an obscure runtime error.

A mock provider remains available for local development and testing.

---

## 14.11 Frontend Failure

If an API request fails:

- preserve the last valid session
- display a safe error
- allow retry
- do not clear conversation
- do not clear state
- do not clear document

---

## 14.12 Duplicate Requests

During message submission:

```text
isSending = true
```

The input/send control is disabled.

This prevents accidental duplicate submissions during the request lifecycle.

Production implementations could use idempotency keys/request IDs, but that is not required for the assessment.

---

## 14.13 Failure Matrix

| Failure                | Behavior                          | Domain State Mutation |
| ---------------------- | --------------------------------- | --------------------- |
| Empty message          | 400 validation error              | No                    |
| Oversized message      | 400 validation error              | No                    |
| LLM timeout            | Safe unavailable error            | No                    |
| Provider failure       | Safe application error            | No                    |
| Malformed JSON         | Reject response                   | No                    |
| Invalid schema         | Reject response                   | No                    |
| Unknown field          | Reject response                   | No                    |
| Wrong value type       | Reject response                   | No                    |
| Invalid value          | Reject response                   | No                    |
| Ambiguous value        | Request clarification             | No until clarified    |
| Contradiction          | Request clarification             | No until resolved     |
| Database failure       | Roll back failed transaction      | No partial commit     |
| Missing configuration  | Configuration error/mock fallback | No                    |
| Frontend network error | Preserve current session + retry  | No                    |
| Duplicate submission   | Disable active submission         | No                    |

---

# 15. End-to-End Request Flow

This section describes the complete system behavior for a normal user message.

---

## 15.1 High-Level Flow

```text
                         USER
                           │
                           │ message
                           ▼
                    ┌─────────────┐
                    │ React UI    │
                    └──────┬──────┘
                           │
                           │ POST /messages
                           ▼
                    ┌─────────────┐
                    │ API Route   │
                    └──────┬──────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │ InterviewService │
                  └────────┬─────────┘
                           │
                    load session
                           │
                           ▼
                  append user message
                           │
                           ▼
                     ┌──────────┐
                     │ LLMClient│
                     └────┬─────┘
                          │
                  candidate updates
                          │
                          ▼
                   ┌────────────┐
                   │ Validation │
                   └─────┬──────┘
                         │
                    valid?
                    /     \
                  no       yes
                  │         │
                  ▼         ▼
             reject     State Engine
                  │         │
                  │         ▼
                  │    updated state
                  │         │
                  │         ▼
                  │  Question Selector
                  │         │
                  │         ▼
                  │  Response Generation
                  │         │
                  │         ▼
                  │ Document Generator
                  │         │
                  │         ▼
                  │    Persistence
                  │         │
                  └────┬────┘
                       │
                       ▼
                  API Response
                       │
                       ▼
                   React UI
                       │
              ┌────────┴─────────┐
              ▼                  ▼
        State Preview      Document Preview
```

---

# 16. Implementation Plan

Implementation follows the architecture from the inside out.

The goal is to build the reliable core first and connect infrastructure afterward.

---

## Phase 1 — Project Foundation

Create:

```text
document-intake-assistant/
├── ARCHITECTURE.md
├── README.md
├── AI_LOG.md
├── .gitignore
├── backend/
└── frontend/
```

Backend:

```text
Node.js
TypeScript
Fastify
Zod
Vitest
SQLite
```

Frontend:

```text
React
TypeScript
Vite
```

---

## Phase 2 — Domain Foundation

Implement first:

```text
backend/src/domain/
├── state.ts
├── stateSchema.ts
```

Implement:

- `FieldStatus`
- `Field<T>`
- `Executor`
- `PersonalWishesState`
- `createInitialState()`
- runtime schemas

Write tests immediately.

---

## Phase 3 — State Engine

Implement:

```text
backend/src/domain/
├── validation.ts
├── transitions.ts
└── questions.ts
```

Implement:

- candidate update validation
- semantic validation
- state consistency checks
- new information
- corrections
- ambiguity
- conflicts
- question selection

Write unit tests before moving forward.

---

## Phase 4 — Document Generator

Implement:

```text
backend/src/domain/document.ts
```

Implement:

```typescript
generateDocument(state);
```

No LLM.

No database.

No HTTP.

No external dependencies.

Test deterministic output.

---

## Phase 5 — LLM Abstraction

Implement:

```text
backend/src/infrastructure/llm/
├── LLMClient.ts
├── MockLLM.ts
└── RealLLMClient.ts
```

Start with `MockLLM`.

Use deterministic fixtures.

Do not start development by depending on a real provider.

---

## Phase 6 — Interview Service

Implement:

```text
backend/src/application/
└── interviewService.ts
```

Orchestrate:

```text
Repository
   ↓
LLM
   ↓
Validation
   ↓
State Transition
   ↓
Question Selection
   ↓
Response Generation
   ↓
Document Generation
   ↓
Persistence
```

---

## Phase 7 — Persistence

Implement:

```text
backend/src/infrastructure/db/
├── database.ts
└── sessionRepository.ts
```

Create:

```text
sessions
messages
session_state
```

Add transactional persistence.

---

## Phase 8 — API

Implement:

```text
backend/src/api/
├── sessionRoutes.ts
└── errors.ts
```

Expose only:

```text
POST /api/sessions
GET /api/sessions/:id
POST /api/sessions/:id/messages
```

Add integration tests.

---

## Phase 9 — React UI

Implement:

```text
frontend/src/
├── components/
├── hooks/
├── api/
├── types/
├── utils/
├── App.tsx
└── main.tsx
```

Build:

```text
ConversationPanel
StatePreview
DocumentPreview
MessageComposer
ErrorBanner
Header
```

The frontend consumes backend session snapshots.

---

## Phase 10 — Real LLM

Replace:

```text
MockLLM
```

with the configured real provider implementation behind the same:

```typescript
LLMClient;
```

The rest of the application should remain unchanged.

---

## Phase 11 — Integration

Verify:

```text
Create session
      ↓
Ask initial question
      ↓
User responds
      ↓
LLM extracts
      ↓
Validation
      ↓
State transition
      ↓
Next question
      ↓
Document update
```

Then test:

```text
ambiguity
correction
contradiction
multiple fields
LLM failure
malformed output
database failure
```

---

## Phase 12 — Hardening

Before submission:

```text
Run tests
Run typecheck
Run production build
Test fresh clone setup
Check environment variables
Check .gitignore
Review API errors
Review malformed LLM handling
Review state invariants
Review document disclaimer
Review README
Review AI_LOG
```

---

# 17. Non-Goals and Deferred Work

The following are deliberately not required for the initial implementation:

## Authentication

Not required because the assessment focuses on LLM reliability and state.

---

## Authorization

Not required for a single-user local assessment application.

---

## RAG

No external knowledge retrieval is necessary.

The assistant operates on information provided by the user.

---

## Vector Database

No semantic document retrieval requirement exists.

---

## Agent Framework

The application does not require autonomous multi-step tool use.

A deterministic application workflow is more appropriate.

---

## PDF Generation

The initial document representation can be Markdown/text.

PDF generation can be added only after the core application works.

---

## Streaming

Streaming is not required for demonstrating reliable structured state.

---

## Multiple LLM Providers

The `LLMClient` abstraction supports future providers, but only the necessary provider/mock implementation needs to be completed.

---

# 18. Architectural Invariants

These are the rules that must remain true throughout implementation.

---

## Invariant 1 — Domain State Is Authoritative

```text
PersonalWishesState
```

is the source of truth.

---

## Invariant 2 — Conversation Is Context

Conversation history may inform the LLM but does not independently define structured truth.

---

## Invariant 3 — LLM Output Is Untrusted

Every structured model response must pass validation.

---

## Invariant 4 — No Invalid Mutation

Invalid or malformed LLM output must never mutate authoritative state.

---

## Invariant 5 — Unknown Is Explicit

```text
UNKNOWN ≠ false
```

Missing information must remain missing.

---

## Invariant 6 — Ambiguity Is Explicit

Ambiguous information must not silently become a confirmed value.

---

## Invariant 7 — Conflicts Are Explicit

Conflicting information must not silently overwrite existing confirmed state.

---

## Invariant 8 — Corrections Are Supported

Explicit user corrections may replace previously confirmed values after validation.

---

## Invariant 9 — Application Owns Workflow

The application determines:

- unresolved fields
- state transitions
- conflicts
- next question

The LLM does not own these decisions.

---

## Invariant 10 — Document Is Derived

```text
Document = generateDocument(state)
```

The document never becomes an independent source of truth.

---

## Invariant 11 — Document Is Deterministic

The same state produces the same document.

---

## Invariant 12 — LLM Provider Is Replaceable

The application depends on:

```text
LLMClient
```

rather than a specific provider implementation.

---

## Invariant 13 — UI Is Not Domain Logic

React renders and interacts with the backend.

It does not independently implement the state machine.

---

## Invariant 14 — Secrets Stay Outside Source Control

API credentials must come from environment/configuration and must never be committed.

---

# 19. Production Considerations

The assessment does not require a production-ready system, but the following improvements would be considered if this application were developed further.

---

## 19.1 Concurrency Control

The current state model includes a version field.

A production implementation could use optimistic concurrency:

```text
read version 5
      ↓
process
      ↓
UPDATE WHERE version = 5
      ↓
version becomes 6
```

This prevents concurrent requests from silently overwriting one another.

---

## 19.2 Idempotency

Production message submission could include:

```text
requestId / idempotency key
```

to protect against duplicate submissions and retries.

---

## 19.3 Provider Resilience

Production could add:

- exponential backoff
- provider retry policies
- circuit breakers
- provider fallback
- rate-limit handling
- request timeouts

These are intentionally outside the initial assessment scope.

---

## 19.4 Observability

Production logging could include structured metrics for:

```text
LLM latency
LLM failures
validation failures
state conflicts
session completion
API latency
database failures
```

without logging secrets or unnecessary sensitive user content.

---

## 19.5 Security

A production system would require:

- authentication
- authorization
- encrypted transport
- secure secret management
- appropriate data encryption
- input/rate limiting
- audit logging
- privacy/data-retention policies

These concerns are intentionally minimized for the assessment's local scope.

---

## 19.6 Persistent Document Versions

A production legal-document workflow might require versioned document snapshots and auditability.

The assessment does not require this because the current document is intentionally modeled as a derived projection.

---

# Final Architecture Summary

The complete architecture can be reduced to one principle:

```text
                         USER
                           │
                           ▼
                    Natural Language
                           │
                           ▼
                     ┌──────────┐
                     │   LLM    │
                     └────┬─────┘
                          │
                  Untrusted candidates
                          │
                          ▼
                    ┌──────────┐
                    │VALIDATOR │
                    └────┬─────┘
                         │
                  valid candidates
                         │
                         ▼
                  ┌─────────────┐
                  │STATE ENGINE │
                  └──────┬──────┘
                         │
                         ▼
                AUTHORITATIVE STATE
                         │
                ┌────────┴─────────┐
                │                  │
                ▼                  ▼
          Persistence       Document Generator
                                   │
                                   ▼
                            Draft Document
```

The fundamental trust boundary is:

```text
                 UNTRUSTED
                    │
                    ▼
              ┌───────────┐
              │    LLM    │
              └─────┬─────┘
                    │
              validation
                    │
                    ▼
                 TRUSTED
                    │
                    ▼
           AUTHORITATIVE STATE
```

The system deliberately keeps the probabilistic part of the application—the LLM—behind deterministic engineering boundaries.

The LLM interprets language.

The application validates interpretation.

The state machine owns truth.

The document generator renders truth.

The database persists truth.

The React UI displays truth.

That separation is the central architectural decision of the Document Intake Assistant.

# Rules For AI Agentic Coding Tools

## Rules for AI Coding Agents

1. Read this document before modifying the codebase.

2. Treat the domain model and invariants defined here as authoritative.

3. Do not introduce architectural changes without explicitly documenting them.

4. Never allow an LLM response to directly mutate canonical application state.

5. Never trust LLM-generated JSON merely because it is syntactically valid.

6. All LLM output must pass:
   - parsing
   - schema validation
   - semantic validation
   - conflict detection
   - domain transition validation

7. Invalid LLM output must result in zero state mutation.

8. Domain logic must not depend on:
   - HTTP
   - React
   - database implementations
   - specific LLM providers

9. Keep deterministic logic deterministic and testable.

10. Prefer small, composable modules over large service classes.

11. Do not add libraries unless there is a concrete architectural reason.

12. Every new state transition must have tests.

13. Every failure mode identified in this document must remain representable
    and testable in the implementation.

14. Do not silently change domain semantics to make tests pass.

15. When uncertain about a requirement, preserve existing domain state rather
    than guessing.
