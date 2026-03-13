"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";

type Listing = {
  id: string;
  title: string;
  address: string;
  neighborhood: string;
  availableFrom: string;
  availableTo: string;
  rentCents: number;
};

export default function LandlordPacketPage() {
  const { getToken } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedListing, setSelectedListing] = useState("");
  const [landlordEmail, setLandlordEmail] = useState("");
  const [landlordName, setLandlordName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{ storagePath: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  // Load lister's listings
  useEffect(() => {
    getToken().then((token) => {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/listings/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((d) => setListings(d.listings ?? []))
        .catch(() => {});
    });
  }, [getToken]);

  const generate = async () => {
    if (!selectedListing) return;
    setGenerating(true);
    setError(null);
    setResult(null);
    setDownloadUrl(null);
    try {
      const token = await getToken();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/documents/landlord-packet`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            listingId: selectedListing,
            ...(landlordEmail ? { landlordEmail } : {}),
            ...(landlordName ? { landlordName } : {}),
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Generation failed");
      }
      const data = await res.json();
      setResult(data);

      // Fetch a short-lived download URL via the documents API
      const docRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/v1/documents/${data.document?.matchId ?? "none"}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      // If no matchId, we can't use the match endpoint — the document portal
      // shows landlord packets too. For now, direct the user to /dashboard/documents.
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  if (result) {
    return (
      <main className="flex min-h-[60vh] flex-col items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-3xl">
            📬
          </div>
          <h1 className="text-xl font-extrabold text-slate-900">
            Landlord Packet Ready!
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Your landlord approval packet has been generated and stored securely.
            {landlordEmail && (
              <>
                {" "}
                A copy has been emailed to <strong>{landlordEmail}</strong>.
              </>
            )}
          </p>
          <a
            href="/dashboard/documents"
            className="mt-6 inline-flex items-center rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
          >
            View in Documents →
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-indigo-500">
          Legal Add-on — $35
        </p>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Landlord Approval Packet
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          A Colorado-specific letter citing{" "}
          <strong>C.R.S. § 38-12-301</strong> (landlord cannot unreasonably
          withhold sublease consent), auto-filled with your details and ready to
          send to your landlord.
        </p>
      </div>

      {/* What's included */}
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
        <h2 className="mb-3 text-sm font-bold text-slate-900">
          What&apos;s included
        </h2>
        <ul className="space-y-2 text-sm text-slate-700">
          {[
            "Professional PDF letter citing Colorado sublease law",
            "Auto-filled with your name, address, sublease dates & rent",
            "Landlord response checkboxes (consent / conditions / denial)",
            "Space for landlord signature",
            "Optional: email directly to your landlord",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-600">✓</span>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Listing selector */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Select listing *
          </label>
          <select
            value={selectedListing}
            onChange={(e) => setSelectedListing(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="">— Choose a listing —</option>
            {listings.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} · {l.neighborhood}
              </option>
            ))}
          </select>
          {listings.length === 0 && (
            <p className="mt-1 text-xs text-slate-400">
              No listings found. Create a listing first.
            </p>
          )}
        </div>

        {/* Landlord name (optional) */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Landlord / property manager name{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="text"
            value={landlordName}
            onChange={(e) => setLandlordName(e.target.value)}
            placeholder="e.g. Boulder Property Management LLC"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </div>

        {/* Landlord email (optional) */}
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-slate-700">
            Email packet to landlord{" "}
            <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            type="email"
            value={landlordEmail}
            onChange={(e) => setLandlordEmail(e.target.value)}
            placeholder="landlord@example.com"
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
          <p className="mt-1 text-xs text-slate-400">
            A signed download link (valid 7 days) will be emailed automatically.
          </p>
        </div>

        <button
          onClick={generate}
          disabled={!selectedListing || generating}
          className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? (
            <span className="flex items-center justify-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Generating packet…
            </span>
          ) : (
            "Generate Landlord Packet →"
          )}
        </button>
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Generated documents are stored encrypted in Supabase and accessible
        only to you and Subletto administrators. Not legal advice.
      </p>
    </main>
  );
}
