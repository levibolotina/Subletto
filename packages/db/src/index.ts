import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    ...(process.env.DATABASE_URL && {
      datasources: { db: { url: process.env.DATABASE_URL } },
    }),
  });

// Always cache on globalThis so warm serverless invocations reuse the connection
globalForPrisma.prisma = prisma;

export { Prisma } from "@prisma/client";
export type { User, Profile, Listing, ListingPhoto, Lease, Verification, SavedSearch, Match, Payment, WaitlistEntry, SuccessStory, Testimonial } from "@prisma/client";
export { Role, VerificationStatus, ListingStatus, LeaseStatus, MatchStatus, EscrowStatus, PaymentType, PaymentStatus } from "@prisma/client";
