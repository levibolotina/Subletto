import { prisma } from "@subletto/db";
import { slugify, formatCurrency } from "@subletto/shared";
import { randomBytes } from "crypto";
import { checkForScamFlags } from "./scam-detection.js";
import type {
  CreateListingInput,
  UpdateListingInput,
  SearchFiltersInput,
  SavedSearchInput,
  AdminListingReviewInput,
} from "../schemas/listings.js";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function generateSlug(base: string): string {
  const suffix = randomBytes(3).toString("hex"); // 6-char hex
  return `${slugify(base)}-${suffix}`;
}

function generateConfirmationToken(): string {
  return randomBytes(24).toString("hex");
}

/** Strip fields that must never be exposed publicly. */
function toPublicView(listing: Awaited<ReturnType<typeof fetchListingWithPhotos>>) {
  if (!listing) return null;
  return {
    id: listing.id,
    slug: listing.slug,
    status: listing.status,
    title: listing.title,
    description: listing.description,
    neighborhood: listing.neighborhood,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    furnished: listing.furnished,
    petFriendly: listing.petFriendly,
    parking: listing.parking,
    rentCents: listing.rentCents,
    availableFrom: listing.availableFrom.toISOString(),
    availableTo: listing.availableTo.toISOString(),
    ownerVerified: !!listing.owner.verifiedAt,
    ownerTrustScore: listing.owner.trustScore,
    ownerReviewCount: listing.owner.reviewsReceived?.length ?? 0,
    isFlagged: listing.isFlagged,
    photos: listing.photos.map((p) => ({
      storageKey: p.storageKey,
      order: p.order,
      isPrimary: p.isPrimary,
    })),
    createdAt: listing.createdAt.toISOString(),
  };
}

async function fetchListingWithPhotos(where: { id?: string; slug?: string }) {
  return prisma.listing.findFirst({
    where,
    include: {
      photos: { orderBy: { order: "asc" } },
      owner: {
        select: {
          verifiedAt: true,
          trustScore: true,
          reviewsReceived: { select: { id: true } },
        },
      },
    },
  });
}

// ─── LISTER OPERATIONS ───────────────────────────────────────────────────────

export async function createListing(userId: string, input: CreateListingInput) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");
  if (user.role !== "LISTER") throw new Error("Only listers can create listings");

  const slug = generateSlug(`${input.neighborhood} ${input.bedrooms}br`);

  return prisma.listing.create({
    data: {
      ownerId: userId,
      slug,
      status: "DRAFT",
      title: input.title,
      description: input.description,
      neighborhood: input.neighborhood,
      bedrooms: input.bedrooms,
      bathrooms: input.bathrooms,
      furnished: input.furnished,
      petFriendly: input.petFriendly,
      parking: input.parking,
      rentCents: input.rentCents,
      availableFrom: new Date(input.availableFrom),
      availableTo: new Date(input.availableTo),
      address: input.address,
      zipCode: input.zipCode,
    },
  });
}

export async function updateListing(
  listingId: string,
  userId: string,
  input: UpdateListingInput,
) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== userId) throw new Error("Forbidden");
  if (!["DRAFT", "ACTIVE"].includes(listing.status)) {
    throw new Error("Only DRAFT or ACTIVE listings can be edited");
  }

  return prisma.listing.update({
    where: { id: listingId },
    data: {
      ...(input.title && { title: input.title }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.neighborhood && { neighborhood: input.neighborhood }),
      ...(input.bedrooms !== undefined && { bedrooms: input.bedrooms }),
      ...(input.bathrooms !== undefined && { bathrooms: input.bathrooms }),
      ...(input.furnished !== undefined && { furnished: input.furnished }),
      ...(input.petFriendly !== undefined && { petFriendly: input.petFriendly }),
      ...(input.parking !== undefined && { parking: input.parking }),
      ...(input.rentCents !== undefined && { rentCents: input.rentCents }),
      ...(input.availableFrom && { availableFrom: new Date(input.availableFrom) }),
      ...(input.availableTo && { availableTo: new Date(input.availableTo) }),
      ...(input.address && { address: input.address }),
      ...(input.zipCode && { zipCode: input.zipCode }),
    },
  });
}

