import type { Metadata } from "next";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import type { ListingPublicView } from "@subletto/shared";
import ListingsFilterBar from "@/components/features/listings-filter-bar";
import SavedSearchForm from "@/components/features/saved-search-form";

export const metadata: Metadata = {
  title: "Browse Subleases",
  description:
    "Browse verified CU Boulder subleases. Filter by neighborhood, price, dates, bedrooms, and more. All listings are ID-verified.",
  keywords: [
    "CU Boulder sublease",
    "Boulder sublease summer",
    "CU Boulder sublet",
    "Boulder CO rental",
  ],
  openGraph: {
    title: "Browse CU Boulder Subleases | Subletto",
    description: "Verified CU Boulder subleases — no scams, no sketchy posts.",
    type: "website",
  },
};

interface SearchParams {
  neighborhood?: string;
  minRentCents?: string;
  maxRentCents?: string;
  availableFrom?: string;
  availableTo?: string;
  bedrooms?: string;
  petFriendly?: string;
  furnished?: string;
  page?: string;
}

export const dynamic = "force-dynamic";

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const page = Number(searchParams.page ?? 1);
  const pageSize = 20;

  const where = {
    status: "ACTIVE" as const,
    ...(searchParams.neighborhood && {
      neighborhood: searchParams.neighborhood,
    }),
    ...(searchParams.minRentCents && {
      rentCents: { gte: Number(searchParams.minRentCents) },
    }),
    ...(searchParams.maxRentCents && {
      rentCents: {
        ...(searchParams.minRentCents
          ? { gte: Number(searchParams.minRentCents) }
          : {}),
        lte: Number(searchParams.maxRentCents),
      },
    }),
    ...(searchParams.availableFrom && {
      availableFrom: { lte: new Date(searchParams.availableFrom) },
    }),
    ...(searchParams.availableTo && {
      availableTo: { gte: new Date(searchParams.availableTo) },
    }),
    ...(searchParams.bedrooms !== undefined && {
      bedrooms: Number(searchParams.bedrooms),
    }),
    ...(searchParams.petFriendly === "true" && { petFriendly: true }),
    ...(searchParams.furnished === "true" && { furnished: true }),
  };

  const [listings, total] = await Promise.all([
    prisma.listing.findMany({
      where,
      include: {
        photos: { orderBy: { order: "asc" } },
        owner: { select: { verifiedAt: true, trustScore: true } },
        reviews: { select: { id: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.listing.count({ where }),
  ]);

  const publicListings: ListingPublicView[] = listings.map((l) => ({
    id: l.id,
    slug: l.slug,
    status: l.status as ListingPublicView["status"],
    title: l.title,
    description: l.description,
    neighborhood: l.neighborhood,
    bedrooms: l.bedrooms,
    bathrooms: l.bathrooms,
    furnished: l.furnished,
    petFriendly: l.petFriendly,
    parking: l.parking,
    rentCents: l.rentCents,
    availableFrom: l.availableFrom.toISOString(),
    availableTo: l.availableTo.toISOString(),
    ownerVerified: !!l.owner.verifiedAt,
    ownerTrustScore: l.owner.trustScore,
    ownerReviewCount: l.reviews.length,
    isFlagged: l.isFlagged,
    photos: l.photos.map((p) => ({
      storageKey: p.storageKey,
      order: p.order,
      isPrimary: p.isPrimary,
    })),
    createdAt: l.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(total / pageSize);

  // Strip undefined values before passing to client component
  const currentParams = Object.fromEntries(
    Object.entries(searchParams).filter(
      (entry): entry is [string, string] => entry[1] !== undefined
    )
  );

  return (
    <>
      {/* Sticky filter bar — sits directly below the navbar (top-16 = 64px) */}
      <ListingsFilterBar count={total} currentParams={currentParams} />

      {/* Split layout: left = scrollable cards, right = sticky map */}
      <div className="flex min-h-screen">
        {/* ── Left panel: listing cards ── */}
        <div className="w-full lg:w-1/2 px-6 py-6">
          {publicListings.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              {publicListings.map((listing) => (
                <ListingPageCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/listings?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition"
                >
                  ← Previous
                </a>
              )}
              <span className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </span>
              {page < totalPages && (
                <a
                  href={`/listings?${new URLSearchParams({ ...searchParams, page: String(page + 1) })}`}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 transition"
                >
                  Next →
                </a>
              )}
            </div>
          )}

          {/* Save search */}
          <div className="mt-10 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
            <h2 className="text-sm font-semibold text-indigo-900">
              Want to be notified of new matches?
            </h2>
            <p className="mt-1 text-xs text-indigo-600">
              Save your search and get email alerts when new listings appear.
            </p>
            <div className="mt-3">
              <SavedSearchForm
                initialFilters={searchParams as Record<string, string>}
              />
            </div>
          </div>
        </div>

        {/* ── Right panel: sticky map placeholder ── */}
        {/* TODO: replace with Mapbox or Google Maps embed showing neighborhood pins */}
        <div className="hidden lg:block lg:w-1/2 sticky top-32 h-[calc(100vh-8rem)] p-6">
          <div className="h-full w-full rounded-2xl bg-gray-100 flex flex-col items-center justify-center gap-3">
            <span className="text-5xl">🗺️</span>
            <p className="text-base font-medium text-gray-500">
              Map view coming soon
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-6xl">🏠</span>
      <h2 className="mt-5 text-2xl font-bold text-slate-900">
        No listings yet
      </h2>
      <p className="mt-2 text-slate-500">
        Check back soon — new subleases are added weekly.
      </p>
    </div>
  );
}

function ListingPageCard({ listing }: { listing: ListingPublicView }) {
  const primaryPhoto =
    listing.photos.find((p) => p.isPrimary) ?? listing.photos[0];

  const from = new Date(listing.availableFrom).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const to = new Date(listing.availableTo).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const bedroomLabel =
    listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bd`;

  return (
    <div className="group bg-white rounded-2xl shadow-sm overflow-hidden hover:-translate-y-1 hover:shadow-lg transition duration-200">
      {/* Photo — 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-gray-100">
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next-eslint/no-img-element
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${primaryPhoto.storageKey}`}
            alt={listing.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-gray-400 text-sm">
            No photo
          </div>
        )}

        {/* Price badge — bottom-left overlay */}
        <div className="absolute bottom-3 left-3">
          <span className="rounded-full bg-white px-3 py-1 text-sm font-bold text-slate-900 shadow-sm">
            {formatCurrency(listing.rentCents)}/mo
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-4">
        {/* Neighborhood badge */}
        {listing.neighborhood && (
          <span className="inline-block rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1">
            {listing.neighborhood}
          </span>
        )}

        {/* Title */}
        <p className="mt-2 font-semibold text-slate-900 truncate">
          {listing.title}
        </p>

        {/* Details row */}
        <p className="mt-1 text-sm text-gray-500">
          {bedroomLabel} · {listing.bathrooms} ba
        </p>

        {/* Dates */}
        <p className="mt-1 text-xs text-gray-400">
          {from} – {to}
        </p>

        {/* Bottom row */}
        <div className="mt-4 flex items-center justify-between">
          <a
            href={`/listings/${listing.slug}`}
            className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition"
          >
            View listing
          </a>
          <a
            href={`/listings/${listing.slug}`}
            className="rounded-full bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700 transition"
          >
            Request Match
          </a>
        </div>
      </div>
    </div>
  );
}
