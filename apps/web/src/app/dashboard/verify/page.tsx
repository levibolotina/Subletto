import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import DocumentUpload from "@/components/features/document-upload";
import LeaseQuestion from "@/components/features/lease-question";

export default async function VerifyPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({
    where: { clerkId: clerkUser.id },
    include: { verification: true },
  });

  if (!user) redirect("/sign-in");
  if (user.role !== "LISTER") redirect("/dashboard");
  if (user.verification?.status === "VERIFIED") redirect("/dashboard");

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
          Step 3 of 3
        </p>
        <h1 className="mt-1.5 text-2xl font-extrabold text-slate-900">
          Identity &amp; Lease Verification
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          To list your sublease, we need to verify your identity and confirm
          that your lease permits subleasing. All documents are encrypted at
          rest and only accessible to our admin team.
        </p>
      </div>

      {/* What to expect */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {[
          { icon: "🔒", label: "Encrypted storage" },
          { icon: "👤", label: "Admin review only" },
          { icon: "⏱️", label: "~24hr turnaround" },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </div>
        ))}
      </div>

      {user.verification?.status === "REJECTED" && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Previous submission rejected.</strong>
          {user.verification.adminNotes && (
            <span> Reason: {user.verification.adminNotes}</span>
          )}
          <span> Please upload new documents below.</span>
        </div>
      )}

      {/* Lease question — shown when not yet answered or can be re-answered before PENDING */}
      {user.verification?.status !== "VERIFIED" && (
        <LeaseQuestion />
      )}

      <DocumentUpload />
    </main>
  );
}
