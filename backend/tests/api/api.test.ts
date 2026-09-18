import { describe, expect, it, beforeEach } from "vitest";
import { FastifyInstance } from "fastify";
import { createApp } from "../../src/api";
import {
  createConfirmedField,
  createInitialState,
  PersonalWishesState,
} from "../../src/domain";
import { InterviewService } from "../../src/application";
import {
  SQLiteSessionRepository,
  createDatabase,
} from "../../src/infrastructure/db";
import { MockLLMClient, LLMClient } from "../../src/infrastructure";

describe("Phase 11: Fastify API Layer", () => {
  let app: FastifyInstance;
  let repo: SQLiteSessionRepository;
  let mockLLM: MockLLMClient;
  let service: InterviewService;

  beforeEach(() => {
    const db = createDatabase(":memory:");
    repo = new SQLiteSessionRepository(db);
    mockLLM = new MockLLMClient({
      extractionResponses: [
        {
          updates: [
            {
              field: "fullName",
              value: "Arthur Dent",
              intent: "NEW",
              confidence: "CLEAR",
            },
          ],
        },
      ],
      textResponses: [
        "Hello! To begin preparing your personal wishes document, what is your full legal name?",
        "Nice to meet you Arthur. Where do you live?",
      ],
    });
    service = new InterviewService({
      llmClient: mockLLM,
      sessionRepository: repo,
    });
    app = createApp({
      interviewService: service,
      sessionRepository: repo,
      llmClient: mockLLM,
    });
  });

  describe("Health Endpoint", () => {
    it("GET /health returns 200 and status ok without leaking secrets or credentials", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/health",
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.status).toBe("ok");
      expect(body.timestamp).toBeDefined();
      // Ensure no environment variables or internal paths leaked
      expect(body.env).toBeUndefined();
      expect(body.database).toBeUndefined();
    });
  });

  describe("Interview Creation (POST /api/sessions)", () => {
    it("creates a new session with 201 Created and initializes the first question", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/sessions",
        payload: {},
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.session).toBeDefined();
      expect(body.session.id).toBeDefined();
      expect(body.session.version).toBe(1);
      expect(body.session.state).toBeDefined();
      expect(body.session.document).toBeDefined();
      expect(body.session.document.status).toBe("draft");
      expect(body.session.messages).toHaveLength(1);
      expect(body.session.messages[0].role).toBe("assistant");
      expect(body.session.messages[0].content).toContain("legal name");
    });

    it("creates a session with a custom valid initial state", async () => {
      const customState: PersonalWishesState = {
        ...createInitialState(),
        fullName: createConfirmedField("Ford Prefect", "user"),
      };

      const res = await app.inject({
        method: "POST",
        url: "/api/sessions",
        payload: {
          initialState: customState,
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json();
      expect(body.session.state.fullName.value).toBe("Ford Prefect");
      expect(body.session.state.fullName.status).toBe("CONFIRMED");
    });

    it("rejects an invalid initial state with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/sessions",
        payload: {
          initialState: {
            // Missing all required fields
            invalid: true,
          },
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error).toBeDefined();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toBeDefined();
    });
  });

  describe("Interview Retrieval (GET /api/sessions/:id)", () => {
    it("returns 200 OK with session snapshot for an existing session", async () => {
      const created = await repo.createSession();

      const res = await app.inject({
        method: "GET",
        url: `/api/sessions/${created.id}`,
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.session).toBeDefined();
      expect(body.session.id).toBe(created.id);
      expect(body.session.state).toEqual(created.state);
      expect(body.session.document).toEqual(created.document);
    });

    it("returns 404 Not Found with stable error code for non-existent session", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/sessions/non-existent-session-id",
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.error).toEqual({
        code: "NOT_FOUND",
        message: "Session 'non-existent-session-id' not found",
      });
    });
  });

  describe("User Turn (POST /api/sessions/:id/messages)", () => {
    it("successfully processes user turn, transitions state, and returns updated session and assistant message", async () => {
      // 1. Create session
      const createRes = await app.inject({
        method: "POST",
        url: "/api/sessions",
      });
      const sessionId = createRes.json().session.id;

      // 2. Submit user turn
      const res = await app.inject({
        method: "POST",
        url: `/api/sessions/${sessionId}/messages`,
        payload: {
          content: "My name is Arthur Dent",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.session).toBeDefined();
      expect(body.session.id).toBe(sessionId);
      expect(body.session.version).toBe(2);
      expect(body.session.state.fullName.value).toBe("Arthur Dent");
      expect(body.assistantMessage).toBeDefined();
      expect(body.assistantMessage.role).toBe("assistant");
      expect(body.assistantMessage.content).toBe(
        "Nice to meet you Arthur. Where do you live?",
      );
      // Verify message history contains initial greeting + user msg + assistant msg
      expect(body.session.messages.length).toBeGreaterThanOrEqual(3);
    });

    it("returns 400 Bad Request when request body content is empty or whitespace", async () => {
      const created = await repo.createSession();

      const res = await app.inject({
        method: "POST",
        url: `/api/sessions/${created.id}/messages`,
        payload: {
          content: "   ",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("content cannot be empty");
    });

    it("returns 400 Bad Request when request body is missing content", async () => {
      const created = await repo.createSession();

      const res = await app.inject({
        method: "POST",
        url: `/api/sessions/${created.id}/messages`,
        payload: {},
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toBeDefined();
    });

    it("returns 404 Not Found when posting a message to a non-existent session", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/sessions/non-existent-id/messages",
        payload: {
          content: "Hello",
        },
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.error.code).toBe("NOT_FOUND");
    });

    it("returns 422 Unprocessable Entity on semantic candidate validation failure", async () => {
      // Mock LLM returning candidate with invalid field
      const invalidLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "unknownField" as any,
                value: "Invalid",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });
      const invalidService = new InterviewService({
        llmClient: invalidLLM,
        sessionRepository: repo,
      });
      const customApp = createApp({
        interviewService: invalidService,
        sessionRepository: repo,
        llmClient: invalidLLM,
      });

      const session = await repo.createSession();

      const res = await customApp.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: "Some input",
        },
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.error.code).toBe("VALIDATION_ERROR");
      expect(body.error.message).toBeDefined();
    });

    it("returns 409 Conflict when candidate conflicts with confirmed state", async () => {
      const conflictingLLM = new MockLLMClient({
        extractionResponses: [
          {
            // NEW intent attempting to overwrite confirmed field causes conflict
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
      const conflictService = new InterviewService({
        llmClient: conflictingLLM,
        sessionRepository: repo,
      });
      const customApp = createApp({
        interviewService: conflictService,
        sessionRepository: repo,
        llmClient: conflictingLLM,
      });

      // Session with already confirmed full name
      const session = await repo.createSession({
        ...createInitialState(),
        fullName: createConfirmedField("Arthur Dent", "user"),
      });

      const res = await customApp.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: "Call me Ford Prefect",
        },
      });

      expect(res.statusCode).toBe(409);
      const body = res.json();
      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).toBeDefined();
    });

    it("returns 503 Service Unavailable when LLM provider fails", async () => {
      const failingLLM: LLMClient = {
        extractUpdates: async () => {
          throw new Error("LLM Provider connection timed out");
        },
        generateResponse: async () => "fallback",
      };
      const providerErrorService = new InterviewService({
        llmClient: failingLLM,
        sessionRepository: repo,
      });
      const customApp = createApp({
        interviewService: providerErrorService,
        sessionRepository: repo,
        llmClient: failingLLM,
      });

      const session = await repo.createSession();

      const res = await customApp.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: "Hello there",
        },
      });

      expect(res.statusCode).toBe(503);
      const body = res.json();
      expect(body.error.code).toBe("PROVIDER_ERROR");
      // Ensure raw internal error stack trace is not exposed
      expect(body.error.stack).toBeUndefined();
    });

    it("returns 500 Internal Server Error when persistence fails", async () => {
      const session = await repo.createSession();

      // LLM causes concurrent update during extraction
      const raceLLM: LLMClient = {
        extractUpdates: async () => {
          await repo.updateState(session.id, session.state); // version incremented to 2
          return {
            updates: [
              {
                field: "fullName",
                value: "Trillian",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          };
        },
        generateResponse: async () => "Hello Trillian",
      };

      const raceService = new InterviewService({
        llmClient: raceLLM,
        sessionRepository: repo,
      });
      const customApp = createApp({
        interviewService: raceService,
        sessionRepository: repo,
        llmClient: raceLLM,
      });

      const res = await customApp.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: "My name is Trillian",
        },
      });

      expect(res.statusCode).toBe(500);
      const body = res.json();
      expect(body.error.code).toBe("PERSISTENCE_ERROR");
      expect(body.error.stack).toBeUndefined();
    });
  });

  describe("Global Error Behavior & Security", () => {
    it("returns 404 for unmapped route with standard error contract", async () => {
      const res = await app.inject({
        method: "GET",
        url: "/api/unmapped-endpoint",
      });

      expect(res.statusCode).toBe(404);
      const body = res.json();
      expect(body.error).toEqual({
        code: "NOT_FOUND",
        message: "Resource not found",
      });
    });

    it("returns 400 for malformed JSON request body", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/sessions",
        headers: {
          "content-type": "application/json",
        },
        payload: "not-valid-json{",
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.stack).toBeUndefined();
    });
  });
});
