"use client";

import { useState } from "react";
import LeaseQuestion from "@/components/features/lease-question";
import DocumentUpload from "@/components/features/document-upload";

type Answer = "YES" | "NO" | "UNKNOWN";

export default function VerifyForm() {
  const [leaseAnswer, setLeaseAnswer] = useState<Answer | null>(null);

  return (
    <>
      <LeaseQuestion value={leaseAnswer} onChange={setLeaseAnswer} />
      <DocumentUpload leaseAnswer={leaseAnswer} />
    </>
  );
}
