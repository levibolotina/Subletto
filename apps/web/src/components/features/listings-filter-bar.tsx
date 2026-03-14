"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const PRICE_OPTIONS = [
  { label: "Under $800", min: undefined, max: "80000" },
  { label: "$800 – $1,200", min: "80000", max: "120000" },
  { label: "$1,200 – $1,800", min: "120000", max: "180000" },
  { label: "$1,800+", min: "180000", max: undefined },
];

const BEDROOM_OPTIONS = [
  { label: "Studio", value: "0" },
  { label: "1 Bed", value: "1" },
  { label: "2 Beds", value: "2" },
  { label: "3 Beds", value: "3" },
  { label: "4+ Beds", value: "4" },
];

const NEIGHBORHOODS = [
  "The Hill",
  "University Hill",
  "Downtown",
  "Martin Acres",
  "Newlands",
  "Table Mesa",
  "Gunbarrel",
  "East Boulder",
  "North Boulder",
  "West Boulder",
];

interface ListingsFilterBarProps {
  count: number;
  currentParams: Record<string, string>;
}

export default function ListingsFilterBar({
  count,
  currentParams,
}: ListingsFilterBarProps) {
  const router = useRouter();
  const [openPill, setOpenPill] = useState<string | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (barRef.current && !barRef.current.contains(e.target as Node)) {
        setOpenPill(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function navigate(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(currentParams);
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) params.delete(key);
      else params.set(key, value);
    }
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
    setOpenPill(null);
  }

  const currentMin = currentParams.minRentCents;
  const currentMax = currentParams.maxRentCents;
  const currentBedrooms = currentParams.bedrooms;
  const currentNeighborhood = currentParams.neighborhood;

  const activePriceOption = PRICE_OPTIONS.find(
    (o) =>
      (o.min ?? "") === (currentMin ?? "") &&
      (o.max ?? "") === (currentMax ?? "")
  );

  const activeBedroom = BEDROOM_OPTIONS.find(
    (b) => b.value === currentBedrooms
  );

  return (
    <div
      ref={barRef}
      className="sticky top-16 z-20 border-b border-slate-200 bg-white py-4 px-6 flex items-center justify-between gap-4"
    >
      <div className="flex items-center gap-2 flex-wrap">
        {/* Price */}
        <Pill
          label={activePriceOption?.label ?? "Price"}
          active={!!activePriceOption}
          open={openPill === "price"}
          onToggle={() => setOpenPill(openPill === "price" ? null : "price")}
        >
          <div className="py-1">
            {activePriceOption && (
              <DropdownItem
                onClick={() =>
                  navigate({ minRentCents: undefined, maxRentCents: undefined })
                }
                muted
              >
                Any price
              </DropdownItem>
            )}
            {PRICE_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt.label}
                onClick={() =>
                  navigate({ minRentCents: opt.min, maxRentCents: opt.max })
                }
                active={activePriceOption?.label === opt.label}
              >
                {opt.label}
              </DropdownItem>
            ))}
          </div>
        </Pill>

        {/* Dates */}
        <Pill
          label="Dates"
          active={!!(currentParams.availableFrom || currentParams.availableTo)}
          open={openPill === "dates"}
          onToggle={() => setOpenPill(openPill === "dates" ? null : "dates")}
          width="w-64"
        >
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Available from
              </label>
              <input
                type="date"
                defaultValue={currentParams.availableFrom ?? ""}
                onChange={(e) =>
                  navigate({ availableFrom: e.target.value || undefined })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Available to
              </label>
              <input
                type="date"
                defaultValue={currentParams.availableTo ?? ""}
                onChange={(e) =>
                  navigate({ availableTo: e.target.value || undefined })
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>
        </Pill>

        {/* Bedrooms */}
        <Pill
          label={activeBedroom?.label ?? "Bedrooms"}
          active={currentBedrooms !== undefined}
          open={openPill === "bedrooms"}
          onToggle={() =>
            setOpenPill(openPill === "bedrooms" ? null : "bedrooms")
          }
          width="w-40"
        >
          <div className="py-1">
            {currentBedrooms !== undefined && (
              <DropdownItem
                onClick={() => navigate({ bedrooms: undefined })}
                muted
              >
                Any
              </DropdownItem>
            )}
            {BEDROOM_OPTIONS.map((opt) => (
              <DropdownItem
                key={opt.value}
                onClick={() => navigate({ bedrooms: opt.value })}
                active={currentBedrooms === opt.value}
              >
                {opt.label}
              </DropdownItem>
            ))}
          </div>
        </Pill>

        {/* Neighborhood */}
        <Pill
          label={currentNeighborhood ?? "Neighborhood"}
          active={!!currentNeighborhood}
          open={openPill === "neighborhood"}
          onToggle={() =>
            setOpenPill(openPill === "neighborhood" ? null : "neighborhood")
          }
          width="w-52"
        >
          <div className="py-1 max-h-60 overflow-y-auto">
            {currentNeighborhood && (
              <DropdownItem
                onClick={() => navigate({ neighborhood: undefined })}
                muted
              >
                Any neighborhood
              </DropdownItem>
            )}
            {NEIGHBORHOODS.map((n) => (
              <DropdownItem
                key={n}
                onClick={() => navigate({ neighborhood: n })}
                active={currentNeighborhood === n}
              >
                {n}
              </DropdownItem>
            ))}
          </div>
        </Pill>
      </div>

      <span className="shrink-0 text-sm text-gray-500">
        {count} listing{count !== 1 ? "s" : ""} found
      </span>
    </div>
  );
}

function Pill({
  label,
  active,
  open,
  onToggle,
  width = "w-48",
  children,
}: {
  label: string;
  active: boolean;
  open: boolean;
  onToggle: () => void;
  width?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className={`inline-flex items-center gap-1 rounded-full border px-4 py-1.5 text-sm font-medium transition ${
          active
            ? "border-indigo-600 bg-indigo-50 text-indigo-700"
            : "border-slate-300 text-slate-700 hover:border-slate-400 bg-white"
        }`}
      >
        {label}
        <svg
          className={`w-3 h-3 opacity-50 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {open && (
        <div
          className={`absolute left-0 top-full mt-1.5 z-30 ${width} rounded-2xl border border-slate-200 bg-white shadow-xl`}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function DropdownItem({
  children,
  onClick,
  active,
  muted,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  muted?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-2 text-left text-sm transition hover:bg-slate-50 ${
        active
          ? "font-semibold text-indigo-600"
          : muted
            ? "text-slate-400"
            : "text-slate-700"
      }`}
    >
      {children}
    </button>
  );
}
