"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface MatchRequestButtonProps {
  listingId: string;
  listingTitle: string;
}

export default function MatchRequestButton({ listingId, listingTitle }: MatchRequestButtonProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setError(null);
    setLoading(true);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/matches/${listingId}/checkout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Not signed in — redirect to sign-in with intent preserved
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
        return;
      }

      if (!res.ok) {
        const body = await res.json();
        setError(body.error ?? "Something went wrong. Please try again.");
        return;
      }

      const { sessionUrl } = await res.json();
      window.location.href = sessionUrl;
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? "Preparing checkout…" : "Request Match — $99"}
      </button>

      <p className="text-center text-xs text-gray-400">
        One-time connection fee · Full refund if lister declines
      </p>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-xs text-red-700">{error}</p>
      )}

      <div className="rounded-lg border border-amber-100 bg-amber-50 p-3 text-xs text-amber-800">
        <strong>How it works:</strong> Pay $99 to notify the lister for{" "}
        <em>{listingTitle}</em>. If they accept, both parties receive each other&apos;s contact
        info and a pre-filled sublease agreement. Full refund if they decline.
      </div>
    </div>
  );
}
