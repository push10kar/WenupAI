import { describe, expect, it, beforeEach } from "vitest";
import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import {
  createDatabase,
  initializeDatabase,
  SQLiteSessionRepository,
} from "../../src/infrastructure/db";
import {
  createConfirmedField,
  createInitialState,
  PersonalWishesState,
} from "../../src/domain";
import { InterviewService, PersistenceError } from "../../src/application";
import { MockLLMClient, Message, LLMClient } from "../../src/infrastructure";

describe("Phase 10: SQLite Persistence & Session Repository", () => {
  let db: DatabaseSync;
  let repo: SQLiteSessionRepository;

  beforeEach(() => {
    db = createDatabase(":memory:");
    repo = new SQLiteSessionRepository(db);
  });

  describe("Database Initialization & Schema", () => {
    it("initializes schema idempotently without errors", () => {
      // Calling initializeDatabase again on an already initialized DB should succeed
      expect(() => initializeDatabase(db)).not.toThrow();

      // Check tables exist
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all() as unknown as { name: string }[];
      const names = tables.map((t) => t.name);
      expect(names).toContain("sessions");
      expect(names).toContain("messages");
      expect(names).toContain("session_state");
    });
  });

  describe("Session Creation & Retrieval", () => {
    it("creates a new session with initial state, version 1, and no messages", async () => {
      const session = await repo.createSession();

      expect(session.id).toBeDefined();
      expect(session.version).toBe(1);
      expect(session.messages).toEqual([]);
      expect(session.state.fullName.status).toBe("UNKNOWN");
      expect(session.state.fullName.value).toBeNull();
      expect(session.document).toBeDefined();
      expect(session.document.status).toBe("draft");
      expect(session.document.sections.length).toBeGreaterThan(0);

      // Verify retrieval returns identical data
      const retrieved = await repo.getSession(session.id);
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(session.id);
      expect(retrieved?.version).toBe(1);
      expect(retrieved?.state).toEqual(session.state);
      expect(retrieved?.messages).toEqual([]);
    });

    it("creates a session with custom valid initial state", async () => {
      const customState: PersonalWishesState = {
        ...createInitialState(),
        fullName: createConfirmedField("Jane Doe", "test"),
      };

      const session = await repo.createSession(customState);
      expect(session.state.fullName.value).toBe("Jane Doe");

      const retrieved = await repo.getSession(session.id);
      expect(retrieved?.state.fullName.value).toBe("Jane Doe");
    });

    it("returns null when getting a non-existent session", async () => {
      const retrieved = await repo.getSession("non-existent-id");
      expect(retrieved).toBeNull();
    });

    it("throws INVALID_STATE when attempting to create a session with an invalid state", async () => {
      const invalidState = {
        ...createInitialState(),
        fullName: { value: "Has a value", status: "UNKNOWN" }, // Invalid: UNKNOWN status must have null value
      } as unknown as PersonalWishesState;

      await expect(repo.createSession(invalidState)).rejects.toThrowError(
        PersistenceError,
      );
      await expect(repo.createSession(invalidState)).rejects.toMatchObject({
        code: "INVALID_STATE",
      });
    });
  });

  describe("Validation on Read & Corrupted State Handling", () => {
    it("throws INVALID_PERSISTED_STATE if state_json in DB is corrupted JSON", async () => {
      const session = await repo.createSession();

      // Corrupt state_json in SQLite directly
      db.prepare(
        "UPDATE session_state SET state_json = '{ invalid json' WHERE session_id = ?",
      ).run(session.id);

      await expect(repo.getSession(session.id)).rejects.toThrowError(
        PersistenceError,
      );
      await expect(repo.getSession(session.id)).rejects.toMatchObject({
        code: "INVALID_PERSISTED_STATE",
      });
    });

    it("throws INVALID_PERSISTED_STATE if state_json violates domain schema", async () => {
      const session = await repo.createSession();

      // Overwrite state_json with valid JSON that violates PersonalWishesState schema
      db.prepare(
        "UPDATE session_state SET state_json = ? WHERE session_id = ?",
      ).run(JSON.stringify({ notAValidState: true }), session.id);

      await expect(repo.getSession(session.id)).rejects.toThrowError(
        PersistenceError,
      );
      await expect(repo.getSession(session.id)).rejects.toMatchObject({
        code: "INVALID_PERSISTED_STATE",
      });
    });

    it("throws INVALID_PERSISTED_STATE if session_state row is missing", async () => {
      const session = await repo.createSession();

      // Delete session_state row
      db.prepare("DELETE FROM session_state WHERE session_id = ?").run(
        session.id,
      );

      await expect(repo.getSession(session.id)).rejects.toThrowError(
        PersistenceError,
      );
      await expect(repo.getSession(session.id)).rejects.toMatchObject({
        code: "INVALID_PERSISTED_STATE",
      });
    });
  });

  describe("Messages & State Management", () => {
    it("adds and retrieves messages in chronological order", async () => {
      const session = await repo.createSession();

      const msg1: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: "Hello",
        createdAt: "2026-09-19T00:00:01.000Z",
      };
      const msg2: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Hi! What is your name?",
        createdAt: "2026-09-19T00:00:02.000Z",
      };

      await repo.addMessage(session.id, msg1);
      await repo.addMessage(session.id, msg2);

      const messages = await repo.getMessages(session.id);
      expect(messages).toHaveLength(2);
      expect(messages[0].content).toBe("Hello");
      expect(messages[1].content).toBe("Hi! What is your name?");

      const fullSession = await repo.getSession(session.id);
      expect(fullSession?.messages).toHaveLength(2);
    });

    it("throws NOT_FOUND when adding message to non-existent session", async () => {
      const msg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: "Hello",
        createdAt: new Date().toISOString(),
      };
      await expect(repo.addMessage("unknown-id", msg)).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("throws NOT_FOUND when getting messages for non-existent session", async () => {
      await expect(repo.getMessages("unknown-id")).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("gets and updates state, incrementing version", async () => {
      const session = await repo.createSession();
      expect(session.version).toBe(1);

      const newState: PersonalWishesState = {
        ...session.state,
        fullName: createConfirmedField("Arthur Dent", "user-input"),
      };

      await repo.updateState(session.id, newState, 1);

      const updated = await repo.getSession(session.id);
      expect(updated?.version).toBe(2);
      expect(updated?.state.fullName.value).toBe("Arthur Dent");

      const stateOnly = await repo.getState(session.id);
      expect(stateOnly.fullName.value).toBe("Arthur Dent");
    });

    it("throws CONCURRENCY_CONFLICT when expectedVersion does not match in updateState", async () => {
      const session = await repo.createSession(); // version is 1

      const newState: PersonalWishesState = {
        ...session.state,
        fullName: createConfirmedField("Arthur Dent", "user-input"),
      };

      // Pass wrong expected version (e.g., 2 instead of 1)
      await expect(
        repo.updateState(session.id, newState, 2),
      ).rejects.toMatchObject({
        code: "CONCURRENCY_CONFLICT",
      });

      // Verify state was untouched
      const current = await repo.getSession(session.id);
      expect(current?.version).toBe(1);
      expect(current?.state.fullName.status).toBe("UNKNOWN");
    });

    it("rejects invalid state on updateState with INVALID_STATE", async () => {
      const session = await repo.createSession();
      const invalidState = {
        ...session.state,
        fullName: { value: "Valid name", status: "INVALID_STATUS" },
      } as unknown as PersonalWishesState;

      await expect(
        repo.updateState(session.id, invalidState),
      ).rejects.toMatchObject({
        code: "INVALID_STATE",
      });
    });
  });

  describe("Atomic saveTurn", () => {
    it("atomically saves user message, assistant message, and updated state with version increment", async () => {
      const session = await repo.createSession();
      expect(session.version).toBe(1);

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: "My name is Ford Prefect",
        createdAt: new Date().toISOString(),
      };
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Where do you currently reside, Ford?",
        createdAt: new Date().toISOString(),
      };
      const updatedState: PersonalWishesState = {
        ...session.state,
        fullName: createConfirmedField("Ford Prefect", "user-input"),
      };

      await repo.saveTurn(session.id, userMsg, updatedState, assistantMsg, 1);

      const loaded = await repo.getSession(session.id);
      expect(loaded?.version).toBe(2);
      expect(loaded?.state.fullName.value).toBe("Ford Prefect");
      expect(loaded?.messages).toHaveLength(2);
      expect(loaded?.messages[0].content).toBe("My name is Ford Prefect");
      expect(loaded?.messages[1].content).toBe(
        "Where do you currently reside, Ford?",
      );
    });

    it("rolls back completely if concurrency conflict occurs during saveTurn", async () => {
      const session = await repo.createSession(); // version is 1

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: "Conflicting turn",
        createdAt: new Date().toISOString(),
      };
      const updatedState: PersonalWishesState = {
        ...session.state,
        fullName: createConfirmedField("Conflict Person", "user-input"),
      };

      // Wrong expected version
      await expect(
        repo.saveTurn(session.id, userMsg, updatedState, undefined, 99),
      ).rejects.toMatchObject({
        code: "CONCURRENCY_CONFLICT",
      });

      // Verify NOTHING was written
      const loaded = await repo.getSession(session.id);
      expect(loaded?.version).toBe(1);
      expect(loaded?.state.fullName.status).toBe("UNKNOWN");
      expect(loaded?.messages).toEqual([]);
    });

    it("rolls back completely if updatedState fails validation during saveTurn", async () => {
      const session = await repo.createSession();

      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content: "Bad state turn",
        createdAt: new Date().toISOString(),
      };
      const badState = {
        ...session.state,
        fullName: { value: "John", status: "UNKNOWN" },
      } as unknown as PersonalWishesState;

      await expect(
        repo.saveTurn(session.id, userMsg, badState, undefined, 1),
      ).rejects.toMatchObject({
        code: "INVALID_STATE",
      });

      const loaded = await repo.getSession(session.id);
      expect(loaded?.version).toBe(1);
      expect(loaded?.messages).toEqual([]);
    });
  });

  describe("InterviewService Integration with SQLite Persistence", () => {
    it("creates and retrieves persistent session through InterviewService", async () => {
      const mockLLM = new MockLLMClient({
        extractionResponses: [],
        textResponses: [],
      });
      const service = new InterviewService({
        llmClient: mockLLM,
        sessionRepository: repo,
      });

      const session = await service.createSession();
      expect(session.id).toBeDefined();

      const fetched = await service.getSession(session.id);
      expect(fetched?.id).toBe(session.id);
    });

    it("successfully processes a turn and persists state + messages atomically", async () => {
      const mockLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Trillian Astra",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
        textResponses: ["Hello Trillian, what is your address?"],
      });

      const service = new InterviewService({
        llmClient: mockLLM,
        sessionRepository: repo,
      });
      const session = await service.createSession();
      expect(session.version).toBe(1);

      const result = await service.processSessionMessage(
        session.id,
        "My name is Trillian Astra",
      );

      expect(result.status).toBe("QUESTION");
      if (result.status === "QUESTION") {
        expect(result.state.fullName.value).toBe("Trillian Astra");
      }

      // Check persisted state in SQLite
      const updatedSession = await service.getSession(session.id);
      expect(updatedSession?.version).toBe(2);
      expect(updatedSession?.state.fullName.value).toBe("Trillian Astra");
      expect(updatedSession?.messages).toHaveLength(2);
      expect(updatedSession?.messages[0].role).toBe("user");
      expect(updatedSession?.messages[0].content).toBe(
        "My name is Trillian Astra",
      );
      expect(updatedSession?.messages[1].role).toBe("assistant");
      expect(updatedSession?.messages[1].content).toBe(
        "Hello Trillian, what is your address?",
      );
    });

    it("leaves persisted state and messages unchanged when candidate validation fails", async () => {
      const mockLLM = new MockLLMClient({
        extractionResponses: [
          {
            // Invalid candidate: missing required fields
            updates: [{ field: "unknownField", intent: "NEW" } as unknown],
          },
        ],
      });

      const service = new InterviewService({
        llmClient: mockLLM,
        sessionRepository: repo,
      });
      const session = await service.createSession();

      const result = await service.processSessionMessage(
        session.id,
        "Random text",
      );

      expect(result.status).toBe("VALIDATION_ERROR");

      // Verify DB remains completely untouched
      const persistentSession = await service.getSession(session.id);
      expect(persistentSession?.version).toBe(1);
      expect(persistentSession?.state.fullName.status).toBe("UNKNOWN");
      expect(persistentSession?.messages).toHaveLength(0);
    });

    it("leaves persisted state and messages unchanged when conflict is detected", async () => {
      // Start with confirmed full name
      const customState: PersonalWishesState = {
        ...createInitialState(),
        fullName: createConfirmedField("Arthur Dent", "test"),
      };
      const mockLLM = new MockLLMClient({
        extractionResponses: [
          {
            // Conflict: overwriting confirmed field with NEW intent instead of CORRECTION
            updates: [
              {
                field: "fullName",
                value: "Ford Prefect",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });

      const service = new InterviewService({
        llmClient: mockLLM,
        sessionRepository: repo,
      });
      const session = await repo.createSession(customState);

      const result = await service.processSessionMessage(
        session.id,
        "I am Ford Prefect",
      );

      expect(result.status).toBe("CONFLICT");

      // Verify DB remains unchanged
      const persistentSession = await service.getSession(session.id);
      expect(persistentSession?.version).toBe(1);
      expect(persistentSession?.state.fullName.value).toBe("Arthur Dent");
      expect(persistentSession?.messages).toHaveLength(0);
    });

    it("leaves persisted state unchanged when LLM provider throws error", async () => {
      const errorLLM = {
        extractUpdates: async () => {
          throw new Error("LLM Provider connection failed");
        },
        generateResponse: async () => "fallback",
      };

      const service = new InterviewService({
        llmClient: errorLLM,
        sessionRepository: repo,
      });
      const session = await repo.createSession();

      const result = await service.processSessionMessage(session.id, "Hello?");

      expect(result.status).toBe("PROVIDER_ERROR");

      const persistentSession = await service.getSession(session.id);
      expect(persistentSession?.version).toBe(1);
      expect(persistentSession?.messages).toHaveLength(0);
    });

    it("returns PERSISTENCE_ERROR and returns unmutated state if saveTurn fails", async () => {
      const session = await repo.createSession();

      // LLM client that causes a concurrent database update during turn extraction
      const concurrentLLM: LLMClient = {
        extractUpdates: async () => {
          // Race condition: another request modifies DB version concurrently
          await repo.updateState(session.id, session.state);
          return {
            updates: [
              {
                field: "fullName",
                value: "Zaphod Beeblebrox",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        },
        generateResponse: async () => "Greetings Zaphod",
      };

      const service = new InterviewService({
        llmClient: concurrentLLM,
        sessionRepository: repo,
      });

      // Process turn with the session
      const result = await service.processSessionMessage(
        session.id,
        "I am Zaphod",
      );

      expect(result.status).toBe("PERSISTENCE_ERROR");
      if (result.status === "PERSISTENCE_ERROR") {
        // Must return original unmutated state from the session
        expect(result.state.fullName.status).toBe("UNKNOWN");
        expect(result.error).toBeDefined();
      }
    });

    it("throws NOT_FOUND if processSessionMessage is called on a non-existent session ID", async () => {
      const mockLLM = new MockLLMClient({ extractionResponses: [] });
      const service = new InterviewService({
        llmClient: mockLLM,
        sessionRepository: repo,
      });

      await expect(
        service.processSessionMessage("missing-session-id", "hello"),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
      });
    });

    it("throws error if InterviewService session methods are called without sessionRepository configured", async () => {
      const mockLLM = new MockLLMClient({ extractionResponses: [] });
      const statelessService = new InterviewService({ llmClient: mockLLM });

      await expect(statelessService.createSession()).rejects.toThrowError(
        PersistenceError,
      );
      await expect(statelessService.getSession("any-id")).rejects.toThrowError(
        PersistenceError,
      );
      await expect(
        statelessService.processSessionMessage("any-id", "msg"),
      ).rejects.toThrowError(PersistenceError);
    });
  });
});
