import { z } from "zod";
import type { FastifyInstance } from "fastify";
import { SubmitVerificationSchema, AdminReviewSchema, SetLeaseAnswerSchema } from "../../schemas/verification.js";
import {
  submitVerification,
  getVerificationStatus,
  reviewVerification,
  setLeaseAnswer,
} from "../../services/verification.js";
import { prisma } from "@subletto/db";

const SetRoleSchema = z.object({
  role: z.enum(["LISTER", "SEEKER"]),
});

export async function authRoutes(fastify: FastifyInstance) {
  // POST /v1/auth/verify — lister submits ID + lease docs
  fastify.post(
    "/auth/verify",
    { config: { rateLimit: { max: 5, timeWindow: "1 hour" } }, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = SubmitVerificationSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }

      try {
        const verification = await submitVerification(user.id, result.data);
        return reply.code(201).send({ verification });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Submission failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // GET /v1/auth/status — check the current user's verification state
  fastify.get(
    "/auth/status",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      try {
        const status = await getVerificationStatus(user.id);
        return reply.send(status);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch status";
        return reply.code(500).send({ error: message });
      }
    },
  );

  // PATCH /v1/auth/lease-answer — lister self-reports whether lease permits subletting
  fastify.patch(
    "/auth/lease-answer",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } }, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = SetLeaseAnswerSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const verification = await setLeaseAnswer(user.id, result.data);
        return reply.send({ listerLeaseAnswer: verification.listerLeaseAnswer });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to save answer";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // PATCH /v1/auth/role — set role during onboarding (one-time, LISTER or SEEKER only)
  fastify.patch(
    "/auth/role",
    { config: { rateLimit: { max: 10, timeWindow: "1 hour" } }, preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      // Prevent role escalation — only allow setting LISTER/SEEKER
      if (user.role === "ADMIN") {
        return reply.code(403).send({ error: "Admin role cannot be changed" });
      }
      const result = SetRoleSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: { role: result.data.role },
      });
      return reply.send({ role: updated.role });
    },
  );

  // POST /v1/admin/verify/:userId — admin approves or rejects
  fastify.post(
    "/admin/verify/:userId",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const result = AdminReviewSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }

      try {
        const verification = await reviewVerification(
          request.dbUser!.id,
          userId,
          result.data,
        );
        return reply.send({ verification });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Review failed";
        return reply.code(422).send({ error: message });
      }
    },
  );
}
