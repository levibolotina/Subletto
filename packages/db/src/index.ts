import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export { Prisma } from "@prisma/client";
export type { User, Profile, Listing, ListingPhoto, Lease, Verification, SavedSearch, Match, Payment, WaitlistEntry, SuccessStory, Testimonial } from "@prisma/client";
export { Role, VerificationStatus, ListingStatus, LeaseStatus, MatchStatus, EscrowStatus, PaymentType, PaymentStatus } from "@prisma/client";
