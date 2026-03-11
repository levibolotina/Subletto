import { redirect } from "next/navigation";
import Link from "next/link";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";

export default async function AdminGrowthPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const [
    totalWaitlist,
    recentWaitlist,
    topReferrers,
    pendingTestimonials,
    approvedTestimonials,
    successStories,
  ] = await Promise.all([
    prisma.waitlistEntry.count(),
    prisma.waitlistEntry.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { email: true, referralCode: true, referredBy: true, createdAt: true },
    }),
    prisma.$queryRaw<{ referralCode: string; count: bigint }[]>`
      SELECT "referral_code" AS "referralCode", COUNT(*) AS count
      FROM waitlist_entries
      WHERE "referred_by" IS NOT NULL
      GROUP BY "referred_by"
      ORDER BY count DESC
      LIMIT 10
    `,
    prisma.testimonial.findMany({
      where: { isApproved: false },
      orderBy: { createdAt: "desc" },
    }),
    prisma.testimonial.findMany({
      where: { isApproved: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.successStory.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Growth Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">Waitlist, testimonials, success stories, and launch templates.</p>

      {/* ── Waitlist Stats ─────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-800">Waitlist</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <p className="text-3xl font-extrabold text-indigo-600">{totalWaitlist}</p>
            <p className="mt-1 text-sm text-slate-500">Total signups</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <p className="text-3xl font-extrabold text-indigo-600">
              {recentWaitlist.filter((e) => e.referredBy).length}
            </p>
            <p className="mt-1 text-sm text-slate-500">Referred (last 20)</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-center">
            <p className="text-3xl font-extrabold text-indigo-600">{successStories.length}</p>
            <p className="mt-1 text-sm text-slate-500">Success stories</p>
          </div>
        </div>

        {/* Recent signups */}
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Referred by</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentWaitlist.map((e) => (
                <tr key={e.email} className="hover:bg-slate-50">
                  <td className="px-4 py-2 text-slate-700">{e.email}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.referralCode}</td>
                  <td className="px-4 py-2 font-mono text-xs text-slate-500">{e.referredBy ?? "—"}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">
                    {new Date(e.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {recentWaitlist.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                    No signups yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Testimonials ─────────────────────────────────────────────────── */}
      <section className="mt-10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            Testimonials
            {pendingTestimonials.length > 0 && (
              <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-800">
                {pendingTestimonials.length} pending
              </span>
            )}
          </h2>
        </div>

        {pendingTestimonials.length > 0 && (
          <div className="mt-3 space-y-3">
            <h3 className="text-sm font-medium text-slate-600">Awaiting review</h3>
            {pendingTestimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-yellow-100 bg-yellow-50 p-4"
              >
                <p className="text-sm text-slate-700 italic">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-1 text-xs text-slate-500">
                  — {t.displayName ?? "Anonymous"} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
                <div className="mt-3 flex gap-2">
                  <form action={`/api/admin/testimonial/${t.id}/approve`} method="POST">
                    <button
                      type="submit"
                      className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                    >
                      Approve
                    </button>
                  </form>
                  <form action={`/api/admin/testimonial/${t.id}/reject`} method="POST">
                    <button
                      type="submit"
                      className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-200"
                    >
                      Reject
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}

        {approvedTestimonials.length > 0 && (
          <div className="mt-4 space-y-3">
            <h3 className="text-sm font-medium text-slate-600">Live on site</h3>
            {approvedTestimonials.map((t) => (
              <div
                key={t.id}
                className="rounded-2xl border border-green-100 bg-green-50 p-4"
              >
                <p className="text-sm text-slate-700 italic">&ldquo;{t.quote}&rdquo;</p>
                <p className="mt-1 text-xs text-slate-500">
                  — {t.displayName ?? "Anonymous"} · {new Date(t.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {pendingTestimonials.length === 0 && approvedTestimonials.length === 0 && (
          <p className="mt-3 text-sm text-slate-400">No testimonials yet.</p>
        )}
      </section>

      {/* ── Launch Channel Templates ─────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">Launch Channel Templates</h2>
        <p className="mt-1 text-sm text-slate-500">
          Copy and paste these templates for each channel. Remember to fill in the
          [BRACKETS] with current data.
        </p>

        <div className="mt-4 space-y-6">

          {/* r/cuboulder */}
          <TemplateCard
            title="r/cuboulder Reddit Post"
            badge="Reddit"
            badgeColor="bg-orange-100 text-orange-700"
            template={`**Title:** Subletto: A scam-free sublease marketplace for CU Boulder students [no affil]

Hey r/cuboulder!

Tired of sketchy Craigslist subleases and Facebook posts where you can never tell if the person is legit? I built Subletto to fix this.

**What it is:**
Subletto is a sublease marketplace exclusively for CU Boulder students (.edu email required). Every lister has to verify their government ID and active lease before posting — no more scams.

**How it works:**
1. Listers post verified subleases
2. Seekers pay a $99 connection fee (refunded if declined)
3. Contact info is unlocked after the lister accepts

**We're launching soon** — join the waitlist at **subletto.co/waitlist** to get early access. Every friend you refer moves you up 5 spots.

Happy to answer any questions!

---
*This is the project I've been working on — built by a CU Boulder student, for CU Boulder students.*`}
          />

          {/* Facebook */}
          <TemplateCard
            title="CU Off-Campus Housing Facebook Group"
            badge="Facebook"
            badgeColor="bg-blue-100 text-blue-700"
            template={`Hey everyone! 👋

I know a lot of you are dealing with the summer sublease struggle — sketchy posts, no-shows, and Venmo scams. I built a solution.

**Subletto** is a new sublease marketplace made only for CU Boulder students. Here's what makes it different:

✅ .edu emails only (verified CU students)
🪪 Every lister submits their ID + lease to our admin team
🔒 $99 connection fee held in escrow — full refund if the lister ghosts you
📄 Optional sublease agreements and escrow for rent + deposit

We're launching this summer and taking early access signups now → **subletto.co/waitlist**

Refer friends to move up the waitlist! Drop questions in the comments 👇`}
          />

          {/* Greek life */}
          <TemplateCard
            title="Greek Life Outreach Email"
            badge="Email"
            badgeColor="bg-purple-100 text-purple-700"
            template={`Subject: Sublease solution for your chapter members — Subletto

Hi [Chapter President / Housing Chair],

My name is [YOUR NAME], and I'm a CU Boulder student who built Subletto — a verified sublease marketplace exclusively for CU students.

**The problem:** Every summer, dozens of your members need to sublease their apartments. Most end up on Craigslist or random Facebook groups, which are full of scams and time-wasters.

**What Subletto does:**
• Requires .edu email (CU students only)
• Verifies every lister's government ID and active lease before listing
• Secure $99 connection fee held in escrow — refunded if the lister declines
• Optional legal sublease agreement generation (DocuSign)

**What I'm asking:** Would you be willing to share our waitlist link — **subletto.co/waitlist** — in your chapter's group chat or newsletter? We're launching this semester, and your members will get priority access.

I'd love to set up a 15-minute call to answer any questions. Or if you prefer, I can come by a chapter meeting.

Thanks for your time,
[YOUR NAME]
CU Boulder [YEAR], [MAJOR]
[EMAIL] | [PHONE]`}
          />

          {/* Study Abroad */}
          <TemplateCard
            title="CU Study Abroad Office Partnership Pitch"
            badge="Partner Email"
            badgeColor="bg-green-100 text-green-700"
            template={`Subject: Student sublease resource for Study Abroad returnees — Subletto Partnership

Dear [Study Abroad Office Director / Coordinator],

I'm a CU Boulder student who developed Subletto (subletto.co) — a verified sublease marketplace exclusively for CU Boulder students.

I'm reaching out because returning study-abroad students represent one of our core user groups: students who were away for a semester frequently need to find housing quickly, and students with active leases often want to sublease while studying abroad.

**Proposed partnership:**
1. You mention Subletto in your pre-departure orientation materials (as a tool for subletting during their abroad semester)
2. You mention Subletto in your return-orientation materials (as a tool for finding a short-term sublease while securing permanent housing)
3. In return, we offer any student referred by your office priority access and waive the connection fee for their first match

**Why this helps your students:**
• Avoids scams (ID + lease verified)
• Legal sublease agreement generation included
• Secure escrow payments — no sending money to strangers

I'd love to schedule a 20-minute call to discuss. I can provide any materials you need, and I'm happy to come present at an info session.

Best,
[YOUR NAME]
[EMAIL] | subletto.co`}
          />

        </div>
      </section>

      {/* ── Flyer ─────────────────────────────────────────────────────────── */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-800">Campus Flyer</h2>
        <p className="mt-1 text-sm text-slate-500">
          Print-ready 8.5×11 flyer for campus bulletin boards.
        </p>
        <Link
          href="/flyer"
          target="_blank"
          className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Open flyer page →
        </Link>
        <p className="mt-2 text-xs text-slate-400">
          Note: Add a real QR code linking to subletto.co/waitlist before printing.
        </p>
      </section>
    </main>
  );
}

// ─── Helper component ─────────────────────────────────────────────────────────

function TemplateCard({
  title,
  badge,
  badgeColor,
  template,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  template: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeColor}`}>
          {badge}
        </span>
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
        {template}
      </pre>
    </div>
  );
}
