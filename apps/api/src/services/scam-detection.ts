import { prisma } from "@subletto/db";
import {
  SCAM_PRICE_THRESHOLD_PERCENT,
  SCAM_NEW_ACCOUNT_THRESHOLD_MS,
  SCAM_URGENT_KEYWORDS,
} from "@subletto/shared";

interface ListingForCheck {
  id: string;
  rentCents: number;
  neighborhood: string;
  bedrooms: number;
  description: string | null;
  ownerId: string;
}

interface ScamFlagInput {
  reason: "PRICE_TOO_LOW" | "NEW_ACCOUNT_URGENT";
  details: string;
}

/**
 * Run all scam-detection heuristics on a listing that is being submitted for review.
 * Creates ScamFlag records and sets isFlagged = true if any signals fire.
 */
export async function checkForScamFlags(listing: ListingForCheck): Promise<void> {
  const flags: ScamFlagInput[] = [];

  // ── 1. Price >20% below neighborhood + bedroom median ───────────────────────
  const neighborhoodMedian = await getNeighborhoodMedianRent(
    listing.neighborhood,
    listing.bedrooms,
    listing.id,
  );

  if (neighborhoodMedian !== null) {
    const threshold = neighborhoodMedian * (1 - SCAM_PRICE_THRESHOLD_PERCENT);
    if (listing.rentCents < threshold) {
      flags.push({
        reason: "PRICE_TOO_LOW",
        details: `Listed at ${listing.rentCents} cents/mo; neighborhood median is ${neighborhoodMedian} cents/mo (>${Math.round(SCAM_PRICE_THRESHOLD_PERCENT * 100)}% below).`,
      });
    }
  }

  // ── 2. Account <24h old + urgent-payment keywords in description ─────────────
  const owner = await prisma.user.findUnique({ where: { id: listing.ownerId } });
  if (owner) {
    const accountAgeMs = Date.now() - owner.createdAt.getTime();
    const isNewAccount = accountAgeMs < SCAM_NEW_ACCOUNT_THRESHOLD_MS;

    if (isNewAccount) {
      const desc = (listing.description ?? "").toLowerCase();
      const foundKeyword = SCAM_URGENT_KEYWORDS.find((kw) => desc.includes(kw));
      if (foundKeyword) {
        flags.push({
          reason: "NEW_ACCOUNT_URGENT",
          details: `Account is ${Math.round(accountAgeMs / 3600000)}h old and description contains "${foundKeyword}".`,
        });
      }
    }
  }

  if (flags.length === 0) return;

  // Write flags and mark listing as flagged in a single transaction
  await prisma.$transaction([
    ...flags.map((f) =>
      prisma.scamFlag.create({
        data: { listingId: listing.id, reason: f.reason, details: f.details },
      }),
    ),
    prisma.listing.update({
      where: { id: listing.id },
      data: { isFlagged: true },
    }),
  ]);
}

async function getNeighborhoodMedianRent(
  neighborhood: string,
  bedrooms: number,
  excludeListingId: string,
): Promise<number | null> {
  const active = await prisma.listing.findMany({
    where: {
      neighborhood,
      bedrooms,
      status: { in: ["ACTIVE", "MATCHED"] },
      id: { not: excludeListingId },
    },
    select: { rentCents: true },
  });

  if (active.length < 3) return null; // not enough data to compute a reliable median

  const sorted = active.map((l) => l.rentCents).sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]!;
}
