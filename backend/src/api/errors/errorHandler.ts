import { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { PersistenceError } from "../../application/repositories";
import { LLMClientError } from "../../infrastructure/llm";
import { API_ERROR_CODES, ApiErrorResponse } from "./apiError";

/**
 * Centralized Fastify error handler mapping internal application and domain errors
 * to standard API error responses without exposing secrets, stack traces, or SQL.
 */
export function errorHandler(
  error: FastifyError | Error,
  _request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  // Handle Zod runtime validation errors (e.g. from request payload / param schemas)
  if (error instanceof ZodError) {
    const message =
      error.issues.map((i) => i.message).join(", ") ||
      "Invalid request payload";
    const payload: ApiErrorResponse = {
      error: {
        code: API_ERROR_CODES.BAD_REQUEST,
        message,
      },
    };
    return reply.status(400).send(payload);
  }

  // Handle Fastify built-in schema validation or JSON parse failures
  if ("validation" in error && error.validation) {
    const payload: ApiErrorResponse = {
      error: {
        code: API_ERROR_CODES.BAD_REQUEST,
        message: error.message || "Invalid request payload",
      },
    };
    return reply.status(400).send(payload);
  }

  // Handle syntax error in JSON body
  if ("statusCode" in error && error.statusCode === 400) {
    const payload: ApiErrorResponse = {
      error: {
        code: API_ERROR_CODES.BAD_REQUEST,
        message: "Malformed JSON payload",
      },
    };
    return reply.status(400).send(payload);
  }

  // Handle PersistenceError
  if (error instanceof PersistenceError) {
    if (error.code === "NOT_FOUND") {
      const payload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.NOT_FOUND,
          message: error.message,
        },
      };
      return reply.status(404).send(payload);
    }
    if (error.code === "CONCURRENCY_CONFLICT") {
      const payload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.CONCURRENCY_CONFLICT,
          message: "The session state has changed concurrently. Please retry.",
        },
      };
      return reply.status(409).send(payload);
    }
    if (error.code === "INVALID_STATE") {
      const payload: ApiErrorResponse = {
        error: {
          code: API_ERROR_CODES.BAD_REQUEST,
          message: error.message,
        },
      };
      return reply.status(400).send(payload);
    }
    const payload: ApiErrorResponse = {
      error: {
        code: API_ERROR_CODES.PERSISTENCE_ERROR,
        message: "A database error occurred.",
      },
    };
    return reply.status(500).send(payload);
  }

  // Handle LLM provider errors
  if (error instanceof LLMClientError) {
    const payload: ApiErrorResponse = {
      error: {
        code: API_ERROR_CODES.PROVIDER_ERROR,
        message: "The AI service is temporarily unavailable.",
      },
    };
    return reply.status(503).send(payload);
  }

  // Handle Fastify 404 (Route not found)
  if ("statusCode" in error && error.statusCode === 404) {
    const payload: ApiErrorResponse = {
      error: {
        code: API_ERROR_CODES.NOT_FOUND,
        message: "Resource not found",
      },
    };
    return reply.status(404).send(payload);
  }

  // Default internal server error
  const payload: ApiErrorResponse = {
    error: {
      code: API_ERROR_CODES.INTERNAL_SERVER_ERROR,
      message: "An unexpected error occurred",
    },
  };
  return reply.status(500).send(payload);
}

/**
 * 404 handler for routes not found.
 */
export function notFoundHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): FastifyReply {
  const payload: ApiErrorResponse = {
    error: {
      code: API_ERROR_CODES.NOT_FOUND,
      message: "Resource not found",
    },
  };
  return reply.status(404).send(payload);
}