export async function submitForReview(listingId: string, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { verification: true },
  });
  if (!user) throw new Error("User not found");
  if (!user.verifiedAt) throw new Error("You must be verified before submitting a listing");

  // Block if admin has determined the lease prohibits subletting
  if (user.verification?.leasePermission === "PROHIBITED") {
    throw new Error(
      "Your lease does not permit subletting. Consider purchasing the Landlord Approval Packet ($35) to request consent from your landlord.",
    );
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== userId) throw new Error("Forbidden");
  if (listing.status !== "DRAFT") throw new Error("Only DRAFT listings can be submitted for review");

  const updated = await prisma.listing.update({
    where: { id: listingId },
    data: { status: "PENDING_REVIEW" },
  });

  // Run scam-detection heuristics asynchronously — don't block the response
  checkForScamFlags({
    id: listing.id,
    rentCents: listing.rentCents,
    neighborhood: listing.neighborhood,
    bedrooms: listing.bedrooms,
    description: listing.description,
    ownerId: listing.ownerId,
  }).catch(() => {
    // Non-fatal: scam detection failure should not block submission
  });

  return updated;
}

export async function getOwnerListings(userId: string) {
  return prisma.listing.findMany({
    where: { ownerId: userId },
    include: {
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteListing(listingId: string, userId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== userId) throw new Error("Forbidden");
  if (!["DRAFT", "ARCHIVED", "EXPIRED"].includes(listing.status)) {
    throw new Error("Only DRAFT, ARCHIVED, or EXPIRED listings can be deleted");
  }
  return prisma.listing.delete({ where: { id: listingId } });
}

// ─── PHOTO OPERATIONS ────────────────────────────────────────────────────────

export async function addPhoto(
  listingId: string,
  userId: string,
  storageKey: string,
  order: number,
  isPrimary: boolean,
) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { photos: true },
  });
  if (!listing) throw new Error("Listing not found");
  if (listing.ownerId !== userId) throw new Error("Forbidden");
  if (listing.photos.length >= 8) throw new Error("Maximum of 8 photos allowed");

  return prisma.listingPhoto.create({
    data: { listingId, storageKey, order, isPrimary },
  });
}

export async function removePhoto(photoId: string, userId: string) {
  const photo = await prisma.listingPhoto.findUnique({
    where: { id: photoId },
    include: { listing: true },
  });
  if (!photo) throw new Error("Photo not found");
  if (photo.listing.ownerId !== userId) throw new Error("Forbidden");
  return prisma.listingPhoto.delete({ where: { id: photoId } });
}

// ─── PUBLIC OPERATIONS ───────────────────────────────────────────────────────

export async function getPublicListing(slug: string) {
  const listing = await fetchListingWithPhotos({ slug });
  if (!listing || listing.status !== "ACTIVE") return null;
  return toPublicView(listing);
}

export async function searchListings(filters: SearchFiltersInput) {
  const {
    neighborhood,
    minRentCents,
    maxRentCents,
    availableFrom,
    availableTo,
    bedrooms,
    petFriendly,
    furnished,
    page,
    pageSize,
  } = filters;

  const where = {
    status: "ACTIVE" as const,
    ...(neighborhood && { neighborhood }),
    ...(minRentCents !== undefined && { rentCents: { gte: minRentCents } }),
    ...(maxRentCents !== undefined && {
      rentCents: { ...(minRentCents !== undefined ? { gte: minRentCents } : {}), lte: maxRentCents },
    }),
    ...(availableFrom && { availableFrom: { lte: new Date(availableFrom) } }),
    ...(availableTo && { availableTo: { gte: new Date(availableTo) } }),
    ...(bedrooms !== undefined && { bedrooms }),
    ...(petFriendly !== undefined && { petFriendly }),
    ...(furnished !== undefined && { furnished }),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        photos: { where: { isPrimary: true }, take: 1 },
        owner: { select: { verifiedAt: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  return {
    data: listings.map((l) => toPublicView(l)!),
    total,
    page,
    pageSize,
  };
}

// ─── ADMIN OPERATIONS ────────────────────────────────────────────────────────

export async function adminReviewListing(
  listingId: string,
  input: AdminListingReviewInput,
) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) throw new Error("Listing not found");
  if (listing.status !== "PENDING_REVIEW") {
    throw new Error("Listing is not pending review");
  }

  const newStatus = input.action === "approve" ? "ACTIVE" : "ARCHIVED";
  return prisma.listing.update({
    where: { id: listingId },
    data: { status: newStatus },
  });
}

export async function getPendingListings() {
  return prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      owner: { select: { id: true, email: true, verifiedAt: true } },
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });
}

// ─── CONFIRMATION FLOW ───────────────────────────────────────────────────────

/**
 * Returns active listings that haven't been confirmed in INTERVAL_DAYS days
 * and haven't had a confirmation email sent yet (no pending token).
 */
