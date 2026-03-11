import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@subletto/db";

// POST /api/testimonial — public submission
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const quote: string = (body.quote ?? "").trim();
    const displayName: string = (body.displayName ?? "").trim();

    if (!quote || quote.length < 20) {
      return NextResponse.json(
        { error: "Quote must be at least 20 characters." },
        { status: 400 },
      );
    }
    if (quote.length > 500) {
      return NextResponse.json({ error: "Quote too long (max 500 chars)." }, { status: 400 });
    }

    await prisma.testimonial.create({
      data: {
        quote,
        displayName: displayName || null,
        isApproved: false,
      },
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
