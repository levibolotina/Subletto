"use client";

import { useState, useEffect } from "react";

interface WaitlistResult {
  position: number;
  referralCode: string;
  referralCount: number;
  alreadyJoined: boolean;
}

interface Props {
  referredBy?: string;
  appUrl: string;
}

export default function WaitlistForm({ referredBy, appUrl }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WaitlistResult | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [totalCount, setTotalCount] = useState<number | null>(null);

  // Fetch total waitlist count for social proof
  useEffect(() => {
    fetch("/api/waitlist?code=NONE")
      .then((r) => r.json())
      .then((d) => {
        if (d.totalCount) setTotalCount(d.totalCount);
      })
      .catch(() => null);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), referredBy }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const referralUrl = result
    ? `${appUrl}/waitlist?ref=${result.referralCode}`
    : "";

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the input
    }
  }

  if (result) {
    return (
      <div className="w-full rounded-2xl border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-100 sm:p-8">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">
          🎉
        </div>
        <h3 className="text-xl font-bold text-slate-900">
          {result.alreadyJoined ? "You're already on the list!" : "You're on the list!"}
        </h3>
        <p className="mt-1 text-slate-500 text-sm">
          {result.alreadyJoined
            ? "We already have your spot saved."
            : "We'll email you when Subletto opens at CU Boulder."}
        </p>

        {/* Position badge */}
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-indigo-50 px-5 py-4">
          <span className="text-3xl font-extrabold text-indigo-600">
            #{result.position}
          </span>
          <div>
            <p className="font-semibold text-indigo-900">in line</p>
            <p className="text-xs text-indigo-600">
              {result.referralCount > 0
                ? `You've referred ${result.referralCount} person${result.referralCount !== 1 ? "s" : ""} — keep going!`
                : "Refer friends to move up."}
            </p>
          </div>
        </div>

        {/* Referral link */}
        <div className="mt-5">
          <p className="mb-2 text-sm font-medium text-slate-700">
            Share your link — move up 5 spots per referral:
          </p>
          <div className="flex gap-2">
            <input
              readOnly
              value={referralUrl}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={copyLink}
              className="shrink-0 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 active:scale-95"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Share buttons */}
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just joined the Subletto waitlist — the only verified sublease marketplace for CU Boulder students. Get early access: ${referralUrl}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Share on X
          </a>
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
          >
            Share on Facebook
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-indigo-100 bg-white p-6 shadow-xl shadow-indigo-100 sm:p-8">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-100 text-2xl">
        🔑
      </div>
      <h3 className="text-xl font-bold text-slate-900">Get early access</h3>
      <p className="mt-1 text-sm text-slate-500">
        Be the first to know when Subletto opens at CU Boulder.
        {totalCount !== null && totalCount > 0 && (
          <> <strong className="text-indigo-600">{totalCount.toLocaleString()} students</strong> already in line.</>
        )}
      </p>

      {referredBy && (
        <div className="mt-3 rounded-xl bg-green-50 px-4 py-2 text-sm text-green-700">
          You were referred — you start with bonus priority!
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="email"
            required
            placeholder="your@colorado.edu"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
          >
            {loading ? "Joining…" : "Get Early Access →"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <p className="mt-2 text-xs text-slate-400">
          .edu email required · No spam · Unsubscribe anytime
        </p>
      </form>
    </div>
  );
}
