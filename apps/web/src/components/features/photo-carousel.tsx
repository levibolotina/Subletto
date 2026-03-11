"use client";

import { useState } from "react";

interface Photo {
  storageKey: string;
  order: number;
  isPrimary: boolean;
}

interface PhotoCarouselProps {
  photos: Photo[];
  supabaseUrl: string;
  neighborhood: string;
}

export default function PhotoCarousel({
  photos,
  supabaseUrl,
  neighborhood,
}: PhotoCarouselProps) {
  const [current, setCurrent] = useState(0);

  if (photos.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-100 sm:h-80">
        <p className="text-sm text-slate-400">No photos available</p>
      </div>
    );
  }

  const photoUrl = (key: string) =>
    `${supabaseUrl}/storage/v1/object/public/listing-photos/${key}`;

  const prev = () => setCurrent((c) => (c === 0 ? photos.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === photos.length - 1 ? 0 : c + 1));

  return (
    <div className="mb-6 space-y-2">
      {/* Main photo */}
      <div className="relative overflow-hidden rounded-2xl bg-slate-100">
        {/* eslint-disable-next-line @next/next-eslint/no-img-element */}
        <img
          src={photoUrl(photos[current]!.storageKey)}
          alt={`${neighborhood} — photo ${current + 1}`}
          className="h-64 w-full object-cover sm:h-80 lg:h-96"
        />

        {/* Nav arrows */}
        {photos.length > 1 && (
          <>
            <button
              onClick={prev}
              aria-label="Previous photo"
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              ‹
            </button>
            <button
              onClick={next}
              aria-label="Next photo"
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm hover:bg-black/70"
            >
              ›
            </button>
          </>
        )}

        {/* Counter pill */}
        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
          {current + 1} / {photos.length}
        </div>
      </div>

      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, i) => (
            <button
              key={photo.storageKey}
              onClick={() => setCurrent(i)}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition ${
                i === current
                  ? "border-indigo-600"
                  : "border-transparent hover:border-slate-300"
              }`}
            >
              {/* eslint-disable-next-line @next/next-eslint/no-img-element */}
              <img
                src={photoUrl(photo.storageKey)}
                alt=""
                className="h-16 w-20 object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Dot indicators (mobile) */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 sm:hidden">
          {photos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to photo ${i + 1}`}
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-4 bg-indigo-600" : "w-1.5 bg-slate-300"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
