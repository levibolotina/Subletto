import type { FastifyInstance } from "fastify";
import { SubmitReportSchema } from "../../schemas/reports.js";
import { submitReport } from "../../services/reports.js";

export async function reportRoutes(fastify: FastifyInstance) {
  // POST /v1/reports — any authenticated user can file a report
  fastify.post(
    "/reports",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = SubmitReportSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const report = await submitReport(user.id, result.data);
        return reply.code(201).send({ report });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Report submission failed";
        const code =
          message.includes("not found") ? 404
          : message === "Cannot report yourself" ? 422
          : 500;
        return reply.code(code).send({ error: message });
      }
    },
  );
}
