import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@subletto/db";

function generateCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = generateCode();
    const existing = await prisma.waitlistEntry.findUnique({
      where: { referralCode: code },
    });
    if (!existing) return code;
  }
  // Extremely unlikely fallback
  return `${Date.now().toString(36).toUpperCase().slice(-4)}${generateCode().slice(0, 2)}`;
}

async function computePosition(entryId: string): Promise<number> {
  const entry = await prisma.waitlistEntry.findUnique({ where: { id: entryId } });
  if (!entry) return 1;
  const before = await prisma.waitlistEntry.count({
    where: { createdAt: { lt: entry.createdAt } },
  });
  return before + 1;
}

// POST /api/waitlist — join the waitlist
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as any;
    const email: string = (body.email ?? "").trim().toLowerCase();
    const refCode: string = (body.referredBy ?? "").trim().toUpperCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Valid email required." }, { status: 400 });
    }

    // Already on waitlist
    const existing = await prisma.waitlistEntry.findUnique({ where: { email } });
    if (existing) {
      const position = await computePosition(existing.id);
      const referralCount = await prisma.waitlistEntry.count({
        where: { referredBy: existing.referralCode },
      });
      return NextResponse.json({
        position,
        referralCode: existing.referralCode,
        referralCount,
        alreadyJoined: true,
      });
    }

    // Validate referral code
    let referredBy: string | undefined;
    if (refCode) {
      const referrer = await prisma.waitlistEntry.findUnique({
        where: { referralCode: refCode },
      });
      if (referrer) referredBy = refCode;
    }

    const referralCode = await uniqueCode();
    const entry = await prisma.waitlistEntry.create({
      data: { email, referralCode, referredBy },
    });

    const position = await computePosition(entry.id);

    return NextResponse.json(
      { position, referralCode, referralCount: 0, alreadyJoined: false },
      { status: 201 },
    );
  } catch {
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// GET /api/waitlist?code=ABC123 — look up position by referral code
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase();
  if (!code) {
    return NextResponse.json({ error: "Missing code." }, { status: 400 });
  }

  const entry = await prisma.waitlistEntry.findUnique({
    where: { referralCode: code },
  });
  if (!entry) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [position, referralCount, totalCount] = await Promise.all([
    computePosition(entry.id),
    prisma.waitlistEntry.count({ where: { referredBy: code } }),
    prisma.waitlistEntry.count(),
  ]);

  return NextResponse.json({ position, referralCode: code, referralCount, totalCount });
}
