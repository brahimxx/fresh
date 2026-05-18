# Gift Card System

## Overview

The gift card system allows salons to sell digital gift cards that clients can redeem during booking or at checkout. Gift cards are salon-specific, support partial redemption, and integrate with Stripe for secure online purchases.

---

## Database Schema

### `gift_cards` table
| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned PK | Auto-increment ID |
| salon_id | bigint unsigned FK | The salon this card belongs to |
| code | varchar(50) UNIQUE | 16-char code (XXXX-XXXX-XXXX-XXXX) |
| initial_balance | decimal(10,2) | Original value when purchased |
| remaining_balance | decimal(10,2) | Current usable balance |
| purchased_by | bigint unsigned FK nullable | User who bought it (NULL for public purchases) |
| purchaser_email | varchar(255) nullable | Email of the buyer (always stored, even without account) |
| recipient_email | varchar(255) | Email of the recipient |
| recipient_name | varchar(255) | Name of the recipient |
| recipient_message | text | Personal message from sender |
| status | enum('pending','active','used','expired','cancelled') | Card lifecycle state |
| expires_at | datetime nullable | Expiration date (NULL = never expires) |
| created_at | datetime | Creation timestamp |

### `booking_gift_cards` table (junction)
| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned PK | Auto-increment ID |
| booking_id | bigint unsigned FK | The booking that used this card |
| gift_card_id | bigint unsigned FK | The gift card that was redeemed |
| amount_used | decimal(10,2) | How much was deducted from the card |
| created_at | datetime | When the redemption occurred |

### `gift_card_transactions` table (audit ledger)
| Column | Type | Description |
|--------|------|-------------|
| id | bigint unsigned PK | Auto-increment ID |
| gift_card_id | bigint unsigned FK | The gift card this transaction belongs to |
| type | enum('purchase','redemption','refund','manual_adjustment','expiry') | Transaction type |
| amount | decimal(10,2) | Positive = credit, Negative = debit |
| balance_after | decimal(10,2) | Gift card balance after this transaction |
| reference_type | varchar(50) nullable | e.g. 'booking', 'checkout', 'cancellation', 'webhook', 'cron', 'dashboard' |
| reference_id | bigint unsigned nullable | ID of the related entity (booking_id, etc.) |
| notes | text nullable | Human-readable description |
| created_by | bigint unsigned nullable | User who triggered this (NULL for system/webhook) |
| created_at | datetime | When the transaction occurred |

---

## Status Lifecycle

```
pending → active → used
                 → expired (set by cron job daily)
                 → cancelled
```

- **pending**: Created via public purchase, awaiting Stripe payment confirmation
- **active**: Paid and ready to use (or created by salon owner directly)
- **used**: Balance fully depleted (remaining_balance = 0) — set atomically during deduction
- **expired**: Past the expires_at date — set by the daily expiration cron job
- **cancelled**: Manually voided by salon owner

**Status is the source of truth.** The `used` status is only set when `(remaining_balance - deduction) <= 0` in the same UPDATE statement. The expiration cron actively marks cards as `'expired'` rather than relying on query-time checks alone.

---

## Features

### 1. Public Gift Card Purchase (Client-Facing)

**Page**: `/salon/[slug]/gift-cards`  
**API**: `POST /api/gift-cards/purchase`

Flow:
1. Client selects amount (presets: $25–$200 or custom), enters recipient details and optionally their own email (`sender_email`)
2. API creates a gift card with `status = 'pending'`, stores `purchaser_email`
3. Stripe Checkout session is created, client is redirected to pay
4. On successful payment (webhook: `checkout.session.completed`), card is activated, `purchaser_email` is backfilled from Stripe's `customer_details.email` if not already set, and email sent to recipient
5. On checkout expiry (webhook: `checkout.session.expired`), pending card is deleted

**Rate limit**: 5 purchases per IP per 15 minutes.

**Success page**: `/gift-card/success?code=XXXX&amount=50`  
**Cancel page**: `/gift-card/cancelled`

### 2. Balance Check (Client-Facing)

**Page**: `/salon/[slug]/gift-cards/check`  
**API**: `POST /api/gift-cards/check`

Clients enter their code and see: remaining balance, original value, expiry date, and status (Active/Expired/Depleted).

**Rate limit**: 10 checks per IP per 15 minutes (prevents code enumeration).

### 3. Gift Card Redemption During Booking

**Booking page**: `/book/[salonId]` (Step 5: Confirm)  
**API**: Widget book route passes `giftCardCode` to `createSafeBooking()`

