import { redirect } from "next/navigation";
import { prisma } from "@subletto/db";
import { AlertTriangle, CheckCircle } from "lucide-react";

interface Props {
  searchParams: { token?: string };
}

export default async function ConfirmListingPage({ searchParams }: Props) {
  const { token } = searchParams;

  if (!token) redirect("/dashboard/listings");

  const listing = await prisma.listing.findUnique({
    where: { confirmationToken: token },
  });

  if (!listing || listing.status !== "ACTIVE") {
    return (
      <main className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
            <AlertTriangle className="h-8 w-8 text-slate-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900">
            Link expired or invalid
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            This confirmation link is no longer valid. Check your dashboard to
            manage your listings.
          </p>
          <a
            href="/dashboard/listings"
            className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to dashboard
          </a>
        </div>
      </main>
    );
  }

  await prisma.listing.update({
    where: { id: listing.id },
    data: {
      confirmedAt: new Date(),
      confirmationToken: null,
      confirmationSentAt: null,
    },
  });

  return (
    <main className="flex min-h-[calc(100vh-60px)] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Listing confirmed
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          <strong>{listing.title}</strong> is still showing as active. We&apos;ll
          check in again in 7 days.
        </p>
        <a
          href="/dashboard/listings"
          className="mt-6 inline-block rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Back to dashboard
        </a>
      </div>
    </main>
  );
}
