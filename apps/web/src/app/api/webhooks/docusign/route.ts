import { NextRequest, NextResponse } from "next/server";

/**
 * DocuSign Connect webhook handler.
 * DocuSign calls this URL when envelope status changes.
 * We forward the raw body to the Fastify API.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  const apiUrl = process.env.API_URL ?? "http://localhost:3001";

  try {
    const res = await fetch(`${apiUrl}/v1/webhooks/docusign`, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") ?? "application/json",
        "x-api-secret": process.env.API_SECRET ?? "",
      },
      body,
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "API webhook processing failed" },
        { status: 500 },
      );
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("DocuSign webhook proxy error:", err);
    return NextResponse.json({ error: "Webhook proxy failed" }, { status: 500 });
  }
}
