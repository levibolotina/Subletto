import type { ListingPublicView } from "@subletto/shared";
import { formatCurrency } from "@subletto/shared";
import VerificationBadge from "./verification-badge";
import TrustBadge from "./trust-badge";

interface ListingCardProps {
  listing: ListingPublicView;
}

export default function ListingCard({ listing }: ListingCardProps) {
  const primaryPhoto =
    listing.photos.find((p) => p.isPrimary) ?? listing.photos[0];

  const amenities = [
    listing.furnished && "Furnished",
    listing.petFriendly && "Pets OK",
    listing.parking && "Parking",
  ].filter(Boolean) as string[];

  const from = new Date(listing.availableFrom).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const to = new Date(listing.availableTo).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <a
      href={`/listings/${listing.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md hover:-translate-y-0.5"
    >
      {/* Photo */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {primaryPhoto ? (
          // eslint-disable-next-line @next/next-eslint/no-img-element
          <img
            src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${primaryPhoto.storageKey}`}
            alt={listing.neighborhood}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-slate-400 text-sm">
            No photo
          </div>
        )}

        {listing.ownerVerified && (
          <div className="absolute right-2 top-2">
            <VerificationBadge status="VERIFIED" role="LISTER" />
          </div>
        )}

        {/* Dates pill */}
        <div className="absolute bottom-2 left-2">
          <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
            {from} – {to}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
              {listing.neighborhood}
            </p>
            <p className="mt-0.5 truncate font-semibold text-slate-900">
              {listing.title}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(listing.rentCents)}
            </p>
            <p className="text-xs text-slate-400">/mo</p>
          </div>
        </div>

        <p className="mt-1.5 text-sm text-slate-500">
          {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} bd`} ·{" "}
          {listing.bathrooms} ba
        </p>

        {amenities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {amenities.map((a) => (
              <span
                key={a}
                className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600"
              >
                {a}
              </span>
            ))}
          </div>
        )}

        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
          <TrustBadge
            trustScore={listing.ownerTrustScore}
            reviewCount={listing.ownerReviewCount}
            size="sm"
          />
          <span className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition group-hover:bg-indigo-700">
            View →
          </span>
        </div>
      </div>
    </a>
  );
}
