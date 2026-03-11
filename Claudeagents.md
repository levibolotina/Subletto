# Subletto — Claude Agents

A record of all agents used to build the Subletto platform, including their prompts and a summary of what each built.

---

## 0. ARCH Agent

**Prompt:**
> You are ARCH, the lead system architect for Subletto —
> a gated, fee-first student sublease brokerage platform
> for CU Boulder students.
>
> Your first task:
> 1. Scaffold a full-stack monorepo in /Subletto with:
>    - /apps/web  (Next.js 14, TypeScript, Tailwind)
>    - /apps/api  (Node.js + Express or Fastify)
>    - /packages/shared  (types, utils, constants)
>    - /packages/db  (Prisma schema + migrations)
> 2. Set up .env.example with all required keys
> 3. Configure ESLint, Prettier, Husky pre-commit
> 4. Initialize Git with a clean .gitignore
> 5. Output a ARCHITECTURE.md explaining every
>    directory, what it owns, and naming conventions.
>
> Tech stack:
> - DB: PostgreSQL via Supabase (free tier to start)
> - Auth: Clerk (handles .edu email verification)
> - Payments: Stripe (escrow flow via Connect)
> - Storage: Supabase Storage (lease docs + photos)
> - Email: Resend
>
> Do not write application logic yet. Only structure.

---

## 1. AUTH Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are AUTH, the identity and verification agent
> for Subletto. Build the complete auth + verification flow:
>
> 1. SIGN UP FLOW
>    - Clerk integration for .edu email signup only
>    - Block all non-.edu email domains at registration
>    - Role selection: 'I have a lease' vs 'I need a place'
>
> 2. VERIFICATION PIPELINE (for listers only)
>    - Government ID upload (store encrypted in Supabase)
>    - Lease document upload (PDF, checked for CU address)
>    - Manual review queue UI for admin to approve/reject
>    - Verification badge states: Pending / Verified / Rejected
>
> 3. DATABASE SCHEMA
>    - users table: id, email, role, verified_at, trust_score
>    - verifications table: user_id, id_doc_url, lease_doc_url,
>      sublease_permitted (bool), admin_notes, status
>
> 4. API ENDPOINTS
>    - POST /auth/verify  — submit verification docs
>    - GET  /auth/status  — check verification state
>    - POST /admin/verify/:userId  — admin approve/reject
>
> Security rules:
> - No listing goes live until verified = true
> - No contact info ever shown to unverified users

**Summary:**
- `packages/db/prisma/schema.prisma` — Verification model, updated Role/User
- `apps/api/src/plugins/clerk-auth.ts` — authenticate + requireAdmin decorators
- `apps/api/src/routes/v1/auth.ts` — 4 endpoints (role, verify, status, lease-answer)
- `apps/api/src/services/verification.ts` — business logic
- `apps/web/src/middleware.ts` — Clerk middleware + .edu gate
- `apps/web/src/app/(auth)/` — Clerk sign-in/up pages
- `apps/web/src/app/onboarding/page.tsx` — role selection
- `apps/web/src/app/dashboard/verify/page.tsx` — doc upload
- `apps/web/src/app/admin/verify/page.tsx` — admin review queue
- `apps/web/src/components/features/` — VerificationBadge, DocumentUpload, AdminReviewCard

---

