"use client";

import { useCallback, useRef, useState } from "react";
import { MAX_LISTING_PHOTOS, ALLOWED_LISTING_PHOTO_MIME_TYPES, MAX_LISTING_PHOTO_SIZE } from "@subletto/shared";

interface UploadedPhoto {
  storageKey: string;
  previewUrl: string;
  isPrimary: boolean;
}

interface PhotoUploadProps {
  listingId: string;
  onPhotosChange: (photos: UploadedPhoto[]) => void;
}

/** Strip EXIF by re-drawing the image onto a canvas and exporting as JPEG. */
async function stripExif(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("Canvas not available")); return; }
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas export failed"));
        },
        "image/jpeg",
        0.92,
      );
    };
    img.onerror = () => reject(new Error("Image load failed"));
    img.src = url;
  });
}

export default function PhotoUpload({ listingId, onPhotosChange }: PhotoUploadProps) {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList) => {
      setError(null);
      const remaining = MAX_LISTING_PHOTOS - photos.length;
      const toUpload = Array.from(files).slice(0, remaining);

      if (toUpload.length === 0) {
        setError(`Maximum ${MAX_LISTING_PHOTOS} photos allowed`);
        return;
      }

      for (const file of toUpload) {
        if (!ALLOWED_LISTING_PHOTO_MIME_TYPES.includes(file.type as never)) {
          setError("Only JPEG, PNG, and WebP images are allowed");
          return;
        }
        if (file.size > MAX_LISTING_PHOTO_SIZE) {
          setError("Each photo must be under 10 MB");
          return;
        }
      }

      setUploading(true);
      try {
        for (const file of toUpload) {
          // 1. Strip EXIF
          const stripped = await stripExif(file);

          // 2. Get signed URL
          const res = await fetch("/api/storage/listing-photos", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              listingId,
              fileName: file.name,
              contentType: "image/jpeg",
            }),
          });
          if (!res.ok) {
            const { error: msg } = await res.json();
            throw new Error(msg ?? "Failed to get upload URL");
          }
          const { signedUrl, storageKey } = await res.json();

          // 3. Upload directly to Supabase
          const upload = await fetch(signedUrl, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: stripped,
          });
          if (!upload.ok) throw new Error("Storage upload failed");

          const previewUrl = URL.createObjectURL(stripped);
          const newPhoto: UploadedPhoto = {
            storageKey,
            previewUrl,
            isPrimary: photos.length === 0,
          };

          setPhotos((prev) => {
            const next = [...prev, newPhoto];
            onPhotosChange(next);
            return next;
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [listingId, photos.length, onPhotosChange],
  );

  const remove = (storageKey: string) => {
    setPhotos((prev) => {
      const next = prev
        .filter((p) => p.storageKey !== storageKey)
        .map((p, i) => ({ ...p, isPrimary: i === 0 }));
      onPhotosChange(next);
      return next;
    });
  };

  const setPrimary = (storageKey: string) => {
    setPhotos((prev) => {
      const next = prev.map((p) => ({ ...p, isPrimary: p.storageKey === storageKey }));
      onPhotosChange(next);
      return next;
    });
  };

  return (
    <div>
      <div
        className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 transition hover:border-gray-400"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
        }}
      >
        <p className="text-sm text-gray-500">
          {uploading ? "Uploading…" : `Drag photos here or click to select (max ${MAX_LISTING_PHOTOS})`}
        </p>
        <p className="mt-1 text-xs text-gray-400">JPEG · PNG · WebP · max 10 MB each · EXIF stripped automatically</p>
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_LISTING_PHOTO_MIME_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {photos.length > 0 && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {photos.map((photo) => (
            <div key={photo.storageKey} className="group relative aspect-square overflow-hidden rounded-lg">
              {/* eslint-disable-next-line @next/next-eslint/no-img-element */}
              <img
                src={photo.previewUrl}
                alt=""
                className="h-full w-full object-cover"
              />
              {photo.isPrimary && (
                <span className="absolute top-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white">
                  Cover
                </span>
              )}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition group-hover:opacity-100">
                {!photo.isPrimary && (
                  <button
                    type="button"
                    onClick={() => setPrimary(photo.storageKey)}
                    className="rounded bg-white/90 px-2 py-1 text-xs font-medium"
                  >
                    Set cover
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(photo.storageKey)}
                  className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
