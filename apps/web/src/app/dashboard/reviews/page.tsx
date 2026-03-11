import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";

export const dynamic = "force-dynamic";

export default async function PendingReviewsPage({
  searchParams,
}: {
  searchParams: { submitted?: string };
}) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) redirect("/sign-in");

  // Find CONFIRMED matches where this user hasn't submitted a review yet
  const confirmedMatches = await prisma.match.findMany({
    where: {
      status: "CONFIRMED",
      OR: [{ listerId: user.id }, { subtenantId: user.id }],
      reviews: { none: { reviewerId: user.id } },
    },
    include: {
      listing: { select: { title: true, slug: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  const pending = confirmedMatches.map((m) => ({
    matchId: m.id,
    listingTitle: m.listing.title,
    listingSlug: m.listing.slug,
    role: m.listerId === user.id ? "LISTER_REVIEWS_SUBTENANT" : "SUBTENANT_REVIEWS_LISTER",
    date: m.updatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  }));

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Pending Reviews</h1>
      <p className="mt-1 text-sm text-slate-500">
        Leave a review for your past subletting experiences.
      </p>

      {searchParams.submitted === "1" && (
        <div className="mt-4 rounded-2xl bg-green-50 border border-green-200 px-5 py-4 text-sm text-green-800 font-medium">
          Review submitted — thank you for contributing to the community!
        </div>
      )}

      {pending.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">
          <p className="text-3xl mb-3">⭐</p>
          <p className="font-medium">No pending reviews</p>
          <p className="mt-1 text-sm">
            Reviews become available after move-in is confirmed.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {pending.map((item) => (
            <li key={item.matchId}>
              <Link
                href={`/dashboard/reviews/${item.matchId}?role=${item.role}`}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:bg-slate-50 transition"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.listingTitle}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {item.role === "LISTER_REVIEWS_SUBTENANT"
                      ? "You are the lister — rate your subtenant"
                      : "You are the subtenant — rate your lister"}{" "}
                    · {item.date}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Review →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
