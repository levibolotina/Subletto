"use client";

export function PrintButton() {
  return (
    <div className="no-print flex justify-center gap-4 bg-slate-100 py-4">
      <button
        onClick={() => window.print()}
        className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700"
      >
        Print / Save as PDF
      </button>
      <p className="self-center text-sm text-slate-500">
        Tip: Set margins to &ldquo;None&rdquo; in your browser&apos;s print dialog for best results.
      </p>
    </div>
  );
}
