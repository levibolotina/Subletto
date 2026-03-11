import type { FastifyInstance } from "fastify";
import {
  GenerateSubleaseSchema,
  SendDocuSignSchema,
  LandlordPacketSchema,
} from "../../schemas/documents.js";
import {
  generateSubleaseAgreement,
  sendForDocuSign,
  getDocumentsByMatch,
  generateLandlordPacket,
  handleDocuSignWebhook,
} from "../../services/documents.js";

export async function documentRoutes(fastify: FastifyInstance) {
  // ── POST /v1/documents/generate ─────────────────────────────────────────
  // Generate a Colorado sublease agreement PDF for a CONFIRMED match.
  fastify.post(
    "/documents/generate",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = GenerateSubleaseSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const data = await generateSubleaseAgreement(result.data, user.id);
        return reply.code(201).send(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Generation failed";
        const code =
          message === "Forbidden"
            ? 403
            : message === "Match not found"
              ? 404
              : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // ── POST /v1/documents/send-docusign ────────────────────────────────────
  // Send a GENERATED document to DocuSign for e-signature.
  fastify.post(
    "/documents/send-docusign",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = SendDocuSignSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const data = await sendForDocuSign(result.data, user.id);
        return reply.send(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "DocuSign send failed";
        const code = message === "Forbidden" ? 403 : message === "Document not found" ? 404 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // ── GET /v1/documents/:matchId ───────────────────────────────────────────
  // Fetch all documents (with signed download URLs) for a match.
  fastify.get(
    "/documents/:matchId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { matchId } = request.params as { matchId: string };
      try {
        const documents = await getDocumentsByMatch(matchId, user.id);
        return reply.send({ documents });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Fetch failed";
        const code = message === "Forbidden" ? 403 : message === "Match not found" ? 404 : 500;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // ── POST /v1/documents/landlord-packet ──────────────────────────────────
  // Generate (and optionally email) a landlord approval packet for a listing.
  // This is a $35 add-on; payment is validated via addOnPaidAt or Stripe session
  // (for now, generation is immediate — payment gate can be added in a follow-up).
  fastify.post(
    "/documents/landlord-packet",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = LandlordPacketSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const data = await generateLandlordPacket(result.data, user.id);
        return reply.code(201).send(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Packet generation failed";
        const code = message === "Forbidden" ? 403 : message === "Listing not found" ? 404 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // ── POST /v1/webhooks/docusign ──────────────────────────────────────────
  // DocuSign Connect webhook — called by DocuSign when envelope status changes.
  // Registered as a public route (no auth header from DocuSign).
  fastify.post("/webhooks/docusign", async (request, reply) => {
    try {
      // DocuSign Connect sends JSON with event data
      const body = request.body as {
        event?: string;
        data?: { envelopeId?: string; envelopeSummary?: { status?: string } };
      };

      const envelopeId = body?.data?.envelopeId;
      const status =
        body?.data?.envelopeSummary?.status ?? body?.event ?? "";

      if (envelopeId && status) {
        await handleDocuSignWebhook(envelopeId, status);
      }

      return reply.code(200).send({ received: true });
    } catch (err: unknown) {
      fastify.log.error(err, "DocuSign webhook error");
      return reply.code(500).send({ error: "Webhook processing failed" });
    }
  });
}
