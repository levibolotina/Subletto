import type { FastifyInstance } from "fastify";
import { ResolveReportSchema } from "../../schemas/reports.js";
import {
  getPendingReports,
  getFlaggedListings,
  resolveReport,
} from "../../services/reports.js";

export async function adminRoutes(fastify: FastifyInstance) {
  // GET /v1/admin/reports — list all pending reports
  fastify.get(
    "/admin/reports",
    { preHandler: [fastify.requireAdmin] },
    async (_request, reply) => {
      const reports = await getPendingReports();
      return reply.send({ reports });
    },
  );

  // POST /v1/admin/reports/:reportId/resolve — dismiss or take action
  fastify.post(
    "/admin/reports/:reportId/resolve",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const admin = request.dbUser!;
      const { reportId } = request.params as { reportId: string };
      const result = ResolveReportSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const report = await resolveReport(reportId, admin.id, result.data);
        return reply.send({ report });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Resolution failed";
        const code = message === "Report not found" ? 404 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // GET /v1/admin/flagged — list flagged listings for review
  fastify.get(
    "/admin/flagged",
    { preHandler: [fastify.requireAdmin] },
    async (_request, reply) => {
      const listings = await getFlaggedListings();
      return reply.send({ listings });
    },
  );

  // POST /v1/admin/flagged/:listingId/clear — clear a scam flag (approve listing)
  fastify.post(
    "/admin/flagged/:listingId/clear",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { listingId } = request.params as { listingId: string };
      const { action } = request.body as { action: "approve" | "archive" };
      if (!["approve", "archive"].includes(action)) {
        return reply.code(400).send({ error: "action must be approve or archive" });
      }
      const { prisma } = await import("@subletto/db");
      await prisma.listing.update({
        where: { id: listingId },
        data: {
          isFlagged: false,
          status: action === "approve" ? "ACTIVE" : "ARCHIVED",
        },
      });
      return reply.send({ ok: true });
    },
  );
}
