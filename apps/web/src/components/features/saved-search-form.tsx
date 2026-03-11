"use client";

import { useState } from "react";
import { BOULDER_NEIGHBORHOODS } from "@subletto/shared";
import Button from "@/components/ui/button";

interface Props {
  initialFilters?: Record<string, string>;
  onCreated?: () => void;
}

export default function SavedSearchForm({ initialFilters = {}, onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const fd = new FormData(e.currentTarget);

    const body = {
      neighborhood: fd.get("neighborhood") || undefined,
      minRentCents: fd.get("minRent") ? Number(fd.get("minRent")) * 100 : undefined,
      maxRentCents: fd.get("maxRent") ? Number(fd.get("maxRent")) * 100 : undefined,
      availableFrom: fd.get("availableFrom") ? `${fd.get("availableFrom")}T00:00:00.000Z` : undefined,
      availableTo: fd.get("availableTo") ? `${fd.get("availableTo")}T00:00:00.000Z` : undefined,
      bedrooms: fd.get("bedrooms") ? Number(fd.get("bedrooms")) : undefined,
      petFriendly: fd.get("petFriendly") === "on" ? true : undefined,
      furnished: fd.get("furnished") === "on" ? true : undefined,
    };

    try {
      const res = await fetch(`${API_URL}/v1/saved-searches`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save search");
      }
      setSuccess(true);
      setOpen(false);
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
        Search saved — we&apos;ll email you when a new match appears.
      </p>
    );
  }

  return (
    <div>
      {!open ? (
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Save this search
        </Button>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-5 space-y-4"
        >
          <h3 className="font-semibold">Save search alert</h3>
          <p className="text-sm text-gray-500">
            We&apos;ll email you whenever a new listing matches these criteria.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Neighborhood</label>
              <select
                name="neighborhood"
                defaultValue={initialFilters.neighborhood ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Any</option>
                {BOULDER_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Min rent ($)</label>
              <input
                type="number"
                name="minRent"
                min={0}
                defaultValue={initialFilters.minRentCents ? String(Number(initialFilters.minRentCents) / 100) : ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Max rent ($)</label>
              <input
                type="number"
                name="maxRent"
                min={0}
                defaultValue={initialFilters.maxRentCents ? String(Number(initialFilters.maxRentCents) / 100) : ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Bedrooms</label>
              <select
                name="bedrooms"
                defaultValue={initialFilters.bedrooms ?? ""}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              >
                <option value="">Any</option>
                {[0, 1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={String(n)}>{n === 0 ? "Studio" : `${n} BR`}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="petFriendly" className="h-4 w-4 accent-black" />
                Pet-friendly
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" name="furnished" className="h-4 w-4 accent-black" />
                Furnished
              </label>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3">
            <Button type="submit" loading={loading}>Save alert</Button>
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
