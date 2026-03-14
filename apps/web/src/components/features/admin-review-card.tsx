"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Button from "@/components/ui/button";

interface VerificationData {
  id: string;
  userId: string;
  idSignedUrl: string | null;
  leaseSignedUrl: string | null;
  submittedAt: Date;
}

interface UserData {
  id: string;
  email: string;
  createdAt: Date;
}

interface AdminReviewCardProps {
  verification: VerificationData;
  user: UserData;
}

export default function AdminReviewCard({ verification, user }: AdminReviewCardProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async (status: "VERIFIED" | "REJECTED") => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/admin/verify/${user.id}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
            adminNotes: notes.trim() || undefined,
          }),
        },
      );
      if (!res.ok) {
        const { error: msg } = (await res.json()) as { error: string };
        throw new Error(msg);
      }
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Review failed");
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
        Review submitted for {user.email}.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <p className="font-semibold">{user.email}</p>
        <p className="text-xs text-slate-400">
          Submitted {new Date(verification.submittedAt).toLocaleDateString()} ·
          Joined {new Date(user.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Document links */}
      <div className="mb-4 flex gap-3">
        {verification.idSignedUrl ? (
          <a
            href={verification.idSignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-600 underline hover:text-indigo-800"
          >
            View Government ID
          </a>
        ) : (
          <span className="text-sm text-slate-400">ID doc unavailable</span>
        )}
        {verification.leaseSignedUrl ? (
          <a
            href={verification.leaseSignedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-indigo-600 underline hover:text-indigo-800"
          >
            View Proof of Residency
          </a>
        ) : (
          <span className="text-sm text-slate-400">Residency doc unavailable</span>
        )}
      </div>

      {/* Admin notes */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Optional notes for the applicant (shown if rejected)..."
        rows={2}
        className="mb-4 w-full rounded-xl border border-slate-200 p-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && (
        <p className="mb-3 rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      <div className="flex gap-3">
        <Button variant="primary" loading={loading} onClick={() => submit("VERIFIED")}>
          Approve
        </Button>
        <Button variant="danger" loading={loading} onClick={() => submit("REJECTED")}>
          Reject
        </Button>
      </div>
    </div>
  );
}
