"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface MatchRespondButtonsProps {
  matchId: string;
}

export default function MatchRespondButtons({ matchId }: MatchRespondButtonsProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [loading, setLoading] = useState<"accept" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const respond = async (action: "accept" | "decline") => {
    setError(null);
    setLoading(action);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
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
      setLoading(null);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={() => respond("accept")}
        disabled={!!loading}
        className="w-full rounded-xl bg-green-700 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
      >
        {loading === "accept" ? "Accepting…" : "Accept Match"}
      </button>
      <button
        onClick={() => respond("decline")}
        disabled={!!loading}
        className="w-full rounded-xl border border-red-300 py-3 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
      >
        {loading === "decline" ? "Declining…" : "Decline (full refund to seeker)"}
      </button>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">{error}</p>
      )}
    </div>
  );
}
