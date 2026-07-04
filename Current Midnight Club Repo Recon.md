# Current Midnight Club Repo Recon

> Target: give a senior platform architect repo-specific context without reading the entire codebase.
> Scope: current state only. No recommendations.

---

## 1. Tech Stack

- **Framework:** Next.js 16.2.7, App Router, React 19, TypeScript 5
- **Database/Auth:** Supabase (Postgres). Two clients: anon (`supabase.ts`, public env vars) and service-role (`supabase-admin.ts`, secret key). No Supabase Auth — custom passcode gate.
- **Payments:** Stripe Checkout (Hosted), webhook-confirmed. `stripe` SDK v22.
- **Styling:** Tailwind v4 CSS-first — no `tailwind.config.ts`. All tokens in `src/app/globals.css` via `@theme {}`.
- **Fonts:** Inter (Google Fonts via `next/font`), Clash Display (Fontshare CDN).
- **QR:** `html5-qrcode` (scanner/door), `react-qr-code` (ticket display).
- **Deployment:** Vercel (inferred). `force-dynamic` on all data-fetching pages.
- **Storage:** Supabase Storage, bucket named `"Photos"` (capital P).

---

## 2. Folder Structure

```
src/
├── app/
│   ├── page.tsx                        # Landing — hardcoded "Midnight Club", "Louisville, KY"
│   ├── layout.tsx                      # Metadata title/description hardcoded to Midnight Club
│   ├── globals.css                     # @theme tokens
│   ├── [client]/                       # Tenant-aware routes (slug in URL)
│   │   ├── albums/page.tsx
│   │   └── events/
│   │       ├── page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           ├── photos/{page,PhotoGrid}.tsx
│   │           ├── success/page.tsx
│   │           └── vip/{page,confirmed/page}.tsx
│   ├── events/                         # Legacy flat routes — ALL redirected to /midnight-club/...
│   │   ├── page.tsx                    # Uses process.env.CLIENT_ID + anon client
│   │   └── [id]/
│   │       ├── {page,AttributionCapture,EventCTAs,TicketPurchaseForm}.tsx
│   │       ├── success/{page,TicketConfirmation}.tsx
│   │       └── vip/{page,BoothGrid,FloorMap,confirmed/{page,VipConfirmation}}.tsx
│   ├── admin/photos/
│   │   ├── page.tsx                    # Hardcodes "midnight-club" slug
│   │   ├── PhotoUploader.tsx           # Client component; hardcodes clientSlug
│   │   └── [albumId]/{page,AlbumPreview}.tsx
│   ├── door/{page,DoorTool}.tsx        # Staff check-in tool
│   └── api/
│       ├── checkout/route.ts
│       ├── orders/route.ts
│       ├── webhooks/stripe/route.ts
│       ├── vip/{checkout,reserve,reservation}/route.ts
│       ├── staff/{auth,events,checkin,checkin-guest,lookup}/route.ts
│       └── admin/photos/{upload,confirm,create-album}/route.ts
├── components/EventCard.tsx
└── lib/{formatEvent,get-client,stripe,supabase,supabase-admin}.ts
```

---

## 3. Key Customer-Facing Routes

| Route | Auth | Notes |
|---|---|---|
| `/` | None | Landing; plum CTA → events, outlined CTA → albums |
| `/midnight-club/events` | None | Upcoming events list |
| `/midnight-club/events/[id]` | None | Event detail, ticket form |
| `/midnight-club/events/[id]/vip` | None | VIP floor map + reservation flow |
| `/midnight-club/events/[id]/success` | None | Post-purchase; polls `/api/orders` |
| `/midnight-club/events/[id]/vip/confirmed` | None | Post-VIP; polls `/api/vip/reservation` |
| `/midnight-club/events/[id]/photos` | None | Public photo gallery |
| `/midnight-club/albums` | None | Public albums index |
| `/events/*` | None | 301 redirects to `/midnight-club/*` |

---

## 4. Key Admin/Staff Routes

| Route | Auth |
|---|---|
| `/door` | Client-side passcode (STAFF_PASSCODE) |
| `/admin/photos` | Client-side passcode (STAFF_PASSCODE) |
| `/admin/photos/[albumId]` | Client-side passcode (STAFF_PASSCODE) |
| `/api/staff/*` | STAFF_PASSCODE re-checked server-side |
| `/api/admin/photos/*` | STAFF_PASSCODE re-checked server-side |

---

## 5. Supabase Tables — Key Fields

