"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { BOULDER_NEIGHBORHOODS } from "@subletto/shared";
import Button from "@/components/ui/button";
import PhotoUpload from "./photo-upload";

interface UploadedPhoto {
  storageKey: string;
  isPrimary: boolean;
}

interface ListingFormProps {
  /** When provided, the form PATCHes an existing listing; otherwise POSTs a new one. */
  listingId?: string;
  defaultValues?: {
    title?: string;
    description?: string;
    neighborhood?: string;
    bedrooms?: number;
    bathrooms?: number;
    furnished?: boolean;
    petFriendly?: boolean;
    parking?: boolean;
    rentCents?: number;
    availableFrom?: string;
    availableTo?: string;
    address?: string;
    zipCode?: string;
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function ListingForm({ listingId, defaultValues = {} }: ListingFormProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!listingId;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const fd = new FormData(e.currentTarget);

    const body = {
      title: fd.get("title") as string,
      description: (fd.get("description") as string) || undefined,
      neighborhood: fd.get("neighborhood") as string,
      bedrooms: Number(fd.get("bedrooms")),
      bathrooms: Number(fd.get("bathrooms")),
      furnished: fd.get("furnished") === "on",
      petFriendly: fd.get("petFriendly") === "on",
      parking: fd.get("parking") === "on",
      rentCents: Math.round(Number(fd.get("rent")) * 100),
      availableFrom: `${fd.get("availableFrom")}T00:00:00.000Z`,
      availableTo: `${fd.get("availableTo")}T00:00:00.000Z`,
      address: fd.get("address") as string,
      zipCode: fd.get("zipCode") as string,
    };

    try {
      const token = await getToken();
      // Create or update the listing
      const res = await fetch(
        isEdit ? `${API_URL}/v1/listings/${listingId}` : `${API_URL}/v1/listings`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Save failed");
      }

      const { listing } = await res.json();
      const targetId = listing.id as string;

      // Register uploaded photos
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]!;
        await fetch(`${API_URL}/v1/listings/${targetId}/photos`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            storageKey: photo.storageKey,
            order: i,
            isPrimary: photo.isPrimary,
          }),
        });
      }

      router.push("/dashboard/listings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Listing title</label>
        <input
          type="text"
          name="title"
          required
          maxLength={120}
          defaultValue={defaultValues.title}
          placeholder="e.g. Bright 2BR near University Hill"
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Neighborhood */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Neighborhood <span className="text-red-500">*</span>
        </label>
        <select
          name="neighborhood"
          required
          defaultValue={defaultValues.neighborhood ?? ""}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select neighborhood</option>
          {BOULDER_NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Your exact address is never shown to seekers until after payment.
        </p>
      </div>

      {/* Bed / Bath */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bedrooms</label>
          <select
            name="bedrooms"
            required
            defaultValue={String(defaultValues.bedrooms ?? "")}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select</option>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={String(n)}>{n === 0 ? "Studio" : `${n} BD`}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Bathrooms</label>
          <select
            name="bathrooms"
            required
            defaultValue={String(defaultValues.bathrooms ?? "")}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select</option>
            {[1, 1.5, 2, 2.5, 3, 3.5, 4].map((n) => (
              <option key={n} value={String(n)}>{n} BA</option>
            ))}
          </select>
        </div>
      </div>

      {/* Rent */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Monthly rent (USD)</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
          <input
            type="number"
            name="rent"
            required
            min={1}
            step={1}
            defaultValue={defaultValues.rentCents ? String(defaultValues.rentCents / 100) : ""}
            placeholder="1500"
            className="w-full rounded-xl border border-slate-300 py-2 pl-7 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Available from</label>
          <input
            type="date"
            name="availableFrom"
            required
            defaultValue={defaultValues.availableFrom?.slice(0, 10)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Available until</label>
          <input
            type="date"
            name="availableTo"
            required
            defaultValue={defaultValues.availableTo?.slice(0, 10)}
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Amenities */}
      <div>
        <p className="block text-sm font-medium text-gray-700 mb-2">Amenities</p>
        <div className="flex flex-wrap gap-4">
          {[
            { name: "furnished", label: "Furnished" },
            { name: "petFriendly", label: "Pet-friendly" },
            { name: "parking", label: "Parking included" },
          ].map(({ name, label }) => (
            <label key={name} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                name={name}
                defaultChecked={!!defaultValues[name as keyof typeof defaultValues]}
                className="h-4 w-4 accent-indigo-600"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Description (optional)</label>
        <textarea
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={defaultValues.description}
          placeholder="Describe the space, building, and what makes it great for a sublease..."
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Address (private — never shown to seekers) */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-700 mb-3">
          Private — visible only after payment
        </p>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Street address</label>
            <input
              type="text"
              name="address"
              required
              defaultValue={defaultValues.address}
              placeholder="123 College Ave"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">ZIP code</label>
            <input
              type="text"
              name="zipCode"
              required
              maxLength={5}
              pattern="\d{5}"
              defaultValue={defaultValues.zipCode}
              placeholder="80302"
              className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Photos */}
      {!isEdit && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Photos (up to 8)</label>
          <PhotoUpload
            listingId={listingId ?? "draft"}
            onPhotosChange={setPhotos}
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" loading={loading}>
          {isEdit ? "Save changes" : "Create listing"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
