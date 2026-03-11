import type { Metadata } from "next";
import TestimonialForm from "@/components/features/testimonial-form";

export const metadata: Metadata = {
  title: "Share Your Experience | Subletto",
  description: "Tell other CU Boulder students about your Subletto experience.",
  robots: { index: false }, // keep off search engines
};

export default function TestimonialPage() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <div className="mb-8 text-center">
        <div className="mb-3 text-4xl">⭐</div>
        <h1 className="text-2xl font-bold text-slate-900">Share your experience</h1>
        <p className="mt-2 text-slate-500 text-sm">
          Help other CU Boulder students know what to expect. Your quote may appear
          on our landing page (after we review it).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <TestimonialForm />
      </div>

      <p className="mt-4 text-center text-xs text-slate-400">
        Testimonials are reviewed before being published. We may shorten or
        anonymize quotes.
      </p>
    </main>
  );
}
