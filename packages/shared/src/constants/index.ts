export const SUBLETTO_FEE_PERCENT = 0.05; // 5% platform fee on first month's rent

// Connection fee charged to seeker to unlock lister identity ($99.00)
export const CONNECTION_FEE_CENTS = 9900;

// Platform fee on escrow transactions (2.5%)
export const ESCROW_PLATFORM_FEE_PERCENT = 0.025;

export const CU_EMAIL_DOMAIN = "colorado.edu";

// Any .edu domain is allowed to sign up; CU Boulder is the primary target
export const EDU_DOMAIN_SUFFIX = ".edu";

export const MAX_LISTING_PHOTOS = 8;

export const MIN_SUBLEASE_DAYS = 7;

export const SUPPORTED_CURRENCIES = ["usd"] as const;

// Supabase Storage bucket for verification documents
export const VERIFICATION_DOCS_BUCKET = "verification-docs";

// Supabase Storage bucket for listing photos
export const LISTING_PHOTOS_BUCKET = "listing-photos";

// Supabase Storage buckets for generated and signed legal documents
export const GENERATED_DOCS_BUCKET = "generated-documents";
export const SIGNED_DOCS_BUCKET = "signed-documents";

// Landlord approval packet add-on fee ($35.00)
export const LANDLORD_PACKET_FEE_CENTS = 3500;

// Max file sizes for verification uploads (bytes)
export const MAX_ID_DOC_SIZE = 10 * 1024 * 1024;   // 10 MB
export const MAX_LEASE_DOC_SIZE = 20 * 1024 * 1024; // 20 MB

// Max file size for listing photos (bytes)
export const MAX_LISTING_PHOTO_SIZE = 10 * 1024 * 1024; // 10 MB

export const ALLOWED_ID_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ALLOWED_LEASE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const ALLOWED_LISTING_PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

// 7-day availability confirmation
export const CONFIRMATION_INTERVAL_DAYS = 7;
export const CONFIRMATION_WINDOW_HOURS = 48;

// ─── TRUST & SCAM DETECTION ──────────────────────────────────────────────────

// Listings priced more than this % below neighborhood median are auto-flagged
export const SCAM_PRICE_THRESHOLD_PERCENT = 0.20;

// User accounts younger than this (ms) are treated as "new" for scam checks
export const SCAM_NEW_ACCOUNT_THRESHOLD_MS = 24 * 60 * 60 * 1000; // 24 hours

// Keywords in a listing description that suggest urgent/off-platform payment
export const SCAM_URGENT_KEYWORDS = [
  "western union",
  "wire transfer",
  "cash only",
  "urgent",
  "act fast",
  "zelle only",
  "cashapp only",
  "venmo only",
  "send money",
  "gift card",
];

// Number of pending CONFIRMED-match transactions needed for "Trusted" badge
export const TRUSTED_BADGE_MIN_TRANSACTIONS = 3;

// Number of pending reports against a user before auto-suspend
export const REPORT_AUTO_SUSPEND_COUNT = 3;

// Boulder neighborhoods (used for dropdown, never exposes address)
// ─── GROWTH / WAITLIST ────────────────────────────────────────────────────────

// How many waitlist positions a user moves up per successful referral
export const REFERRAL_BOOST_POSITIONS = 5;

// Target keywords for SEO (used as default meta keywords)
export const SEO_TARGET_KEYWORDS = [
  "CU Boulder sublease",
  "Boulder sublease summer",
  "CU Boulder sublet",
  "Boulder CO sublease",
  "University of Colorado sublease",
  "CU Boulder housing",
];

export const BOULDER_NEIGHBORHOODS = [
  "University Hill",
  "Chautauqua",
  "Martin Acres",
  "Newlands",
  "Mapleton Hill",
  "Table Mesa",
  "Gunbarrel",
  "Baseline",
  "East Boulder",
  "North Boulder",
  "South Boulder",
  "Downtown Boulder",
  "Whittier",
  "Goss-Grove",
  "Holiday",
  "Wonderland Hills",
  "Bear Creek",
  "Frasier Meadows",
  "Other",
] as const;

export type BoulderNeighborhood = (typeof BOULDER_NEIGHBORHOODS)[number];
