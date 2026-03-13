"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

interface RatingFormProps {
  matchId: string;
  role: "LISTER_REVIEWS_SUBTENANT" | "SUBTENANT_REVIEWS_LISTER";
}

interface StarInputProps {
  label: string;
  name: string;
  value: number;
  onChange: (v: number) => void;
}

function StarInput({ label, name, value, onChange }: StarInputProps) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex items-center gap-1" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n !== 1 ? "s" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
            className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          >
            <svg
              className={`h-7 w-7 transition-colors ${n <= display ? "text-amber-400" : "text-slate-200"}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </button>
        ))}
        {value > 0 && (
          <span className="ml-1 text-sm text-slate-500">{value}/5</span>
        )}
      </div>
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

const LISTER_FIELDS: { name: string; label: string }[] = [
  { name: "reliability", label: "Reliability" },
  { name: "communication", label: "Communication" },
  { name: "paymentSpeed", label: "Payment Speed" },
];

const SUBTENANT_FIELDS: { name: string; label: string }[] = [
  { name: "listingAccuracy", label: "Listing Accuracy" },
  { name: "responsiveness", label: "Responsiveness" },
  { name: "unitCondition", label: "Unit Condition" },
];

export default function RatingForm({ matchId, role }: RatingFormProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const fields = role === "LISTER_REVIEWS_SUBTENANT" ? LISTER_FIELDS : SUBTENANT_FIELDS;
  const [scores, setScores] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const allFilled = fields.every((f) => (scores[f.name] ?? 0) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allFilled) return;
    setSubmitting(true);
    setError(null);

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/v1/matches/${matchId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role, ...scores, comment: comment.trim() || undefined }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Submission failed");
      }

      router.push("/dashboard/reviews?submitted=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  const heading =
    role === "LISTER_REVIEWS_SUBTENANT"
      ? "Rate your subtenant"
      : "Rate your lister";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-lg font-semibold text-slate-900">{heading}</p>

      {fields.map((f) => (
        <StarInput
          key={f.name}
          label={f.label}
          name={f.name}
          value={scores[f.name] ?? 0}
          onChange={(v) => setScores((prev) => ({ ...prev, [f.name]: v }))}
        />
      ))}

      <div>
        <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-1">
          Comment <span className="text-slate-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="comment"
          rows={4}
          maxLength={1000}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience…"
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!allFilled || submitting}
        className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {submitting ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
