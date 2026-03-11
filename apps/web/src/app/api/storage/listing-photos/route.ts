import { auth } from "@/lib/clerk";
import { createAdminClient } from "@/lib/supabase";
import { LISTING_PHOTOS_BUCKET, ALLOWED_LISTING_PHOTO_MIME_TYPES } from "@subletto/shared";
import { NextResponse } from "next/server";

/**
 * POST /api/storage/listing-photos
 * Body: { listingId: string, fileName: string, contentType: string }
 * Returns: { signedUrl, storageKey }
 *
 * The client should:
 *   1. Strip EXIF from the image (canvas re-encode)
 *   2. Request a signed URL from this endpoint
 *   3. PUT the file directly to Supabase Storage
 *   4. Register the storageKey via POST /v1/listings/:id/photos
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { listingId: string; fileName: string; contentType: string };
  try {
    body = await request.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { listingId, fileName, contentType } = body;

  if (!listingId || !fileName || !contentType) {
    return NextResponse.json(
      { error: "listingId, fileName, and contentType are required" },
      { status: 400 },
    );
  }

  if (!ALLOWED_LISTING_PHOTO_MIME_TYPES.includes(contentType as never)) {
    return NextResponse.json(
      { error: `contentType must be one of: ${ALLOWED_LISTING_PHOTO_MIME_TYPES.join(", ")}` },
      { status: 400 },
    );
  }

  // Namespace by userId/listingId to prevent path traversal
  const storageKey = `${userId}/${listingId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(LISTING_PHOTOS_BUCKET)
    .createSignedUploadUrl(storageKey);

  if (error || !data) {
    console.error("[listing-photos] signed URL error", error);
    return NextResponse.json({ error: "Failed to generate upload URL" }, { status: 500 });
  }

  return NextResponse.json({ signedUrl: data.signedUrl, storageKey });
}
