import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import { Home } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "In review", color: "bg-yellow-100 text-yellow-700" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
  MATCHED: { label: "Matched", color: "bg-indigo-100 text-indigo-700" },
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-600" },
  LEASED: { label: "Leased", color: "bg-purple-100 text-purple-700" },
  ARCHIVED: { label: "Archived", color: "bg-slate-100 text-slate-500" },
};

export default async function MyListingsPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { verification: true },
  });

  if (!user) redirect("/sign-in");
  if (user.role !== "LISTER") redirect("/dashboard");

  const listings = await prisma.listing.findMany({
    where: { ownerId: user.id },
    include: { photos: { where: { isPrimary: true }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  const isVerified = !!user.verifiedAt;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">My listings</h1>
          <p className="mt-0.5 text-sm text-slate-400">
            {listings.length} listing{listings.length !== 1 ? "s" : ""}
          </p>
        </div>
        {isVerified ? (
          <a
            href="/dashboard/listings/new"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New listing
          </a>
        ) : (
          <a
            href="/dashboard/verify"
            className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            Verify to list
          </a>
        )}
      </div>

      {!isVerified && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          You need to be verified before you can create listings.{" "}
          <a href="/dashboard/verify" className="font-semibold underline hover:text-amber-900">
            Complete verification →
          </a>
        </div>
      )}

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 py-20 text-center">
          <div className="flex justify-center"><Home className="h-8 w-8 text-slate-300" /></div>
          <p className="mt-3 font-medium text-slate-600">No listings yet.</p>
          {isVerified && (
            <a
              href="/dashboard/listings/new"
              className="mt-5 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              Create your first listing →
            </a>
          )}
        </div>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
          {listings.map((listing) => {
            const badge = STATUS_LABELS[listing.status] ?? STATUS_LABELS.DRAFT!;
            const photo = listing.photos[0];

            return (
              <div key={listing.id} className="flex items-center gap-4 p-4">
                {/* Thumbnail */}
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                  {photo ? (
                    // eslint-disable-next-line @next/next-eslint/no-img-element
                    <img
                      src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${photo.storageKey}`}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-300">
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-slate-900">{listing.title}</p>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {listing.neighborhood} · {formatCurrency(listing.rentCents)}/mo ·{" "}
                    {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BD`}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {new Date(listing.availableFrom).toLocaleDateString()} –{" "}
                    {new Date(listing.availableTo).toLocaleDateString()}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex shrink-0 gap-2">
                  {listing.status === "DRAFT" && (
                    <>
                      <a
                        href={`/dashboard/listings/${listing.id}/edit`}
                        className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                      >
                        Edit
                      </a>
                      <SubmitButton listingId={listing.id} />
                    </>
                  )}
                  {listing.status === "ACTIVE" && (
                    <a
                      href={`/listings/${listing.slug}`}
                      className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

function SubmitButton({ listingId }: { listingId: string }) {
  return (
    <form action={`/dashboard/listings/${listingId}/submit`} method="POST">
      <button
        type="submit"
        className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
      >
        Submit
      </button>
    </form>
  );
}
