import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { prisma } from "@subletto/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [waitlistCount, approvedTestimonials, successStories] = await Promise.all([
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
  return (
    <main>
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600 px-4 pb-24 pt-20 text-white">
        {/* Decorative blobs */}
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-violet-500/30 blur-3xl" />

        <div className="relative mx-auto max-w-4xl text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
            CU Boulder students only
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl">
            Find your sublease.{" "}
            <span className="text-indigo-200">Safely.</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-100 sm:text-xl">
            The only sublease marketplace built for CU Boulder students —
            verified identities, secure payments, zero scams.
          </p>

          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center">
            <SignedOut>
              <Link
                href="/sign-up"
                className="rounded-xl bg-white px-8 py-4 text-center text-base font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50 active:scale-95"
              >
                Get started — it&apos;s free
              </Link>
              <Link
                href="/listings"
                className="rounded-xl border-2 border-white/40 px-8 py-4 text-center text-base font-semibold text-white transition hover:border-white/70 active:scale-95"
              >
                Browse listings
              </Link>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="rounded-xl bg-white px-8 py-4 text-center text-base font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50 active:scale-95"
              >
                Go to dashboard
              </Link>
              <Link
                href="/listings"
                className="rounded-xl border-2 border-white/40 px-8 py-4 text-center text-base font-semibold text-white transition hover:border-white/70 active:scale-95"
              >
                Browse listings
              </Link>
            </SignedIn>
          </div>

          {/* Social proof */}
          <p className="mt-8 text-sm text-indigo-200">
            Trusted by CU Boulder students • Verified listings only
          </p>
        </div>
      </section>

      {/* ── Waitlist Banner (signed-out only) ─────────────────────────── */}
      <SignedOut>
        <section className="bg-indigo-600 px-4 py-10">
          <div className="mx-auto max-w-2xl text-center text-white">
            <p className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
              Early access
            </p>
            <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
              Join {waitlistCount > 0 ? `${waitlistCount.toLocaleString()}+ ` : ""}CU students on the waitlist
            </h2>
            <p className="mt-2 text-indigo-200">
              Be the first to access verified subleases when we launch.
            </p>
            <Link
              href="/waitlist"
              className="mt-6 inline-block rounded-xl bg-white px-8 py-3 text-sm font-bold text-indigo-600 shadow-lg transition hover:bg-indigo-50 active:scale-95"
            >
              Get early access →
            </Link>
          </div>
        </section>
      </SignedOut>

      {/* ── Trust Signals ─────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-bold text-slate-900">
              Why students trust Subletto
            </h2>
            <p className="mt-3 text-slate-500">
              Every listing is backed by real verification
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-3">
            {[
              {
                icon: "🎓",
                title: ".edu emails only",
                desc: "Only CU Boulder students can sign up. No randos, no scammers.",
              },
              {
                icon: "🪪",
                title: "ID + lease verified",
                desc: "Listers submit a government ID and active lease to our team before going live.",
              },
              {
                icon: "🔒",
                title: "Secure payments",
                desc: "The $99 connection fee is held in escrow. You get a full refund if the lister declines.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center"
              >
                <div className="mb-3 text-4xl">{item.icon}</div>
                <h3 className="font-semibold text-slate-900">{item.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          {/* Verified badge explainer */}
          <div className="mt-8 flex flex-col items-start gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 sm:flex-row sm:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <svg
                className="h-6 w-6 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-indigo-900">
                What does the{" "}
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-2 py-0.5 text-xs text-indigo-700">
                  ✓ Verified
                </span>{" "}
                badge mean?
              </p>
              <p className="mt-1 text-sm leading-relaxed text-indigo-700">
                Listers with a Verified badge have submitted a government-issued
                ID and their current lease to our admin team. We confirm the
                sublease is legitimate before it goes live — so you can browse
                with confidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="bg-slate-50 px-4 py-16">
        <div className="mx-auto max-w-4xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-slate-900">How it works</h2>
            <p className="mt-3 text-slate-500">
              From listing to move-in in three simple steps
            </p>
          </div>

          <div className="relative grid gap-10 md:grid-cols-3">
            {/* Connector line (desktop) */}
            <div className="absolute left-[16.67%] right-[16.67%] top-5 hidden h-0.5 bg-indigo-200 md:block" />

            {[
              {
                step: "01",
                emoji: "🏠",
                title: "List or browse",
                desc: "Listers post their verified sublease. Seekers browse anonymized listings — no personal info exposed until you match.",
              },
              {
                step: "02",
                emoji: "🤝",
                title: "Request a match",
                desc: "Pay the $99 connection fee. The lister accepts or declines within 48 hours. Full refund if declined, no questions asked.",
              },
              {
                step: "03",
                emoji: "📦",
                title: "Move in",
                desc: "Contact info unlocked. Optionally use Subletto escrow for first month + deposit. Funds release on move-in day.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center"
              >
                <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
                  {item.step}
                </div>
                <div className="mt-5 text-4xl">{item.emoji}</div>
                <h3 className="mt-3 font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-14 flex justify-center">
            <Link
              href="/listings"
              className="rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 active:scale-95"
            >
              Browse available subleases →
            </Link>
          </div>
        </div>
      </section>

      {/* ── CTA Banner ────────────────────────────────────────────────── */}
      <section className="bg-white px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Have a sublease to offer?
          </h2>
          <p className="mt-3 text-slate-500">
            List your unit in minutes. Reach verified CU Boulder students
            actively looking for a place.
          </p>
          <SignedOut>
            <Link
              href="/sign-up"
              className="mt-8 inline-block rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              List your unit →
            </Link>
          </SignedOut>
          <SignedIn>
            <Link
              href="/dashboard/listings/new"
              className="mt-8 inline-block rounded-xl bg-indigo-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              Create a listing →
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* ── Social Proof ──────────────────────────────────────────────── */}
      {(approvedTestimonials.length > 0 || successStories.length > 0) && (
        <section className="bg-slate-50 px-4 py-16">
          <div className="mx-auto max-w-5xl">
            {approvedTestimonials.length > 0 && (
              <>
                <div className="mb-10 text-center">
                  <h2 className="text-3xl font-bold text-slate-900">
                    What students say
                  </h2>
                  <p className="mt-3 text-slate-500">Real experiences from CU Boulder students</p>
                </div>
                <div className="grid gap-5 sm:grid-cols-3">
                  {approvedTestimonials.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6"
                    >
                      <p className="flex-1 text-sm leading-relaxed text-slate-600 italic">
                        &ldquo;{t.quote}&rdquo;
                      </p>
                      <p className="mt-4 text-xs font-semibold text-slate-400">
                        — {t.displayName ?? "Anonymous CU Student"}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {successStories.length > 0 && (
              <div className={approvedTestimonials.length > 0 ? "mt-12" : ""}>
                <div className="mb-6 text-center">
                  <h2 className="text-2xl font-bold text-slate-900">
                    Subleases matched so far
                  </h2>
                  <p className="mt-2 text-slate-500">Every match is a scam avoided</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {successStories.map((s) => (
                    <div
                      key={s.id}
                      className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5"
                    >
                      <p className="text-lg font-bold text-indigo-600">
                        {s.bedrooms}BR · {s.neighborhood}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">
                        ${Math.round(s.rentCents / 100)}/mo ·{" "}
                        {new Date(s.fromDate).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}{" "}
                        →{" "}
                        {new Date(s.toDate).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                      <p className="mt-2 text-xs font-semibold text-indigo-500">
                        ✓ Matched
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-slate-50 px-4 py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-lg font-extrabold tracking-tight text-indigo-600">
            Subletto
          </p>
          <p className="text-sm text-slate-400">
            © 2026 Subletto · Built for CU Boulder students
          </p>
          <div className="flex gap-5 text-sm text-slate-500">
            <Link href="/listings" className="hover:text-slate-900">
              Browse
            </Link>
            <Link href="/waitlist" className="hover:text-slate-900">
              Waitlist
            </Link>
            <Link href="/sign-up" className="hover:text-slate-900">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
