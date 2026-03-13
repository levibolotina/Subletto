"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";

type Role = "LISTER" | "SEEKER";

const STEPS = ["Role", "Confirm", "Done"];

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="mb-8">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>
          Step {step} of {total}
        </span>
        <span>{pct}% complete</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-col items-center gap-1">
            <div
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i + 1 < step
                  ? "bg-indigo-600 text-white"
                  : i + 1 === step
                    ? "border-2 border-indigo-600 bg-white text-indigo-600"
                    : "border-2 border-slate-200 bg-white text-slate-400"
              }`}
            >
              {i + 1 < step ? "✓" : i + 1}
            </div>
            <span
              className={`text-xs ${i + 1 === step ? "font-semibold text-indigo-600" : "text-slate-400"}`}
            >
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const isEdu = email.endsWith(".edu");

  const selectRole = async (role: Role) => {
    setSelectedRole(role);
    setStep(2);
  };

  const confirmAndSubmit = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/role`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: selectedRole }),
        },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("PATCH /v1/auth/role failed", res.status, body);
        throw new Error("Failed to set role");
      }
      setStep(3);
      // Brief pause to show completion state before redirect
      setTimeout(() => {
        router.push(selectedRole === "LISTER" ? "/dashboard/verify" : "/dashboard");
      }, 1200);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="text-2xl font-extrabold tracking-tight text-indigo-600">
            Subletto
          </p>
          <p className="mt-1 text-sm text-slate-400">
            Let&apos;s get you set up
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <ProgressBar step={step} total={3} />

          {/* ── Step 1: Role selection ─────────────────────────────── */}
          {step === 1 && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                How are you using Subletto?
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                This helps us set up the right experience for you.
              </p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <button
                  onClick={() => selectRole("LISTER")}
                  className="group flex flex-col items-start rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-indigo-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span className="mb-3 text-3xl">🏠</span>
                  <span className="text-base font-semibold text-slate-900">
                    I have a lease
                  </span>
                  <span className="mt-1 text-sm text-slate-500">
                    I want to sublet my apartment while I&apos;m away.
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                    <span>🪪</span> Requires ID + lease verification
                  </span>
                </button>

                <button
                  onClick={() => selectRole("SEEKER")}
                  className="group flex flex-col items-start rounded-2xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-indigo-500 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <span className="mb-3 text-3xl">🔍</span>
                  <span className="text-base font-semibold text-slate-900">
                    I need a place
                  </span>
                  <span className="mt-1 text-sm text-slate-500">
                    I&apos;m looking for a short-term sublease near campus.
                  </span>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-green-600">
                    <span>✅</span> Browse listings right away
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* ── Step 2: Confirm email ──────────────────────────────── */}
          {step === 2 && selectedRole && (
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Confirm your .edu email
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Subletto is restricted to CU Boulder students only.
              </p>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Your email
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{email || "—"}</p>
                  {isEdu && (
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                      ✓ .edu verified
                    </span>
                  )}
                </div>
              </div>

              {!isEdu && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  Your email must be a .edu address to use Subletto.
                </div>
              )}

              <div className="mt-5 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-sm">
                <p className="font-semibold text-indigo-900">
                  You selected:{" "}
                  {selectedRole === "LISTER" ? "🏠 Lister" : "🔍 Subtenant"}
                </p>
                <p className="mt-1 text-indigo-700">
                  {selectedRole === "LISTER"
                    ? "Next, you'll upload your government ID and lease to get verified."
                    : "You'll be taken to the dashboard to start browsing listings."}
                </p>
              </div>

              {error && (
                <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back
                </button>
                <button
                  onClick={confirmAndSubmit}
                  disabled={loading || !isEdu}
                  className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Setting up…
                    </span>
                  ) : selectedRole === "LISTER" ? (
                    "Continue to verification →"
                  ) : (
                    "Start browsing →"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Step 3: Done ──────────────────────────────────────── */}
          {step === 3 && (
            <div className="py-4 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
                🎉
              </div>
              <h1 className="text-xl font-bold text-slate-900">
                You&apos;re all set!
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                {selectedRole === "LISTER"
                  ? "Taking you to verification…"
                  : "Taking you to your dashboard…"}
              </p>
              <div className="mt-4 flex justify-center">
                <span className="h-1 w-24 animate-pulse rounded-full bg-indigo-200" />
              </div>
            </div>
          )}
        </div>

        {/* Step 1 only: reassurance */}
        {step === 1 && (
          <p className="mt-6 text-center text-xs text-slate-400">
            You can change your role later from the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
