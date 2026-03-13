"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

type Document = {
  id: string;
  type: "SUBLEASE_AGREEMENT" | "LANDLORD_PACKET";
  status: string;
  storagePath: string | null;
  signedStoragePath: string | null;
  docusignStatus: string | null;
  signedAt: string | null;
  createdAt: string;
  downloadUrl: string | null;
};

function statusLabel(status: string) {
  const map: Record<string, { text: string; color: string }> = {
    PENDING: { text: "Pending generation", color: "text-slate-500" },
    GENERATED: { text: "PDF ready", color: "text-blue-600" },
    SENT_FOR_SIGNATURE: { text: "Awaiting signatures", color: "text-amber-600" },
    SIGNED: { text: "Fully signed ✓", color: "text-green-600" },
    DECLINED_SIGNING: { text: "Signing declined", color: "text-red-600" },
  };
  return map[status] ?? { text: status, color: "text-slate-500" };
}

export default function MatchDocumentsPage() {
  const { matchId } = useParams<{ matchId: string }>();
  const { getToken } = useAuth();
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState<string | null>(null);

  const fetchDocs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/documents/${matchId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Failed to load documents");
      const data = await res.json();
      setDocs(data.documents);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [matchId]);

  const generateAgreement = async () => {
    setGenerating(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/documents/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ matchId }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      await fetchDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const sendToDocuSign = async (documentId: string) => {
    setSending(documentId);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/documents/send-docusign`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ documentId }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "DocuSign send failed");
      }
      await fetchDocs();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "DocuSign send failed");
    } finally {
      setSending(null);
    }
  };

  const hasAgreement = docs.some((d) => d.type === "SUBLEASE_AGREEMENT");

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <span className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-slate-900">Legal Documents</h1>
        <p className="mt-1 text-sm text-slate-500">
          Documents for this sublease match.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Generate CTA */}
      {!hasAgreement && (
        <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-3xl">📝</span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Colorado Sublease Agreement
              </h2>
              <p className="text-sm text-slate-600">
                Generate a legally-compliant PDF, auto-filled with both
                parties&apos; details, ready for e-signature via DocuSign.
              </p>
            </div>
          </div>
          <button
            onClick={generateAgreement}
            disabled={generating}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Generating PDF…
              </span>
            ) : (
              "Generate Agreement →"
            )}
          </button>
        </div>
      )}

      {/* Document list */}
      {docs.length > 0 && (
        <div className="space-y-4">
          {docs.map((doc) => {
            const sl = statusLabel(doc.status);
            return (
              <div
                key={doc.id}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {doc.type === "SUBLEASE_AGREEMENT" ? "📝" : "📬"}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-900">
                        {doc.type === "SUBLEASE_AGREEMENT"
                          ? "Colorado Sublease Agreement"
                          : "Landlord Approval Packet"}
                      </p>
                      <p className={`text-xs font-medium ${sl.color}`}>
                        {sl.text}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Download */}
                  {doc.downloadUrl && (
                    <a
                      href={doc.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Download PDF
                    </a>
                  )}

                  {/* Send to DocuSign */}
                  {doc.status === "GENERATED" && (
                    <button
                      onClick={() => sendToDocuSign(doc.id)}
                      disabled={sending === doc.id}
                      className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {sending === doc.id ? "Sending…" : "Send for e-signature"}
                    </button>
                  )}

                  {doc.status === "SENT_FOR_SIGNATURE" && (
                    <span className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                      Signature emails sent — awaiting completion
                    </span>
                  )}

                  {doc.status === "SIGNED" && doc.signedAt && (
                    <span className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
                      Signed on {new Date(doc.signedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {docs.length === 0 && hasAgreement === false && (
        <p className="text-center text-sm text-slate-400">
          No documents generated yet.
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50 p-4">
        <p className="text-xs text-slate-500">
          <strong>Important:</strong> Subletto-generated documents are provided as a convenience
          and are not a substitute for legal advice. Signed copies are stored securely in
          encrypted Supabase Storage and accessible only to the parties and Subletto administrators.
        </p>
      </div>
    </main>
  );
}
