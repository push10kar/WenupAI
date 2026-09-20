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

    it("returns 422 Unprocessable Entity on schema validation failure with schema error code and description", async () => {
      // Mock LLM returning candidate with invalid field (schema failure)
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
      expect(body.error.code).toBe("UNKNOWN_FIELD");
      expect(body.error.message).toBe(
        "The candidate update response does not satisfy CandidateUpdate schema.",
      );
    });

    it("returns 422 Unprocessable Entity on parse failure with parse error code and description", async () => {
      // Mock LLM returning malformed non-JSON data that fails Stage 1 Parse
      const invalidLLM = new MockLLMClient({
        extractionResponses: ["{ malformed json string" as any],
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
      expect(body.error.code).toBe("MALFORMED_JSON");
      expect(body.error.message).toBe(
        "The candidate update response could not be parsed.",
      );
    });

    it("returns 422 Unprocessable Entity on semantic failure with semantic error code and description", async () => {
      // Mock LLM returning candidate with duplicate children (fails Stage 3 Semantics)
      const semanticLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "children",
                value: ["Alice", "alice"],
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
      });
      const semanticService = new InterviewService({
        llmClient: semanticLLM,
        sessionRepository: repo,
      });
      const customApp = createApp({
        interviewService: semanticService,
        sessionRepository: repo,
        llmClient: semanticLLM,
      });

      const session = await repo.createSession();

      const res = await customApp.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: "Alice and alice",
        },
      });

      expect(res.statusCode).toBe(422);
      const body = res.json();
      expect(body.error.code).toBe("INVALID_VALUE");
      expect(body.error.message).toBe(
        "The candidate update structure is valid but violates domain semantics.",
      );
    });

    it("runs interactive end-to-end interview turns with unconfigured MockLLMClient", async () => {
      const unconfiguredMock = new MockLLMClient();
      const defaultService = new InterviewService({
        llmClient: unconfiguredMock,
        sessionRepository: repo,
      });
      const mockApp = createApp({
        interviewService: defaultService,
        sessionRepository: repo,
        llmClient: unconfiguredMock,
      });

      // 1. Create interview session
      const createRes = await mockApp.inject({
        method: "POST",
        url: "/api/sessions",
        payload: {},
      });
      expect(createRes.statusCode).toBe(201);
      const sessionId = createRes.json().session.id;
      expect(createRes.json().session.version).toBe(1);

      // 2. Submit user response for fullName (Turn 1)
      const turn1Res = await mockApp.inject({
        method: "POST",
        url: `/api/sessions/${sessionId}/messages`,
        payload: { content: "Arthur Dent" },
      });
      expect(turn1Res.statusCode).toBe(200);
      const turn1Body = turn1Res.json();
      expect(turn1Body.session.version).toBe(2);
      expect(turn1Body.session.state.fullName.value).toBe("Arthur Dent");
      expect(turn1Body.session.state.fullName.status).toBe("CONFIRMED");
      expect(turn1Body.assistantMessage.content).toContain("home address");

      // 3. Submit user response for homeAddress (Turn 2)
      const turn2Res = await mockApp.inject({
        method: "POST",
        url: `/api/sessions/${sessionId}/messages`,
        payload: { content: "Cottington Lane" },
      });
      expect(turn2Res.statusCode).toBe(200);
      const turn2Body = turn2Res.json();
      expect(turn2Body.session.version).toBe(3);
      expect(turn2Body.session.state.homeAddress.value).toBe("Cottington Lane");
      expect(turn2Body.session.state.homeAddress.status).toBe("CONFIRMED");
      expect(turn2Body.assistantMessage.content).toContain("worldwide assets");
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

    it("safely handles large message payloads without crashing or corrupting state", async () => {
      const session = await repo.createSession();
      const largeContent = "My name is Arthur Dent. ".repeat(4000); // ~96KB

      mockLLM.queueExtractionResult({
        updates: [
          {
            field: "fullName",
            value: "Arthur Dent",
            intent: "NEW",
            confidence: "CLEAR",
          },
        ],
      });
      mockLLM.queueTextResponse("Thank you Arthur, your name is saved.");

      const res = await app.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: largeContent,
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.session.state.fullName.value).toBe("Arthur Dent");
      expect(body.session.state.fullName.status).toBe("CONFIRMED");
    });

    it("safely rejects malformed URL parameters with 400 Bad Request", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/sessions/%20%20/messages",
        payload: {
          content: "Hello",
        },
      });

      expect(res.statusCode).toBe(400);
      const body = res.json();
      expect(body.error.code).toBe("BAD_REQUEST");
      expect(body.error.message).toContain("Invalid session ID parameter");
    });

    it("detects optimistic concurrency conflicts when state version does not match expected", async () => {
      const session = await repo.createSession();

      // State starts at version 1. Simulate an out-of-sync update expecting version 99
      const updatePromise = repo.updateState(
        session.id,
        session.state,
        99, // expectedVersion mismatch
      );

      await expect(updatePromise).rejects.toThrow();
      await expect(updatePromise).rejects.toMatchObject({
        code: "CONCURRENCY_CONFLICT",
      });
    });

    it("runs a multi-turn interview to full completion and generates the complete draft document", async () => {
      const completeLLM = new MockLLMClient({
        extractionResponses: [
          {
            updates: [
              {
                field: "fullName",
                value: "Arthur Dent",
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "homeAddress",
                value: "Cottington Lane, UK",
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "coversWorldwideAssets",
                value: true,
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "hasChildren",
                value: false,
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "executor.name",
                value: "Ford Prefect",
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "executor.relationship",
                value: "Friend",
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "specificGifts",
                value: ["Towel to Ford"],
                intent: "NEW",
                confidence: "CLEAR",
              },
              {
                field: "additionalWishes",
                value: "Don't Panic",
                intent: "NEW",
                confidence: "CLEAR",
              },
            ],
          },
        ],
        textResponses: [
          "All required information has been collected. Your draft document is ready.",
        ],
      });

      const completeService = new InterviewService({
        llmClient: completeLLM,
        sessionRepository: repo,
      });

      const completeApp = createApp({
        interviewService: completeService,
        sessionRepository: repo,
        llmClient: completeLLM,
      });

      const session = await repo.createSession();

      const res = await completeApp.inject({
        method: "POST",
        url: `/api/sessions/${session.id}/messages`,
        payload: {
          content: "Here are all my details...",
        },
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.session.state.fullName.status).toBe("CONFIRMED");
      expect(body.session.state.hasChildren.value).toBe(false);
      expect(body.session.document.status).toBe("draft");
      expect(body.session.document.content).toContain("Arthur Dent");
      expect(body.session.document.content).toContain("Cottington Lane, UK");
      expect(body.session.document.content).toContain(
        "Worldwide Asset Coverage\nYes",
      );
      expect(body.session.document.content).toContain("Children\nNo");
      expect(body.session.document.content).toContain("Ford Prefect");
      expect(body.session.document.content).toContain("Don't Panic");
    });
  });
});
