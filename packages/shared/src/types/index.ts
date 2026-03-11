// Domain types — all shared across web and api
// Do not import from @subletto/db here; keep this layer DB-agnostic.

export type UserRole = "LISTER" | "SEEKER" | "ADMIN";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export type ListingStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "MATCHED"
  | "EXPIRED"
  | "LEASED"
  | "ARCHIVED";

export type LeaseStatus = "PENDING" | "ACTIVE" | "COMPLETED" | "DISPUTED" | "CANCELLED";

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VerificationSubmission {
  idDocPath: string;
  leaseDocPath: string;
}

export interface VerificationReview {
  status: "VERIFIED" | "REJECTED";
  subleasePermitted?: boolean;
  adminNotes?: string;
}

export interface AuthStatusResponse {
  userId: string;
  email: string;
  role: UserRole;
  verificationStatus: VerificationStatus | null;
  verifiedAt: string | null;
  trustScore: number;
}

// ─── LISTINGS ────────────────────────────────────────────────────────────────

export interface ListingCreateInput {
  title: string;
  description?: string;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  petFriendly: boolean;
  parking: boolean;
  rentCents: number;
  availableFrom: string; // ISO date
  availableTo: string;   // ISO date
  // address fields — stored in DB, never exposed publicly
  address: string;
  zipCode: string;
}

export interface ListingUpdateInput extends Partial<ListingCreateInput> {}

/** The shape returned for public-facing listing views — no address, name, or contact info. */
export interface ListingPublicView {
  id: string;
  slug: string;
  status: ListingStatus;
  title: string;
  description: string | null;
  neighborhood: string;
  bedrooms: number;
  bathrooms: number;
  furnished: boolean;
  petFriendly: boolean;
  parking: boolean;
  rentCents: number;
  availableFrom: string;
  availableTo: string;
  ownerVerified: boolean;
  ownerTrustScore: number;
  ownerReviewCount: number;
  isFlagged: boolean;
  photos: { storageKey: string; order: number; isPrimary: boolean }[];
  createdAt: string;
}

export interface SearchFilters {
  neighborhood?: string;
  minRentCents?: number;
  maxRentCents?: number;
  availableFrom?: string;
  availableTo?: string;
  bedrooms?: number;
  petFriendly?: boolean;
  furnished?: boolean;
  page?: number;
  pageSize?: number;
}

// ─── MATCHES ─────────────────────────────────────────────────────────────────

export type MatchStatus =
  | "PENDING_PAYMENT"
  | "AWAITING_LISTER"
  | "CONFIRMED"
  | "DECLINED"
  | "CANCELLED";

export type EscrowStatus = "NONE" | "PENDING_PAYMENT" | "HELD" | "RELEASED" | "REFUNDED";

export type PaymentType = "CONNECTION_FEE" | "ESCROW_RENT" | "ESCROW_DEPOSIT";

export type PaymentStatus = "PENDING" | "SUCCEEDED" | "REFUNDED" | "FAILED";

export interface MatchSummary {
  id: string;
  listingId: string;
  listingTitle: string;
  listingSlug: string;
  status: MatchStatus;
  escrowStatus: EscrowStatus;
  feePaidAt: string | null;
  revealedAt: string | null;
  createdAt: string;
}

export interface MatchDetail extends MatchSummary {
  /** Populated only after CONFIRMED */
  listerContact: { email: string } | null;
  /** Populated for lister only when AWAITING_LISTER or after */
  subtenantContact: { email: string } | null;
  escrowAmountCents: number | null;
}

// ─── TRUST & REVIEWS ─────────────────────────────────────────────────────────

export type ReviewRole = "LISTER_REVIEWS_SUBTENANT" | "SUBTENANT_REVIEWS_LISTER";
export type ReportCategory = "SCAM" | "WRONG_INFO" | "INAPPROPRIATE";
export type ReportStatus = "PENDING" | "REVIEWED" | "DISMISSED";
export type ScamFlagReason = "PRICE_TOO_LOW" | "NEW_ACCOUNT_URGENT" | "REPORTED_SCAM";

export interface TrustSummary {
  trustScore: number;      // rolling average, 0 if no reviews
  reviewCount: number;
  isTrusted: boolean;      // 3+ confirmed transactions
  isNew: boolean;          // 0 reviews
}

export interface ReviewSummary {
  id: string;
  role: ReviewRole;
  overallScore: number;
  comment: string | null;
  createdAt: string;
}

export interface SavedSearchInput {
  neighborhood?: string;
  minRentCents?: number;
  maxRentCents?: number;
  availableFrom?: string;
  availableTo?: string;
  bedrooms?: number;
  petFriendly?: boolean;
  furnished?: boolean;
}