export async function getListingsNeedingConfirmation(intervalDays: number) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - intervalDays);

  return prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      confirmationToken: null,
      OR: [
        { confirmedAt: null },
        { confirmedAt: { lt: cutoff } },
      ],
    },
    include: {
      owner: { select: { id: true, email: true } },
    },
  });
}

export async function setConfirmationToken(listingId: string) {
  const token = generateConfirmationToken();
  await prisma.listing.update({
    where: { id: listingId },
    data: { confirmationToken: token, confirmationSentAt: new Date() },
  });
  return token;
}

/** Lister clicks the confirmation link — clears token, stamps confirmedAt. */
export async function confirmListingAvailability(token: string) {
  const listing = await prisma.listing.findUnique({
    where: { confirmationToken: token },
  });
  if (!listing) throw new Error("Invalid or expired confirmation token");
  if (listing.status !== "ACTIVE") throw new Error("Listing is no longer active");

  return prisma.listing.update({
    where: { id: listing.id },
    data: {
      confirmedAt: new Date(),
      confirmationToken: null,
      confirmationSentAt: null,
    },
  });
}

/**
 * Returns active listings whose confirmation token has been pending
 * for more than windowHours — these get deactivated.
 */
export async function getListingsToDeactivate(windowHours: number) {
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - windowHours);

  return prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      confirmationToken: { not: null },
      confirmationSentAt: { lt: cutoff },
    },
    include: {
      owner: { select: { id: true, email: true } },
    },
  });
}

export async function deactivateListing(listingId: string) {
  return prisma.listing.update({
    where: { id: listingId },
    data: {
      status: "EXPIRED",
      confirmationToken: null,
      confirmationSentAt: null,
    },
  });
}

/** Expire listings whose availableTo date has passed. */
export async function expireStaleListings() {
  return prisma.listing.updateMany({
    where: {
      status: "ACTIVE",
      availableTo: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
}

// ─── SAVED SEARCHES ──────────────────────────────────────────────────────────

export async function createSavedSearch(seekerId: string, input: SavedSearchInput) {
  const user = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!user) throw new Error("User not found");

  const count = await prisma.savedSearch.count({ where: { seekerId } });
  if (count >= 10) throw new Error("Maximum of 10 saved searches allowed");

  return prisma.savedSearch.create({
    data: {
      seekerId,
      neighborhood: input.neighborhood ?? null,
      minRentCents: input.minRentCents ?? null,
      maxRentCents: input.maxRentCents ?? null,
      availableFrom: input.availableFrom ? new Date(input.availableFrom) : null,
      availableTo: input.availableTo ? new Date(input.availableTo) : null,
      bedrooms: input.bedrooms ?? null,
      petFriendly: input.petFriendly ?? null,
      furnished: input.furnished ?? null,
    },
  });
}

export async function getSavedSearches(seekerId: string) {
  return prisma.savedSearch.findMany({
    where: { seekerId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteSavedSearch(id: string, seekerId: string) {
  const search = await prisma.savedSearch.findUnique({ where: { id } });
  if (!search) throw new Error("Saved search not found");
  if (search.seekerId !== seekerId) throw new Error("Forbidden");
  return prisma.savedSearch.delete({ where: { id } });
}

/**
 * Find all saved searches that match a newly activated listing,
 * and return (seekerEmail, searchId) pairs for notification.
 */
export async function findMatchingSavedSearches(listingId: string) {
  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) return [];

  const searches = await prisma.savedSearch.findMany({
    where: {
      ...(listing.neighborhood && { OR: [{ neighborhood: null }, { neighborhood: listing.neighborhood }] }),
      OR: [{ minRentCents: null }, { minRentCents: { lte: listing.rentCents } }],
      AND: [
        { OR: [{ maxRentCents: null }, { maxRentCents: { gte: listing.rentCents } }] },
        { OR: [{ bedrooms: null }, { bedrooms: listing.bedrooms }] },
        { OR: [{ petFriendly: null }, { petFriendly: listing.petFriendly }] },
        { OR: [{ furnished: null }, { furnished: listing.furnished }] },
      ],
    },
    include: { seeker: { select: { email: true } } },
  });

  return searches.map((s) => ({ searchId: s.id, seekerEmail: s.seeker.email, listingSlug: listing.slug }));
}

export async function markSearchNotified(searchId: string) {
  return prisma.savedSearch.update({
    where: { id: searchId },
    data: { lastNotifiedAt: new Date() },
  });
}
