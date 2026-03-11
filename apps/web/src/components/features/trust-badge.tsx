import { TRUSTED_BADGE_MIN_TRANSACTIONS } from "@subletto/shared";

interface TrustBadgeProps {
  trustScore: number;
  reviewCount: number;
  confirmedTransactions?: number;
  size?: "sm" | "md";
}

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={`h-3.5 w-3.5 ${filled ? "text-amber-400" : "text-slate-200"}`}
      fill="currentColor"
      viewBox="0 0 20 20"
      aria-hidden="true"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

export default function TrustBadge({
  trustScore,
  reviewCount,
  confirmedTransactions = 0,
  size = "md",
}: TrustBadgeProps) {
  const isTrusted = confirmedTransactions >= TRUSTED_BADGE_MIN_TRANSACTIONS;
  const isNew = reviewCount === 0;

  if (isNew) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
        New — No reviews yet
      </span>
    );
  }

  const rounded = Math.round(trustScore * 10) / 10;
  const stars = Math.round(rounded);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <StarIcon key={n} filled={n <= stars} />
        ))}
      </span>
      <span className={`font-semibold text-slate-800 ${size === "sm" ? "text-xs" : "text-sm"}`}>
        {rounded.toFixed(1)}
      </span>
      <span className={`text-slate-400 ${size === "sm" ? "text-xs" : "text-sm"}`}>
        ({reviewCount})
      </span>
      {isTrusted && (
        <span className="inline-flex items-center gap-0.5 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-semibold text-indigo-700">
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          Trusted
        </span>
      )}
    </span>
  );
}
