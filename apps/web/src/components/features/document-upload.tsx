"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Button from "@/components/ui/button";

type UploadStep = "idle" | "uploading" | "submitting" | "done" | "error";

interface FileState {
  file: File | null;
  path: string | null;
}

async function getSignedUploadUrl(
  docType: "id" | "lease",
  file: File,
): Promise<{ signedUrl: string; storagePath: string }> {
  const res = await fetch("/api/storage/upload-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      docType,
      mimeType: file.type,
      fileSize: file.size,
    }),
  });
  if (!res.ok) {
    const { error } = await res.json() as { error: string };
    throw new Error(error ?? "Failed to get upload URL");
  }
  return res.json() as Promise<{ signedUrl: string; storagePath: string }>;
}

async function uploadToStorage(signedUrl: string, file: File): Promise<void> {
  const res = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!res.ok) throw new Error("Upload failed");
}

export default function DocumentUpload() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [step, setStep] = useState<UploadStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [idDoc, setIdDoc] = useState<FileState>({ file: null, path: null });
  const [leaseDoc, setLeaseDoc] = useState<FileState>({ file: null, path: null });
  const idInputRef = useRef<HTMLInputElement>(null);
  const leaseInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDoc.file || !leaseDoc.file) return;

    setStep("uploading");
    setErrorMsg(null);

    try {
      // 1. Get signed upload URLs
      const [idUpload, leaseUpload] = await Promise.all([
        getSignedUploadUrl("id", idDoc.file),
        getSignedUploadUrl("lease", leaseDoc.file),
      ]);

      // 2. Upload directly to Supabase Storage
      await Promise.all([
        uploadToStorage(idUpload.signedUrl, idDoc.file),
        uploadToStorage(leaseUpload.signedUrl, leaseDoc.file),
      ]);

      // 3. Submit paths to Fastify API
      setStep("submitting");
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/auth/verify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            idDocPath: idUpload.storagePath,
            leaseDocPath: leaseUpload.storagePath,
          }),
        },
      );

      if (!res.ok) {
        const { error } = await res.json() as { error: string };
        throw new Error(error ?? "Submission failed");
      }

      setStep("done");
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "An unexpected error occurred");
      setStep("error");
    }
  };

  if (step === "done") {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <p className="text-lg font-semibold text-green-800">Documents submitted!</p>
        <p className="mt-1 text-sm text-green-700">
          You&apos;ll hear back within 24 hours. Redirecting to dashboard...
        </p>
      </div>
    );
  }

  const isLoading = step === "uploading" || step === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Government ID */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Government-issued ID</h2>
        <p className="mt-1 text-sm text-gray-500">
          Driver&apos;s license, passport, or state ID. JPG, PNG, or PDF, max 10 MB.
        </p>
        <input
          ref={idInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setIdDoc({ file, path: null });
          }}
        />
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => idInputRef.current?.click()}
            disabled={isLoading}
          >
            {idDoc.file ? "Change file" : "Choose file"}
          </Button>
          {idDoc.file && (
            <span className="truncate text-sm text-gray-600">{idDoc.file.name}</span>
          )}
        </div>
      </div>

      {/* Lease document */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Lease document</h2>
        <p className="mt-1 text-sm text-gray-500">
          Your current lease showing the CU Boulder area address. PDF only, max 20 MB.
        </p>
        <input
          ref={leaseInputRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0] ?? null;
            setLeaseDoc({ file, path: null });
          }}
        />
        <div className="mt-4 flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => leaseInputRef.current?.click()}
            disabled={isLoading}
          >
            {leaseDoc.file ? "Change file" : "Choose file"}
          </Button>
          {leaseDoc.file && (
            <span className="truncate text-sm text-gray-600">{leaseDoc.file.name}</span>
          )}
        </div>
      </div>

      {(step === "error" || errorMsg) && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errorMsg}</p>
      )}

      <Button
        type="submit"
        disabled={!idDoc.file || !leaseDoc.file}
        loading={isLoading}
        className="w-full"
      >
        {step === "uploading"
          ? "Uploading documents..."
          : step === "submitting"
            ? "Submitting for review..."
            : "Submit for verification"}
      </Button>
    </form>
  );
}