Flow:
1. Client enters gift card code in the "Gift Card" field on the confirmation step
2. Frontend validates via `POST /api/gift-cards/check` (with salonId for scope)
3. UI shows: amount applied, remaining after use, and updated total
4. On booking confirmation, `createSafeBooking()`:
   - Locks the gift card row (`SELECT ... FOR UPDATE`)
   - Calculates `giftCardAmountUsed = Math.min(balance, totalAfterDiscount)`
   - Inserts `booking_gift_cards` record
   - Deducts balance and sets status to 'used' if `(remaining_balance - deduction) <= 0`
   - Records a `redemption` entry in `gift_card_transactions`
5. Payment record stores the **remaining** amount due (after gift card deduction)
6. If gift card covers full amount: payment marked as `'paid'` with method `'gift_card'`
7. If partial: remaining charged via Stripe or recorded as cash

### 4. Gift Card Redemption at Dashboard Checkout

**Page**: `/dashboard/salon/[salonId]/checkout/[bookingId]`  
**API**: `POST /api/checkout/[bookingId]`

Staff can apply a gift card during in-salon checkout. Same validation and deduction logic, with duplicate-application prevention. Records a `redemption` entry in the ledger.

### 5. Gift Card Refund on Cancellation

When a booking is cancelled (PUT or DELETE on `/api/bookings/[id]`):
- The `booking_gift_cards` record is looked up
- The `amount_used` is added back to the gift card's `remaining_balance`
- Gift card status is reset to `'active'`
- A `refund` entry is recorded in `gift_card_transactions`

**Not refunded on no-show** — intentional policy decision.

Also refunded when Stripe checkout expires (webhook handler).

### 6. Dashboard Gift Card Management

**Page**: `/dashboard/salon/[salonId]/marketing/gift-cards`  
**API**: `GET /api/gift-cards?salon_id=X`, `POST /api/gift-cards`, `PUT /api/gift-cards/[id]`

Features:
- Metrics: Total cards, Active count, Outstanding balance, Monthly sales
- Table with search, status filter tabs (All/Active/Expired/Cancelled)
- Create new gift card (with optional email delivery) — records `purchase` in ledger
- Cancel/void a gift card
- Copy code to clipboard

### 7. Booking Detail — Gift Card Display

**Dashboard** (`BookingDetailSheet`):
- Shows "Service Value" (full price before gift card)
- "Paid via Gift Card" row with code and amount
- "Remaining Balance" row showing what the client owes

**Client bookings page** (`/bookings`):
- Gift card line item with code and deducted amount
- Total reflects the amount due after gift card

### 8. Email Notifications

**Booking confirmation email** includes:
- Gift card row showing amount applied and code
- Discount row (if applicable)
- Final total

**Gift card delivery email** (sent to recipient after purchase):
- Gift card code prominently displayed
- Amount, sender name, personal message
- Expiry date and redemption instructions

**Expiring soon email** (sent by cron, 7 days before expiry):
- Remaining balance and code
- Expiry date
- Prompt to book before it expires

### 9. Expiration Enforcement (Cron Job)

**API**: `GET /api/cron/gift-cards/expire`  
**Schedule**: Daily (via external scheduler or Vercel Cron)  
**Auth**: `Bearer CRON_SECRET`

Responsibilities:
1. Marks `active` cards with `expires_at < NOW()` as `'expired'` and records `expiry` in ledger
2. Sends one-time "expiring soon" emails to recipients whose cards expire within 7 days (deduplication via notifications table)

---

## API Routes Summary

