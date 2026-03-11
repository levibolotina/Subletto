"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ConfirmMoveInButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (!confirm("Confirm that your subtenant has moved in? This releases escrow funds.")) return;

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/confirm-movein`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Something went wrong.");
        return;
      }

      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
      >
        {loading ? "Confirming…" : "Confirm Move-in & Release Escrow"}
      </button>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
