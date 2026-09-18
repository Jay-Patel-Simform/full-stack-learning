import type { FastifyInstance } from "fastify";

// * Simple "are you alive?" route.
export default async function healthRoutes(app: FastifyInstance) {
  app.get("/health", async () => ({ ok: true }));
}
