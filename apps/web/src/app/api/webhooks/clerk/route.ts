import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@subletto/db";
import { isEduEmail } from "@subletto/shared";

interface ClerkEmailAddress {
  email_address: string;
  id: string;
}

interface ClerkUserCreatedEvent {
  type: "user.created" | "user.updated";
  data: {
    id: string;
    email_addresses: ClerkEmailAddress[];
    primary_email_address_id: string;
  };
}

export async function POST(req: Request) {
  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json({ error: "Missing svix headers" }, { status: 400 });
  }

  const payload = await req.text();
  const wh = new Webhook(webhookSecret);

  let event: ClerkUserCreatedEvent;
  try {
    event = wh.verify(payload, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ClerkUserCreatedEvent;
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (event.type === "user.created") {
    const { id: clerkId, email_addresses, primary_email_address_id } = event.data;
    const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
    const email = primaryEmail?.email_address;

    if (!email) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // .edu guard — should be caught by Clerk allowlist first, but double-check
    if (!isEduEmail(email)) {
      return NextResponse.json({ error: "Non-.edu email blocked" }, { status: 403 });
    }

    await prisma.user.upsert({
      where: { clerkId },
      create: { clerkId, email, role: "SEEKER" },
      update: { email },
    });
  }

  if (event.type === "user.updated") {
    const { id: clerkId, email_addresses, primary_email_address_id } = event.data;
    const primaryEmail = email_addresses.find((e) => e.id === primary_email_address_id);
    const email = primaryEmail?.email_address;

    if (email) {
      await prisma.user.updateMany({
        where: { clerkId },
        data: { email },
      });
    }
  }

  return NextResponse.json({ received: true });
}
