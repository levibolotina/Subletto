import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const clerkUser = await currentUser();
  if (!clerkUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!admin || admin.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.testimonial.delete({ where: { id: params.id } });

  return NextResponse.redirect(new URL("/admin/growth", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"));
}
