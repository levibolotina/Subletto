import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@subletto/db";
import { createAdminClient } from "@/lib/supabase";
import {
  VERIFICATION_DOCS_BUCKET,
  MAX_ID_DOC_SIZE,
  MAX_LEASE_DOC_SIZE,
  ALLOWED_ID_MIME_TYPES,
  ALLOWED_LEASE_MIME_TYPES,
} from "@subletto/shared";

type DocType = "id" | "lease";

function getDocConfig(docType: DocType) {
  return docType === "id"
    ? { maxSize: MAX_ID_DOC_SIZE, allowedTypes: ALLOWED_ID_MIME_TYPES }
    : { maxSize: MAX_LEASE_DOC_SIZE, allowedTypes: ALLOWED_LEASE_MIME_TYPES };
}

export async function POST(req: Request) {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { clerkId } });
  if (!user || user.role !== "LISTER") {
    return NextResponse.json(
      { error: "Only listers can upload verification documents" },
      { status: 403 },
    );
  }

  const body = await req.json() as { docType: DocType; mimeType: string; fileSize: number };
  const { docType, mimeType, fileSize } = body;

  if (!["id", "lease"].includes(docType)) {
    return NextResponse.json({ error: "docType must be 'id' or 'lease'" }, { status: 400 });
  }

  const config = getDocConfig(docType);
  if (!config.allowedTypes.includes(mimeType)) {
    return NextResponse.json(
      { error: `File type ${mimeType} not allowed for ${docType} document` },
      { status: 400 },
    );
  }
  if (fileSize > config.maxSize) {
    return NextResponse.json({ error: "File exceeds maximum size" }, { status: 400 });
  }

  const ext = mimeType === "application/pdf" ? "pdf" : mimeType.split("/")[1];
  const storagePath = `${user.id}/${docType}-${Date.now()}.${ext}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(VERIFICATION_DOCS_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    return NextResponse.json({ error: "Failed to create upload URL" }, { status: 500 });
  }

  return NextResponse.json({
    signedUrl: data.signedUrl,
    storagePath,
  });
}
