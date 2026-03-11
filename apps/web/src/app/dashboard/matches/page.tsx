import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Payment pending",
  AWAITING_LISTER: "Awaiting lister",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-gray-100 text-gray-600",
  AWAITING_LISTER: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
};

export default async function MatchesPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) redirect("/sign-in");

  const matches = await prisma.match.findMany({
    where: {
      OR: [{ listerId: user.id }, { subtenantId: user.id }],
      status: { not: "PENDING_PAYMENT" },
    },
    include: {
      listing: { select: { title: true, slug: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Matches</h1>
        <Link href="/listings" className="text-sm text-gray-500 underline underline-offset-2">
          Browse listings
        </Link>
      </div>

      {matches.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-gray-300 p-10 text-center text-gray-500">
          <p className="font-medium">No matches yet</p>
          <p className="mt-1 text-sm">
            When you request a match on a listing (or a seeker requests yours), it will appear here.
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {matches.map((m) => (
            <li key={m.id}>
              <Link
                href={`/dashboard/matches/${m.id}`}
                className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:bg-gray-50"
              >
                <div>
                  <p className="font-medium">{m.listing.title}</p>
                  <p className="text-xs text-gray-400">
                    {m.listerId === user.id ? "You are the lister" : "You are the seeker"} ·{" "}
                    {new Date(m.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLOR[m.status] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {STATUS_LABEL[m.status] ?? m.status}
                  </span>
                  {m.escrowStatus !== "NONE" && (
                    <span className="text-xs text-gray-400">Escrow: {m.escrowStatus.toLowerCase()}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
