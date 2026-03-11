import Stripe from "stripe";
import { Resend } from "resend";
import { prisma } from "@subletto/db";
import { CONNECTION_FEE_CENTS, ESCROW_PLATFORM_FEE_PERCENT } from "@subletto/shared";
import type { CreateEscrowInput, RespondToMatchInput } from "../schemas/matches.js";
import { sendRatingRequests } from "./reviews.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@subletto.co";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function sendEmail(to: string, subject: string, html: string) {
  await resend.emails.send({ from: FROM, to, subject, html });
}

// ─── CHECKOUT ────────────────────────────────────────────────────────────────

/**
 * Seeker initiates a match: creates a Stripe Checkout session for the $99 connection fee.
 * Creates a Match record in PENDING_PAYMENT status.
 * Listing must be ACTIVE; seeker cannot match their own listing.
 */
export async function createMatchCheckout(listingId: string, seekerId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    include: { owner: { select: { id: true, email: true } } },
  });
  if (!listing || listing.status !== "ACTIVE") throw new Error("Listing not available");

  const seeker = await prisma.user.findUnique({ where: { id: seekerId } });
  if (!seeker) throw new Error("User not found");
  if (listing.ownerId === seekerId) throw new Error("Cannot match your own listing");

  // Block if there is already an active (non-terminal) match for this seeker + listing
  const existing = await prisma.match.findFirst({
    where: {
      listingId,
      subtenantId: seekerId,
      status: { notIn: ["DECLINED", "CANCELLED"] },
    },
  });
  if (existing) throw new Error("You already have an active match for this listing");

  // Create placeholder match before the Checkout session so we have an ID for metadata
  const match = await prisma.match.create({
    data: {
      listingId,
      listerId: listing.ownerId,
      subtenantId: seekerId,
      status: "PENDING_PAYMENT",
    },
  });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Subletto Connection Fee",
            description: `Match request for: ${listing.title}`,
          },
          unit_amount: CONNECTION_FEE_CENTS,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    customer_email: seeker.email,
    success_url: `${APP_URL}/dashboard/matches/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/listings/${listing.slug}`,
    metadata: { matchId: match.id, type: "connection_fee" },
  });

  await prisma.match.update({
    where: { id: match.id },
    data: { checkoutSessionId: session.id },
  });

  return { sessionUrl: session.url!, matchId: match.id };
}

// ─── LISTER RESPONSE ─────────────────────────────────────────────────────────

/**
 * Lister accepts or declines a match that is AWAITING_LISTER.
 * Accept → CONFIRMED + reveal identities + intro emails (no refund after this).
 * Decline → DECLINED + Stripe refund + notify seeker.
 */
export async function respondToMatch(
  matchId: string,
  listerId: string,
  input: RespondToMatchInput,
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          neighborhood: true,
          bedrooms: true,
          bathrooms: true,
          rentCents: true,
          availableFrom: true,
          availableTo: true,
        },
      },
      lister: { select: { email: true } },
      subtenant: { select: { email: true } },
    },
  });

  if (!match) throw new Error("Match not found");
  if (match.listerId !== listerId) throw new Error("Forbidden");
  if (match.status !== "AWAITING_LISTER") throw new Error("Match is not awaiting your response");

  if (input.action === "accept") {
    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: "CONFIRMED", revealedAt: new Date() },
    });

    // Mark listing as MATCHED so no new checkout sessions can be opened
    await prisma.listing.update({
      where: { id: match.listingId },
      data: { status: "MATCHED" },
    });

    await sendIntroEmails(
      match.lister.email,
      match.subtenant.email,
      match.listing.title,
      matchId,
    );

    // ── Social proof: create anonymised success story + request testimonials ──
    const l = match.listing;
    prisma.successStory
      .create({
        data: {
          neighborhood: l.neighborhood,
          bedrooms: l.bedrooms,
          bathrooms: l.bathrooms,
          rentCents: l.rentCents,
          fromDate: l.availableFrom,
          toDate: l.availableTo,
        },
      })
      .catch(() => {}); // non-fatal

    sendTestimonialRequestEmails(
      match.lister.email,
      match.subtenant.email,
      l.title,
    ).catch(() => {}); // non-fatal

    return updated;
  } else {
    // Decline: refund the connection fee if payment succeeded
    const payment = await prisma.payment.findFirst({
      where: { matchId, type: "CONNECTION_FEE", status: "SUCCEEDED" },
    });

    if (payment) {
      await stripe.refunds.create({ payment_intent: payment.stripeId });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });
    }

    const updated = await prisma.match.update({
      where: { id: matchId },
      data: { status: "DECLINED" },
    });

    await sendEmail(
      match.subtenant.email,
      "Your match request was declined",
      `<p>Unfortunately, the lister for <strong>${match.listing.title}</strong> has declined your match request.</p>
      <p>A full refund of $99.00 has been initiated and will appear in 5–10 business days.</p>
      <p>You can browse other listings at <a href="${APP_URL}/listings">${APP_URL}/listings</a>.</p>`,
    );

    return updated;
  }
}

