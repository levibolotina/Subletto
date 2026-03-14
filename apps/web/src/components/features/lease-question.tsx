"use client";

type Answer = "YES" | "NO" | "UNKNOWN";

interface LeaseQuestionProps {
  value: Answer | null;
  onChange: (answer: Answer) => void;
}

const OPTIONS = [
  { value: "YES" as Answer, label: "Yes", icon: "✅" },
  { value: "NO" as Answer, label: "No", icon: "🚫" },
  { value: "UNKNOWN" as Answer, label: "Not sure", icon: "🔍" },
];

export default function LeaseQuestion({ value, onChange }: LeaseQuestionProps) {
  return (
    <div className="mb-6 rounded-2xl bg-white shadow-sm p-8">
      <h2 className="text-2xl font-bold text-gray-900">
        Does your lease allow subletting?
      </h2>
      <p className="mt-2 text-sm text-gray-500">
        This helps us understand your situation. Your answer won&apos;t affect
        approval.
      </p>

      <div className="mt-6 grid grid-cols-3 gap-4">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`border-2 rounded-xl p-4 text-center cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              value === opt.value
                ? "border-blue-600 bg-blue-50"
                : "border-gray-200 bg-white hover:border-blue-300"
            }`}
          >
            <span className="text-2xl">{opt.icon}</span>
            <p
              className={`mt-2 text-sm font-semibold ${
                value === opt.value ? "text-blue-700" : "text-gray-800"
              }`}
            >
              {opt.label}
            </p>
          </button>
        ))}
      </div>

      {value === "NO" && (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">⚠️</span>
            <p className="text-sm font-bold text-red-900">
              Your lease may not permit subletting
            </p>
          </div>
          <p className="mb-3 text-sm text-red-700">
            If your lease prohibits subletting, you need your landlord&apos;s
            written consent before you can list. Under{" "}
            <strong>C.R.S. § 38-12-301</strong>, landlords generally cannot
            unreasonably withhold consent.
          </p>
          <div className="rounded-xl border border-red-200 bg-white p-4 mb-3">
            <p className="mb-1 text-sm font-semibold text-slate-900">
              Landlord Approval Packet — $35 add-on
            </p>
            <p className="mb-3 text-xs text-slate-500">
              A Colorado-specific letter citing state law, auto-filled with your
              info, ready to send directly to your landlord.
            </p>
            <a
              href="/dashboard/landlord-packet"
              className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Get the Landlord Packet →
            </a>
          </div>
          <p className="text-xs text-red-600">
            You can still upload your documents below — an admin will review
            whether subletting is permitted under your specific lease.
          </p>
        </div>
      )}

      {value === "UNKNOWN" && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">🔍</span>
            <p className="text-sm text-amber-800">
              Upload your lease below and our admin team will check whether
              subletting is permitted. You&apos;ll hear back within 24 hours.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
