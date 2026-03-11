import { Resend } from "resend";
import { prisma } from "@subletto/db";
import type { SubmitReviewInput } from "../schemas/reviews.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@subletto.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({ from: FROM, to, subject, html });
}

// ─── RATING REQUEST EMAILS ────────────────────────────────────────────────────

/**
 * Send rating-request emails to both parties after move-in is confirmed.
 * Sets ratingRequestSentAt on the match to prevent duplicate sends.
 */
export async function sendRatingRequests(matchId: string): Promise<void> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      listing: { select: { title: true } },
      lister: { select: { email: true } },
      subtenant: { select: { email: true } },
    },
  });
  if (!match || match.ratingRequestSentAt) return;

  const listingTitle = match.listing.title;
  const reviewUrl = (role: string) =>
    `${APP_URL}/dashboard/reviews/${matchId}?role=${role}`;

  await Promise.all([
    sendEmail(
      match.lister.email,
      `Rate your subtenant for "${listingTitle}"`,
      `<h2>How was your subletting experience?</h2>
      <p>You've confirmed move-in for <strong>${listingTitle}</strong>. Help the Subletto community by rating your subtenant.</p>
      <p><a href="${reviewUrl("LISTER_REVIEWS_SUBTENANT")}">Leave a review →</a></p>`,
    ),
    sendEmail(
      match.subtenant.email,
      `Rate your lister for "${listingTitle}"`,
      `<h2>How was your subletting experience?</h2>
      <p>Move-in has been confirmed for <strong>${listingTitle}</strong>. Help the Subletto community by rating your lister.</p>
      <p><a href="${reviewUrl("SUBTENANT_REVIEWS_LISTER")}">Leave a review →</a></p>`,
    ),
  ]);

  await prisma.match.update({
    where: { id: matchId },
    data: { ratingRequestSentAt: new Date() },
  });
}

// ─── SUBMIT REVIEW ────────────────────────────────────────────────────────────

export async function submitReview(matchId: string, reviewerId: string, input: SubmitReviewInput) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      lister: { select: { id: true } },
      subtenant: { select: { id: true } },
    },
  });

  if (!match) throw new Error("Match not found");
  if (match.status !== "CONFIRMED") throw new Error("Reviews are only available for confirmed matches");

  const isLister = match.listerId === reviewerId;
  const isSubtenant = match.subtenantId === reviewerId;
  if (!isLister && !isSubtenant) throw new Error("Forbidden");

  // Validate role matches who is submitting
  if (input.role === "LISTER_REVIEWS_SUBTENANT" && !isLister) {
    throw new Error("Only the lister can submit a lister review");
  }
  if (input.role === "SUBTENANT_REVIEWS_LISTER" && !isSubtenant) {
    throw new Error("Only the subtenant can submit a subtenant review");
  }

  const revieweeId = input.role === "LISTER_REVIEWS_SUBTENANT"
    ? match.subtenantId
    : match.listerId;

  // Compute overall score from the relevant fields
  let overallScore: number;
  if (input.role === "LISTER_REVIEWS_SUBTENANT") {
    overallScore = (input.reliability + input.communication + input.paymentSpeed) / 3;
  } else {
    overallScore = (input.listingAccuracy + input.responsiveness + input.unitCondition) / 3;
  }

  // Create the review (@@unique on [matchId, reviewerId] prevents duplicates)
  const review = await prisma.review.create({
    data: {
      matchId,
      reviewerId,
      revieweeId,
      role: input.role,
      ...(input.role === "LISTER_REVIEWS_SUBTENANT"
        ? {
            reliability: input.reliability,
            communication: input.communication,
            paymentSpeed: input.paymentSpeed,
          }
        : {
            listingAccuracy: input.listingAccuracy,
            responsiveness: input.responsiveness,
            unitCondition: input.unitCondition,
          }),
      comment: input.comment ?? null,
      overallScore,
    },
  });

  // Recompute and persist the reviewee's rolling trust score
  await recomputeTrustScore(revieweeId);

  return review;
}

// ─── TRUST SCORE ─────────────────────────────────────────────────────────────

async function recomputeTrustScore(userId: string): Promise<void> {
  const reviews = await prisma.review.findMany({
    where: { revieweeId: userId },
    select: { overallScore: true },
  });

  const trustScore =
    reviews.length === 0
      ? 0
      : reviews.reduce((sum, r) => sum + r.overallScore, 0) / reviews.length;

  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: Math.round(trustScore * 10) / 10 }, // round to 1 decimal
  });
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

/** Matches the user has been in (CONFIRMED) where they haven't yet submitted a review. */
export async function getPendingReviews(userId: string) {
  const confirmedMatches = await prisma.match.findMany({
    where: {
      status: "CONFIRMED",
      OR: [{ listerId: userId }, { subtenantId: userId }],
    },
    include: {
      listing: { select: { title: true, slug: true } },
      reviews: { where: { reviewerId: userId }, select: { id: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return confirmedMatches
    .filter((m) => m.reviews.length === 0)
    .map((m) => ({
      matchId: m.id,
      listingTitle: m.listing.title,
      listingSlug: m.listing.slug,
      role: m.listerId === userId ? "LISTER_REVIEWS_SUBTENANT" : "SUBTENANT_REVIEWS_LISTER",
      createdAt: m.createdAt.toISOString(),
    }));
}

/** Public review list for a user (only overallScore + comment — no personal data). */
export async function getUserReviews(userId: string) {
  return prisma.review.findMany({
    where: { revieweeId: userId },
    select: {
      id: true,
      role: true,
      overallScore: true,
      comment: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

/** Count of CONFIRMED matches (used for Trusted badge threshold). */
export async function getConfirmedTransactionCount(userId: string): Promise<number> {
  return prisma.match.count({
    where: {
      status: "CONFIRMED",
      OR: [{ listerId: userId }, { subtenantId: userId }],
    },
  });
}
