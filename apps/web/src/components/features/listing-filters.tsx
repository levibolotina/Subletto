"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { BOULDER_NEIGHBORHOODS } from "@subletto/shared";

function FilterForm({
  onDone,
}: {
  onDone?: () => void;
}) {
  const router = useRouter();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.set("page", "1");
      router.push(`/listings?${next.toString()}`);
    },
    [params, router],
  );

  const clear = useCallback(() => {
    router.push("/listings");
    onDone?.();
  }, [router, onDone]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Filters</h2>
        <button
          onClick={clear}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
        >
          Clear all
        </button>
      </div>

      {/* Neighborhood */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Neighborhood
        </label>
        <select
          value={params.get("neighborhood") ?? ""}
          onChange={(e) => update("neighborhood", e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Any</option>
          {BOULDER_NEIGHBORHOODS.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      {/* Price range */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Monthly rent (USD)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Min"
            min={0}
            value={
              params.get("minRentCents")
                ? String(Number(params.get("minRentCents")) / 100)
                : ""
            }
            onChange={(e) =>
              update(
                "minRentCents",
                e.target.value ? String(Number(e.target.value) * 100) : "",
              )
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            placeholder="Max"
            min={0}
            value={
              params.get("maxRentCents")
                ? String(Number(params.get("maxRentCents")) / 100)
                : ""
            }
            onChange={(e) =>
              update(
                "maxRentCents",
                e.target.value ? String(Number(e.target.value) * 100) : "",
              )
            }
            className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Bedrooms
        </label>
        <select
          value={params.get("bedrooms") ?? ""}
          onChange={(e) => update("bedrooms", e.target.value)}
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Any</option>
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={String(n)}>
              {n === 0 ? "Studio" : `${n} BR`}
            </option>
          ))}
        </select>
      </div>

      {/* Date range */}
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Available from
        </label>
        <input
          type="date"
          value={params.get("availableFrom")?.slice(0, 10) ?? ""}
          onChange={(e) =>
            update(
              "availableFrom",
              e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
            )
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">
          Available until
        </label>
        <input
          type="date"
          value={params.get("availableTo")?.slice(0, 10) ?? ""}
          onChange={(e) =>
            update(
              "availableTo",
              e.target.value ? `${e.target.value}T00:00:00.000Z` : "",
            )
          }
          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Toggles */}
      <div className="space-y-2.5">
        {[
          { key: "petFriendly", label: "Pet-friendly" },
          { key: "furnished", label: "Furnished" },
        ].map(({ key, label }) => (
          <label
            key={key}
            className="flex cursor-pointer items-center gap-2.5 text-sm"
          >
            <input
              type="checkbox"
              checked={params.get(key) === "true"}
              onChange={(e) => update(key, e.target.checked ? "true" : "")}
              className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
            />
            <span className="text-slate-700">{label}</span>
          </label>
        ))}
      </div>

      {onDone && (
        <button
          onClick={onDone}
          className="mt-2 w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-700"
        >
          Show results
        </button>
      )}
    </div>
  );
}

/** Desktop sidebar */
export function ListingFiltersSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <FilterForm />
      </div>
    </aside>
  );
}

/** Mobile bottom-sheet trigger + sheet */
export default function ListingFilters() {
  const [open, setOpen] = useState(false);
  const params = useSearchParams();
  const activeCount = [
    params.get("neighborhood"),
    params.get("minRentCents"),
    params.get("maxRentCents"),
    params.get("bedrooms"),
    params.get("availableFrom"),
    params.get("availableTo"),
    params.get("petFriendly"),
    params.get("furnished"),
  ].filter(Boolean).length;

  return (
    <>
      {/* Mobile trigger */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
            />
          </svg>
          Filters
          {activeCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop sidebar */}
      <ListingFiltersSidebar />

      {/* Mobile bottom sheet */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          {/* Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-50 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl">
            {/* Drag handle */}
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-300" />
            <FilterForm onDone={() => setOpen(false)} />
          </div>
        </>
      )}
    </>
  );
}
