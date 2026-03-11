import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<string, string> = {
  SCAM: "Scam / Fraud",
  WRONG_INFO: "Incorrect info",
  INAPPROPRIATE: "Inappropriate",
};

const CATEGORY_COLOR: Record<string, string> = {
  SCAM: "bg-red-100 text-red-700",
  WRONG_INFO: "bg-yellow-100 text-yellow-800",
  INAPPROPRIATE: "bg-orange-100 text-orange-700",
};

export default async function AdminReportsPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const reports = await prisma.report.findMany({
    where: { status: "PENDING" },
    include: {
      reporter: { select: { email: true } },
      reportedUser: { select: { id: true, email: true, suspendedAt: true } },
      listing: { select: { id: true, title: true, slug: true, status: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">Admin</p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">Reports Queue</h1>
          <p className="mt-1 text-sm text-slate-400">
            {reports.length} pending report{reports.length !== 1 ? "s" : ""}
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
            href="/admin/flagged"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Flagged Listings
          </a>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-20 text-center">
          <div className="text-3xl">✅</div>
          <p className="mt-3 font-medium text-slate-600">No pending reports.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div key={r.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLOR[r.category] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </span>
                    <span className="text-xs text-slate-400">
                      Reported by {r.reporter.email}
                    </span>
                    <span className="text-xs text-slate-400">
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>

                  {r.reportedUser && (
                    <p className="mt-2 text-sm text-slate-700">
                      <span className="font-medium">Reported user:</span> {r.reportedUser.email}
                      {r.reportedUser.suspendedAt && (
                        <span className="ml-2 text-xs font-semibold text-red-600">(suspended)</span>
                      )}
                    </p>
                  )}

                  {r.listing && (
                    <p className="mt-1 text-sm text-slate-700">
                      <span className="font-medium">Listing:</span>{" "}
                      <a
                        href={`/listings/${r.listing.slug}`}
                        className="text-indigo-600 hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {r.listing.title}
                      </a>{" "}
                      <span className="text-xs text-slate-400">({r.listing.status})</span>
                    </p>
                  )}

                  {r.description && (
                    <p className="mt-2 text-sm text-slate-600 italic">"{r.description}"</p>
                  )}
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <form method="POST" action={`${API_URL}/v1/admin/reports/${r.id}/resolve`}>
                  <input type="hidden" name="action" value="dismiss" />
                  <button
                    type="submit"
                    className="rounded-xl border border-slate-300 bg-white px-4 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Dismiss
                  </button>
                </form>

                {r.reportedUser && !r.reportedUser.suspendedAt && (
                  <form method="POST" action={`${API_URL}/v1/admin/reports/${r.id}/resolve`}>
                    <input type="hidden" name="action" value="suspend_user" />
                    <button
                      type="submit"
                      className="rounded-xl bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
                    >
                      Suspend user
                    </button>
                  </form>
                )}

                {r.listing && r.listing.status !== "ARCHIVED" && (
                  <form method="POST" action={`${API_URL}/v1/admin/reports/${r.id}/resolve`}>
                    <input type="hidden" name="action" value="remove_listing" />
                    <button
                      type="submit"
                      className="rounded-xl border border-red-300 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Remove listing
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
