import { prisma } from "@subletto/db";
import type { SubmitVerificationInput, AdminReviewInput, SetLeaseAnswerInput } from "../schemas/verification.js";

export async function submitVerification(
  userId: string,
  input: SubmitVerificationInput,
) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { verification: true },
  });

  if (!user) throw new Error("User not found");
  if (user.role !== "LISTER") {
    throw new Error("Only listers (users with a lease) need verification");
  }
  if (user.verification?.status === "PENDING") {
    throw new Error("A verification request is already pending");
  }
  if (user.verification?.status === "VERIFIED") {
    throw new Error("You are already verified");
  }

  // Upsert: allow re-submission after a REJECTED state
  const verification = await prisma.verification.upsert({
    where: { userId },
    create: {
      userId,
      idDocUrl: input.idDocPath,
      leaseDocUrl: input.leaseDocPath,
      listerLeaseAnswer: input.listerLeaseAnswer ?? null,
      status: "PENDING",
      submittedAt: new Date(),
    },
    update: {
      idDocUrl: input.idDocPath,
      leaseDocUrl: input.leaseDocPath,
      ...(input.listerLeaseAnswer && { listerLeaseAnswer: input.listerLeaseAnswer }),
      status: "PENDING",
      submittedAt: new Date(),
      adminNotes: null,
      subleasePermitted: null,
      leasePermission: null,
      reviewedAt: null,
    },
  });

  return verification;
}

export async function getVerificationStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { verification: true },
  });

  if (!user) throw new Error("User not found");

  return {
    userId: user.id,
    email: user.email,
    role: user.role,
    verificationStatus: user.verification?.status ?? null,
    verifiedAt: user.verifiedAt?.toISOString() ?? null,
    trustScore: user.trustScore,
    listerLeaseAnswer: user.verification?.listerLeaseAnswer ?? null,
    leasePermission: user.verification?.leasePermission ?? null,
  };
}

/**
 * Lister self-reports their lease subletting answer before uploading docs.
 * Can be called standalone (before full verification) or as part of it.
 */
export async function setLeaseAnswer(userId: string, input: SetLeaseAnswerInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { verification: true } });
  if (!user) throw new Error("User not found");
  if (user.role !== "LISTER") throw new Error("Only listers have a lease answer");

  // Upsert: might not have a verification record yet
  if (user.verification) {
    return prisma.verification.update({
      where: { userId },
      data: { listerLeaseAnswer: input.listerLeaseAnswer },
    });
  }

  // Create a stub record — docs will be added when they actually submit
  return prisma.verification.create({
    data: {
      userId,
      idDocUrl: "",
      leaseDocUrl: "",
      listerLeaseAnswer: input.listerLeaseAnswer,
      status: "PENDING",
    },
  });
}

export async function reviewVerification(
  adminId: string,
  targetUserId: string,
  input: AdminReviewInput,
) {
  const verification = await prisma.verification.findUnique({
    where: { userId: targetUserId },
  });

  if (!verification) {
    throw new Error("No verification submission found for this user");
  }
  if (verification.status !== "PENDING") {
    throw new Error(`Verification is already ${verification.status.toLowerCase()}`);
  }

  const now = new Date();

  const [updatedVerification] = await prisma.$transaction([
    prisma.verification.update({
      where: { userId: targetUserId },
      data: {
        status: input.status,
        subleasePermitted: input.subleasePermitted ?? null,
        leasePermission: input.leasePermission ?? null,
        adminNotes: input.adminNotes ?? null,
        reviewedAt: now,
      },
    }),
    // If approved: stamp verifiedAt and boost trust score
    ...(input.status === "VERIFIED"
      ? [
          prisma.user.update({
            where: { id: targetUserId },
            data: { verifiedAt: now, trustScore: 100 },
          }),
        ]
      : []),
  ]);

  return updatedVerification;
}

export async function getPendingVerifications() {
  return prisma.verification.findMany({
    where: { status: "PENDING" },
    include: {
      user: {
        select: { id: true, email: true, verifiedAt: true, createdAt: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
}
