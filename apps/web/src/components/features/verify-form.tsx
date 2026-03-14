"use client";

import { useState } from "react";
import Link from "next/link";
import LeaseQuestion from "@/components/features/lease-question";
import DocumentUpload from "@/components/features/document-upload";

type Answer = "YES" | "NO" | "UNKNOWN";

interface VerifyFormProps {
  email: string;
}

const STEPS = [
  { number: 1, label: "Lease Question" },
  { number: 2, label: "Upload Docs" },
  { number: 3, label: "Submitted" },
];

function ProgressSteps({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center mb-10">
      {STEPS.map((step, i) => {
        const done = step.number < current;
        const active = step.number === current;
        return (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  done
                    ? "bg-green-500 text-white"
                    : active
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-400"
                }`}
              >
                {done ? "✓" : step.number}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium whitespace-nowrap ${
                  active
                    ? "text-blue-600"
                    : done
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 mb-5 ${
                  step.number < current ? "bg-green-400" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function VerifyForm({ email }: VerifyFormProps) {
  const [leaseAnswer, setLeaseAnswer] = useState<Answer | null>(null);
  const [isDone, setIsDone] = useState(false);

  const currentStep: 1 | 2 | 3 = isDone ? 3 : leaseAnswer ? 2 : 1;

  return (
    <>
      <Link
        href="/dashboard"
        className="inline-block mb-6 text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        ← Dashboard
      </Link>
      <ProgressSteps current={currentStep} />
      <LeaseQuestion value={leaseAnswer} onChange={setLeaseAnswer} />
      <DocumentUpload
        leaseAnswer={leaseAnswer}
        email={email}
        onDone={() => setIsDone(true)}
      />
    </>
  );
}
