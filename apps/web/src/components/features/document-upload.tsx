"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Link from "next/link";
import { CreditCard, FileText, CheckCircle, Clock, Lock } from "lucide-react";

type UploadStep = "idle" | "uploading" | "submitting" | "done" | "error";
type LeaseAnswer = "YES" | "NO" | "UNKNOWN";

interface FileState {
  file: File | null;
  path: string | null;
}

interface DocumentUploadProps {
  leaseAnswer: LeaseAnswer | null;
  email: string;
  onDone?: () => void;
}

interface UploadBoxProps {
  label: string;
  icon: React.ReactNode;
  hint: string;
  doc: FileState;
  inputRef: React.RefObject<HTMLInputElement>;
  accept: string;
  disabled: boolean;
  onChange: (file: File | null) => void;
}

function UploadBox({
  label,
  icon,
  hint,
  doc,
  inputRef,
  accept,
  disabled,
  onChange,
}: UploadBoxProps) {
  return (
    <div
      className={`rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
        doc.file
          ? "border-blue-400 bg-blue-50"
          : "border-gray-300 bg-white hover:border-blue-300"
      }`}
      onClick={() => !disabled && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {doc.file ? (
        <>
          <CheckCircle className="h-6 w-6 text-green-500 mx-auto" />
          <p className="mt-2 text-xs text-gray-600 truncate px-2">
            {doc.file.name}
          </p>
          <button
            type="button"
            disabled={disabled}
            className="mt-2 text-xs text-blue-600 underline"
            onClick={(e) => {
              e.stopPropagation();
              if (!disabled) inputRef.current?.click();
            }}
          >
            Change file
          </button>
        </>
      ) : (
        <>
          <div className="flex justify-center">{icon}</div>
          <p className="mt-3 text-sm font-semibold text-gray-800">{label}</p>
          <p className="mt-1 text-xs text-gray-400">{hint}</p>
          <button
            type="button"
            disabled={disabled}
            className="mt-4 px-4 py-2 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition"
          >
            Choose file
          </button>
        </>
      )}
    </div>
  );
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
    const { error } = (await res.json()) as { error: string };
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

export default function DocumentUpload({
  leaseAnswer,
  email,
  onDone,
}: DocumentUploadProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [step, setStep] = useState<UploadStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [idDoc, setIdDoc] = useState<FileState>({ file: null, path: null });
  const [residencyDoc, setResidencyDoc] = useState<FileState>({
    file: null,
    path: null,
  });
  const idInputRef = useRef<HTMLInputElement>(null);
  const residencyInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDoc.file || !residencyDoc.file) return;

    setStep("uploading");
    setErrorMsg(null);

    try {
      const [idUpload, residencyUpload] = await Promise.all([
        getSignedUploadUrl("id", idDoc.file),
        getSignedUploadUrl("lease", residencyDoc.file),
      ]);

      await Promise.all([
        uploadToStorage(idUpload.signedUrl, idDoc.file),
        uploadToStorage(residencyUpload.signedUrl, residencyDoc.file),
      ]);

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
            leaseDocPath: residencyUpload.storagePath,
            ...(leaseAnswer ? { listerLeaseAnswer: leaseAnswer } : {}),
          }),
        },
      );

      if (!res.ok) {
        const { error } = (await res.json()) as { error: string };
        throw new Error(error ?? "Submission failed");
      }

      setStep("done");
      onDone?.();
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
      setStep("error");
    }
  };

  if (step === "done") {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-8 text-center">
        <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-gray-900">
          Verification submitted!
        </h2>
        <p className="mt-2 text-sm text-gray-500">
          Our team will review within 24 hours. We&apos;ll email you at{" "}
          <span className="font-medium text-gray-700">{email}</span>.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const isLoading = step === "uploading" || step === "submitting";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="rounded-2xl bg-white shadow-sm p-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          Upload your documents
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UploadBox
            label="Government ID"
            icon={<CreditCard className="h-7 w-7 text-slate-500" />}
            hint="JPG, PNG or PDF · Max 10MB"
            doc={idDoc}
            inputRef={idInputRef}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            disabled={isLoading}
            onChange={(file) => setIdDoc({ file, path: null })}
          />
          <UploadBox
            label="Proof of Residency"
            icon={<FileText className="h-7 w-7 text-slate-500" />}
            hint="Utility bill, bank statement, or official mail · Max 20MB"
            doc={residencyDoc}
            inputRef={residencyInputRef}
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            disabled={isLoading}
            onChange={(file) => setResidencyDoc({ file, path: null })}
          />
        </div>
      </div>

      {(step === "error" || errorMsg) && (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {errorMsg}
        </p>
      )}

      <button
        type="submit"
        disabled={!idDoc.file || !residencyDoc.file || isLoading}
        className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-sm transition hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {step === "uploading"
          ? "Uploading documents..."
          : step === "submitting"
            ? "Submitting for review..."
            : "Submit for Verification"}
      </button>

      <p className="flex items-center justify-center gap-1 text-center text-xs text-gray-400">
        <Lock className="h-3 w-3" /> Documents are encrypted and only reviewed by our team
      </p>
    </form>
  );
}
