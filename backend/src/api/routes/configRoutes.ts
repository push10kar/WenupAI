import { FastifyPluginAsync } from "fastify";
import { getActiveProvider } from "../../infrastructure/llm/providerTelemetry";

/**
 * Lightweight config endpoint exposing the provider actually serving LLM
 * requests so the frontend can display the provider in use in real time (e.g. a
 * badge on the chat card).
 *
 * Only exposes the non-sensitive provider identifier — never API keys, models
 * reached via env fallbacks, database paths, or any other operational detail.
 */
export const configRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/api/config/llm", async (_request, reply) => {
    return reply.status(200).send({
      provider: getActiveProvider(),
    });
  });
};