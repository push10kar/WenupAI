import crypto from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import {
  PersonalWishesState,
  createInitialState,
  generateDocument,
  safeValidatePersonalWishesState,
} from "../../../domain";
import { Message } from "../../llm";
import {
  PersistenceError,
  Session,
  SessionRepository,
} from "../../../application/repositories";

interface SessionRow {
  id: string;
  created_at: string;
  updated_at: string;
}

interface StateRow {
  session_id: string;
  state_json: string;
  version: number;
  updated_at: string;
}

interface MessageRow {
  id: string;
  session_id: string;
  role: string;
  content: string;
  created_at: string;
}

/**
 * SQLite implementation of SessionRepository.
 *
 * Implements:
 * - Deterministic schema access (sessions, messages, session_state)
 * - Validation on write (fails before saving invalid state)
 * - Validation on read (rejects corrupted persisted state)
 * - Atomic multi-statement writes using SQLite transactions
 * - Optimistic concurrency control using state versioning
 */
export class SQLiteSessionRepository implements SessionRepository {
  private readonly db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  async createSession(initialState?: PersonalWishesState): Promise<Session> {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const state = initialState ?? createInitialState();

    // Runtime validation on write
    const validation = safeValidatePersonalWishesState(state);
    if (!validation.success) {
      throw new PersistenceError(
        `Cannot persist invalid state: ${validation.error.message}`,
        "INVALID_STATE",
      );
    }

    try {
      this.db.exec("BEGIN IMMEDIATE;");

      const insertSession = this.db.prepare(
        "INSERT INTO sessions (id, created_at, updated_at) VALUES (?, ?, ?)",
      );
      insertSession.run(id, now, now);

      const insertState = this.db.prepare(
        "INSERT INTO session_state (session_id, state_json, version, updated_at) VALUES (?, ?, 1, ?)",
      );
      insertState.run(id, JSON.stringify(validation.data), now);

      this.db.exec("COMMIT;");

      return {
        id,
        createdAt: now,
        updatedAt: now,
        state: validation.data,
        messages: [],
        document: generateDocument(validation.data),
        version: 1,
      };
    } catch (err) {
      try {
        this.db.exec("ROLLBACK;");
      } catch {
        // Rollback failed if not in transaction
      }
      if (err instanceof PersistenceError) throw err;
      throw new PersistenceError(
        `Database error during createSession: ${err instanceof Error ? err.message : String(err)}`,
        "DATABASE_ERROR",
      );
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const sessionStmt = this.db.prepare(
        "SELECT id, created_at, updated_at FROM sessions WHERE id = ?",
      );
      const sessionRow = sessionStmt.get(sessionId) as unknown as
        | SessionRow
        | undefined;
      if (!sessionRow) {
        return null;
      }

      const stateStmt = this.db.prepare(
        "SELECT session_id, state_json, version, updated_at FROM session_state WHERE session_id = ?",
      );
      const stateRow = stateStmt.get(sessionId) as unknown as
        | StateRow
        | undefined;
      if (!stateRow) {
        throw new PersistenceError(
          `Missing session_state row for session '${sessionId}'`,
          "INVALID_PERSISTED_STATE",
        );
      }

      // Runtime deserialization & schema validation on read
      let parsed: unknown;
      try {
        parsed = JSON.parse(stateRow.state_json);
      } catch {
        throw new PersistenceError(
          `Malformed JSON in session_state for session '${sessionId}'`,
          "INVALID_PERSISTED_STATE",
        );
      }

      const validation = safeValidatePersonalWishesState(parsed);
      if (!validation.success) {
        throw new PersistenceError(
          `Persisted state violates canonical schema for session '${sessionId}': ${validation.error.message}`,
          "INVALID_PERSISTED_STATE",
        );
      }

      const messagesStmt = this.db.prepare(
        "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
      );
      const messageRows = messagesStmt.all(
        sessionId,
      ) as unknown as MessageRow[];
      const messages: readonly Message[] = messageRows.map((m) => ({
        id: m.id,
        role: m.role as Message["role"],
        content: m.content,
        createdAt: m.created_at,
      }));

      return {
        id: sessionRow.id,
        createdAt: sessionRow.created_at,
        updatedAt: sessionRow.updated_at,
        state: validation.data,
        messages,
        document: generateDocument(validation.data),
        version: stateRow.version,
      };
    } catch (err) {
      if (err instanceof PersistenceError) throw err;
      throw new PersistenceError(
        `Database error during getSession: ${err instanceof Error ? err.message : String(err)}`,
        "DATABASE_ERROR",
      );
    }
  }

