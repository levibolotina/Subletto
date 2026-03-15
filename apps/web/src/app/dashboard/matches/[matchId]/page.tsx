import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";
import MatchRespondButtons from "@/components/features/match-respond-buttons";
import EscrowForm from "@/components/features/escrow-form";
import ConfirmMoveInButton from "@/components/features/confirm-movein-button";

export const dynamic = "force-dynamic";

interface Props {
  params: { matchId: string };
}

function statusBanner(status: string) {
  switch (status) {
    case "AWAITING_LISTER":
      return "border border-yellow-200 bg-yellow-50 text-yellow-900";
    case "CONFIRMED":
      return "border border-green-200 bg-green-50 text-green-900";
    case "DECLINED":
      return "border border-red-200 bg-red-50 text-red-900";
    default:
      return "border border-slate-200 bg-slate-50 text-slate-700";
  }
}

const STATUS_LABEL: Record<string, string> = {
  AWAITING_LISTER: "Awaiting your response",
  CONFIRMED: "Match confirmed",
  DECLINED: "Match declined",
};

export default async function MatchDetailPage({ params }: Props) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) redirect("/sign-in");

  const match = await prisma.match.findUnique({
    where: { id: params.matchId },
    include: {
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
          rentCents: true,
          neighborhood: true,
          availableFrom: true,
          availableTo: true,
        },
      },
      lister: { select: { id: true, email: true } },
      subtenant: { select: { id: true, email: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!match) notFound();

  const isLister = match.listerId === user.id;
  const isSeeker = match.subtenantId === user.id;
  if (!isLister && !isSeeker) notFound();

  const isConfirmed = match.status === "CONFIRMED";

  const showSubtenantContact =
    isLister &&
    match.status !== "PENDING_PAYMENT" &&
    match.status !== "CANCELLED";
  const showListerContact = isSeeker && isConfirmed;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {/* Back link */}
      <Link
        href="/dashboard/matches"
        className="mb-4 inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-700"
      >
        ← Back to matches
      </Link>

      {/* Header */}
      <h1 className="text-2xl font-extrabold text-slate-900">
        {match.listing.title}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {match.listing.neighborhood} · Available{" "}
        {new Date(match.listing.availableFrom).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        })}{" "}
        –{" "}
        {new Date(match.listing.availableTo).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      {/* Status banner */}
      <div className={`mt-6 rounded-2xl p-4 text-sm ${statusBanner(match.status)}`}>
        <strong>{STATUS_LABEL[match.status] ?? match.status}</strong>
        {match.status === "AWAITING_LISTER" && isSeeker && (
          <p className="mt-1">
            Your $99 connection fee was received. The lister will accept or
            decline shortly.
          </p>
        )}
        {match.status === "DECLINED" && isSeeker && (
          <p className="mt-1">
            The lister declined this match. A full refund has been issued.
          </p>
        )}
        {match.status === "CONFIRMED" && (
          <p className="mt-1">
            Both parties have been connected. See contact details below.
          </p>
        )}
      </div>

      {/* Contact reveal */}
      {(showListerContact || showSubtenantContact) && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">
            {isLister ? "Subtenant contact" : "Lister contact"}
          </h2>
          <p className="mt-2 text-sm text-slate-700">
            <span className="font-medium">Email: </span>
            <a
              href={`mailto:${isLister ? match.subtenant.email : match.lister.email}`}
              className="text-indigo-600 underline hover:text-indigo-800"
            >
              {isLister ? match.subtenant.email : match.lister.email}
            </a>
          </p>
          <p className="mt-3 text-xs text-slate-400">
            Please reach out directly to exchange details and coordinate the
            sublease.
          </p>
        </div>
      )}

      {/* Lister: Accept / Decline */}
      {isLister && match.status === "AWAITING_LISTER" && (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">
            Respond to this match request
          </h2>
          <MatchRespondButtons matchId={match.id} />
        </div>
      )}

      {/* Seeker: Escrow option */}
      {isSeeker && isConfirmed && match.escrowStatus === "NONE" && (
        <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
          <h2 className="font-semibold text-indigo-900">
            Optional: Pay via Escrow
          </h2>
          <p className="mt-1 text-sm text-indigo-700">
            Secure your sublease by paying first month&apos;s rent and deposit
            through Subletto. Funds are held until your lister confirms
            move-in.
          </p>
          <div className="mt-4">
            <EscrowForm matchId={match.id} rentCents={match.listing.rentCents} />
          </div>
        </div>
      )}

      {/* Escrow held */}
      {match.escrowStatus === "HELD" && (
        <div className="mt-5 rounded-2xl border border-yellow-200 bg-yellow-50 p-5 text-sm text-yellow-900">
          <strong>Escrow held: </strong>
          {formatCurrency(match.escrowAmountCents ?? 0)} is securely held by
          Subletto.
          {isLister && (
            <div className="mt-4">
              <ConfirmMoveInButton matchId={match.id} />
            </div>
          )}
          {isSeeker && (
            <p className="mt-2 text-xs text-yellow-700">
              Funds will be released to your lister once they confirm
              move-in. If move-in fails, you&apos;ll receive an automatic refund.
            </p>
          )}
        </div>
      )}

      {match.escrowStatus === "RELEASED" && (
        <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <strong>Escrow released.</strong> Move-in confirmed — enjoy your new
          place!
        </div>
      )}

      {match.escrowStatus === "REFUNDED" && (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Escrow refunded.</strong> Funds have been returned to the
          subtenant.
        </div>
      )}

      {/* Payment history */}
      {match.payments.length > 0 && (
        <div className="mt-8">
          <h2 className="font-semibold text-slate-700">Payment history</h2>
          <ul className="mt-3 space-y-2">
            {match.payments.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm"
              >
                <span className="text-slate-600">
                  {p.type
                    .replace(/_/g, " ")
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900">
                    {formatCurrency(p.amountCents)}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.status === "SUCCEEDED"
                        ? "bg-green-100 text-green-700"
                        : p.status === "REFUNDED"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {p.status.toLowerCase()}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </main>
  );
}
