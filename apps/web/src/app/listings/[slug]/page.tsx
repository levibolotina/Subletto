import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import VerificationBadge from "@/components/features/verification-badge";
import MatchRequestButton from "@/components/features/match-request-button";
import PhotoCarousel from "@/components/features/photo-carousel";

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
      owner: { select: { verifiedAt: true } },
    },
  });

  if (!listing || listing.status !== "ACTIVE") notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const amenities = [
    listing.furnished && "Furnished",
    listing.petFriendly && "Pets welcome",
    listing.parking && "Parking included",
  ].filter(Boolean) as string[];

  const photos = listing.photos.map((p) => ({
    storageKey: p.storageKey,
    order: p.order,
    isPrimary: p.isPrimary,
  }));

  return (
    <>
      {/* Add bottom padding on mobile so sticky bar doesn't overlap */}
      <main className="mx-auto max-w-4xl px-4 py-6 pb-28 lg:pb-10">
        <PhotoCarousel
          photos={photos}
          supabaseUrl={supabaseUrl}
          neighborhood={listing.neighborhood}
        />

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* ── Main info ─────────────────────────────────────────── */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
                  {listing.neighborhood} · Boulder, CO
                </p>
                <h1 className="mt-1.5 text-2xl font-bold text-slate-900 sm:text-3xl">
                  {listing.title}
                </h1>
                <p className="mt-1 text-slate-500">
                  {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bed`}{" "}
                  · {listing.bathrooms} bath
                </p>
              </div>
              {listing.owner.verifiedAt && (
                <div className="shrink-0">
                  <VerificationBadge status="VERIFIED" role="LISTER" />
                </div>
              )}
            </div>

            {/* Price */}
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-4xl font-extrabold text-slate-900">
                {formatCurrency(listing.rentCents)}
              </span>
              <span className="text-slate-400">/month</span>
            </div>

            {/* Dates */}
            <div className="mt-5 flex flex-wrap gap-4 rounded-xl bg-slate-50 p-4 text-sm">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Available from
                </p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {new Date(listing.availableFrom).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="h-auto w-px bg-slate-200" />
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Until
                </p>
                <p className="mt-0.5 font-semibold text-slate-800">
                  {new Date(listing.availableTo).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="mt-6">
                <h2 className="font-semibold text-slate-900">Amenities</h2>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {amenities.map((a) => (
                    <span
                      key={a}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700"
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description */}
            {listing.description && (
              <div className="mt-6">
                <h2 className="font-semibold text-slate-900">
                  About this place
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 whitespace-pre-line">
                  {listing.description}
                </p>
              </div>
            )}

            {/* Neighborhood zone note */}
            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">📍</span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {listing.neighborhood}, Boulder CO
                  </p>
                  <p className="text-xs text-slate-500">
                    Exact address shared after you connect with the lister
                  </p>
                </div>
              </div>
            </div>

            {/* Privacy notice */}
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <strong>🔒 Address and contact info revealed only after payment.</strong>{" "}
              All transactions are handled securely through Subletto.
            </div>
          </div>

          {/* ── Desktop sidebar CTA ───────────────────────────────── */}
          <aside className="hidden lg:block lg:w-72 lg:shrink-0">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-3xl font-extrabold text-slate-900">
                {formatCurrency(listing.rentCents)}
                <span className="text-base font-normal text-slate-400">/mo</span>
              </p>

              <div className="mt-4 space-y-2 rounded-xl bg-slate-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Neighborhood</span>
                  <span className="font-medium text-slate-800">
                    {listing.neighborhood}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Beds / Baths</span>
                  <span className="font-medium text-slate-800">
                    {listing.bedrooms === 0 ? "Studio" : listing.bedrooms} /{" "}
                    {listing.bathrooms}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Available</span>
                  <span className="font-medium text-slate-800">
                    {new Date(listing.availableFrom).toLocaleDateString(
                      "en-US",
                      { month: "short", day: "numeric" },
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5">
                <MatchRequestButton
                  listingId={listing.id}
                  listingTitle={listing.title}
                />
              </div>

              <p className="mt-3 text-center text-xs text-slate-400">
                $99 connection fee · Full refund if declined
              </p>
            </div>
          </aside>
        </div>
      </main>

      {/* ── Mobile sticky bottom bar ─────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white px-4 py-3 shadow-lg lg:hidden">
        <div className="mx-auto flex max-w-4xl items-center gap-3">
          <div>
            <p className="text-xl font-extrabold text-slate-900">
              {formatCurrency(listing.rentCents)}
            </p>
            <p className="text-xs text-slate-400">/month</p>
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
