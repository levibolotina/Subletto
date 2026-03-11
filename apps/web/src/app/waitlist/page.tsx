import type { Metadata } from "next";
import { prisma } from "@subletto/db";
import WaitlistForm from "@/components/features/waitlist-form";

export const metadata: Metadata = {
  title: "Join the Waitlist | Subletto — CU Boulder Subleases",
  description:
    "Get early access to Subletto, the verified sublease marketplace built exclusively for CU Boulder students. Sign up now and move up the list by referring friends.",
  keywords: [
    "CU Boulder sublease",
    "Boulder sublease summer",
    "CU Boulder sublet",
    "CU Boulder housing waitlist",
  ],
  openGraph: {
    title: "Join the Subletto Waitlist — CU Boulder Subleases",
    description:
      "Verified, scam-free subleases exclusively for CU Boulder students. Get early access.",
    siteName: "Subletto",
    type: "website",
  },
};

interface Props {
  searchParams: { ref?: string };
}

export default async function WaitlistPage({ searchParams }: Props) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://subletto.co";
  const referredBy = searchParams.ref?.toUpperCase();

  const totalCount = await prisma.waitlistEntry.count();

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-600">
      {/* Decorative blobs */}
      <div className="pointer-events-none fixed -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none fixed -bottom-32 -left-32 h-96 w-96 rounded-full bg-violet-500/30 blur-3xl" />

      <div className="relative mx-auto max-w-2xl px-4 py-20 text-white">
        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
          CU Boulder students only
        </div>

        {/* Headline */}
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Find a sublease<br />
          <span className="text-indigo-200">the safe way.</span>
        </h1>
        <p className="mt-5 max-w-lg text-lg text-indigo-100 sm:text-xl">
          Subletto is a verified sublease marketplace built exclusively for CU
          Boulder students. No scams. No randos. Just real subleases from real
          Buffs.
        </p>

        {/* Counter */}
        {totalCount > 0 && (
          <div className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white/20 px-5 py-3 backdrop-blur-sm">
            <span className="text-2xl font-extrabold">{totalCount.toLocaleString()}</span>
            <span className="text-indigo-200 text-sm">
              CU students already waiting
            </span>
          </div>
        )}

        {/* Form */}
        <div className="mt-8">
          <WaitlistForm referredBy={referredBy} appUrl={appUrl} />
        </div>

        {/* How referrals work */}
        <div className="mt-10 rounded-2xl bg-white/10 p-6 backdrop-blur-sm">
          <h2 className="font-semibold text-white">How the waitlist works</h2>
          <ul className="mt-3 space-y-2 text-sm text-indigo-100">
            <li className="flex items-start gap-2">
              <span className="mt-0.5">1️⃣</span>
              <span>Sign up with your .edu email — you're assigned a position based on when you joined.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">2️⃣</span>
              <span>Share your personal referral link. Every friend who joins moves you up <strong>5 spots</strong>.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-0.5">3️⃣</span>
              <span>When we launch, the highest-ranked users get access first.</span>
            </li>
          </ul>
        </div>

        {/* Trust signals */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: "🎓", label: ".edu only", desc: "CU Boulder students exclusively" },
            { icon: "🪪", label: "ID verified", desc: "Every lister is verified by our team" },
            { icon: "🔒", label: "Secure", desc: "Payments held in escrow until move-in" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/10 p-4 text-center backdrop-blur-sm">
              <div className="text-2xl">{item.icon}</div>
              <p className="mt-2 text-sm font-semibold">{item.label}</p>
              <p className="mt-0.5 text-xs text-indigo-200">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
