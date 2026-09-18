import { FastifyPluginAsync } from "fastify";

/**
 * Health check endpoint matching ARCHITECTURE.md Section 9.2.
 */
export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get("/health", async (_request, reply) => {
    return reply.status(200).send({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });
};
