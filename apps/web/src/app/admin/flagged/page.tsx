import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import { CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const FLAG_REASON_LABEL: Record<string, string> = {
  PRICE_TOO_LOW: "Price too low",
  NEW_ACCOUNT_URGENT: "New account + urgent keywords",
  REPORTED_SCAM: "Reported as scam",
};

const FLAG_REASON_COLOR: Record<string, string> = {
  PRICE_TOO_LOW: "bg-yellow-100 text-yellow-800",
  NEW_ACCOUNT_URGENT: "bg-orange-100 text-orange-700",
  REPORTED_SCAM: "bg-red-100 text-red-700",
};

export default async function AdminFlaggedPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const flagged = await prisma.listing.findMany({
    where: { isFlagged: true, status: { not: "ARCHIVED" } },
    include: {
      owner: { select: { email: true, verifiedAt: true, suspendedAt: true } },
      scamFlags: { orderBy: { createdAt: "desc" } },
      photos: { where: { isPrimary: true }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Admin</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Flagged Listings</h1>
          <p className="mt-1 text-sm text-slate-400">
            {flagged.length} listing{flagged.length !== 1 ? "s" : ""} flagged for review
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href="/admin/verify"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Verifications
          </a>
          <a
            href="/admin/reports"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Reports
          </a>
        </div>
      </div>

      {flagged.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-20 text-center">
          <div className="flex justify-center"><CheckCircle className="h-8 w-8 text-green-500" /></div>
          <p className="mt-3 font-medium text-slate-600">No flagged listings.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {flagged.map((listing) => (
            <div
              key={listing.id}
              className="rounded-2xl border border-amber-200 bg-white p-5 shadow-sm"
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
                  <p className="mt-0.5 text-xs text-slate-400">
                    Owner: {listing.owner.email}
                    {listing.owner.verifiedAt ? (
                      <span className="ml-1 font-medium text-green-600">(verified)</span>
                    ) : (
                      <span className="ml-1 font-medium text-red-500">(not verified)</span>
                    )}
                    {listing.owner.suspendedAt && (
                      <span className="ml-1 font-medium text-red-600">(suspended)</span>
                    )}
                  </p>

                  {/* Scam flags */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {listing.scamFlags.map((f) => (
                      <span
                        key={f.id}
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${FLAG_REASON_COLOR[f.reason] ?? "bg-slate-100 text-slate-600"}`}
                        title={f.details ?? undefined}
                      >
                        {FLAG_REASON_LABEL[f.reason] ?? f.reason}
                      </span>
                    ))}
                  </div>

                  {listing.scamFlags[0]?.details && (
                    <p className="mt-1.5 text-xs text-slate-500 italic">
                      {listing.scamFlags[0].details}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-3">
                <a
                  href={`/listings/${listing.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  View listing ↗
                </a>
                <form method="POST" action={`${API_URL}/v1/admin/flagged/${listing.id}/clear`}>
                  <input type="hidden" name="action" value="approve" />
                  <button
                    type="submit"
                    className="rounded-xl bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                  >
                    Approve — clear flag
                  </button>
                </form>
                <form method="POST" action={`${API_URL}/v1/admin/flagged/${listing.id}/clear`}>
                  <input type="hidden" name="action" value="archive" />
                  <button
                    type="submit"
                    className="rounded-xl border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                  >
                    Archive
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