  async getMessages(sessionId: string): Promise<readonly Message[]> {
    try {
      const sessionStmt = this.db.prepare(
        "SELECT id FROM sessions WHERE id = ?",
      );
      const session = sessionStmt.get(sessionId);
      if (!session) {
        throw new PersistenceError(
          `Session '${sessionId}' not found`,
          "NOT_FOUND",
        );
      }

      const messagesStmt = this.db.prepare(
        "SELECT id, role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC",
      );
      const rows = messagesStmt.all(sessionId) as unknown as MessageRow[];
      return rows.map((m) => ({
        id: m.id,
        role: m.role as Message["role"],
        content: m.content,
        createdAt: m.created_at,
      }));
    } catch (err) {
      if (err instanceof PersistenceError) throw err;
      throw new PersistenceError(
        `Database error during getMessages: ${err instanceof Error ? err.message : String(err)}`,
        "DATABASE_ERROR",
      );
    }
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    try {
      const sessionStmt = this.db.prepare(
        "SELECT id FROM sessions WHERE id = ?",
      );
      const session = sessionStmt.get(sessionId);
      if (!session) {
        throw new PersistenceError(
          `Session '${sessionId}' not found`,
          "NOT_FOUND",
        );
      }

      const now = new Date().toISOString();
      const insertStmt = this.db.prepare(
        "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      );
      insertStmt.run(
        message.id,
        sessionId,
        message.role,
        message.content,
        message.createdAt,
      );

      const updateSessionStmt = this.db.prepare(
        "UPDATE sessions SET updated_at = ? WHERE id = ?",
      );
      updateSessionStmt.run(now, sessionId);
    } catch (err) {
      if (err instanceof PersistenceError) throw err;
      throw new PersistenceError(
        `Database error during addMessage: ${err instanceof Error ? err.message : String(err)}`,
        "DATABASE_ERROR",
      );
    }
  }

  async getState(sessionId: string): Promise<PersonalWishesState> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new PersistenceError(
        `Session '${sessionId}' not found`,
        "NOT_FOUND",
      );
    }
    return session.state;
  }

  async updateState(
    sessionId: string,
    state: PersonalWishesState,
    expectedVersion?: number,
  ): Promise<void> {
    const validation = safeValidatePersonalWishesState(state);
    if (!validation.success) {
      throw new PersistenceError(
        `Cannot persist invalid state: ${validation.error.message}`,
        "INVALID_STATE",
      );
    }

    try {
      const now = new Date().toISOString();

      if (expectedVersion !== undefined) {
        const stateStmt = this.db.prepare(
          "SELECT version FROM session_state WHERE session_id = ?",
        );
        const stateRow = stateStmt.get(sessionId) as unknown as
          | StateRow
          | undefined;
        if (!stateRow) {
          throw new PersistenceError(
            `Session state '${sessionId}' not found`,
            "NOT_FOUND",
          );
        }

        if (stateRow.version !== expectedVersion) {
          throw new PersistenceError(
            `Concurrency conflict on session '${sessionId}': expected version ${expectedVersion}, found ${stateRow.version}`,
            "CONCURRENCY_CONFLICT",
          );
        }

        const updateStmt = this.db.prepare(
          "UPDATE session_state SET state_json = ?, version = version + 1, updated_at = ? WHERE session_id = ? AND version = ?",
        );
        const result = updateStmt.run(
          JSON.stringify(validation.data),
          now,
          sessionId,
          expectedVersion,
        );

        if (result.changes === 0) {
          throw new PersistenceError(
            `Concurrency conflict: state update did not modify any row for session '${sessionId}'`,
            "CONCURRENCY_CONFLICT",
          );
        }
      } else {
        const updateStmt = this.db.prepare(
          "UPDATE session_state SET state_json = ?, version = version + 1, updated_at = ? WHERE session_id = ?",
        );
        const result = updateStmt.run(
          JSON.stringify(validation.data),
          now,
          sessionId,
        );
        if (result.changes === 0) {
          throw new PersistenceError(
            `Session state '${sessionId}' not found`,
            "NOT_FOUND",
          );
        }
      }

      const updateSessionStmt = this.db.prepare(
        "UPDATE sessions SET updated_at = ? WHERE id = ?",
      );
      updateSessionStmt.run(now, sessionId);
    } catch (err) {
      if (err instanceof PersistenceError) throw err;
      throw new PersistenceError(
        `Database error during updateState: ${err instanceof Error ? err.message : String(err)}`,
        "DATABASE_ERROR",
      );
    }
  }

  async saveTurn(
    sessionId: string,
    userMessage: Message,
    updatedState: PersonalWishesState,
    assistantMessage?: Message,
    expectedVersion?: number,
  ): Promise<void> {
    const validation = safeValidatePersonalWishesState(updatedState);
    if (!validation.success) {
      throw new PersistenceError(
        `Cannot persist invalid state: ${validation.error.message}`,
        "INVALID_STATE",
      );
    }

    try {
      this.db.exec("BEGIN IMMEDIATE;");

      const sessionStmt = this.db.prepare(
        "SELECT id, updated_at FROM sessions WHERE id = ?",
      );
      const session = sessionStmt.get(sessionId);
      if (!session) {
        throw new PersistenceError(
          `Session '${sessionId}' not found`,
          "NOT_FOUND",
        );
      }

      const now = new Date().toISOString();

      // 1. Insert user message
      const insertUserMsg = this.db.prepare(
        "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
      );
      insertUserMsg.run(
        userMessage.id,
        sessionId,
        userMessage.role,
        userMessage.content,
        userMessage.createdAt,
      );

      // 2. Update state with optimistic concurrency check
      if (expectedVersion !== undefined) {
        const stateStmt = this.db.prepare(
          "SELECT version FROM session_state WHERE session_id = ?",
        );
        const stateRow = stateStmt.get(sessionId) as unknown as
          | StateRow
          | undefined;
        if (!stateRow) {
          throw new PersistenceError(
            `Session state '${sessionId}' not found`,
            "NOT_FOUND",
          );
        }
        if (stateRow.version !== expectedVersion) {
          throw new PersistenceError(
            `Concurrency conflict on session '${sessionId}': expected version ${expectedVersion}, found ${stateRow.version}`,
            "CONCURRENCY_CONFLICT",
          );
        }

        const updateStateStmt = this.db.prepare(
          "UPDATE session_state SET state_json = ?, version = version + 1, updated_at = ? WHERE session_id = ? AND version = ?",
        );
        const res = updateStateStmt.run(
          JSON.stringify(validation.data),
          now,
          sessionId,
          expectedVersion,
        );
        if (res.changes === 0) {
          throw new PersistenceError(
            `Concurrency conflict during saveTurn on session '${sessionId}'`,
            "CONCURRENCY_CONFLICT",
          );
        }
      } else {
        const updateStateStmt = this.db.prepare(
          "UPDATE session_state SET state_json = ?, version = version + 1, updated_at = ? WHERE session_id = ?",
        );
        const res = updateStateStmt.run(
          JSON.stringify(validation.data),
          now,
          sessionId,
        );
        if (res.changes === 0) {
          throw new PersistenceError(
            `Session state '${sessionId}' not found`,
            "NOT_FOUND",
          );
        }
      }

      // 3. Insert assistant message if provided
      if (assistantMessage) {
        const insertAssistantMsg = this.db.prepare(
          "INSERT INTO messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        );
        insertAssistantMsg.run(
          assistantMessage.id,
          sessionId,
          assistantMessage.role,
          assistantMessage.content,
          assistantMessage.createdAt,
        );
      }

      // 4. Update session timestamp
      const updateSession = this.db.prepare(
        "UPDATE sessions SET updated_at = ? WHERE id = ?",
      );
      updateSession.run(now, sessionId);

      this.db.exec("COMMIT;");
    } catch (err) {
      try {
        this.db.exec("ROLLBACK;");
      } catch {
        // Rollback safety
      }
      if (err instanceof PersistenceError) throw err;
      throw new PersistenceError(
        `Database error during saveTurn: ${err instanceof Error ? err.message : String(err)}`,
        "DATABASE_ERROR",
      );
    }
  }
}
