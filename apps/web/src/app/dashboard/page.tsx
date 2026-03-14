import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import { formatCurrency } from "@subletto/shared";

const STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: "Payment pending",
  AWAITING_LISTER: "Awaiting lister",
  CONFIRMED: "Confirmed",
  DECLINED: "Declined",
  CANCELLED: "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: "bg-slate-100 text-slate-600",
  AWAITING_LISTER: "bg-yellow-100 text-yellow-800",
  CONFIRMED: "bg-green-100 text-green-800",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-slate-100 text-slate-500",
};

const LISTING_STATUS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  PENDING_REVIEW: { label: "In review", color: "bg-yellow-100 text-yellow-700" },
  ACTIVE: { label: "Active", color: "bg-green-100 text-green-700" },
  MATCHED: { label: "Matched", color: "bg-indigo-100 text-indigo-700" },
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-600" },
  LEASED: { label: "Leased", color: "bg-purple-100 text-purple-700" },
  ARCHIVED: { label: "Archived", color: "bg-slate-100 text-slate-500" },
};

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { verification: true },
  });
  if (!user) redirect("/sign-in");

  const isLister = user.role === "LISTER";
  const isSeeker = user.role === "SEEKER";
  const hasRole = isLister || isSeeker || user.role === "ADMIN";

  // Fetch role-specific data
  const [listings, matches] = await Promise.all([
    isLister
      ? prisma.listing.findMany({
          where: { ownerId: user.id },
          include: { photos: { where: { isPrimary: true }, take: 1 } },
          orderBy: { createdAt: "desc" },
          take: 5,
        })
      : Promise.resolve([]),
    prisma.match.findMany({
      where: {
        OR: [{ listerId: user.id }, { subtenantId: user.id }],
        status: { not: "PENDING_PAYMENT" },
      },
      include: { listing: { select: { title: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const isVerified = !!user.verifiedAt;
  const verificationStatus = user.verification?.status ?? null;
  const firstName =
    clerkUser.firstName ?? user.email.split("@")[0] ?? "there";

  const fullName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
    firstName;
  const initials =
    ((clerkUser.firstName?.[0] ?? "") + (clerkUser.lastName?.[0] ?? "")).toUpperCase() ||
    firstName[0]?.toUpperCase() ||
    "?";

  const activeListingsCount = listings.filter((l) => l.status === "ACTIVE").length;
  const confirmedMatchesCount = matches.filter((m) => m.status === "CONFIRMED").length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* ── LEFT SIDEBAR (desktop only) ─────────────────────────────── */}
      <aside className="hidden lg:flex lg:flex-col w-64 border-r border-gray-100 bg-white fixed top-0 left-0 h-screen z-10">
        {/* User info */}
        <div className="py-6 px-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate text-sm">
                {fullName}
              </p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 py-4 px-2 overflow-y-auto">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 rounded-xl bg-blue-50 text-blue-600 font-medium text-sm mb-1"
          >
            <span>🏠</span>
            Dashboard
          </Link>
          {isLister && (
            <Link
              href="/dashboard/listings"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-gray-50 font-medium text-sm mb-1 transition"
            >
              <span>📋</span>
              My Listings
            </Link>
          )}
          <Link
            href="/dashboard/matches"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-gray-50 font-medium text-sm mb-1 transition"
          >
            <span>🤝</span>
            Matches
          </Link>
          {isLister && (
            <Link
              href="/dashboard/verify"
              className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-gray-50 font-medium text-sm mb-1 transition"
            >
              <span>✅</span>
              Verification
            </Link>
          )}
          <Link
            href="/dashboard/documents"
            className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-600 hover:bg-gray-50 font-medium text-sm mb-1 transition"
          >
            <span>📄</span>
            Documents
          </Link>
        </nav>

        {/* Bottom: role pill + switch */}
        <div className="py-4 px-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                isLister
                  ? "bg-indigo-100 text-indigo-700"
                  : isSeeker
                    ? "bg-blue-100 text-blue-700"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              {isLister ? "Lister" : isSeeker ? "Seeker" : "No role"}
            </span>
            <Link
              href="/onboarding"
              className="text-xs text-slate-400 hover:text-slate-700 transition"
            >
              Switch role
            </Link>
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────── */}
      <main className="flex-1 lg:ml-64 min-h-screen pb-24 lg:pb-8">
        <div className="mx-auto max-w-3xl px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-slate-900">
              Hey, {firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
          </div>

          {/* ── Onboarding banners ──────────────────────────────────── */}

          {/* 1. No role */}
          {!hasRole && (
            <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">👋</span>
                <div className="flex-1">
                  <h2 className="font-semibold text-indigo-900">
                    Complete your setup
                  </h2>
                  <p className="mt-1 text-sm text-indigo-700">
                    Tell us how you&apos;re using Subletto so we can set up the
                    right experience for you.
                  </p>
                  <Link
                    href="/onboarding"
                    className="mt-3 inline-block rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Complete setup →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 2. Lister — no verification started */}
          {isLister && !user.verification && (
            <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🪪</span>
                <div className="flex-1">
                  <h2 className="font-semibold text-amber-900">
                    Verify your identity to start listing
                  </h2>
                  <p className="mt-1 text-sm text-amber-700">
                    Upload your government ID and proof of residency. Usually approved
                    within 24 hours.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href="/dashboard/verify"
                      className="inline-block rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                    >
                      Verify identity →
                    </Link>
                    <Link
                      href="/onboarding"
                      className="inline-block rounded-xl border border-amber-300 bg-white px-5 py-2 text-sm font-semibold text-amber-700 hover:bg-amber-50"
                    >
                      Switch to Seeker
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 3. Lister — verification rejected */}
          {isLister && verificationStatus === "REJECTED" && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">❌</span>
                <div className="flex-1">
                  <h2 className="font-semibold text-red-900">
                    Verification rejected
                  </h2>
                  {user.verification?.adminNotes && (
                    <p className="mt-1 text-sm text-red-700">
                      {user.verification.adminNotes}
                    </p>
                  )}
                  <Link
                    href="/dashboard/verify"
                    className="mt-3 inline-block rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700"
                  >
                    Resubmit documents →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 4. Lister — verification pending */}
          {isLister && verificationStatus === "PENDING" && (
            <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⏳</span>
                <div className="flex-1">
                  <h2 className="font-semibold text-blue-900">
                    Verification in review
                  </h2>
                  <p className="mt-0.5 text-sm text-blue-700">
                    Our team is reviewing your documents — usually within 24 hours.
                    We&apos;ll email you when it&apos;s done.
                  </p>
                  <Link
                    href="/dashboard/verify"
                    className="mt-3 inline-block rounded-xl border border-blue-300 bg-white px-5 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                  >
                    View your submission →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* 5. Lister — verified: prompt to create a listing */}
          {isVerified && listings.length === 0 && (
            <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h2 className="font-semibold text-green-900">
                      You&apos;re verified — ready to list!
                    </h2>
                    <p className="mt-0.5 text-sm text-green-700">
                      Your account is approved. Create your first listing to start
                      getting matched.
                    </p>
                  </div>
                </div>
                <Link
                  href="/dashboard/listings/new"
                  className="shrink-0 rounded-xl bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
                >
                  Create listing →
                </Link>
              </div>
            </div>
          )}

          {/* ── Stats cards ─────────────────────────────────────────── */}
          {hasRole && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {isLister && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-3xl font-bold text-blue-600">
                      {activeListingsCount}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Active Listings</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-3xl font-bold text-blue-600">
                      {matches.length}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Match Requests</p>
                  </div>
                </>
              )}
              {isSeeker && (
                <>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-3xl font-bold text-blue-600">
                      {confirmedMatchesCount}
                    </p>
                    <p className="text-sm text-slate-500 mt-1">Active Matches</p>
                  </div>
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                    <p className="text-3xl font-bold text-blue-600">—</p>
                    <p className="text-sm text-slate-500 mt-1">Saved Searches</p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* ── Quick actions grid ──────────────────────────────────── */}
          <div className="mb-8 grid gap-3 sm:grid-cols-3">
            {isLister && (
              <Link
                href="/dashboard/listings"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                  🏠
                </div>
                <div>
                  <p className="font-semibold text-slate-900">My listings</p>
                  <p className="text-xs text-slate-400">{listings.length} total</p>
                </div>
              </Link>
            )}

            {isLister && isVerified && (
              <Link
                href="/dashboard/listings/new"
                className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm transition hover:border-indigo-400 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-xl">
                  ✏️
                </div>
                <div>
                  <p className="font-semibold text-indigo-900">Create listing</p>
                  <p className="text-xs text-indigo-500">Post a sublease</p>
                </div>
              </Link>
            )}

            {isLister && !isVerified && (
              <Link
                href="/dashboard/verify"
                className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm transition hover:border-amber-400 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-xl">
                  🪪
                </div>
                <div>
                  <p className="font-semibold text-amber-900">Verify identity</p>
                  <p className="text-xs text-amber-600">Required to list</p>
                </div>
              </Link>
            )}

            <Link
              href="/dashboard/matches"
              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                🤝
              </div>
              <div>
                <p className="font-semibold text-slate-900">Matches</p>
                <p className="text-xs text-slate-400">{matches.length} active</p>
              </div>
            </Link>

            {isSeeker && (
              <Link
                href="/listings"
                className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-xl">
                  🔍
                </div>
                <div>
                  <p className="font-semibold text-slate-900">Browse</p>
                  <p className="text-xs text-slate-400">Find subleases</p>
                </div>
              </Link>
            )}
          </div>

          {/* ── LISTER: Active listings ─────────────────────────────── */}
          {isLister && (
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">My listings</h2>
                <div className="flex gap-2">
                  <Link
                    href="/dashboard/listings"
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    View all
                  </Link>
                  {isVerified && (
                    <Link
                      href="/dashboard/listings/new"
                      className="rounded-xl bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      + New listing
                    </Link>
                  )}
                </div>
              </div>

              {listings.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                  <div className="text-3xl">🏠</div>
                  <p className="mt-3 font-medium text-slate-700">No listings yet</p>
                  {isVerified ? (
                    <Link
                      href="/dashboard/listings/new"
                      className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                    >
                      Create your first listing →
                    </Link>
                  ) : (
                    <div className="mt-3">
                      <p className="text-sm text-slate-400">
                        You need to verify your identity before listing.
                      </p>
                      <Link
                        href="/dashboard/verify"
                        className="mt-3 inline-block rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                      >
                        Verify identity →
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm">
                  {listings.map((listing) => {
                    const badge =
                      LISTING_STATUS[listing.status] ?? LISTING_STATUS.DRAFT!;
                    const photo = listing.photos[0];
                    return (
                      <div
                        key={listing.id}
                        className="flex items-center gap-4 p-4"
                      >
                        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {photo ? (
                            // eslint-disable-next-line @next/next-eslint/no-img-element
                            <img
                              src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/${photo.storageKey}`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-300">
                              📷
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-slate-900">
                              {listing.title}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${badge.color}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-sm text-slate-500">
                            {listing.neighborhood} ·{" "}
                            {formatCurrency(listing.rentCents)}/mo
                          </p>
                        </div>

                        <Link
                          href={
                            listing.status === "ACTIVE"
                              ? `/listings/${listing.slug}`
                              : `/dashboard/listings/${listing.id}/edit`
                          }
                          className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                        >
                          {listing.status === "ACTIVE" ? "View" : "Edit"}
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          )}

          {/* ── Matches / Activity ──────────────────────────────────── */}
          <section className="mb-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">
                {isLister ? "Match requests" : "My matches"}
              </h2>
              <Link
                href="/dashboard/matches"
                className="text-sm text-indigo-600 hover:text-indigo-800"
              >
                View all
              </Link>
            </div>

            {matches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 py-12 text-center">
                <div className="text-3xl">🤝</div>
                <p className="mt-3 font-medium text-slate-700">No matches yet</p>
                {isSeeker && (
                  <Link
                    href="/listings"
                    className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Browse listings →
                  </Link>
                )}
                {isLister && isVerified && (
                  <Link
                    href="/dashboard/listings/new"
                    className="mt-4 inline-block rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                  >
                    Create a listing to get matched →
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map((m) => (
                  <Link
                    key={m.id}
                    href={`/dashboard/matches/${m.id}`}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">
                        {m.listing.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {m.listerId === user.id
                          ? "You are the lister"
                          : "You are the seeker"}{" "}
                        ·{" "}
                        {new Date(m.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLOR[m.status] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {STATUS_LABEL[m.status] ?? m.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </section>

          {/* ── Seeker: want to list? ────────────────────────────────── */}
          {isSeeker && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-slate-900">
                    Have a sublease to offer?
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Switch to a Lister account to post your unit.
                  </p>
                </div>
                <Link
                  href="/onboarding"
                  className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Switch to Lister →
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MOBILE BOTTOM TAB BAR ────────────────────────────────────── */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20">
        <div className="flex items-center justify-around py-2 px-2">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-blue-600"
          >
            <span className="text-xl">🏠</span>
            <span className="text-xs font-medium">Dashboard</span>
          </Link>
          <Link
            href="/dashboard/listings"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">📋</span>
            <span className="text-xs">Listings</span>
          </Link>
          <Link
            href="/dashboard/matches"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">🤝</span>
            <span className="text-xs">Matches</span>
          </Link>
          <Link
            href="/dashboard/verify"
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 text-slate-500 hover:text-slate-700"
          >
            <span className="text-xl">👤</span>
            <span className="text-xs">Profile</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
