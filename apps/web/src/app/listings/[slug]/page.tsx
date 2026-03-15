import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import VerificationBadge from "@/components/features/verification-badge";
import MatchRequestButton from "@/components/features/match-request-button";
import PhotoCarousel from "@/components/features/photo-carousel";
import { CheckCircle, Bed, Droplets, MapPin } from "lucide-react";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://subletto.co";

  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    select: {
      title: true,
      description: true,
      neighborhood: true,
      bedrooms: true,
      bathrooms: true,
      rentCents: true,
      availableFrom: true,
      availableTo: true,
    },
  });

  if (!listing) return { title: "Listing not found" };

  const rent = `$${Math.round(listing.rentCents / 100)}/mo`;
  const title = `${listing.title} — ${rent}`;
  const desc = listing.description
    ? listing.description.slice(0, 155)
    : `${listing.bedrooms}BR sublease in ${listing.neighborhood}, Boulder CO · ${rent} · Available ${new Date(listing.availableFrom).toLocaleDateString("en-US", { month: "short", year: "numeric" })}.`;
  const canonicalUrl = `${APP_URL}/listings/${params.slug}`;

  return {
    title,
    description: desc,
    keywords: [
      "CU Boulder sublease",
      "Boulder sublease",
      "CU Boulder sublet",
      `${listing.neighborhood} sublease Boulder`,
      `${listing.bedrooms} bedroom sublease Boulder`,
    ],
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title,
      description: desc,
      url: canonicalUrl,
      siteName: "Subletto",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description: desc },
  };
}

export default async function ListingDetailPage({ params }: Props) {
  const listing = await prisma.listing.findUnique({
    where: { slug: params.slug },
    include: {
      photos: { orderBy: { order: "asc" } },
      owner: { select: { verifiedAt: true, email: true } },
    },
  });

  if (!listing || listing.status !== "ACTIVE") notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const photos = listing.photos.map((p) => ({
    storageKey: p.storageKey,
    order: p.order,
    isPrimary: p.isPrimary,
  }));

  const maskedEmail = listing.owner.email.slice(0, 3) + "***";

  const fromDate = new Date(listing.availableFrom).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const toDate = new Date(listing.availableTo).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <main className="mx-auto max-w-5xl px-4 py-8 pb-28 lg:pb-8">
        {/* Photo gallery */}
        <PhotoCarousel
          photos={photos}
          supabaseUrl={supabaseUrl}
          neighborhood={listing.neighborhood}
        />

        {/* Two-column layout */}
        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-2">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                {listing.neighborhood}
              </span>
              {listing.owner.verifiedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                  <CheckCircle className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="mt-2 font-display text-3xl font-bold text-gray-900">
              {listing.title}
            </h1>

            {/* Price */}
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-blue-600">
                {formatCurrency(listing.rentCents)}
              </span>
              <span className="text-lg text-gray-400">/month</span>
            </div>

            {/* Details row */}
            <div className="mt-4 flex flex-wrap gap-6 text-sm text-gray-700">
              <span className="inline-flex items-center gap-1.5">
                <Bed className="h-4 w-4 text-gray-500" />
                <span className="font-medium">
                  {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`}
                </span>
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Droplets className="h-4 w-4 text-gray-500" />
                <span className="font-medium">{listing.bathrooms} bath</span>
              </span>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Available dates */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400">
                Available dates
              </h2>
              <p className="mt-1 text-gray-800">
                {fromDate} — {toDate}
              </p>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Description */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                About this sublease
              </h2>
              <p className="mt-2 leading-relaxed text-gray-600 whitespace-pre-line">
                {listing.description ?? "No description provided."}
              </p>
            </div>

            <hr className="my-6 border-gray-200" />

            {/* Map placeholder */}
            <div className="flex h-48 items-center justify-center rounded-2xl bg-gray-100">
              <span className="inline-flex items-center gap-1.5 text-gray-500">
                <MapPin className="h-4 w-4" /> {listing.neighborhood}, Boulder CO
              </span>
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              {/* Price */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-blue-600">
                  {formatCurrency(listing.rentCents)}
                </span>
                <span className="text-lg text-gray-400">/month</span>
              </div>

              {/* Available dates */}
              <div className="mt-4 text-sm text-gray-600">
                <p>
                  <span className="font-medium text-gray-800">From:</span>{" "}
                  {fromDate}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-gray-800">To:</span>{" "}
                  {toDate}
                </p>
              </div>

              {/* CTA */}
              <div className="mt-5">
                <MatchRequestButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                />
              </div>

              <hr className="my-5 border-gray-200" />

              {/* Lister info */}
              <div className="text-sm text-gray-600">
                <p className="font-medium text-gray-800">Listed by</p>
                <p className="mt-1">
                  {maskedEmail}{" "}
                  {listing.owner.verifiedAt && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      <CheckCircle className="h-3 w-3" /> Verified
                    </span>
                  )}
                </p>
              </div>

              <p className="mt-4 text-xs text-gray-400">
                Exact address shared after match is confirmed
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* Mobile sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white px-4 py-3 shadow-lg lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <div>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrency(listing.rentCents)}
            </p>
            <p className="text-xs text-gray-400">/month</p>
          </div>
          <div className="flex-1">
            <MatchRequestButton
              listingId={listing.id}
              listingTitle={listing.title}
            />
          </div>
        </div>
      </div>
    </>
  );
}
