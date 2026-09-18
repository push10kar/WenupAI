import { PersonalWishesState, DocumentPreview } from "../../domain";
import { Message } from "../../infrastructure/llm";

/**
 * Session snapshot representation matching ARCHITECTURE.md Section 11.4 & Section 9.3.
 */
export interface Session {
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly state: PersonalWishesState;
  readonly messages: readonly Message[];
  readonly document: DocumentPreview;
  readonly version: number;
}

/**
 * Repository abstraction for storing and retrieving interview sessions and canonical state
 * (ARCHITECTURE.md Section 10.5).
 *
 * Invariants:
 * - Application code depends only on this interface, not on SQLite.
 * - Stores and returns validated canonical PersonalWishesState.
 * - Enforces atomic state writes and optimistic concurrency checks when version is supplied.
 */
export interface SessionRepository {
  createSession(initialState?: PersonalWishesState): Promise<Session>;
  getSession(sessionId: string): Promise<Session | null>;
  getMessages(sessionId: string): Promise<readonly Message[]>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  getState(sessionId: string): Promise<PersonalWishesState>;
  updateState(
    sessionId: string,
    state: PersonalWishesState,
    expectedVersion?: number,
  ): Promise<void>;
  saveTurn(
    sessionId: string,
    userMessage: Message,
    updatedState: PersonalWishesState,
    assistantMessage?: Message,
    expectedVersion?: number,
  ): Promise<void>;
}

/**
 * Type alias for InterviewStateRepository matching the requirement.
 */
export type InterviewStateRepository = SessionRepository;