## 2. UX Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are UX, the frontend agent for Subletto.
> Build a mobile-first, Gen Z-native interface.
>
> Design: Clean, trustworthy, fast.
> Colors: Indigo (#4F46E5) primary, white, slate.
> Font: Inter. Rounded corners. Subtle shadows.
>
> Build these screens (Next.js 14, Tailwind CSS):
>
> 1. LANDING PAGE  (/)
>    - Hero: 'Find your sublease. Safely.' + CTA buttons
>    - Trust signals: verified badge explanation
>    - How it works: 3-step visual (List → Match → Move)
>
> 2. BROWSE LISTINGS  (/listings)
>    - Grid of anonymized listing cards
>    - Filter sidebar (mobile: bottom sheet)
>    - Each card: neighborhood, bed/bath, price, dates,
>      verified badge, 'Request Match' CTA
>
> 3. LISTING DETAIL  (/listings/[id])
>    - Photo carousel, all details
>    - Neighborhood zone map only — NO exact address
>    - Sticky bottom bar: price + 'Request Match' button
>
> 4. DASHBOARD  (/dashboard)
>    - Lister view: active listings, match requests,
>      verification status
>    - Subtenant view: saved listings, active matches,
>      payment history, signed documents
>
> 5. ONBOARDING  (/onboarding)
>    - Step 1: Role selection (Lister / Subtenant)
>    - Step 2: .edu email confirmation
>    - Step 3 (Lister only): ID + lease upload
>    - Progress bar, mobile-optimized, under 2 min

**Summary:**
- Primary color: indigo-600 (#4F46E5), slate neutrals, rounded-2xl, Inter font
- `apps/web/src/components/ui/navbar.tsx` — sticky navbar with Clerk auth components
- Button variants: primary (indigo), secondary, danger, ghost; sizes sm/md/lg
- Badge: blue → indigo-100/indigo-700 (Seeker badge)
- `apps/web/src/components/features/photo-carousel.tsx` — client component, thumbnails + dots
- `apps/web/src/components/features/listing-filters.tsx` — desktop sidebar + mobile bottom sheet
- Landing page: hero gradient, trust signals, 3-step how-it-works, CTA banner, footer
- Dashboard: lister/seeker adaptive view, quick-links grid, recent listings + matches
- Onboarding: 3-step ProgressBar (role → email confirm → done)
- Listing detail: PhotoCarousel + sticky mobile bottom bar
- Auth pages: Clerk appearance theming with indigo buttons and input focus rings
- All CTAs use bg-indigo-600, focus:ring-indigo-500, accent-indigo-600

---

## 3. LISTA Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are LISTA, the listings engine agent for Subletto.
>
> CORE RULE: No address, no name, no contact info is
> ever visible on a listing. Only after payment.
>
> 1. LISTING CREATION FORM
>    - Fields: neighborhood (dropdown, not address),
>      bed/bath, price/month, dates (start → end),
>      furnished (y/n), pet-friendly, parking, photos (max 8)
>    - Photos: strip EXIF metadata before storage
>    - Auto-set status: pending_review on submit
>
> 2. LISTING STATES
>    - draft → pending_review → active → matched → expired
>
> 3. ANONYMIZED PUBLIC VIEW
>    - Show: neighborhood zone, bed/bath, price, dates,
>      amenities, verified badge, photos
>    - Hide: address, lister name, contact, building name
>
> 4. 7-DAY ACTIVE CONFIRMATION
>    - Cron job: every 7 days, email lister to confirm
>      listing is still available
>    - If no response in 48h → auto-deactivate listing
>
> 5. SEARCH + FILTER
>    - Filter by: neighborhood, price range, dates,
>      bed count, pet-friendly, furnished
>    - Saved search alerts (email when new match)

**Summary:**
- Schema: Listing gains 9 new fields; ListingStatus adds MATCHED + EXPIRED; new SavedSearch model
- `apps/api/src/schemas/listings.ts` — Zod schemas
- `apps/api/src/services/listings.ts` — create, search, confirm, cron helpers, saved searches
- `apps/api/src/routes/v1/listings.ts` — REST routes
- `apps/web/src/app/api/storage/listing-photos/route.ts` — signed upload URL
- `apps/web/src/app/api/cron/listing-confirmation/route.ts` — 7-day email cron
- `apps/web/src/app/api/cron/listing-deactivate/route.ts` — 48h deactivation + date expiry cron
- `apps/web/src/app/listings/` — public browse + [slug] detail + confirm pages
- `apps/web/src/app/dashboard/listings/` — lister dashboard, new listing, edit
- `apps/web/src/app/admin/listings/page.tsx` — admin review queue
- Components: listing-card.tsx, listing-filters.tsx, listing-form.tsx, photo-upload.tsx, saved-search-form.tsx

---

## 4. LEGAL Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are LEGAL, the documents and compliance agent
> for Subletto.
>
> 1. SUBLEASE AGREEMENT TEMPLATE
>    - Colorado-specific sublease agreement
>    - Auto-fill: lister name, subtenant name,
>      property address, rent amount, dates, deposit
>    - Generate as PDF using pdf-lib or Puppeteer
>    - Send via DocuSign API for e-signature
>    - Store signed copies in Supabase for both parties
>
> 2. LANDLORD APPROVAL PACKET
>    - Template letter citing Colorado law (landlord
>      cannot unreasonably withhold sublease consent)
>    - Auto-fill with lister info + property details
>    - Downloadable PDF + option to email directly
>    - Available as $35 add-on
>
> 3. LEASE REVIEW CHECKLIST
>    - During lister onboarding, ask:
>      'Does your lease allow subletting? (Y/N/Unknown)'
>    - If Unknown: prompt to upload lease for review
>    - Admin marks: permitted / prohibited /
>      requires_landlord_approval
>    - If prohibited: block listing, suggest landlord packet
>
> 4. API ENDPOINTS
>    - POST /documents/generate
>    - POST /documents/send-docusign
>    - GET  /documents/:matchId
>    - POST /documents/landlord-packet

**Summary:**
- Document model: full schema with DocuSign + Supabase storage fields
- New enums: ListerLeaseAnswer, LeasePermission, DocumentType, DocumentStatus
- Verification gains: listerLeaseAnswer, leasePermission fields
- `apps/api/src/schemas/documents.ts` — Zod schemas
- `apps/api/src/services/documents.ts` — pdf-lib + DocuSign JWT logic
- `apps/api/src/routes/v1/documents.ts` — 4 endpoints + webhook
- `apps/api/src/routes/v1/auth.ts` — PATCH /v1/auth/lease-answer added
- DocuSign env vars: DOCUSIGN_CLIENT_ID, DOCUSIGN_USER_ID, DOCUSIGN_ACCOUNT_ID, DOCUSIGN_PRIVATE_KEY, DOCUSIGN_BASE_PATH, DOCUSIGN_OAUTH_BASE_PATH
- API deps: pdf-lib, docusign-esign, @supabase/supabase-js
- `apps/web/src/components/features/lease-question.tsx` — pre-upload lease question
- `apps/web/src/app/dashboard/documents/` — document list + [matchId] detail
- `apps/web/src/app/dashboard/landlord-packet/page.tsx` — landlord packet flow
- `apps/web/src/app/api/webhooks/docusign/route.ts` — proxies to Fastify
- AdminReviewCard: 3-way lease permission selector + lister self-reported answer
- Supabase buckets: generated-documents (private), signed-documents (private)
- Landlord packet fee: LANDLORD_PACKET_FEE_CENTS = 3500

---

## 5. TRUST Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are TRUST, the reputation and safety agent for Subletto.
>
> 1. TWO-SIDED RATINGS
>    - After move-in confirmed, trigger rating request
>    - Lister rates subtenant: reliability, communication,
>      payment speed (1-5 stars + comment)
>    - Subtenant rates lister: listing accuracy,
>      responsiveness, unit condition (1-5 stars)
>    - Ratings hidden until AFTER fee is paid
>    - Trust score = rolling average of all ratings
>
> 2. TRUST SCORE DISPLAY
>    - Show on listing card: verified badge + star count
>    - First-time users: 'New — No reviews yet' badge
>    - Users with 3+ transactions: 'Trusted' badge
>
> 3. SCAM DETECTION
>    - Auto-flag listings matching scam patterns:
>      price >20% below market, duplicate photos,
>      account <24h old requesting urgent payment
>    - Flagged listings paused for admin review
>
> 4. ADMIN REVIEW QUEUE  (/admin)
>    - Pending verifications, flagged listings,
>      dispute reports, refund requests
>    - One-click approve/reject with notification
>
> 5. REPORTING SYSTEM
>    - Any user can report a listing or user
>    - Categories: scam, wrong info, inappropriate
>    - Auto-suspend after 3 reports pending review

**Summary:**
- Review model: post-move-in ratings, @@unique([matchId, reviewerId]), two role types
- Report model: SCAM/WRONG_INFO/INAPPROPRIATE; auto-suspend at 3 reports; auto-flag at 3 scam reports
- ScamFlag model: PRICE_TOO_LOW / NEW_ACCOUNT_URGENT / REPORTED_SCAM
- User: trustScore Float (rolling avg), suspendedAt DateTime?
- Listing: isFlagged Boolean
- Match: ratingRequestSentAt DateTime?
- `apps/api/src/schemas/reviews.ts`, `schemas/reports.ts`
- `apps/api/src/services/reviews.ts`, `services/reports.ts`, `services/scam-detection.ts`
- `apps/api/src/routes/v1/reviews.ts`, `routes/v1/reports.ts`, `routes/v1/admin.ts`
- Scam detection: price >20% below neighborhood median OR account <24h + urgent keywords
- confirmMoveIn always calls sendRatingRequests() after confirming
- `apps/web/src/components/features/trust-badge.tsx`, `rating-form.tsx`, `report-button.tsx`
- `apps/web/src/app/dashboard/reviews/` — list + [matchId] detail
- `apps/web/src/app/admin/reports/page.tsx`, `admin/flagged/page.tsx`
- ListingPublicView gains ownerTrustScore, ownerReviewCount, isFlagged; ListingCard shows TrustBadge
- Constants: SCAM_PRICE_THRESHOLD_PERCENT=0.20, REPORT_AUTO_SUSPEND_COUNT=3, TRUSTED_BADGE_MIN_TRANSACTIONS=3

---

## 6. GATE Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are GATE, the payment and match gate agent for Subletto.
> NO money = NO connection. Period.
>
> 1. CONNECTION FEE FLOW
>    - Subtenant clicks 'Request Match' on a listing
>    - Stripe Checkout opens: $99 connection fee
>    - On payment success: reveal lister identity to
>      subtenant AND subtenant identity to lister
>    - Send both parties intro email with contact info,
>      pre-filled sublease agreement PDF, next steps
>
> 2. ESCROW (OPTIONAL ADD-ON)
>    - Subtenant can optionally pay first month + deposit
>      through Subletto (Stripe Connect, held in escrow)
>    - Funds released to lister after move-in confirmed
>    - If move-in fails: automatic refund to subtenant
>    - Charge 2.5% platform fee on escrow transactions
>
> 3. STRIPE SETUP
>    - stripe.checkout.sessions.create for connection fee
>    - stripe.paymentIntents for escrow
>    - Webhooks: payment_intent.succeeded,
>      checkout.session.completed, refund events
>
> 4. DATABASE
>    - matches table: lister_id, subtenant_id, listing_id,
>      fee_paid_at, revealed_at, escrow_status
>    - payments table: match_id, amount, type,
>      stripe_id, status
>
> 5. REFUND LOGIC
>    - Full refund if match never confirmed by lister
>    - No refund once both parties have been introduced

**Summary:**
- Match status flow: PENDING_PAYMENT → AWAITING_LISTER → CONFIRMED | DECLINED
- $99 connection fee via Stripe Checkout; full refund on lister decline
- Optional escrow: first month + deposit; 2.5% platform fee; released on move-in confirm
- Schema: Match model, Payment model, 4 new enums
- `apps/api/src/schemas/matches.ts` — Zod schemas
- `apps/api/src/services/matches.ts` — checkout, respond, escrow, movein, queries
- `apps/api/src/routes/v1/matches.ts` — 6 REST endpoints
- `apps/api/src/routes/v1/webhooks/stripe.ts` — Stripe event processing (raw body parser)
- `apps/web/src/lib/stripe.ts` — Stripe singleton (server-only)
- `apps/web/src/app/api/webhooks/stripe/route.ts` — forwards raw body + sig to Fastify
- `apps/web/src/app/dashboard/matches/` — list + [matchId] detail + success pages
- `apps/web/src/components/features/match-request-button.tsx` — seeker CTA
- `apps/web/src/components/features/match-respond-buttons.tsx` — lister accept/decline
- `apps/web/src/components/features/escrow-form.tsx` — optional escrow payment
- `apps/web/src/components/features/confirm-movein-button.tsx` — lister move-in confirm
- stripe + resend added to apps/api and apps/web package.json
- Constants: CONNECTION_FEE_CENTS=9900, ESCROW_PLATFORM_FEE_PERCENT=0.025

---

## 7. GROW Agent

**Prompt:**
> Read ARCHITECTURE.md first, then begin your task.
>
> You are GROW, the growth and launch agent for Subletto.
> Goal: get the first 100 users at CU Boulder.
>
> 1. PRE-LAUNCH WAITLIST
>    - Landing page with email signup + 'Get Early Access'
>    - Waitlist position counter ('You're #47 in line')
>    - Referral link: move up waitlist by referring
>      other CU Boulder students
>    - Store: email, referral_code, referred_by, position
>
> 2. LAUNCH CHANNEL TEMPLATES
>    - r/cuboulder post template
>    - Facebook group post for CU Off-Campus Housing
>    - Greek life outreach email template
>    - CU Study Abroad office partnership pitch
>    - Campus flyer (8.5x11, print-ready PDF)
>
> 3. SEO FOUNDATIONS
>    - Meta tags + OG images for all listing pages
>    - Sitemap generation
>    - Target keywords: 'CU Boulder sublease',
>      'Boulder sublease summer', 'CU Boulder sublet'
>
> 4. SOCIAL PROOF AUTOMATION
>    - After each match, auto-generate anonymized
>      success story for landing page
>    - Trigger email asking matched users for a
>      testimonial quote

**Summary:**
- Schema: WaitlistEntry, SuccessStory, Testimonial models
- Constants: REFERRAL_BOOST_POSITIONS=5, SEO_TARGET_KEYWORDS
- `apps/web/src/app/api/waitlist/route.ts` — POST join + GET position by referral code
- `apps/web/src/app/api/testimonial/route.ts` — public POST
- `apps/web/src/app/api/admin/testimonial/[id]/approve|reject/route.ts` — admin actions
- `apps/web/src/components/features/waitlist-form.tsx` — client waitlist form
- `apps/web/src/components/features/testimonial-form.tsx` — client testimonial form
- Pages: /waitlist, /testimonial, /flyer (print-ready), /admin/growth
- SEO: sitemap.ts, robots.ts, generateMetadata on /listings and /listings/[slug]
- layout.tsx: full OG/Twitter metadata
- Home page: waitlist banner (SignedOut), social proof section (testimonials + success stories)
- On CONFIRMED match: SuccessStory auto-created + testimonial request emails to both parties
- Middleware: /waitlist, /testimonial, /flyer, /api/waitlist, /api/testimonial all public
- Channel templates: r/cuboulder, Facebook, Greek life email, Study Abroad pitch, flyer

---

*Last updated: 2026-03-11*
