"use client";

import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import Button from "@/components/ui/button";

type LeasePermission = "PERMITTED" | "PROHIBITED" | "REQUIRES_LANDLORD_APPROVAL";

interface VerificationData {
  id: string;
  userId: string;
  idSignedUrl: string | null;
  leaseSignedUrl: string | null;
  submittedAt: Date;
  listerLeaseAnswer?: string | null;
  leasePermission?: string | null;
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

const LEASE_PERMISSION_OPTIONS: Array<{
  value: LeasePermission;
  label: string;
  description: string;
  classes: { active: string; inactive: string };
}> = [
  {
    value: "PERMITTED",
    label: "Permitted",
    description: "Lease explicitly allows subletting",
    classes: {
      active: "border-green-500 bg-green-50 text-green-700",
      inactive: "border-slate-200 hover:border-slate-300",
    },
  },
  {
    value: "PROHIBITED",
    label: "Prohibited",
    description: "Lease prohibits subletting",
    classes: {
      active: "border-red-500 bg-red-50 text-red-700",
      inactive: "border-slate-200 hover:border-slate-300",
    },
  },
  {
    value: "REQUIRES_LANDLORD_APPROVAL",
    label: "Needs landlord consent",
    description: "Subletting requires landlord approval",
    classes: {
      active: "border-amber-500 bg-amber-50 text-amber-700",
      inactive: "border-slate-200 hover:border-slate-300",
    },
  },
];

const ANSWER_LABEL: Record<string, string> = {
  YES: "Yes — lease permits subletting",
  NO: "No — lease prohibits subletting",
  UNKNOWN: "Unknown — requested lease review",
};

export default function AdminReviewCard({ verification, user }: AdminReviewCardProps) {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [notes, setNotes] = useState("");
  const [leasePermission, setLeasePermission] = useState<LeasePermission | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (status: "VERIFIED" | "REJECTED") => {
    if (status === "VERIFIED" && leasePermission === null) {
      setError("Please classify the lease permission before approving.");
      return;
    }
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
            subleasePermitted:
              leasePermission === "PERMITTED"
                ? true
                : leasePermission === "PROHIBITED"
                  ? false
                  : undefined,
            leasePermission: leasePermission ?? undefined,
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
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-semibold">{user.email}</p>
          <p className="text-xs text-slate-400">
            Submitted {new Date(verification.submittedAt).toLocaleDateString()} ·
            Joined {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Lister self-reported answer */}
      {verification.listerLeaseAnswer && (
        <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5 text-sm">
          <span className="font-semibold text-slate-700">Lister reported: </span>
          <span className="text-slate-600">
            {ANSWER_LABEL[verification.listerLeaseAnswer] ?? verification.listerLeaseAnswer}
          </span>
        </div>
      )}

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

      {/* Lease permission classification */}
      <div className="mb-4">
        <p className="mb-2 text-sm font-semibold text-slate-700">
          Lease subletting classification
        </p>
        <div className="flex flex-wrap gap-2">
          {LEASE_PERMISSION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setLeasePermission(opt.value)}
              className={`flex flex-col rounded-xl border px-4 py-2.5 text-left text-sm transition ${
                leasePermission === opt.value
                  ? opt.classes.active
                  : opt.classes.inactive
              }`}
            >
              <span className="font-semibold">{opt.label}</span>
              <span className="text-xs opacity-75">{opt.description}</span>
            </button>
          ))}
        </div>
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
