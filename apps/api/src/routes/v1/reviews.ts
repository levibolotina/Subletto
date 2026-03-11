import type { FastifyInstance } from "fastify";
import { SubmitReviewSchema } from "../../schemas/reviews.js";
import {
  submitReview,
  getPendingReviews,
  getUserReviews,
  getConfirmedTransactionCount,
} from "../../services/reviews.js";
import { TRUSTED_BADGE_MIN_TRANSACTIONS } from "@subletto/shared";

export async function reviewRoutes(fastify: FastifyInstance) {
  // POST /v1/matches/:matchId/reviews — submit a review for a confirmed match
  fastify.post(
    "/matches/:matchId/reviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { matchId } = request.params as { matchId: string };
      const result = SubmitReviewSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const review = await submitReview(matchId, user.id, result.data);
        return reply.code(201).send({ review });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Review submission failed";
        const code =
          message === "Match not found" ? 404
          : message === "Forbidden" ? 403
          : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // GET /v1/reviews/pending — matches where the current user hasn't yet left a review
  fastify.get(
    "/reviews/pending",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const pending = await getPendingReviews(user.id);
      return reply.send({ pending });
    },
  );

  // GET /v1/users/:userId/reviews — public trust profile for a user
  fastify.get(
    "/users/:userId/reviews",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const { userId } = request.params as { userId: string };
      const [reviews, transactionCount] = await Promise.all([
        getUserReviews(userId),
        getConfirmedTransactionCount(userId),
      ]);
      return reply.send({
        reviews,
        transactionCount,
        isTrusted: transactionCount >= TRUSTED_BADGE_MIN_TRANSACTIONS,
      });
    },
  );
}
