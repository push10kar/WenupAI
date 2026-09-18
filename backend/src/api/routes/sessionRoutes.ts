import crypto from "node:crypto";
import { FastifyPluginAsync } from "fastify";
import { InterviewService } from "../../application/interview";
import {
  SessionRepository,
  PersistenceError,
} from "../../application/repositories";
import { Message } from "../../infrastructure/llm";
import {
  createSessionBodySchema,
  sessionIdParamSchema,
  sendMessageBodySchema,
} from "../schemas";
import { API_ERROR_CODES, ApiErrorResponse } from "../errors";

export interface SessionRouteOptions {
  interviewService: InterviewService;
  sessionRepository?: SessionRepository;
}

export const sessionRoutes: FastifyPluginAsync<SessionRouteOptions> = async (
  fastify,
  opts,
) => {
  const { interviewService, sessionRepository } = opts;

  /**
   * POST /api/sessions
   * Creates a new interview session and initializes the first question as an assistant message.
   */
  fastify.post("/api/sessions", async (request, reply) => {
    const parseResult = createSessionBodySchema.safeParse(request.body || {});
    if (!parseResult.success) {
      const message = parseResult.error.issues.map((i) => i.message).join(", ");
      const errPayload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.BAD_REQUEST,
          message,
        },
      };
      return reply.status(400).send(errPayload);
    }

    const session = await interviewService.createSession(
      parseResult.data?.initialState,
    );

    // Initialize the first question as an assistant message so caller immediately receives the intake prompt
    const initialInterview = await interviewService.startInterview(
      session.state,
    );
    const content =
      "assistantMessage" in initialInterview
        ? initialInterview.assistantMessage
        : "Hello! To begin preparing your personal wishes document, what is your full legal name?";

    const initialMessage: Message = {
      id: crypto.randomUUID(),
      role: "assistant",
      content,
      createdAt: new Date().toISOString(),
    };

    if (sessionRepository) {
      try {
        await sessionRepository.addMessage(session.id, initialMessage);
      } catch {
        // Safe fallback if message logging fails
      }
    }

    const currentSession =
      (await interviewService.getSession(session.id)) ?? session;
    return reply.status(201).send({
      session: currentSession,
    });
  });

  /**
   * GET /api/sessions/:id
   * Retrieves an existing session snapshot by ID.
   */
  fastify.get("/api/sessions/:id", async (request, reply) => {
    const paramsResult = sessionIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      const errPayload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.BAD_REQUEST,
          message: "Invalid session ID parameter",
        },
      };
      return reply.status(400).send(errPayload);
    }

    const session = await interviewService.getSession(paramsResult.data.id);
    if (!session) {
      const errPayload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: `Session '${paramsResult.data.id}' not found`,
        },
      };
      return reply.status(404).send(errPayload);
    }

    return reply.status(200).send({
      session,
    });
  });

  /**
   * POST /api/sessions/:id/messages
   * Submits a user message turn to advance the interview.
   */
  fastify.post("/api/sessions/:id/messages", async (request, reply) => {
    const paramsResult = sessionIdParamSchema.safeParse(request.params);
    if (!paramsResult.success) {
      const errPayload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.BAD_REQUEST,
          message: "Invalid session ID parameter",
        },
      };
      return reply.status(400).send(errPayload);
    }

    const bodyResult = sendMessageBodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      const message = bodyResult.error.issues.map((i) => i.message).join(", ");
      const errPayload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.BAD_REQUEST,
          message,
        },
      };
      return reply.status(400).send(errPayload);
    }

    const sessionId = paramsResult.data.id;
    const content = bodyResult.data.content;

    try {
      const result = await interviewService.processSessionMessage(
        sessionId,
        content,
      );

      switch (result.status) {
        case "QUESTION":
        case "COMPLETE": {
          const updatedSession = await interviewService.getSession(sessionId);
          if (!updatedSession) {
            const errPayload: ApiErrorResponse = {
              error: {
                code: API_ERROR_CODES.NOT_FOUND,
                message: `Session '${sessionId}' not found`,
              },
            };
            return reply.status(404).send(errPayload);
          }

          const lastMsg =
            updatedSession.messages[updatedSession.messages.length - 1];
          const assistantMessage: Message =
            lastMsg && lastMsg.role === "assistant"
              ? lastMsg
              : {
                  id: crypto.randomUUID(),
                  role: "assistant",
                  content: result.assistantMessage,
                  createdAt: new Date().toISOString(),
                };

          return reply.status(200).send({
            session: updatedSession,
            assistantMessage,
          });
        }

        case "VALIDATION_ERROR": {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.VALIDATION_ERROR,
              message: "The candidate update failed semantic validation.",
            },
          };
          return reply.status(422).send(errPayload);
        }

        case "CONFLICT": {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.CONFLICT,
              message: "The candidate update conflicts with confirmed wishes.",
            },
          };
          return reply.status(409).send(errPayload);
        }

        case "TRANSITION_ERROR": {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.TRANSITION_ERROR,
              message: "Unable to apply state transition.",
            },
          };
          return reply.status(422).send(errPayload);
        }

        case "PROVIDER_ERROR": {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.PROVIDER_ERROR,
              message: "The AI service is temporarily unavailable.",
            },
          };
          return reply.status(503).send(errPayload);
        }

        case "PERSISTENCE_ERROR": {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.PERSISTENCE_ERROR,
              message:
                "A database error occurred while saving the interview session.",
            },
          };
          return reply.status(500).send(errPayload);
        }
      }
    } catch (err) {
      if (err instanceof PersistenceError) {
        if (err.code === "NOT_FOUND") {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.NOT_FOUND,
              message: `Session '${sessionId}' not found`,
            },
          };
          return reply.status(404).send(errPayload);
        }
        if (err.code === "CONCURRENCY_CONFLICT") {
          const errPayload: ApiErrorResponse = {
            error: {
              code: API_ERROR_CODES.CONCURRENCY_CONFLICT,
              message:
                "The session state has changed concurrently. Please retry.",
            },
          };
          return reply.status(409).send(errPayload);
        }
      }
      throw err;
    }
  });
};
