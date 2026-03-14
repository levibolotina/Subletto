import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import VerifyForm from "@/components/features/verify-form";

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

  const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";

  return (
    <div className="bg-gray-50 min-h-screen">
      <main className="mx-auto max-w-2xl px-4 py-12">
        {user.verification?.status === "REJECTED" && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <strong>Previous submission rejected.</strong>
            {user.verification.adminNotes && (
              <span> Reason: {user.verification.adminNotes}</span>
            )}
            <span> Please upload new documents below.</span>
          </div>
        )}
        <VerifyForm email={email} />
      </main>
    </div>
  );
}
