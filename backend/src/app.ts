import { FastifyInstance } from "fastify";
import { createApp } from "./api";

const fastifyApp = createApp();

// Fastify instance callable wrapper ensuring backward-compatibility with supertest(app)
// while providing full native FastifyInstance capabilities (inject, listen, register, etc.)
const handler = (req: unknown, res: unknown) => {
  fastifyApp.ready().then(() => {
    (
      fastifyApp as unknown as { routing: (req: unknown, res: unknown) => void }
    ).routing(req, res);
  });
};

export const app = new Proxy(handler, {
  get(target, prop) {
    if (prop in target)
      return (target as unknown as Record<string, unknown>)[prop as string];
    const val = (fastifyApp as unknown as Record<string, unknown>)[
      prop as string
    ];
    return typeof val === "function" ? val.bind(fastifyApp) : val;
  },
}) as unknown as FastifyInstance;

export { createApp };
