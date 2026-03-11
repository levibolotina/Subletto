import { redirect, notFound } from "next/navigation";
import { currentUser } from "@/lib/clerk";
import { prisma } from "@subletto/db";
import ListingForm from "@/components/features/listing-form";

interface Props {
  params: { id: string };
}

export default async function EditListingPage({ params }: Props) {
  const clerkUser = await currentUser();
  if (!clerkUser) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
  if (!user) redirect("/sign-in");
  if (user.role !== "LISTER") redirect("/dashboard");

  const listing = await prisma.listing.findUnique({ where: { id: params.id } });
  if (!listing || listing.ownerId !== user.id) notFound();
  if (!["DRAFT", "ACTIVE"].includes(listing.status)) redirect("/dashboard/listings");

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Edit listing</h1>
        <p className="mt-1 text-sm text-gray-500">
          Changes will take effect immediately for ACTIVE listings.
        </p>
      </div>
      <ListingForm
        listingId={listing.id}
        defaultValues={{
          title: listing.title,
          description: listing.description ?? undefined,
          neighborhood: listing.neighborhood,
          bedrooms: listing.bedrooms,
          bathrooms: listing.bathrooms,
          furnished: listing.furnished,
          petFriendly: listing.petFriendly,
          parking: listing.parking,
          rentCents: listing.rentCents,
          availableFrom: listing.availableFrom.toISOString(),
          availableTo: listing.availableTo.toISOString(),
          address: listing.address,
          zipCode: listing.zipCode,
        }}
      />
    </main>
  );
}