// ─── ESCROW ──────────────────────────────────────────────────────────────────

/**
 * Seeker optionally pays first month + deposit through Subletto escrow.
 * Match must be CONFIRMED; escrow must be NONE.
 * Returns a Stripe PaymentIntent client_secret for frontend confirmation.
 */
export async function createEscrowPaymentIntent(
  matchId: string,
  seekerId: string,
  input: CreateEscrowInput,
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      listing: { select: { title: true } },
      subtenant: { select: { email: true } },
      lister: { select: { email: true } },
    },
  });

  if (!match) throw new Error("Match not found");
  if (match.subtenantId !== seekerId) throw new Error("Forbidden");
  if (match.status !== "CONFIRMED") throw new Error("Match must be confirmed before escrow");
  if (match.escrowStatus !== "NONE") throw new Error("Escrow is already in progress");

  const totalCents = input.firstMonthRentCents + input.depositCents;
  const platformFeeCents = Math.round(totalCents * ESCROW_PLATFORM_FEE_PERCENT);

  // NOTE: Production escrow should use Stripe Connect `application_fee_amount`
  // with a destination charge to the lister's Connect account. For now, funds
  // are held on the platform and transferred manually after move-in confirmation.
  const intent = await stripe.paymentIntents.create({
    amount: totalCents,
    currency: "usd",
    description: `Subletto escrow — ${match.listing.title}`,
    receipt_email: match.subtenant.email,
    metadata: {
      matchId,
      type: "escrow",
      firstMonthRentCents: String(input.firstMonthRentCents),
      depositCents: String(input.depositCents),
      platformFeeCents: String(platformFeeCents),
    },
  });

  await prisma.match.update({
    where: { id: matchId },
    data: {
      escrowStatus: "PENDING_PAYMENT",
      escrowPaymentIntentId: intent.id,
      escrowAmountCents: totalCents,
    },
  });

  await sendEmail(
    match.lister.email,
    "Escrow payment initiated",
    `<p>Your subtenant has initiated an escrow payment for <strong>${match.listing.title}</strong>.</p>
    <p>Funds will be held securely until you confirm move-in. Subletto charges a 2.5% platform fee.</p>`,
  );

  return { clientSecret: intent.client_secret!, intentId: intent.id };
}

// ─── MOVE-IN CONFIRMATION ─────────────────────────────────────────────────────

/**
 * Lister confirms that the subtenant moved in.
 * Releases escrow funds to the lister (production: via Stripe Transfer).
 */
export async function confirmMoveIn(matchId: string, listerId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      lister: { select: { email: true } },
      subtenant: { select: { email: true } },
      listing: { select: { title: true } },
    },
  });

  if (!match) throw new Error("Match not found");
  if (match.listerId !== listerId) throw new Error("Forbidden");
  if (match.status !== "CONFIRMED") throw new Error("Match is not confirmed");
  if (["PENDING_PAYMENT", "RELEASED", "REFUNDED"].includes(match.escrowStatus)) {
    throw new Error("Cannot confirm move-in in current escrow state");
  }

  const updates: Parameters<typeof prisma.match.update>[0]["data"] = {};

  if (match.escrowStatus === "HELD") {
    // Production: create a Stripe Transfer to the lister's Connect account:
    //   await stripe.transfers.create({ amount: netCents, currency: "usd",
    //     destination: listerConnectAccountId });
    updates.escrowStatus = "RELEASED";

    await sendEmail(
      match.lister.email,
      "Move-in confirmed — escrow released",
      `<p>You've confirmed move-in for <strong>${match.listing.title}</strong>.</p>
      <p>Escrow funds (minus the 2.5% platform fee) will be transferred to your account within 2–3 business days.</p>`,
    );

    await sendEmail(
      match.subtenant.email,
      "Move-in confirmed",
      `<p>Your lister has confirmed your move-in for <strong>${match.listing.title}</strong>. Enjoy your new place!</p>`,
    );
  }

  await prisma.match.update({ where: { id: matchId }, data: updates });

  // Trigger rating request emails (non-fatal if it fails)
  sendRatingRequests(matchId).catch(() => {});

  return { released: match.escrowStatus === "HELD" };
}

