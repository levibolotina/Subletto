import { redirect } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import ListingForm from "@/components/features/listing-form";

export default async function NewListingPage() {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) redirect("/sign-in");
  if (user.role !== "LISTER") redirect("/dashboard");
  if (!user.verifiedAt) redirect("/dashboard/verify");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Create a listing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Your address is kept private — only the neighborhood zone is shown publicly.
        </p>
      </div>
      <ListingForm />
    </main>
  );
}
