"use client";

type Answer = "YES" | "NO" | "UNKNOWN";

interface LeaseQuestionProps {
  value: Answer | null;
  onChange: (answer: Answer) => void;
}

const OPTIONS = [
  {
    value: "YES" as Answer,
    label: "Yes",
    description: "My lease explicitly permits subletting.",
    icon: "✅",
    selectedBorder: "border-green-400 bg-green-50",
    selectedText: "text-green-800",
  },
  {
    value: "NO" as Answer,
    label: "No",
    description: "My lease prohibits or restricts subletting.",
    icon: "🚫",
    selectedBorder: "border-red-400 bg-red-50",
    selectedText: "text-red-800",
  },
  {
    value: "UNKNOWN" as Answer,
    label: "I'm not sure",
    description: "Upload your lease and we'll check for you.",
    icon: "🔍",
    selectedBorder: "border-amber-400 bg-amber-50",
    selectedText: "text-amber-800",
  },
] as const;

export default function LeaseQuestion({ value, onChange }: LeaseQuestionProps) {
  if (value === "NO") {
    return (
      <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-6">
        <div className="mb-3 flex items-center gap-2">
          <span className="text-2xl">⚠️</span>
          <h2 className="text-base font-bold text-red-900">
            Your lease may not permit subletting
          </h2>
        </div>
        <p className="mb-4 text-sm text-red-700">
          If your lease prohibits subletting, you need your landlord&apos;s written
          consent before you can list. Under{" "}
          <strong>C.R.S. § 38-12-301</strong>, landlords generally cannot
          unreasonably withhold consent.
        </p>
        <div className="mb-4 rounded-xl border border-red-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-900">
            Landlord Approval Packet — $35 add-on
          </p>
          <p className="mb-3 text-xs text-slate-500">
            A Colorado-specific letter citing state law, auto-filled with your
            info, ready to send directly to your landlord.
          </p>
          <a
            href="/dashboard/landlord-packet"
            className="inline-flex items-center rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            Get the Landlord Packet →
          </a>
        </div>
        <p className="mb-3 text-xs text-red-600">
          You can still upload your documents below — an admin will review
          whether subletting is permitted under your specific lease.
        </p>
        <button
          type="button"
          onClick={() => onChange("YES")}
          className="text-xs text-red-700 underline"
        >
          Change my answer
        </button>
      </div>
    );
  }

  if (value === "UNKNOWN") {
    return (
      <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h2 className="text-base font-bold text-amber-900">
            We&apos;ll review your lease
          </h2>
        </div>
        <p className="mb-3 text-sm text-amber-800">
          Upload your lease below and our admin team will check whether
          subletting is permitted. You&apos;ll hear back within 24 hours.
        </p>
        <button
          type="button"
          onClick={() => onChange("YES")}
          className="text-xs text-amber-700 underline"
        >
          Change my answer
        </button>
      </div>
    );
  }

  if (value === "YES") {
    return (
      <div className="mb-8 rounded-2xl border border-green-200 bg-green-50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">✅</span>
            <p className="text-sm font-semibold text-green-800">
              Great — your lease permits subletting. Please upload your documents
              below to complete verification.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange("NO")}
            className="ml-4 shrink-0 text-xs text-green-700 underline"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-1 text-base font-bold text-slate-900">
        Does your lease allow subletting?
      </h2>
      <p className="mb-5 text-sm text-slate-500">
        This helps us verify your listing meets Colorado sublease requirements.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-start rounded-2xl border-2 p-4 text-left transition hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              value === opt.value
                ? opt.selectedBorder
                : "border-slate-200 bg-white hover:border-indigo-400"
            }`}
          >
            <span className="mb-2 text-2xl">{opt.icon}</span>
            <span
              className={`text-sm font-semibold ${value === opt.value ? opt.selectedText : "text-slate-900"}`}
            >
              {opt.label}
            </span>
            <span className="mt-1 text-xs text-slate-500">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