// ─── QUERIES ─────────────────────────────────────────────────────────────────

const matchInclude = {
  listing: { select: { id: true, title: true, slug: true } },
  lister: { select: { id: true, email: true } },
  subtenant: { select: { id: true, email: true } },
} as const;

type MatchWithRelations = NonNullable<
  Awaited<ReturnType<typeof prisma.match.findFirst<{ include: typeof matchInclude }>>>
>;

export async function getUserMatches(userId: string) {
  const matches = await prisma.match.findMany({
    where: {
      OR: [{ listerId: userId }, { subtenantId: userId }],
      status: { not: "PENDING_PAYMENT" }, // hide checkout-abandoned matches
    },
    include: matchInclude,
    orderBy: { createdAt: "desc" },
  });

  return matches.map((m) => formatMatchForUser(m, userId));
}

export async function getMatchById(matchId: string, userId: string) {
  const m = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      ...matchInclude,
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!m) throw new Error("Match not found");
  if (m.listerId !== userId && m.subtenantId !== userId) throw new Error("Forbidden");

  return formatMatchForUser(m, userId);
}

// ─── FORMATTING ──────────────────────────────────────────────────────────────

function formatMatchForUser(m: MatchWithRelations, viewerId: string) {
  const isLister = m.listerId === viewerId;
  const isConfirmed = m.status === "CONFIRMED";
  const isAwaitingOrBeyond =
    m.status === "AWAITING_LISTER" || isConfirmed || m.status === "DECLINED";

  return {
    id: m.id,
    listingId: m.listingId,
    listingTitle: m.listing.title,
    listingSlug: m.listing.slug,
    status: m.status,
    escrowStatus: m.escrowStatus,
    escrowAmountCents: m.escrowAmountCents,
    feePaidAt: m.feePaidAt?.toISOString() ?? null,
    revealedAt: m.revealedAt?.toISOString() ?? null,
    createdAt: m.createdAt.toISOString(),
    // Identity revealed: lister sees seeker from AWAITING_LISTER; seeker sees lister only on CONFIRMED
    listerContact: !isLister && isConfirmed ? { email: m.lister.email } : null,
    subtenantContact: isLister && isAwaitingOrBeyond ? { email: m.subtenant.email } : null,
  };
}

// ─── EMAIL HELPERS ────────────────────────────────────────────────────────────

async function sendTestimonialRequestEmails(
  listerEmail: string,
  seekerEmail: string,
  listingTitle: string,
) {
  const testimonialUrl = `${APP_URL}/testimonial`;
  const subject = "How was your Subletto experience?";
  const html = (role: string) =>
    `<h2>Congrats on your match!</h2>
    <p>Your ${role} sublease for <strong>${listingTitle}</strong> has been confirmed.</p>
    <p>Would you mind sharing a quick quote about your Subletto experience? It helps other CU Boulder students know what to expect.</p>
    <p>It only takes 30 seconds:</p>
    <p><a href="${testimonialUrl}" style="background:#4F46E5;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;">Share your experience →</a></p>
    <p style="color:#94a3b8;font-size:12px;">This is completely optional. Testimonials are reviewed before being published.</p>`;

  await Promise.all([
    sendEmail(listerEmail, subject, html("lister")),
    sendEmail(seekerEmail, subject, html("subtenant")),
  ]);
}

async function sendIntroEmails(
  listerEmail: string,
  seekerEmail: string,
  listingTitle: string,
  matchId: string,
) {
  const dashboardUrl = `${APP_URL}/dashboard/matches/${matchId}`;

  await Promise.all([
    sendEmail(
      seekerEmail,
      "You've been connected with your lister!",
      `<h2>Great news — your match is confirmed!</h2>
      <p>The lister for <strong>${listingTitle}</strong> has accepted your request.</p>
      <p>Visit your dashboard to see their contact details and review next steps:</p>
      <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>
      <p>You'll also have the option to pay first month's rent and deposit through Subletto's secure escrow.</p>`,
    ),
    sendEmail(
      listerEmail,
      "You've been connected with a subtenant!",
      `<h2>You've accepted a match request!</h2>
      <p>You're now connected with a subtenant for <strong>${listingTitle}</strong>.</p>
      <p>Visit your dashboard to see their contact details and next steps:</p>
      <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>`,
    ),
  ]);
}
