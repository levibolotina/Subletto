"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { CheckCircle } from "lucide-react";

type ReportCategory = "SCAM" | "WRONG_INFO" | "INAPPROPRIATE";

interface ReportButtonProps {
  listingId?: string;
  reportedUserId?: string;
  label?: string;
}

const CATEGORIES: { value: ReportCategory; label: string; description: string }[] = [
  { value: "SCAM", label: "Scam or fraud", description: "Suspicious pricing, fake listing, or requesting off-platform payment" },
  { value: "WRONG_INFO", label: "Incorrect information", description: "Photos or details don't match the actual unit" },
  { value: "INAPPROPRIATE", label: "Inappropriate content", description: "Discriminatory, offensive, or violates community guidelines" },
];

export default function ReportButton({ listingId, reportedUserId, label = "Report" }: ReportButtonProps) {
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          category,
          description: description.trim() || undefined,
          listingId: listingId ?? undefined,
          reportedUserId: reportedUserId ?? undefined,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Submission failed");
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    setCategory("");
    setDescription("");
    setSubmitted(false);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-red-500 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 21l1.5-4.5A9 9 0 1121 10.5 9 9 0 016 19.5L3 21z" />
        </svg>
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={close}
            aria-hidden="true"
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {submitted ? (
              <div className="text-center py-4">
                <div className="mb-3 flex justify-center"><CheckCircle className="h-8 w-8 text-green-500" /></div>
                <h3 className="text-lg font-semibold text-slate-900">Report submitted</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Our team will review this report. Thank you for keeping Subletto safe.
                </p>
                <button
                  onClick={close}
                  className="mt-5 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-semibold text-slate-900">Submit a report</h3>
                  <button
                    type="button"
                    onClick={close}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    aria-label="Close"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-2 mb-4">
                  {CATEGORIES.map((c) => (
                    <label
                      key={c.value}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${
                        category === c.value
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={c.value}
                        checked={category === c.value}
                        onChange={() => setCategory(c.value)}
                        className="mt-0.5 accent-indigo-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{c.label}</p>
                        <p className="text-xs text-slate-500">{c.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <textarea
                  rows={3}
                  maxLength={2000}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional details (optional)…"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 mb-4"
                />

                {error && (
                  <p className="mb-3 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!category || submitting}
                  className="w-full rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? "Submitting…" : "Submit report"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
