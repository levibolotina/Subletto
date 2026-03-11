"use client";

import { useState } from "react";

export default function TestimonialForm() {
  const [quote, setQuote] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/testimonial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quote: quote.trim(), displayName: displayName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-2xl border border-green-100 bg-green-50 p-8 text-center">
        <div className="mb-3 text-4xl">🙏</div>
        <h3 className="text-lg font-bold text-green-900">Thank you!</h3>
        <p className="mt-1 text-sm text-green-700">
          Your testimonial has been submitted and will appear on the site once approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Your experience <span className="text-red-500">*</span>
        </label>
        <textarea
          required
          rows={4}
          maxLength={500}
          placeholder="Tell other CU students what your experience with Subletto was like..."
          value={quote}
          onChange={(e) => setQuote(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-right text-xs text-slate-400">{quote.length}/500</p>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          Your name (optional)
        </label>
        <input
          type="text"
          maxLength={80}
          placeholder="e.g. Jordan S., CU Boulder '26"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <p className="mt-1 text-xs text-slate-400">Leave blank to be listed as "Anonymous"</p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95 disabled:opacity-60"
      >
        {loading ? "Submitting…" : "Submit testimonial →"}
      </button>
    </form>
  );
}
