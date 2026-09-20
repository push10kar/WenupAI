import crypto from "node:crypto";
import { FastifyPluginAsync } from "fastify";
import { InterviewService } from "../../application/interview";
import {
  SessionRepository,
  PersistenceError,
} from "../../application/repositories";
import { LLMClientError, Message } from "../../infrastructure/llm";
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

function getProviderErrorMessage(error: unknown): string {
  if (!(error instanceof LLMClientError)) {
    return "The AI service is temporarily unavailable. Please try again.";
  }

  switch (error.code) {
    case "CONFIGURATION_ERROR":
      return "Gemini is not configured correctly. Check GEMINI_API_KEY and LLM_PROVIDER.";
    case "PROVIDER_AUTH_ERROR":
      return "Gemini authentication failed. Check that your API key is valid and has Gemini API access.";
    case "PROVIDER_RATE_LIMIT":
      return "Gemini rate limit reached. Check your quota or try again later.";
    case "PROVIDER_ERROR":
      return "Gemini rejected the request. Check that GEMINI_MODEL is supported for your API key.";
    case "PROVIDER_TIMEOUT":
      return "Gemini took too long to respond. Try again or increase LLM_TIMEOUT_MS.";
    case "MALFORMED_OUTPUT":
      return "Gemini returned an unexpected response. Try again.";
    default:
      return "The AI service is temporarily unavailable. Please try again.";
  }
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
          const primaryError = result.errors[0];
          let errorCode: string = API_ERROR_CODES.VALIDATION_ERROR;
          let errorMessage = "The candidate update failed validation.";

          if (primaryError) {
            errorCode = primaryError.code;
            switch (primaryError.stage) {
              case "PARSE":
                errorMessage =
                  "The candidate update response could not be parsed.";
                break;
              case "SCHEMA":
                errorMessage =
                  "The candidate update response does not satisfy CandidateUpdate schema.";
                break;
              case "SEMANTIC":
                errorMessage =
                  "The candidate update structure is valid but violates domain semantics.";
                break;
              default:
                errorMessage = "The candidate update failed validation.";
            }
          }

          const errPayload: ApiErrorResponse = {
            error: {
              code: errorCode,
              message: errorMessage,
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
              message: getProviderErrorMessage(result.error),
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
