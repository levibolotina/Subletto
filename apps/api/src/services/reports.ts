import { Resend } from "resend";
import { prisma } from "@subletto/db";
import { REPORT_AUTO_SUSPEND_COUNT } from "@subletto/shared";
import type { SubmitReportInput, ResolveReportInput } from "../schemas/reports.js";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@subletto.co";

async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({ from: FROM, to, subject, html });
}

// ─── SUBMIT REPORT ────────────────────────────────────────────────────────────

export async function submitReport(reporterId: string, input: SubmitReportInput) {
  // Prevent self-reporting
  if (input.reportedUserId === reporterId) throw new Error("Cannot report yourself");

  // Validate targets exist
  if (input.listingId) {
    const listing = await prisma.listing.findUnique({ where: { id: input.listingId } });
    if (!listing) throw new Error("Listing not found");
  }
  if (input.reportedUserId) {
    const user = await prisma.user.findUnique({ where: { id: input.reportedUserId } });
    if (!user) throw new Error("User not found");
  }

  const report = await prisma.report.create({
    data: {
      reporterId,
      reportedUserId: input.reportedUserId ?? null,
      listingId: input.listingId ?? null,
      category: input.category,
      description: input.description ?? null,
      status: "PENDING",
    },
  });

  // ── Auto-suspend user after REPORT_AUTO_SUSPEND_COUNT pending reports ────────
  if (input.reportedUserId) {
    await maybeAutoSuspend(input.reportedUserId);
  }

  // ── Auto-flag listing if it has 3+ pending SCAM reports ─────────────────────
  if (input.listingId && input.category === "SCAM") {
    await maybeAutoFlagListing(input.listingId);
  }

  return report;
}

async function maybeAutoSuspend(userId: string): Promise<void> {
  const pendingCount = await prisma.report.count({
    where: { reportedUserId: userId, status: "PENDING" },
  });

  if (pendingCount >= REPORT_AUTO_SUSPEND_COUNT) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user && !user.suspendedAt) {
      await prisma.user.update({
        where: { id: userId },
        data: { suspendedAt: new Date() },
      });

      // Create a REPORTED_SCAM ScamFlag on all active listings owned by the user
      const activeListings = await prisma.listing.findMany({
        where: { ownerId: userId, status: { in: ["ACTIVE", "PENDING_REVIEW"] } },
        select: { id: true },
      });

      for (const listing of activeListings) {
        await prisma.$transaction([
          prisma.scamFlag.create({
            data: {
              listingId: listing.id,
              reason: "REPORTED_SCAM",
              details: `Auto-flagged: owner suspended after ${pendingCount} pending reports.`,
            },
          }),
          prisma.listing.update({
            where: { id: listing.id },
            data: { isFlagged: true, status: "PENDING_REVIEW" },
          }),
        ]);
      }

      await sendEmail(
        user.email,
        "Your account has been suspended",
        `<p>Your Subletto account has been temporarily suspended due to multiple reports from community members.</p>
        <p>Please contact support if you believe this is an error.</p>`,
      );
    }
  }
}

async function maybeAutoFlagListing(listingId: string): Promise<void> {
  const scamReportCount = await prisma.report.count({
    where: { listingId, category: "SCAM", status: "PENDING" },
  });

  if (scamReportCount >= REPORT_AUTO_SUSPEND_COUNT) {
    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (listing && !listing.isFlagged) {
      await prisma.$transaction([
        prisma.scamFlag.create({
          data: {
            listingId,
            reason: "REPORTED_SCAM",
            details: `Auto-flagged after ${scamReportCount} pending scam reports.`,
          },
        }),
        prisma.listing.update({
          where: { id: listingId },
          data: { isFlagged: true, status: "PENDING_REVIEW" },
        }),
      ]);
    }
  }
}

// ─── ADMIN: RESOLVE REPORT ────────────────────────────────────────────────────

export async function resolveReport(
  reportId: string,
  adminId: string,
  input: ResolveReportInput,
) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reportedUser: { select: { id: true, email: true } },
      listing: { select: { id: true, title: true } },
    },
  });

  if (!report) throw new Error("Report not found");

  let updatedReport;

  switch (input.action) {
    case "dismiss": {
      updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "DISMISSED",
          adminNotes: input.adminNotes ?? null,
          resolvedAt: new Date(),
        },
      });
      break;
    }

    case "suspend_user": {
      if (!report.reportedUser) throw new Error("No user to suspend on this report");
      await prisma.user.update({
        where: { id: report.reportedUser.id },
        data: { suspendedAt: new Date() },
      });
      await sendEmail(
        report.reportedUser.email,
        "Your account has been suspended",
        `<p>After reviewing a report, Subletto has suspended your account.</p>
        <p>Please contact support to appeal.</p>`,
      );
      updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "REVIEWED",
          adminNotes: input.adminNotes ?? null,
          resolvedAt: new Date(),
        },
      });
      break;
    }

    case "remove_listing": {
      if (!report.listing) throw new Error("No listing to remove on this report");
      await prisma.listing.update({
        where: { id: report.listing.id },
        data: { status: "ARCHIVED" },
      });
      updatedReport = await prisma.report.update({
        where: { id: reportId },
        data: {
          status: "REVIEWED",
          adminNotes: input.adminNotes ?? null,
          resolvedAt: new Date(),
        },
      });
      break;
    }

    default:
      throw new Error("Invalid action");
  }

  return updatedReport;
}

// ─── ADMIN: QUERIES ──────────────────────────────────────────────────────────

export async function getPendingReports() {
  return prisma.report.findMany({
    where: { status: "PENDING" },
    include: {
      reporter: { select: { id: true, email: true } },
      reportedUser: { select: { id: true, email: true, suspendedAt: true } },
      listing: { select: { id: true, title: true, slug: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getFlaggedListings() {
  return prisma.listing.findMany({
    where: { isFlagged: true, status: { not: "ARCHIVED" } },
    include: {
      owner: { select: { email: true, verifiedAt: true, suspendedAt: true } },
      scamFlags: { orderBy: { createdAt: "desc" } },
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });
}
