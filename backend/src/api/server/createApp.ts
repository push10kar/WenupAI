import fastify, { FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import { InterviewService } from "../../application/interview";
import {
  SQLiteSessionRepository,
  createDatabase,
} from "../../infrastructure/db";
import { createLLMClient } from "../../infrastructure/llm";
import { config } from "../../config";
import { errorHandler, notFoundHandler } from "../errors";
import { configRoutes, healthRoutes, sessionRoutes } from "../routes";
import { AppDependencies } from "./types";

/**
 * Factory function creating a configured Fastify application.
 * Accepts optional injected dependencies for testing and flexibility.
 */
export function createApp(dependencies: AppDependencies = {}): FastifyInstance {
  const app = fastify({
    logger: false,
  });

  // Wire dependencies with defaults if not injected
  const dbPath = process.env.DATABASE_PATH || ":memory:";
  const repo =
    dependencies.sessionRepository ??
    new SQLiteSessionRepository(createDatabase(dbPath));

  const llm = dependencies.llmClient ?? createLLMClient(config);

  const interviewService =
    dependencies.interviewService ??
    new InterviewService({
      llmClient: llm,
      sessionRepository: repo,
    });

  // Global middlewares / plugins
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Centralized error handling
  app.setErrorHandler(errorHandler);
  app.setNotFoundHandler(notFoundHandler);

  // Routes
  app.register(configRoutes);
  app.register(healthRoutes);
  app.register(sessionRoutes, {
    interviewService,
    sessionRepository: repo,
  });

  return app;
}