| Method | Route | Auth | Rate Limit | Description |
|--------|-------|------|------------|-------------|
| POST | `/api/gift-cards/purchase` | Public | 5/15min/IP | Create pending card + Stripe checkout |
| POST | `/api/gift-cards/check` | Public | 10/15min/IP | Check balance by code |
| GET | `/api/gift-cards/[code]` | Public | 10/15min/IP | Validate card for booking (active + balance > 0) |
| PUT | `/api/gift-cards/[code]` | Auth (owner/manager) | — | Update/cancel a gift card |
| GET | `/api/gift-cards` | Auth | — | List gift cards (filtered by salon_id, status) |
| POST | `/api/gift-cards` | Auth (owner/manager) | — | Create gift card from dashboard |
| GET | `/api/salons/[id]/gift-cards` | Auth (salon access) | — | Salon-scoped list |
| POST | `/api/salons/[id]/gift-cards` | Auth (salon access) | — | Salon-scoped create |
| GET | `/api/cron/gift-cards/expire` | CRON_SECRET | — | Expire cards + send warnings |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/booking.js` | `createSafeBooking()` — gift card validation, deduction, balance update, ledger entry |
| `src/lib/gift-card-ledger.js` | `recordGiftCardTransaction()` — audit trail utility (works standalone or within transactions) |
| `src/app/api/widget/[salonId]/book/route.js` | Widget booking with gift card + payment logic |
| `src/app/api/bookings/[id]/route.js` | Cancellation refund logic + ledger entry |
| `src/app/api/checkout/[bookingId]/route.js` | Dashboard checkout with gift card + ledger entry |
| `src/app/api/webhooks/stripe/route.js` | Activates cards on payment, records purchase in ledger, refunds on expiry |
| `src/app/api/gift-cards/purchase/route.js` | Public purchase → Stripe flow (rate limited) |
| `src/app/api/gift-cards/check/route.js` | Balance check (rate limited, decodes salonId) |
| `src/app/api/gift-cards/[code]/route.js` | GET (validate, rate limited) + PUT (update/cancel) |
| `src/app/api/gift-cards/route.js` | Dashboard list + create (with ledger entry) |
| `src/app/api/cron/gift-cards/expire/route.js` | Daily expiration cron + expiry warning emails |
| `src/hooks/use-gift-cards.js` | React Query hooks for all operations |
| `src/components/bookings/booking-detail.jsx` | Dashboard booking detail with gift card breakdown |
| `src/app/(marketplace)/bookings/page.js` | Client bookings page with gift card display |
| `src/app/(marketplace)/salon/[slug]/gift-cards/page.jsx` | Public purchase page |
| `src/app/(marketplace)/salon/[slug]/gift-cards/check/page.jsx` | Public balance check |
| `src/app/dashboard/salon/[salonId]/marketing/gift-cards/page.js` | Dashboard management |
| `src/lib/notifications.js` | Email templates with gift card info |

---

## Important Implementation Details

1. **Partial redemption**: A €10 gift card can be applied to a €50 booking. The client pays the remaining €40 via Stripe or cash.

2. **ID encoding**: The booking page URL uses encoded salon IDs. The `/api/gift-cards/check` endpoint decodes them via `decodeId()` before querying.

3. **Status is the source of truth**: The `status` column is authoritative. Validation queries filter by `status = 'active'` only. The `used` status is set atomically using `CASE WHEN (remaining_balance - ?) <= 0` in the same UPDATE that deducts the balance.

4. **Stripe zero-amount handling**: When a gift card covers the full booking amount, no Stripe checkout is created. The payment is recorded as `method: 'gift_card', status: 'paid'`.

5. **Concurrency safety**: Gift card deduction uses `SELECT ... FOR UPDATE` within a transaction to prevent race conditions on balance.

6. **Rate limiting**: All public gift card endpoints are rate-limited per IP to prevent code enumeration and abuse. Uses the in-memory `rateLimiter` singleton from `@/lib/rate-limit`.

7. **Purchaser tracking**: `purchaser_email` is always stored regardless of whether the buyer has an account. For public purchases, it comes from the form (`sender_email`) or is backfilled from Stripe's `customer_details.email` on payment. For dashboard creation, it's the authenticated user's email.

8. **Audit ledger**: Every balance change (purchase, redemption, refund, expiry, manual adjustment) is recorded in `gift_card_transactions`. Query `SELECT * FROM gift_card_transactions WHERE gift_card_id = ? ORDER BY created_at` for full history.

9. **Expiration enforcement**: A daily cron job (`/api/cron/gift-cards/expire`) actively marks expired cards and sends 7-day warning emails. This ensures `status` reflects reality even if no one queries the card.

---

## Migrations (run in order)

1. `database/migrations/20260517_add_pending_status_to_gift_cards.sql` — Adds 'pending' to status enum
2. `database/migrations/20260518_fix_gift_card_status_consistency.sql` — Fixes inconsistent status values from the old bug
3. `database/migrations/20260518_add_purchaser_email_to_gift_cards.sql` — Adds purchaser_email column + backfills
4. `database/migrations/20260518_create_gift_card_transactions.sql` — Creates audit ledger table + backfills existing data

---

## Querying the Audit Ledger

Full history for a specific card:
```sql
SELECT * FROM gift_card_transactions WHERE gift_card_id = ? ORDER BY created_at;
```

All redemptions for a salon in a date range:
```sql
SELECT gct.* FROM gift_card_transactions gct
JOIN gift_cards gc ON gc.id = gct.gift_card_id
WHERE gc.salon_id = ? AND gct.type = 'redemption'
AND gct.created_at BETWEEN ? AND ?;
```

Cards purchased by a specific email:
```sql
SELECT * FROM gift_cards WHERE purchaser_email = ? ORDER BY created_at DESC;
```
