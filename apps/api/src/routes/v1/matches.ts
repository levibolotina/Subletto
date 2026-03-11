import type { FastifyInstance } from "fastify";
import { CreateEscrowSchema, RespondToMatchSchema } from "../../schemas/matches.js";
import {
  createMatchCheckout,
  respondToMatch,
  createEscrowPaymentIntent,
  confirmMoveIn,
  getUserMatches,
  getMatchById,
} from "../../services/matches.js";

export async function matchRoutes(fastify: FastifyInstance) {
  // POST /v1/matches/:listingId/checkout — seeker initiates match ($99 Checkout session)
  fastify.post(
    "/matches/:listingId/checkout",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { listingId } = request.params as { listingId: string };
      try {
        const result = await createMatchCheckout(listingId, user.id);
        return reply.code(201).send(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Checkout creation failed";
        const code = message === "Listing not available" ? 404 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // GET /v1/matches — list all matches for the current user
  fastify.get(
    "/matches",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const matches = await getUserMatches(user.id);
      return reply.send({ matches });
    },
  );

  // GET /v1/matches/:matchId — get single match (contact info revealed per status)
  fastify.get(
    "/matches/:matchId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { matchId } = request.params as { matchId: string };
      try {
        const match = await getMatchById(matchId, user.id);
        return reply.send({ match });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to fetch match";
        const code = message === "Match not found" ? 404 : message === "Forbidden" ? 403 : 500;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // POST /v1/matches/:matchId/respond — lister accepts or declines
  fastify.post(
    "/matches/:matchId/respond",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { matchId } = request.params as { matchId: string };
      const result = RespondToMatchSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const match = await respondToMatch(matchId, user.id, result.data);
        return reply.send({ match });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Response failed";
        const code =
          message === "Match not found" ? 404 : message === "Forbidden" ? 403 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // POST /v1/matches/:matchId/escrow — seeker initiates optional escrow payment
  fastify.post(
    "/matches/:matchId/escrow",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { matchId } = request.params as { matchId: string };
      const result = CreateEscrowSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const escrow = await createEscrowPaymentIntent(matchId, user.id, result.data);
        return reply.code(201).send(escrow);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Escrow creation failed";
        const code =
          message === "Match not found" ? 404 : message === "Forbidden" ? 403 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // POST /v1/matches/:matchId/confirm-movein — lister confirms move-in, releases escrow
  fastify.post(
    "/matches/:matchId/confirm-movein",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { matchId } = request.params as { matchId: string };
      try {
        const result = await confirmMoveIn(matchId, user.id);
        return reply.send(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Move-in confirmation failed";
        const code =
          message === "Match not found" ? 404 : message === "Forbidden" ? 403 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );
}
