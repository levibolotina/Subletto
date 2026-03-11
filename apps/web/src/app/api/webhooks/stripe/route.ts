import { headers } from "next/headers";
import { NextResponse } from "next/server";

/**
 * POST /api/webhooks/stripe
 *
 * Forwards the raw Stripe webhook body + signature header to the Fastify API,
 * which performs signature verification and business logic processing.
 *
 * Using Next.js as the public-facing entry point keeps webhook routing consistent
 * with the Clerk webhook and allows Next.js middleware to handle CORS/headers.
 */
export async function POST(req: Request) {
  const rawBody = await req.text();
  const headerPayload = await headers();
  const sig = headerPayload.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const apiUrl = process.env.API_URL ?? "http://localhost:3001";

  const res = await fetch(`${apiUrl}/v1/webhooks/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": sig,
    },
    body: rawBody,
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