| Table | Key fields |
|---|---|
| `clients` | `id`, `slug`, `settings` (JSONB — `vip_inquiry_phone` read from here) |
| `events` | `id`, `client_id`, `name`, `event_date`, `price`, `flyer_url`, `dj_lineup`, `genre`, `vip_enabled` |
| `customers` | `id`, `client_id`, `full_name`, `phone`, `email` |
| `ticket_orders` | `id`, `client_id`, `event_id`, `customer_id`, `quantity`, `total`, `tax`, `fee`, `status`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `meta_campaign_id`, `meta_adset_id`, `meta_ad_id`, `meta_placement`, `fbclid`, `landing_page`, `referrer` |
| `tickets` | `id`, `client_id`, `ticket_order_id`, `event_id`, `qr_code`, `price_paid`, `status`, `checked_in_at` |
| `payments` | `id`, `client_id`, `customer_id`, `ticket_order_id`, `reservation_id`, `stripe_session_id`, `amount`, `currency`, `status` |
| `reservations` | `id`, `client_id`, `event_id`, `booth_id`, `customer_id`, `fee`, `entries_included`, `bottle_min_ack`, `status`, `hold_expires_at` |
| `booths` | `id`, `client_id`, `area_id`, `label`, `booking_mode` |
| `venue_areas` | `id`, `client_id`, `name`, `is_bookable` |
| `photo_albums` | `id`, `client_id`, `event_id`, `title`, `shoot_date`, `is_published` |
| `photos` | `id`, `client_id`, `album_id`, `thumbnail_url`, `full_url`, `sort_order` |

`photos` has **no `caption` column** — previous code that selected it caused null returns.

---

## 6. Payment / Stripe Flow

**Ticket (paid):** Browser → `POST /api/checkout` → Stripe Checkout session (3 line items: Admission, KY Sales Tax 6%, Processing Fee). 17 metadata keys including full UTM set. Webhook `checkout.session.completed` → idempotency check on `payments.stripe_session_id` → upsert customer → insert `ticket_orders` (with all UTM columns) → insert N `tickets` → insert `payments`.

**Ticket (free):** Bypasses Stripe entirely. `/api/checkout` directly inserts `ticket_orders` + `tickets`, returns redirect URL with `?order_id=`.

**VIP:** Browser → `POST /api/vip/reserve` → inserts `reservations` (status=`held`, 10-min TTL, fee=$50, entries=8) → `POST /api/vip/checkout` → Stripe session with `vip_reservation_id` in metadata → webhook branches on `meta.vip_reservation_id` → double-book check → update reservation to `confirmed` (or `payment_refund_due`) → insert `payments` → fire N8N alert.

**Tax/fee formula** (hardcoded in two places — `checkout/route.ts` AND `TicketPurchaseForm.tsx`):
```
taxCents = round(subtotalCents * 0.06)
totalCents = ceil((taxedSubtotal + 30) / (1 - 0.029))
feeCents = totalCents - taxedSubtotal
```

---

## 7. UTM Attribution Flow

`AttributionCapture.tsx` (client, renders null) → reads 10 URL params on mount → writes to `localStorage["mc_attribution"]` only when ≥1 param is non-empty, also captures `landing_page` and `referrer`. `TicketPurchaseForm` reads that key before checkout POST. Route passes all 12 fields into Stripe metadata. Webhook writes them to `ticket_orders` columns (empty string → NULL). VIP flow does **not** capture attribution.

---

