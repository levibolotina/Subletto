import Stripe from "stripe";
import type { FastifyInstance } from "fastify";
import { prisma } from "@subletto/db";

/**
 * POST /v1/webhooks/stripe
 *
 * Stripe events processed here:
 *  - checkout.session.completed  → mark match fee paid → AWAITING_LISTER, notify lister
 *  - payment_intent.succeeded    → update escrow status → HELD, notify lister
 *  - charge.refunded             → record refund on Payment row
 *
 * This route MUST receive the raw request body for signature verification.
 * The Next.js route at /api/webhooks/stripe forwards the raw body + stripe-signature header.
 */
export async function stripeWebhookRoute(fastify: FastifyInstance) {
  fastify.addContentTypeParser(
    "application/json",
    { parseAs: "buffer" },
    (_req, body, done) => done(null, body),
  );

  fastify.post("/webhooks/stripe", async (request, reply) => {
    const sig = request.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      return reply.code(400).send({ error: "Missing stripe-signature or webhook secret" });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(request.body as Buffer, sig, webhookSecret);
    } catch {
      return reply.code(400).send({ error: "Invalid webhook signature" });
    }

    try {
      if (event.type === "checkout.session.completed") {
        await handleCheckoutComplete(event.data.object as Stripe.Checkout.Session);
      } else if (event.type === "payment_intent.succeeded") {
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
      } else if (event.type === "charge.refunded") {
        await handleChargeRefunded(event.data.object as Stripe.Charge);
      }
    } catch (err) {
      fastify.log.error(err, "Stripe webhook handler error");
      return reply.code(500).send({ error: "Webhook processing failed" });
    }

    return reply.send({ received: true });
  });
}

// ─── HANDLERS ────────────────────────────────────────────────────────────────

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const { matchId, type } = session.metadata ?? {};
  if (type !== "connection_fee" || !matchId) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.status !== "PENDING_PAYMENT") return;

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!paymentIntentId) return;

  await prisma.$transaction([
    // Advance match status: fee paid, lister must now respond
    prisma.match.update({
      where: { id: matchId },
      data: { status: "AWAITING_LISTER", feePaidAt: new Date() },
    }),
    // Record the payment using the PaymentIntent ID (used for future refunds)
    prisma.payment.create({
      data: {
        matchId,
        amountCents: session.amount_total ?? 9900,
        type: "CONNECTION_FEE",
        stripeId: paymentIntentId,
        status: "SUCCEEDED",
      },
    }),
  ]);

  // Notify lister that a seeker is waiting — include seeker email so lister can evaluate
  const fullMatch = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      lister: { select: { email: true } },
      subtenant: { select: { email: true } },
      listing: { select: { title: true } },
    },
  });
  if (!fullMatch) return;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const dashboardUrl = `${appUrl}/dashboard/matches/${matchId}`;

  // Import Resend lazily to avoid loading it on cold-start if not needed
  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.RESEND_FROM_EMAIL ?? "noreply@subletto.co";

  await Promise.all([
    resend.emails.send({
      from,
      to: fullMatch.lister.email,
      subject: "A subtenant wants to match with your listing",
      html: `<h2>New match request!</h2>
        <p>A subtenant (<strong>${fullMatch.subtenant.email}</strong>) has paid the $99 connection fee for <strong>${fullMatch.listing.title}</strong>.</p>
        <p>Visit your dashboard to <strong>accept or decline</strong> this request:</p>
        <p><a href="${dashboardUrl}">${dashboardUrl}</a></p>
        <p>If you decline, the subtenant receives a full refund.</p>`,
    }),
    resend.emails.send({
      from,
      to: fullMatch.subtenant.email,
      subject: "Payment received — waiting for lister",
      html: `<h2>Your $99 connection fee was received!</h2>
        <p>We've notified the lister for <strong>${fullMatch.listing.title}</strong>. They'll accept or decline within 48 hours.</p>
        <p>Track your match status here: <a href="${dashboardUrl}">${dashboardUrl}</a></p>`,
    }),
  ]);
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent) {
  const { matchId, type, firstMonthRentCents, depositCents } = intent.metadata ?? {};
  if (type !== "escrow" || !matchId) return;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match || match.escrowStatus !== "PENDING_PAYMENT") return;

  const rentCents = Number(firstMonthRentCents ?? 0);
  const depCents = Number(depositCents ?? 0);

  await prisma.$transaction([
    prisma.match.update({
      where: { id: matchId },
      data: { escrowStatus: "HELD" },
    }),
    ...(rentCents > 0
      ? [
          prisma.payment.create({
            data: {
              matchId,
              amountCents: rentCents,
              type: "ESCROW_RENT",
              stripeId: `${intent.id}_rent`,
              status: "SUCCEEDED",
            },
          }),
        ]
      : []),
    ...(depCents > 0
      ? [
          prisma.payment.create({
            data: {
              matchId,
              amountCents: depCents,
              type: "ESCROW_DEPOSIT",
              stripeId: `${intent.id}_deposit`,
              status: "SUCCEEDED",
            },
          }),
        ]
      : []),
  ]);

  // Notify lister that escrow is held
  const fullMatch = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      lister: { select: { email: true } },
      listing: { select: { title: true } },
    },
  });
  if (!fullMatch) return;

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "noreply@subletto.co",
    to: fullMatch.lister.email,
    subject: "Escrow funds received",
    html: `<p>Escrow funds for <strong>${fullMatch.listing.title}</strong> are now held securely. Once your subtenant moves in, confirm move-in in your dashboard to release funds.</p>`,
  });
}

async function handleChargeRefunded(charge: Stripe.Charge) {
  const paymentIntentId =
    typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!paymentIntentId) return;

  await prisma.payment.updateMany({
    where: { stripeId: paymentIntentId, status: "SUCCEEDED" },
    data: { status: "REFUNDED" },
  });
}
