import { redirect } from "next/navigation";
import Link from "next/link";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: { session_id?: string };
}

export default async function MatchSuccessPage({ searchParams }: Props) {
  const { session_id } = searchParams;

  if (!session_id) redirect("/dashboard/matches");

  let matchId: string | null = null;
  let paymentStatus: string | null = null;

  try {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    paymentStatus = session.payment_status;
    matchId = session.metadata?.matchId ?? null;
  } catch {
    redirect("/dashboard/matches");
  }

  if (paymentStatus !== "paid") {
    return (
      <main className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="rounded-2xl border border-yellow-200 bg-yellow-50 p-8">
          <div className="mb-3 text-3xl">⏳</div>
          <h1 className="text-xl font-bold text-yellow-900">Payment pending</h1>
          <p className="mt-2 text-sm text-yellow-800">
            Your payment is still processing. Check your matches dashboard in a
            moment.
          </p>
          <Link
            href="/dashboard/matches"
            className="mt-6 inline-block rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to Matches
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-8">
        <div className="mb-4 text-4xl">🎉</div>
        <h1 className="text-xl font-bold text-green-900">Payment successful!</h1>
        <p className="mt-2 text-sm text-green-800">
          Your $99 connection fee has been received. The lister has been
          notified and will accept or decline your request shortly.
        </p>
        <p className="mt-2 text-sm text-green-800">
          You&apos;ll receive an email update. Track the match status in your
          dashboard.
        </p>
        {matchId ? (
          <Link
            href={`/dashboard/matches/${matchId}`}
            className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            View Match →
          </Link>
        ) : (
          <Link
            href="/dashboard/matches"
            className="mt-6 inline-block rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800"
          >
            Go to Matches →
          </Link>
        )}
      </div>
    </main>
  );
}