## 8. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
CLIENT_ID                    # Legacy fallback; still required for all staff routes
NEXT_PUBLIC_BASE_URL         # Stripe redirect origin fallback
STAFF_PASSCODE               # Single shared passcode for door + admin
N8N_VIP_ALERT_URL            # Optional; skipped if unset
```

---

## 9. Reusable Components / Modules

- `src/lib/get-client.ts` — `getClientBySlug(slug)` → `ClientRow | null`. Used in all tenant-aware API routes and `[client]` pages.
- `src/lib/formatEvent.ts` — `formatEventDate(dateStr)` — parses `YYYY-MM-DD` as local date, formats as `"Saturday, July 4"` style.
- `src/components/EventCard.tsx` — event list card, `clientSlug?` prop controls href.
- `src/app/events/[id]/TicketPurchaseForm.tsx`, `EventCTAs.tsx`, `AttributionCapture.tsx` — reused by both legacy and `[client]` pages via absolute imports (`@/app/events/[id]/...`).
- `src/app/events/[id]/vip/venues/midnight-club-layout.ts` — hardcoded SVG venue layout data (booth coordinates, room definitions).

---

## 10. Hardcoded Midnight Club Logic

- Slug `"midnight-club"` in: `next.config.ts` (5 redirects), `admin/photos/page.tsx`, `PhotoUploader.tsx` (every API call body), all three `admin/photos` API routes (default clientSlug fallback).
- Supabase project hostname `hbvqcygyufkjymdflgxo.supabase.co` in `next.config.ts`.
- Tax label `"KY Sales Tax (6%)"` and rate `0.06` in checkout route and form.
- VIP: `BOOTH_FEE = 50`, `ENTRIES_INCLUDED = 8`, `HOLD_MINUTES = 10`, Stripe `BASE_CENTS = 5000`, `TOTAL_CENTS = 5181`, `FEE_CENTS = 181` — all in API routes and mirrored in `BoothGrid.tsx`.
- Copy: `"Louisville, KY"` in `page.tsx`, `"Midnight Club · Staff only"` in `PhotoUploader`, `"VIP Reservation · $50"` / `"Includes 8 entries • 1-bottle minimum"` in `EventCTAs`.
- Storage bucket name `"Photos"` (capital P).
- Photo thumbnail: max 400px, JPEG q0.8, batch size 5.
- `localStorage` key `"mc_attribution"`.
- Venue layout file: `midnight-club-layout.ts` — fully hardcoded SVG coordinates.

---

## 11. Missing / Inconsistent Tenancy

- **All four staff API routes** (`/api/staff/events`, `checkin`, `checkin-guest`, `lookup`) use `process.env.CLIENT_ID` only — no `clientSlug` parameter, not multi-tenant.
- **`/admin/photos/*`** hardcodes `"midnight-club"` slug — not configurable per client.
- **`/api/orders`** event sub-query missing `.eq("client_id", clientId)` — minor cross-tenant leak risk.
- **Legacy `src/app/events/page.tsx` and `events/[id]/page.tsx`** use `process.env.CLIENT_ID` + anon client directly (not `supabaseAdmin`). They are redirected but still exist.

---

## 12. Duplicated Logic

- Tax/fee formula in both `checkout/route.ts` and `TicketPurchaseForm.tsx`.
- Customer upsert by phone: helper `upsertCustomer()` in `checkout/route.ts`, inlined identically in `webhooks/stripe/route.ts`.
- Client resolution pattern (slug → env fallback) repeated across 5 API routes — no shared helper.
- Full VIP flow state/UI duplicated between `[client]/events/[id]/vip/page.tsx` (which imports `BoothGrid` from the legacy path) and the legacy `events/[id]/vip/page.tsx`.

---

## 13. Known Gaps / Risks

- No `publish/route.ts` exists on `main` — publish toggle is in `admin-photo-review` branch (unmerged). `photo_albums.is_published` can only be set at creation time via `create-album` route on `main`.
- `admin-photo-review` branch stacks on `admin-photo-upload` (also unmerged) — neither is on `main` yet.
- VIP pricing (`$50`, `$5181` total) and fee math hardcoded in route — changing prices requires a code deploy.
- `events/[id]/vip/venues/midnight-club-layout.ts` — venue geometry is code, not DB. Any floor plan change requires a deploy.
- Single `STAFF_PASSCODE` covers door, admin photos, and all staff API routes — no role separation.
- `N8N_VIP_ALERT_URL` integration: fire-and-forget with 5s timeout. No retry, no dead-letter queue.
- Signed upload URLs in the photo uploader expire in ~2 min. Batching at 5 files mitigates this but is not guaranteed on slow connections.

---

## 14. What Is Working — Do Not Break

- Stripe checkout + webhook for tickets (paid and free) — fully functional including UTM capture.
- VIP reservation hold → payment → confirm flow including double-book guard.
- Door check-in tool (QR scan + name lookup) — live in production.
- 301 redirects `/events/*` → `/midnight-club/events/*`.
- `[client]` slug-based routing with `getClientBySlug` resolution.
- Photo album upload (signed-URL transport, bypasses Vercel 4.5 MB cap).
- Public photo gallery at `/midnight-club/events/[id]/photos` and `/midnight-club/albums`.
- `AttributionCapture` → Stripe metadata → `ticket_orders` UTM columns pipeline.
- All Supabase admin client usage on locked tables (`reservations`, `payments`, `customers`).
