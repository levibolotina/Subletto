import { NextResponse } from "next/server";
import { prisma } from "@subletto/db";
import { Resend } from "resend";
import { CONFIRMATION_WINDOW_HOURS, formatCurrency } from "@subletto/shared";

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * GET /api/cron/listing-deactivate
 * Triggered daily (or more frequently) by Vercel Cron.
 * Deactivates listings whose 48-hour confirmation window has expired.
 * Also expires listings past their availableTo date.
 *
 * Secured by CRON_SECRET header.
 */
export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const windowCutoff = new Date();
  windowCutoff.setHours(windowCutoff.getHours() - CONFIRMATION_WINDOW_HOURS);

  // Deactivate listings that didn't respond within the window
  const stale = await prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      confirmationToken: { not: null },
      confirmationSentAt: { lt: windowCutoff },
    },
    include: { owner: { select: { email: true } } },
  });

  for (const listing of stale) {
    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: "EXPIRED",
        confirmationToken: null,
        confirmationSentAt: null,
      },
    });

    await resend.emails.send({
      from: "Subletto <noreply@subletto.com>",
      to: listing.owner.email,
      subject: "Your Subletto listing has been paused",
      html: `
        <p>Hi there,</p>
        <p>Your listing <strong>${listing.title}</strong>
        (${listing.neighborhood} · ${formatCurrency(listing.rentCents)}/mo)
        has been automatically paused because we didn't receive a confirmation within 48 hours.</p>
        <p>If your space is still available, you can reactivate it from your
        <a href="${APP_URL}/dashboard/listings">dashboard</a>.</p>
      `,
    });
  }

  // Also expire listings past their availableTo date
  const expired = await prisma.listing.updateMany({
    where: {
      status: "ACTIVE",
      availableTo: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });

  return NextResponse.json({
    deactivated: stale.length,
    expiredByDate: expired.count,
  });
}
