"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { formatCurrency } from "@subletto/shared";
import { ESCROW_PLATFORM_FEE_PERCENT } from "@subletto/shared";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface EscrowFormProps {
  matchId: string;
  rentCents: number; // prefilled from listing
}

export default function EscrowForm({ matchId, rentCents }: EscrowFormProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [depositCents, setDepositCents] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

  const totalCents = rentCents + depositCents;
  const feeCents = Math.round(totalCents * ESCROW_PLATFORM_FEE_PERCENT);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/escrow`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          firstMonthRentCents: rentCents,
          depositCents,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Something went wrong.");
        return;
      }

      const { clientSecret: secret } = await res.json();
      setClientSecret(secret);
      // In a real integration, pass clientSecret to Stripe.js / PaymentElement
      // For now, show confirmation that escrow was initiated
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (clientSecret) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        <strong>Escrow initiated!</strong> Complete the payment in the Stripe popup. Funds will be
        held securely until your lister confirms move-in.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">
          First month&apos;s rent
        </label>
        <p className="mt-1 text-sm text-gray-900">{formatCurrency(rentCents)}</p>
      </div>

      <div>
        <label htmlFor="deposit" className="block text-sm font-medium text-slate-700">
          Security deposit (optional)
        </label>
        <input
          id="deposit"
          type="number"
          min={0}
          step={1}
          placeholder="0"
          onChange={(e) => setDepositCents(Math.round(Number(e.target.value) * 100))}
          className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-gray-400">Enter dollar amount (e.g. 500 for $500)</p>
      </div>

      <div className="rounded-lg bg-slate-50 p-3 text-sm space-y-1">
        <div className="flex justify-between">
          <span>Total held in escrow</span>
          <span className="font-medium">{formatCurrency(totalCents)}</span>
        </div>
        <div className="flex justify-between text-gray-500">
          <span>Subletto platform fee (2.5%)</span>
          <span>−{formatCurrency(feeCents)}</span>
        </div>
        <div className="flex justify-between font-semibold border-t border-slate-200 pt-1">
          <span>Lister receives</span>
          <span>{formatCurrency(totalCents - feeCents)}</span>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading || totalCents === 0}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Processing…" : `Pay ${formatCurrency(totalCents)} into Escrow`}
      </button>

      <p className="text-center text-xs text-gray-400">
        Funds released to lister only after you confirm move-in · Automatic refund if move-in fails
      </p>
    </form>
  );
}
