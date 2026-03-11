import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import RatingForm from "@/components/features/rating-form";

type Role = "LISTER_REVIEWS_SUBTENANT" | "SUBTENANT_REVIEWS_LISTER";

export default async function SubmitReviewPage({
  params,
  searchParams,
}: {
  params: { matchId: string };
  searchParams: { role?: string };
}) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) redirect("/sign-in");

  const { matchId } = params;
  const roleParam = searchParams.role as Role | undefined;

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { listing: { select: { title: true } } },
  });

  if (!match || match.status !== "CONFIRMED") redirect("/dashboard/reviews");
  if (match.listerId !== user.id && match.subtenantId !== user.id) redirect("/dashboard");

  // Determine correct role from who the viewer is
  const correctRole: Role =
    match.listerId === user.id ? "LISTER_REVIEWS_SUBTENANT" : "SUBTENANT_REVIEWS_LISTER";

  // If role param is provided and doesn't match, reject
  if (roleParam && roleParam !== correctRole) redirect("/dashboard/reviews");

  // Check if already reviewed
  const existing = await prisma.review.findFirst({
    where: { matchId, reviewerId: user.id },
  });
  if (existing) redirect("/dashboard/reviews?submitted=1");

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          Reviews
        </p>
        <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">
          {match.listing.title}
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          {correctRole === "LISTER_REVIEWS_SUBTENANT"
            ? "Rate your subtenant's reliability, communication, and payment speed."
            : "Rate your lister's listing accuracy, responsiveness, and the unit's condition."}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <RatingForm matchId={matchId} role={correctRole} />
      </div>
    </main>
  );
}
