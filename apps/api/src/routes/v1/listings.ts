import type { FastifyInstance } from "fastify";
import {
  CreateListingSchema,
  UpdateListingSchema,
  SearchFiltersSchema,
  SavedSearchSchema,
  AdminListingReviewSchema,
} from "../../schemas/listings.js";
import {
  createListing,
  updateListing,
  submitForReview,
  getOwnerListings,
  deleteListing,
  addPhoto,
  removePhoto,
  getPublicListing,
  searchListings,
  adminReviewListing,
  getPendingListings,
  confirmListingAvailability,
  createSavedSearch,
  getSavedSearches,
  deleteSavedSearch,
} from "../../services/listings.js";

export async function listingRoutes(fastify: FastifyInstance) {
  // ── PUBLIC ROUTES ─────────────────────────────────────────────────────────

  // GET /v1/listings — search active listings
  fastify.get("/listings", async (request, reply) => {
    const result = SearchFiltersSchema.safeParse(request.query);
    if (!result.success) {
      return reply.code(400).send({ error: result.error.flatten() });
    }
    const listings = await searchListings(result.data);
    return reply.send(listings);
  });

  // GET /v1/listings/:slug — public anonymized single listing
  fastify.get("/listings/:slug", async (request, reply) => {
    const { slug } = request.params as { slug: string };
    const listing = await getPublicListing(slug);
    if (!listing) return reply.code(404).send({ error: "Listing not found" });
    return reply.send({ listing });
  });

  // GET /v1/listings/confirm — email confirmation link handler
  fastify.get("/listings/confirm", async (request, reply) => {
    const { token } = request.query as { token?: string };
    if (!token) return reply.code(400).send({ error: "token required" });
    try {
      await confirmListingAvailability(token);
      return reply.send({ message: "Listing confirmed — thank you!" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Confirmation failed";
      return reply.code(422).send({ error: message });
    }
  });

  // ── LISTER ROUTES (authenticated) ────────────────────────────────────────

  // POST /v1/listings — create a draft listing
  fastify.post(
    "/listings",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = CreateListingSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const listing = await createListing(user.id, result.data);
        return reply.code(201).send({ listing });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Creation failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // GET /v1/listings/mine — lister's own listings
  fastify.get(
    "/listings/mine",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const listings = await getOwnerListings(user.id);
      return reply.send({ listings });
    },
  );

  // PATCH /v1/listings/:id — update listing fields
  fastify.patch(
    "/listings/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { id } = request.params as { id: string };
      const result = UpdateListingSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const listing = await updateListing(id, user.id, result.data);
        return reply.send({ listing });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Update failed";
        const code = message === "Forbidden" ? 403 : message === "Listing not found" ? 404 : 422;
        return reply.code(code).send({ error: message });
      }
    },
  );

  // POST /v1/listings/:id/submit — submit DRAFT → PENDING_REVIEW
  fastify.post(
    "/listings/:id/submit",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { id } = request.params as { id: string };
      try {
        const listing = await submitForReview(id, user.id);
        return reply.send({ listing });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Submit failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // DELETE /v1/listings/:id — delete a DRAFT/ARCHIVED/EXPIRED listing
  fastify.delete(
    "/listings/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { id } = request.params as { id: string };
      try {
        await deleteListing(id, user.id);
        return reply.code(204).send();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Delete failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // POST /v1/listings/:id/photos — register an uploaded photo
  fastify.post(
    "/listings/:id/photos",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { id } = request.params as { id: string };
      const { storageKey, order, isPrimary } = request.body as {
        storageKey: string;
        order: number;
        isPrimary: boolean;
      };
      try {
        const photo = await addPhoto(id, user.id, storageKey, order ?? 0, isPrimary ?? false);
        return reply.code(201).send({ photo });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Photo add failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // DELETE /v1/listings/photos/:photoId — remove a photo
  fastify.delete(
    "/listings/photos/:photoId",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { photoId } = request.params as { photoId: string };
      try {
        await removePhoto(photoId, user.id);
        return reply.code(204).send();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Photo remove failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // ── SAVED SEARCHES ────────────────────────────────────────────────────────

  // POST /v1/saved-searches
  fastify.post(
    "/saved-searches",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const result = SavedSearchSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const search = await createSavedSearch(user.id, result.data);
        return reply.code(201).send({ search });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to create saved search";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // GET /v1/saved-searches
  fastify.get(
    "/saved-searches",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const searches = await getSavedSearches(user.id);
      return reply.send({ searches });
    },
  );

  // DELETE /v1/saved-searches/:id
  fastify.delete(
    "/saved-searches/:id",
    { preHandler: [fastify.authenticate] },
    async (request, reply) => {
      const user = request.dbUser!;
      const { id } = request.params as { id: string };
      try {
        await deleteSavedSearch(id, user.id);
        return reply.code(204).send();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Delete failed";
        return reply.code(422).send({ error: message });
      }
    },
  );

  // ── ADMIN ROUTES ──────────────────────────────────────────────────────────

  // GET /v1/admin/listings — pending review queue
  fastify.get(
    "/admin/listings",
    { preHandler: [fastify.requireAdmin] },
    async (_request, reply) => {
      const listings = await getPendingListings();
      return reply.send({ listings });
    },
  );

  // POST /v1/admin/listings/:id/review — approve or reject
  fastify.post(
    "/admin/listings/:id/review",
    { preHandler: [fastify.requireAdmin] },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const result = AdminListingReviewSchema.safeParse(request.body);
      if (!result.success) {
        return reply.code(400).send({ error: result.error.flatten() });
      }
      try {
        const listing = await adminReviewListing(id, result.data);
        return reply.send({ listing });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Review failed";
        return reply.code(422).send({ error: message });
      }
    },
  );
}
