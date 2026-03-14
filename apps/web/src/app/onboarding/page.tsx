"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useAuth } from "@clerk/nextjs";

type Role = "LISTER" | "SEEKER";

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
  };

  const confirmAndSubmit = async () => {
    if (!selectedRole) return;
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const url = `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/role`;
      console.error("PATCH /v1/auth/role — token:", token, "url:", url);
      if (!token) {
        throw new Error("No auth token available");
      }
      const res = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("PATCH /v1/auth/role failed", res.status, body);
        throw new Error(
          `Failed to set role (${res.status}): ${body?.message ?? body?.error ?? JSON.stringify(body)}`,
        );
      }
      setStep(3);
      setTimeout(() => {
        router.push(selectedRole === "LISTER" ? "/dashboard/verify" : "/dashboard");
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const progressPct = step === 1 ? 33 : step === 2 ? 66 : 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
          {/* Progress bar */}
          <div className="h-1 w-full bg-gray-100">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="p-10">
            {/* Wordmark */}
            <p className="mb-8 text-center font-display text-xl font-semibold tracking-tight text-gray-900">
              Subletto
            </p>

            {/* ── Step 1: Role selection ─────────────────────────────── */}
            {step === 1 && (
              <div>
                <h1 className="font-display text-2xl font-bold text-center text-gray-900">
                  How are you using Subletto?
                </h1>
                <p className="mt-1.5 text-sm text-gray-400 text-center">
                  You can switch later
                </p>

                <div className="mt-8 grid grid-cols-2 gap-4">
                  <button
                    onClick={() => selectRole("SEEKER")}
                    className={`flex flex-col items-center rounded-2xl border-2 p-6 text-center cursor-pointer transition hover:border-blue-300 focus:outline-none ${
                      selectedRole === "SEEKER"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="mb-3 text-3xl">🔍</span>
                    <span className="text-sm font-semibold text-gray-900">
                      I need a sublease
                    </span>
                  </button>

                  <button
                    onClick={() => selectRole("LISTER")}
                    className={`flex flex-col items-center rounded-2xl border-2 p-6 text-center cursor-pointer transition hover:border-blue-300 focus:outline-none ${
                      selectedRole === "LISTER"
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <span className="mb-3 text-3xl">🏠</span>
                    <span className="text-sm font-semibold text-gray-900">
                      I have a place to sublet
                    </span>
                  </button>
                </div>

                <button
                  onClick={() => setStep(2)}
                  disabled={!selectedRole}
                  className="mt-6 w-full rounded-full bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Continue
                </button>
              </div>
            )}

            {/* ── Step 2: Confirm ────────────────────────────────────── */}
            {step === 2 && selectedRole && (
              <div>
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  Confirm your details
                </h1>

                <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Email
                  </p>
                  <div className="mt-1 flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{email || "—"}</p>
                    {isEdu && (
                      <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-700">
                        ✓ .edu
                      </span>
                    )}
                  </div>
                </div>

                {!isEdu && (
                  <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    Your email must be a .edu address to use Subletto.
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                  <p className="font-semibold text-gray-900">
                    Role:{" "}
                    {selectedRole === "LISTER" ? "🏠 Lister" : "🔍 Seeker"}
                  </p>
                  <p className="mt-1 text-gray-500">
                    {selectedRole === "LISTER"
                      ? "Next, you'll upload your government ID and lease to get verified."
                      : "You'll be taken to the dashboard to start browsing listings."}
                  </p>
                </div>

                {error && (
                  <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setStep(1)}
                    className="rounded-full border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                  >
                    ← Back
                  </button>
                  <button
                    onClick={confirmAndSubmit}
                    disabled={loading || !isEdu}
                    className="flex-1 rounded-full bg-blue-600 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Setting up…
                      </span>
                    ) : selectedRole === "LISTER" ? (
                      "Continue to verification"
                    ) : (
                      "Continue"
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Done ──────────────────────────────────────── */}
            {step === 3 && (
              <div className="py-4 text-center">
                <div className="mx-auto mb-5 text-5xl">✅</div>
                <h1 className="font-display text-2xl font-bold text-gray-900">
                  You&apos;re all set!
                </h1>
                <p className="mt-2 text-sm text-gray-400">
                  {selectedRole === "LISTER"
                    ? "Taking you to verification…"
                    : "Taking you to your dashboard…"}
                </p>
                <div className="mt-6 flex justify-center">
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
