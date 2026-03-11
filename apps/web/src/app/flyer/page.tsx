import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subletto — Campus Flyer",
  robots: { index: false },
};

export default function FlyerPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://subletto.co";

  return (
    <>
      {/* Print-specific styles injected inline so they survive Next.js */}
      <style>{`
        @media print {
          body { margin: 0; padding: 0; }
          nav { display: none !important; }
          .no-print { display: none !important; }
          .flyer {
            width: 8.5in;
            min-height: 11in;
            page-break-after: always;
          }
        }
        @page {
          size: letter;
          margin: 0;
        }
      `}</style>

      {/* Print button */}
      <div className="no-print flex justify-center gap-4 bg-slate-100 py-4">
        <button
          onClick={() => window.print()}
          className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
        >
          Print / Save as PDF
        </button>
        <p className="self-center text-sm text-slate-500">
          Tip: Set margins to "None" in your browser's print dialog for best results.
        </p>
      </div>

      {/* Flyer — 8.5×11 */}
      <div
        className="flyer mx-auto flex flex-col items-center justify-between bg-white px-12 py-10"
        style={{ width: "816px", minHeight: "1056px" }}
      >
        {/* Top stripe */}
        <div
          className="w-full rounded-2xl px-8 py-10 text-center text-white"
          style={{ background: "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)" }}
        >
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest opacity-80">
            CU Boulder Students
          </p>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
            Subletto
          </h1>
          <p className="mt-2 text-xl font-semibold opacity-90">
            Find a sublease. Safely.
          </p>
          <p className="mx-auto mt-4 max-w-md text-sm opacity-80">
            The only verified sublease marketplace built for CU Boulder students.
            No scams. No sketchy Craigslist posts. Just real listings from real Buffs.
          </p>
        </div>

        {/* Three pillars */}
        <div className="mt-8 w-full">
          <h2 className="mb-5 text-center text-lg font-bold text-slate-800">
            Why students use Subletto
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                emoji: "🎓",
                title: ".edu Only",
                desc: "Every user must sign up with a CU Boulder .edu email.",
              },
              {
                emoji: "🪪",
                title: "ID + Lease Verified",
                desc: "Listers submit a government ID and active lease to our team.",
              },
              {
                emoji: "🔒",
                title: "Secure Payments",
                desc: "$99 connection fee held in escrow. Full refund if declined.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center"
              >
                <div className="mb-2 text-3xl">{item.emoji}</div>
                <p className="font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* How it works */}
        <div className="mt-8 w-full rounded-2xl border border-indigo-100 bg-indigo-50 px-8 py-6">
          <h2 className="mb-4 text-center text-lg font-bold text-indigo-900">
            How it works — 3 steps
          </h2>
          <div className="flex items-start justify-between gap-4 text-center">
            {[
              { n: "01", emoji: "🏠", t: "Browse listings", d: "Verified subleases, no personal info until you match." },
              { n: "02", emoji: "🤝", t: "Request a match", d: "Pay $99 — refunded if lister declines, no questions asked." },
              { n: "03", emoji: "📦", t: "Move in", d: "Contact info unlocked. Optional escrow for first month + deposit." },
            ].map((s) => (
              <div key={s.n} className="flex-1">
                <div className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {s.n}
                </div>
                <div className="text-2xl">{s.emoji}</div>
                <p className="mt-1 text-sm font-semibold text-indigo-900">{s.t}</p>
                <p className="mt-1 text-xs text-indigo-700">{s.d}</p>
              </div>
            ))}
          </div>
        </div>

        {/* QR + CTA */}
        <div className="mt-8 flex w-full items-center justify-between gap-8 rounded-2xl bg-slate-900 px-8 py-6 text-white">
          {/* QR placeholder */}
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 text-xs text-white/60">
            [QR code]
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-medium text-slate-300">Scan or visit</p>
            <p className="mt-1 text-2xl font-extrabold text-white">subletto.co/waitlist</p>
            <p className="mt-1 text-sm text-slate-300">Get early access before launch</p>
          </div>
          <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border-2 border-white/30 bg-white/10 text-xs text-white/60">
            [QR code]
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 w-full text-center">
          <p className="text-sm font-bold text-indigo-600">subletto.co</p>
          <p className="mt-1 text-xs text-slate-400">
            Built for CU Boulder students · Questions? hello@subletto.co
          </p>
        </div>
      </div>
    </>
  );
}
