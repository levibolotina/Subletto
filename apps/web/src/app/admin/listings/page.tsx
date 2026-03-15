import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import { CheckCircle } from "lucide-react";

export default async function AdminListingsPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user || user.role !== "ADMIN") redirect("/dashboard");

  const listings = await prisma.listing.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      owner: { select: { email: true, verifiedAt: true } },
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { createdAt: "asc" },
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          Admin
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">
          Listing Review Queue
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {listings.length} listing{listings.length !== 1 ? "s" : ""} pending
          review
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-20 text-center">
          <div className="flex justify-center"><CheckCircle className="h-8 w-8 text-green-500" /></div>
          <p className="mt-3 font-medium text-slate-600">
            No listings pending review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start gap-4">
                {listing.photos[0] && (
                  // eslint-disable-next-line @next/next-eslint/no-img-element
                  <img
                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${listing.photos[0].storageKey}`}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-xl object-cover"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{listing.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {listing.neighborhood} · {formatCurrency(listing.rentCents)}/mo ·{" "}
                    {listing.bedrooms === 0 ? "Studio" : `${listing.bedrooms} BD`} /{" "}
                    {listing.bathrooms} BA
                  </p>
                  <p className="text-sm text-slate-500">
                    {listing.address}, {listing.zipCode}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Owner: {listing.owner.email}{" "}
                    {listing.owner.verifiedAt ? (
                      <span className="font-medium text-green-600">(verified)</span>
                    ) : (
                      <span className="font-medium text-red-500">(not verified)</span>
                    )}
                  </p>
                  {listing.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                      {listing.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <form
                  method="POST"
                  action={`${API_URL}/v1/admin/listings/${listing.id}/review`}
                >
                  <input type="hidden" name="action" value="approve" />
                  <button
                    type="submit"
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Approve → Active
                  </button>
                </form>
                <form
                  method="POST"
                  action={`${API_URL}/v1/admin/listings/${listing.id}/review`}
                >
                  <input type="hidden" name="action" value="reject" />
                  <button
                    type="submit"
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Reject
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
