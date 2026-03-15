import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import { createAdminClient } from "@/lib/supabase";
import { VERIFICATION_DOCS_BUCKET } from "@subletto/shared";
import AdminReviewCard from "@/components/features/admin-review-card";
import { CheckCircle } from "lucide-react";

export default async function AdminVerifyPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const admin = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!admin || admin.role !== "ADMIN") redirect("/dashboard");

  const pending = await prisma.verification.findMany({
    where: { status: "PENDING" },
    include: {
      user: { select: { id: true, email: true, createdAt: true } },
    },
    orderBy: { submittedAt: "asc" },
  });

  const supabase = createAdminClient();

  const verificationsWithUrls = await Promise.all(
    pending.map(async (v) => {
      const [idUrlResult, leaseUrlResult] = await Promise.all([
        supabase.storage
          .from(VERIFICATION_DOCS_BUCKET)
          .createSignedUrl(v.idDocUrl, 3600),
        supabase.storage
          .from(VERIFICATION_DOCS_BUCKET)
          .createSignedUrl(v.leaseDocUrl, 3600),
      ]);
      return {
        ...v,
        idSignedUrl: idUrlResult.data?.signedUrl ?? null,
        leaseSignedUrl: leaseUrlResult.data?.signedUrl ?? null,
        listerLeaseAnswer: v.listerLeaseAnswer ?? null,
        leasePermission: v.leasePermission ?? null,
      };
    }),
  );

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-500">
            Admin
          </p>
          <h1 className="mt-0.5 text-2xl font-extrabold text-slate-900">
            Verification Queue
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {pending.length} pending review{pending.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      {verificationsWithUrls.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 py-20 text-center">
          <div className="flex justify-center"><CheckCircle className="h-8 w-8 text-green-500" /></div>
          <p className="mt-3 font-medium text-slate-600">
            All caught up — no pending verifications.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {verificationsWithUrls.map((v) => (
            <AdminReviewCard
              key={v.id}
              verification={v}
              user={v.user}
            />
          ))}
        </div>
      )}
    </main>
  );
}
