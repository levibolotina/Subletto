import { NextResponse } from "next/server";
import { prisma } from "@subletto/db";
import { Resend } from "resend";
import {
  CONFIRMATION_INTERVAL_DAYS,
  formatCurrency,
} from "@subletto/shared";

const resend = new Resend(process.env.RESEND_API_KEY);
const API_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/cron/listing-confirmation
 * Triggered every 7 days by Vercel Cron (or external scheduler).
 * Sends confirmation emails to listers whose listings haven't been confirmed recently.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - CONFIRMATION_INTERVAL_DAYS);

  // Find active listings with no pending token that need a confirmation nudge
  const listings = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      confirmationToken: null,
      OR: [
        { confirmedAt: null },
        { confirmedAt: { lt: cutoff } },
      ],
    },
    include: {
      owner: { select: { email: true } },
    },
  });

  const results: { listingId: string; ok: boolean }[] = [];

  for (const listing of listings) {
    const { randomBytes } = await import("crypto");
    const token = randomBytes(24).toString("hex");

    await prisma.listing.update({
      where: { id: listing.id },
      data: { confirmationToken: token, confirmationSentAt: new Date() },
    });

    const confirmUrl = `${API_URL}/listings/confirm?token=${token}`;

    const { error } = await resend.emails.send({
      from: "Subletto <noreply@subletto.com>",
      to: listing.owner.email,
      subject: "Is your sublease still available?",
      html: `
        <p>Hi there,</p>
        <p>Your Subletto listing <strong>${listing.title}</strong>
        (${listing.neighborhood} · ${formatCurrency(listing.rentCents)}/mo)
        is still showing as active.</p>
        <p>Please confirm it's still available by clicking the button below.
        If we don't hear back within 48 hours, your listing will be automatically paused.</p>
        <p style="margin: 24px 0;">
          <a href="${confirmUrl}"
             style="background:#000;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
            Yes, still available
          </a>
        </p>
        <p style="font-size:12px;color:#666;">
          This link expires in 48 hours. If you no longer need this listing,
          you can archive it from your <a href="${API_URL}/dashboard/listings">dashboard</a>.
        </p>
      `,
    });

    results.push({ listingId: listing.id, ok: !error });
    if (error) console.error(`[listing-confirmation] email failed for ${listing.id}`, error);
  }

  return NextResponse.json({ processed: results.length, results });
}
