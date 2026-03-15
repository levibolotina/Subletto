import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { prisma } from "@subletto/db";
import { Search, Home, CheckCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let waitlistCount = 0;
  let approvedTestimonials: Awaited<ReturnType<typeof prisma.testimonial.findMany>> = [];
  let successStories: Awaited<ReturnType<typeof prisma.successStory.findMany>> = [];

  try {
    [waitlistCount, approvedTestimonials, successStories] = await Promise.all([
      prisma.waitlistEntry.count(),
      prisma.testimonial.findMany({
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.successStory.findMany({
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);
  } catch (err) {
    console.error("[HomePage] DB fetch failed:", err);
  }

  void successStories; // fetched for future use

  return (
    <main className="font-sans">

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Background image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600"
          alt="Boulder Colorado Flatirons"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/50" />

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium text-white backdrop-blur-sm">
            CU Boulder Students Only
          </div>

          {/* Headline */}
          <h1 className="font-display text-5xl font-bold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your Next Sublease,
            <br />
            <span className="text-blue-400">Found.</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 sm:text-xl">
            The only verified sublease marketplace built exclusively for CU Boulder students.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/listings"
              className="rounded-full bg-white px-8 py-3.5 text-base font-semibold text-gray-900 shadow-lg transition hover:bg-gray-100 active:scale-95"
            >
              Browse Listings
            </Link>
            <SignedOut>
              <Link
                href="/sign-up"
                className="rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
              >
                List Your Place
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard/listings/new"
                className="rounded-full bg-blue-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition hover:bg-blue-700 active:scale-95"
              >
                List Your Place
              </Link>
            </SignedIn>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce text-white/60">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── Stats Bar ───────────────────────────────────────────────────── */}
      <section className="border-b border-gray-100 bg-white py-8">
        <div className="mx-auto max-w-4xl px-6">
          <div className="grid grid-cols-3 divide-x divide-gray-100 text-center">
            <div className="px-6">
              <p className="font-display text-3xl font-bold text-blue-600">
                {waitlistCount > 0 ? `${waitlistCount.toLocaleString()}+` : "200+"}
              </p>
              <p className="mt-1 text-sm text-gray-500">Students</p>
            </div>
            <div className="px-6">
              <p className="font-display text-3xl font-bold text-blue-600">100%</p>
              <p className="mt-1 text-sm text-gray-500">Verified</p>
            </div>
            <div className="px-6">
              <p className="font-display text-3xl font-bold text-blue-600">CU</p>
              <p className="mt-1 text-sm text-gray-500">Boulder Only</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────────── */}
      <section id="how-it-works" className="bg-gray-50 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-14 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-600">
              Simple Process
            </p>
            <h2 className="font-display mt-3 text-4xl font-bold text-gray-900">
              Find your sublease in 3 steps
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                step: "01",
                icon: <Search className="h-8 w-8 text-blue-600" />,
                title: "Browse verified listings",
                desc: "Search CU-exclusive subleases near campus. Every listing is from a verified student.",
              },
              {
                step: "02",
                icon: <CheckCircle className="h-8 w-8 text-blue-600" />,
                title: "Request a match",
                desc: "Pay the $99 connection fee. Lister accepts or declines within 48 hours. Full refund if declined.",
              },
              {
                step: "03",
                icon: null,
                title: "Sign & move in",
                desc: "Contact info unlocked. Use Subletto escrow for deposit security. Move in with confidence.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="flex flex-col items-center rounded-2xl bg-white p-8 text-center shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
                  {item.step}
                </div>
                {item.icon && <div className="mt-5">{item.icon}</div>}
                <h3 className="mt-4 text-base font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Intent Split CTA ────────────────────────────────────────────── */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display mb-10 text-center text-3xl font-bold text-gray-900">
            What brings you here?
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Link
              href="/listings"
              className="flex flex-col items-center rounded-2xl border-2 border-gray-100 p-8 text-center transition hover:border-blue-400 hover:shadow-lg cursor-pointer"
            >
              <Search className="h-12 w-12 text-blue-600" />
              <h3 className="mt-5 text-lg font-bold text-gray-900">Find a Sublease</h3>
              <p className="mt-2 text-sm text-gray-500">
                Browse verified listings near CU Boulder campus from real students.
              </p>
            </Link>
            <Link
              href="/onboarding"
              className="flex flex-col items-center rounded-2xl border-2 border-gray-100 p-8 text-center transition hover:border-blue-400 hover:shadow-lg cursor-pointer"
            >
              <Home className="h-12 w-12 text-blue-600" />
              <h3 className="mt-5 text-lg font-bold text-gray-900">List Your Place</h3>
              <p className="mt-2 text-sm text-gray-500">
                Sublet your apartment to verified CU Boulder students in minutes.
              </p>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Testimonials ────────────────────────────────────────────────── */}
      {approvedTestimonials.length > 0 && (
        <section className="bg-gray-50 px-6 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="font-display mb-12 text-center text-3xl font-bold text-gray-900">
              What students are saying
            </h2>
            <div className="grid gap-6 sm:grid-cols-3">
              {approvedTestimonials.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col rounded-2xl bg-white p-6 shadow-sm"
                >
                  <p className="flex-1 text-sm leading-relaxed text-gray-600 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                  <p className="mt-4 text-xs font-semibold text-gray-400">
                    — {t.displayName ?? "Anonymous CU Student"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 px-6 py-16 text-white">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
            {/* Left */}
            <div>
              <p className="font-display text-xl font-bold text-white">Subletto</p>
              <p className="mt-2 text-sm text-slate-400">
                The verified sublease marketplace for CU Boulder
              </p>
            </div>

            {/* Right links */}
            <div className="flex gap-8 text-sm text-slate-400">
              <Link href="/listings" className="hover:text-white transition-colors">
                Browse
              </Link>
              <Link href="/onboarding" className="hover:text-white transition-colors">
                List
              </Link>
              <Link href="/sign-in" className="hover:text-white transition-colors">
                Sign in
              </Link>
            </div>
          </div>

          <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
            © 2026 Subletto. For CU Boulder students only.
          </div>
        </div>
      </footer>
    </main>
  );
}
