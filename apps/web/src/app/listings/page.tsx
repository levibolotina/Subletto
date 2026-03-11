import type { Metadata } from "next";
import { prisma } from "@subletto/db";
import ListingCard from "@/components/features/listing-card";

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
import ListingFilters, {
  ListingFiltersSidebar,
} from "@/components/features/listing-filters";
import SavedSearchForm from "@/components/features/saved-search-form";
import type { ListingPublicView } from "@subletto/shared";

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
        owner: { select: { verifiedAt: true } },
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
    photos: l.photos.map((p) => ({
      storageKey: p.storageKey,
      order: p.order,
      isPrimary: p.isPrimary,
    })),
    createdAt: l.createdAt.toISOString(),
  }));

  const totalPages = Math.ceil(total / pageSize);
  const hasFilters = Object.values(searchParams).some(Boolean);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-slate-900">
          Boulder Subleases
        </h1>
        <p className="mt-1 text-slate-500">
          {total} verified listing{total !== 1 ? "s" : ""} available
        </p>
      </div>

      {/* Mobile filters row */}
      <div className="mb-4 flex items-center gap-3 lg:hidden">
        <ListingFilters />
        {hasFilters && (
          <a
            href="/listings"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Clear filters
          </a>
        )}
      </div>

      <div className="flex gap-6">
        {/* Desktop sidebar (rendered inside ListingFilters) */}
        <ListingFiltersSidebar />

        {/* Results */}
        <div className="min-w-0 flex-1">
          {publicListings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center">
              <div className="text-4xl">🔍</div>
              <p className="mt-3 font-semibold text-slate-700">
                No listings match your filters
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Try adjusting your search criteria
              </p>
              {hasFilters && (
                <a
                  href="/listings"
                  className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Clear filters
                </a>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {publicListings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {page > 1 && (
                <a
                  href={`/listings?${new URLSearchParams({ ...searchParams, page: String(page - 1) })}`}
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
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
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
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
      </div>
    </main>
  );
}
