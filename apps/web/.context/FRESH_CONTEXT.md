# FRESH — Complete Project Context

> **Generated:** 2026-05-18 | **Branch:** `devalop` | **Engine:** MySQL 8.0.45 | **Runtime:** Next.js 16.1.1

---

## 1. Project Overview

**Fresh** is a multi-tenant SaaS platform for the beauty and wellness industry. It provides salon owners with a complete business management suite (bookings, staff, payments, marketing, CRM, reporting) while simultaneously operating a consumer-facing marketplace where end-users discover, compare, and book services at participating salons.

### Core Value Propositions

1. **For Salon Owners:** A single dashboard to manage appointments, staff schedules, inventory, payments, marketing campaigns, gift cards, discount codes, waitlists, and multi-location operations.
2. **For Clients (Consumers):** A marketplace to browse salons by category and city, view real-time availability, book services, pay online, leave reviews, and manage upcoming/past appointments.
3. **For the Platform (Fresh):** Revenue via platform acquisition fees on new marketplace clients (20% of first booking value) and payment processing fees.

### Hybrid Fulfillment Model

Every salon can operate in one or more fulfillment modes simultaneously:

- **Physical:** Traditional in-salon appointments. The client visits the salon's physical address.
- **Mobile:** The staff member travels to the client's location. The system enforces travel radius limits (per-salon and per-staff overrides), calculates travel fees (fixed or per-km using Haversine distance), validates travel feasibility between consecutive bookings using bidirectional travel checks, and automatically adds buffer time before/after mobile appointments.
- **Virtual:** Video-call appointments. The system stores a meeting link and the client's timezone on the booking record.

Fulfillment capability is configured at three levels:
- **Salon level:** `salons.is_physical`, `salons.is_mobile`, `salons.is_virtual` flags determine which modes the business supports.
- **Service level:** `services.can_physical`, `services.can_mobile`, `services.can_virtual` flags determine which modes each individual service supports. Services can also have `mobile_price_override` and `virtual_price_override` for mode-specific pricing.
- **Staff level:** `staff.can_physical`, `staff.can_mobile`, `staff.can_virtual` flags determine which modes each staff member can perform. Staff can have individual `travel_radius` overrides and `home_lat`/`home_lng` coordinates for distance calculations.

### User Surfaces

1. **Public Marketplace** — Browse salons, view profiles, book services, purchase gift cards.
2. **Client Dashboard** — View upcoming/past bookings, manage profile, saved addresses, reviews.
3. **Salon Owner Dashboard** — Full business management (bookings, calendar, team, services, products, marketing, reports, settings).
4. **Platform Admin Dashboard** — Global oversight (all salons, users, bookings, fees, payouts, analytics, support tickets, audit logs, global discounts, broadcasts).
5. **Embeddable Booking Widget** — A white-label booking widget that salon owners can embed on their own websites.
6. **Staff Invitation Flow** — Email-based invitation system for onboarding new team members.

---

## 2. Tech Stack

### Runtime & Framework

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.1.1 | Full-stack React framework (App Router) |
| React | 19.2.3 | UI library |
| React DOM | 19.2.3 | DOM rendering |
| Node.js | (system) | Server runtime |

### Database & ORM

| Technology | Version | Purpose |
|---|---|---|
| MySQL | 8.0.45 | Primary relational database |
| mysql2 | ^3.16.0 | MySQL client with connection pooling (promise API) |

### Authentication & Security

| Technology | Version | Purpose |
|---|---|---|
| jose | ^6.1.3 | JWT creation and verification (HS256) |
| bcryptjs | ^3.0.3 | Password hashing (cost factor 12) |

### Payments

| Technology | Version | Purpose |
|---|---|---|
| stripe | ^20.1.0 | Payment processing, Connect accounts, webhooks |

### Email

| Technology | Version | Purpose |
|---|---|---|
| resend | ^6.10.0 | Transactional email delivery |

### UI Component Library

| Technology | Version | Purpose |
|---|---|---|
| @radix-ui/react-alert-dialog | ^1.1.15 | Accessible alert dialogs |
| @radix-ui/react-avatar | ^1.1.11 | User avatar components |
| @radix-ui/react-checkbox | ^1.3.3 | Accessible checkboxes |
| @radix-ui/react-collapsible | ^1.1.12 | Collapsible panels |
| @radix-ui/react-dialog | ^1.1.15 | Modal dialogs |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Dropdown menus |
| @radix-ui/react-label | ^2.1.8 | Form labels |
| @radix-ui/react-popover | ^1.1.15 | Popovers |
| @radix-ui/react-progress | ^1.1.8 | Progress bars |
| @radix-ui/react-radio-group | ^1.3.8 | Radio button groups |
| @radix-ui/react-scroll-area | ^1.2.10 | Custom scroll areas |
| @radix-ui/react-select | ^2.2.6 | Select dropdowns |
| @radix-ui/react-separator | ^1.1.8 | Visual separators |
| @radix-ui/react-slot | ^1.2.4 | Slot composition |
| @radix-ui/react-switch | ^1.2.6 | Toggle switches |
| @radix-ui/react-tabs | ^1.1.13 | Tab interfaces |
| @radix-ui/react-tooltip | ^1.2.8 | Tooltips |
| radix-ui | ^1.4.3 | Radix UI meta-package |
| cmdk | ^1.1.1 | Command palette (⌘K) |
| sonner | ^2.0.7 | Toast notifications |
| lucide-react | ^0.562.0 | Icon library |

### Styling

| Technology | Version | Purpose |
|---|---|---|
| tailwindcss | ^4 | Utility-first CSS framework |
| @tailwindcss/postcss | ^4 | PostCSS integration |
| tw-animate-css | ^1.4.0 | Animation utilities |
| class-variance-authority | ^0.7.1 | Variant-based component styling |
| clsx | ^2.1.1 | Conditional class merging |
| tailwind-merge | ^3.5.0 | Intelligent Tailwind class deduplication |
| next-themes | ^0.4.6 | Dark/light theme switching |

### Data Visualization & Calendar

| Technology | Version | Purpose |
|---|---|---|
| recharts | ^3.7.0 | Charts for reports/analytics |
| @fullcalendar/core | ^6.1.20 | Calendar engine |
| @fullcalendar/daygrid | ^6.1.20 | Month/day grid views |
| @fullcalendar/timegrid | ^6.1.20 | Time-based grid views |
| @fullcalendar/interaction | ^6.1.20 | Drag-and-drop, click events |
| @fullcalendar/list | ^6.1.20 | List view |
| @fullcalendar/react | ^6.1.20 | React wrapper |

### Forms & Validation

| Technology | Version | Purpose |
|---|---|---|
| react-hook-form | ^7.70.0 | Form state management |
| @hookform/resolvers | ^5.2.2 | Schema validation resolvers |
| zod | ^4.3.5 | Schema declaration and validation |

### Maps

| Technology | Version | Purpose |
|---|---|---|
| @react-google-maps/api | ^2.20.8 | Google Maps integration for marketplace |

### Carousel & Animation

| Technology | Version | Purpose |
|---|---|---|
| embla-carousel-react | ^8.6.0 | Carousel component |
| embla-carousel-autoplay | ^8.6.0 | Autoplay plugin |
| framer-motion | ^12.35.0 | Animation library |

### Tables & Virtualization

| Technology | Version | Purpose |
|---|---|---|
| @tanstack/react-table | ^8.21.3 | Headless table logic |
| @tanstack/react-virtual | ^3.13.18 | Virtualized lists |

### Date Utilities

| Technology | Version | Purpose |
|---|---|---|
| date-fns | ^4.1.0 | Date manipulation and formatting |
| react-day-picker | ^9.13.0 | Date picker component |

### State Management Strategy

| Technology | Version | Purpose |
|---|---|---|
| @tanstack/react-query | ^5.90.16 | Server state management, caching, mutations |

The application uses **TanStack React Query** as its primary state management solution. All server data is fetched and cached through custom hooks (located in `src/hooks/`) that wrap `useQuery` and `useMutation`. There is no global client-side store (no Redux, Zustand, or Jotai). Local component state uses React's built-in `useState` and `useReducer`. Context providers handle cross-cutting concerns:

- `AuthProvider` — Current user session, login/logout state
- `SalonProvider` — Active salon context for the dashboard
- `QueryProvider` — TanStack Query client configuration
- `ThemeProvider` — Dark/light mode preference
- `ToastProvider` — Global toast notification queue

### Testing

| Technology | Version | Purpose |
|---|---|---|
| vitest | ^2.1.9 | Test runner |
| @testing-library/react | ^16.3.2 | React component testing |
| @testing-library/jest-dom | ^6.9.1 | DOM assertion matchers |
| @vitejs/plugin-react | ^4.7.0 | React plugin for Vite/Vitest |
| jsdom | ^25.0.1 | DOM environment for tests |
| fast-check | ^3.23.2 | Property-based testing |
| dotenv | ^17.3.1 | Environment variable loading for tests |

### Build & Tooling

| Technology | Version | Purpose |
|---|---|---|
| eslint | ^9 | Linting |
| eslint-config-next | 16.1.1 | Next.js ESLint rules |
| ts-node | ^10.9.2 | TypeScript execution (scripts) |

---

## 3. Directory Structure

```
src/
├── app/                          # Next.js App Router (pages + API routes)
│   ├── (auth)/                   # Auth route group (login, register, forgot/reset password)
│   │   ├── layout.js            # Shared auth layout (centered card)
│   │   ├── login/page.js        # Login page
│   │   ├── register/page.js     # Registration page
│   │   ├── forgot-password/page.js
│   │   └── reset-password/page.js
│   ├── (marketplace)/            # Public marketplace route group
│   │   ├── layout.js            # Marketplace layout (navbar + footer)
│   │   ├── page.js              # Homepage / landing
│   │   ├── [category]/page.js   # Category listing
│   │   ├── [category]/[city]/page.js  # Category + city filtered listing
│   │   ├── bookings/page.js     # Client's bookings list
│   │   ├── contact/page.js      # Contact page
│   │   ├── help/page.js         # Help/FAQ page
│   │   ├── privacy/page.js      # Privacy policy
│   │   ├── profile/page.js      # Client profile management
│   │   ├── salon/[slug]/        # Individual salon public profile
│   │   │   ├── page.jsx         # Salon detail page
│   │   │   ├── layout.js        # Salon profile layout
│   │   │   └── gift-cards/      # Gift card purchase + balance check
│   │   ├── salons/page.js       # All salons listing
│   │   └── terms/page.js        # Terms of service
│   ├── api/                      # API route handlers (see Section 8)
│   ├── auth/choose/page.js      # Post-login role selection
│   ├── book/[salonId]/page.js   # Standalone booking flow
│   ├── dashboard/                # Authenticated dashboard
│   │   ├── layout.js            # Dashboard shell (sidebar + topbar)
│   │   ├── page.js              # Dashboard home (redirects based on role)
│   │   ├── admin/               # Platform admin pages
│   │   ├── locations/new/page.js # Add new salon location
│   │   ├── salon/[salonId]/     # Salon-specific dashboard pages
│   │   └── settings/page.js     # User account settings
│   ├── gift-card/                # Gift card post-purchase pages
│   │   ├── success/page.jsx     # Purchase success
│   │   └── cancelled/page.jsx   # Purchase cancelled
│   ├── invite/page.js           # Staff invitation acceptance
│   ├── onboarding/              # New user onboarding
│   │   ├── page.js              # Onboarding start
│   │   ├── choose/page.js       # Choose account type
│   │   └── join/page.js         # Join existing salon
│   ├── verify-email/page.js     # Email verification
│   ├── globals.css              # Global styles
│   ├── layout.js                # Root layout
│   └── favicon.ico
├── components/                   # Reusable React components
│   ├── booking-widget/          # Embeddable booking widget components
│   ├── bookings/                # Booking-related components
│   ├── calendar/                # FullCalendar wrappers
│   ├── checkout/                # Checkout flow components
│   ├── clients/                 # Client management components
│   ├── help/                    # Help/FAQ components
│   ├── layout/                  # Layout components (sidebar, topbar, nav)
│   ├── marketing/               # Marketing feature components
│   ├── marketplace/             # Marketplace-specific components
│   ├── onboarding/              # Onboarding flow components
│   ├── products/                # Product management components
│   ├── sales/                   # Sales/payment components
│   ├── services/                # Service management components
│   ├── staff/                   # Staff management components
│   ├── ui/                      # Shadcn/ui base components
│   ├── command-palette.jsx      # ⌘K command palette
│   ├── EmailVerificationBanner.jsx
│   ├── ImpersonationBanner.jsx
│   └── providers.jsx            # Combined provider wrapper
├── hooks/                        # Custom React hooks (TanStack Query wrappers)
│   ├── use-bookings.js          # Booking CRUD + mutations
│   ├── use-campaigns.js         # Campaign management
│   ├── use-clients.js           # Client CRM operations
│   ├── use-debounce.js          # Input debouncing
│   ├── use-discounts.js         # Discount code management
│   ├── use-gallery.js           # Gallery image management
│   ├── use-gift-cards.js        # Gift card operations
│   ├── use-marketplace.js       # Marketplace search/browse
│   ├── use-my-profile.js        # Current user profile
│   ├── use-notifications.js     # Notification bell
│   ├── use-packages.js          # Service packages
│   ├── use-payments.js          # Payment history
│   ├── use-product-categories.js # Product category CRUD
│   ├── use-products.js          # Product inventory
│   ├── use-reports.js           # Analytics/reports data
│   ├── use-reviews.js           # Review management
│   ├── use-salon-closures.js    # Closure day management
│   ├── use-services.js          # Service CRUD
│   ├── use-settings.js          # Salon settings
│   ├── use-staff.js             # Staff management
│   ├── use-support.js           # Support ticket operations
│   ├── use-toast.js             # Toast notification helper
│   └── use-waitlist.js          # Waitlist management
├── lib/                          # Core business logic & utilities
│   ├── api-client.js            # Fetch wrapper with auth headers
│   ├── auth.js                  # JWT + bcrypt (server-side)
│   ├── booking.js               # createSafeBooking transaction engine
│   ├── checkout.js              # calculateBookingTotal + processCheckout
│   ├── client.js                # findOrCreateClient logic
│   ├── csv.js                   # CSV export utilities
│   ├── db.js                    # MySQL connection pool + query helpers
│   ├── email.js                 # Resend email sending
│   ├── format.js                # Number/date formatting utilities
│   ├── geo.js                   # Haversine distance, travel fee calculation
│   ├── gift-card-ledger.js      # Gift card transaction audit trail
│   ├── id.js                    # ID generation utilities
│   ├── notifications.js         # In-app notification creation
│   ├── permissions-server.js    # Server-side salon access authorization
│   ├── permissions.js           # Role-based permission engine
│   ├── rate-limit.js            # API rate limiting
│   ├── response.js              # Standardized API response helpers
│   ├── security.js              # Security utilities
│   ├── stripe.js                # Stripe client initialization
│   ├── travel.js                # Bidirectional travel feasibility checks
│   ├── utils.js                 # General utilities (cn, etc.)
│   ├── validate.js              # Input validation helpers
│   └── constants/               # Static data
│       ├── categories.js        # Salon category definitions
│       ├── countries.js         # Country list
│       └── email-templates.js   # Email template strings
├── providers/                    # React context providers
│   ├── auth-provider.jsx        # Authentication state
│   ├── query-provider.jsx       # TanStack Query client
│   ├── salon-provider.jsx       # Active salon context
│   ├── theme-provider.jsx       # Theme (dark/light)
│   └── toast-provider.jsx       # Toast notifications
├── scripts/                      # Utility scripts
│   └── generate-jwt.mjs         # JWT generation for testing
├── styles/
│   └── calendar.css             # FullCalendar custom styles
└── proxy.js                      # Development proxy configuration
```

### Other Critical Directories

```
database/
├── fresh.sql                     # Full database dump (schema + data)
├── fresh_structure.sql           # Schema-only dump (1541 lines)
└── migrations/                   # Incremental schema migrations
    ├── 20260301_add_soft_deletes.sql
    ├── 20260301_create_user_addresses.sql
    ├── 20260330_add_sub_times_to_booking_services.sql
    ├── 20260408_create_salon_categories.sql
    ├── 20260412_add_hybrid_fulfillment.sql
    ├── 20260412_phase2_buffer_zips.sql
    ├── 20260413_create_staff_invitations.sql
    ├── 20260414_add_message_to_staff_invitations.sql
    ├── 20260420_add_staff_permissions.sql
    ├── 20260422_add_mobile_base_address.sql
    ├── 20260422_fix_invalid_service_fulfillment_flags.sql
    ├── 20260422_hybrid_fulfillment_phase3.sql
    ├── 20260422_replace_service_offering_enum_with_flags.sql
    ├── 20260517_add_pending_status_to_gift_cards.sql
    ├── 20260518_add_purchaser_email_to_gift_cards.sql
    ├── 20260518_create_gift_card_transactions.sql
    ├── 20260518_fix_gift_card_status_consistency.sql
    └── 20260601_products_sales_overhaul.sql

docs/
├── FRESH_DOCUMENTATION.md        # Primary documentation
└── archive/                      # Historical phase documentation (Phases 1-13)

.context/
├── FRESH_CONTEXT.md              # This file
├── GIFT_CARDS.md                 # Gift card feature specification
└── PROJECT_CONTEXT.md            # Previous project context (superseded)
```

---

## 4. User Roles & Permission Hierarchy

### System-Level Roles (`users.role`)

The `users.role` ENUM defines the global identity of a user across the entire platform:

| Role | Description | Access |
|---|---|---|
| `client` | End consumer | Marketplace browsing, booking, profile management, reviews |
| `owner` | Salon business owner | Full salon dashboard access for owned salons |
| `staff` | Salon employee | Dashboard access scoped by staff permissions |
| `admin` | Platform administrator | Full platform admin dashboard, impersonation, global settings |

### Staff-Level Roles (`staff.role`)

The `staff.role` ENUM defines a user's role WITHIN a specific salon. A single user can have different staff roles at different salons (multi-location support):

| Role | Rank | Description |
|---|---|---|
| `staff` | 1 | Basic employee — sees own calendar and bookings only |
| `receptionist` | 2 | Front desk — sees all calendars, all bookings, client database |
| `manager` | 3 | Full operational access — services, products, marketing, reports, team |
| `owner` | 4 | Unrestricted — all permissions, cannot be restricted by custom overrides |

### How `users.role` Differs from `staff.role`

- `users.role` is a **platform-wide identity**. It determines which top-level surfaces a user can access (marketplace vs. dashboard vs. admin panel).
- `staff.role` is a **per-salon permission level**. It determines what a user can do within a specific salon's dashboard.
- A user with `users.role = 'client'` can be upgraded to `'owner'` or `'staff'` during onboarding.
- A user with `users.role = 'owner'` automatically gets `staff.role = 'owner'` in their own salon.
- A user with `users.role = 'staff'` has a `staff` record linking them to a salon with a specific `staff.role`.

### Permission Resolution Algorithm

1. If `staff.role === 'owner'` → **always allowed** (cannot be restricted)
2. If `staff.permissions` JSON has an explicit boolean for the key → use that value
3. Otherwise → fall back to the role's default (defined by `PERMISSION_KEYS[key].roleDefault(role)`)

### Full Permission Matrix (Defaults)

| Permission Key | staff | receptionist | manager | owner |
|---|---|---|---|---|
| `dashboard_full` | ❌ | ❌ | ✅ | ✅ |
| `calendar_all` | ❌ | ✅ | ✅ | ✅ |
| `bookings_all` | ❌ | ✅ | ✅ | ✅ |
| `clients` | ❌ | ✅ | ✅ | ✅ |
| `services_edit` | ❌ | ❌ | ✅ | ✅ |
| `team` | ❌ | ❌ | ✅ | ✅ |
| `products` | ❌ | ❌ | ✅ | ✅ |
| `products_manage` | ❌ | ❌ | ✅ | ✅ |
| `sales` | ❌ | ❌ | ✅ | ✅ |
| `sales_manage` | ❌ | ❌ | ✅ | ✅ |
| `marketing` | ❌ | ❌ | ✅ | ✅ |
| `reports` | ❌ | ❌ | ✅ | ✅ |
| `settings_business` | ❌ | ❌ | ❌ | ✅ |
| `settings_hours` | ❌ | ❌ | ✅ | ✅ |
| `settings_billing` | ❌ | ❌ | ❌ | ✅ |
| `add_location` | ❌ | ❌ | ❌ | ✅ |
| `gallery` | ❌ | ❌ | ✅ | ✅ |

### Server-Side Authorization (`assertSalonAccess`)

Every salon-scoped API endpoint calls `assertSalonAccess({ session, salonId, perm, ownerOnly })` which implements:

1. No session → 401 UNAUTHORIZED
2. Admin role → 200 ALLOWED (bypasses all salon checks)
3. Non-admin without salon_id → 400 MISSING_SALON_ID
4. Non-admin with invalid/non-existent salon_id → 400 INVALID_SALON_ID
5. User is the salon owner → 200 ALLOWED
6. `ownerOnly=true` and user is not owner → 403 FORBIDDEN
7. User has active staff record AND permission resolves true → 200 ALLOWED
8. User has active staff record but permission resolves false → 403 FORBIDDEN
9. User has no active staff record on this salon → 403 FORBIDDEN

---

## 5. Database Schema (All Tables)

### Database: `fresh` | Engine: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_0900_ai_ci


### Domain Group: Core Identity

#### Table: `users`

The central identity table for all platform participants.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Unique user identifier |
| `email` | varchar(255) | UNIQUE, NOT NULL | Login email |
| `phone` | varchar(30) | nullable, indexed | Phone number |
| `gender` | varchar(20) | nullable | Gender |
| `date_of_birth` | date | nullable | Date of birth |
| `address` | varchar(255) | nullable | Street address |
| `city` | varchar(100) | nullable | City |
| `postal_code` | varchar(20) | nullable | Postal code |
| `notes` | text | nullable | Internal notes |
| `password_hash` | varchar(255) | NOT NULL | bcrypt hash (cost 12) |
| `first_name` | varchar(100) | nullable, indexed | First name |
| `last_name` | varchar(100) | nullable, indexed | Last name |
| `country` | varchar(100) | nullable, indexed | Country |
| `role` | enum('client','owner','staff','admin') | NOT NULL, DEFAULT 'client' | Platform role |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Registration timestamp |
| `updated_at` | datetime | NOT NULL, auto-update | Last modification |
| `email_verified` | tinyint(1) | NOT NULL, DEFAULT 0 | Email verification status |
| `reset_token` | varchar(255) | nullable | Password reset token |
| `reset_token_expires` | datetime | nullable | Token expiry |
| `avatar_url` | varchar(500) | nullable | Profile picture URL |
| `last_login_at` | datetime | nullable, indexed | Last login timestamp |
| `deleted_at` | datetime | nullable, indexed | Soft delete timestamp |

**Indexes:** `uq_users_email`, `idx_users_role`, `idx_users_country`, `idx_users_last_login_role`, `idx_users_phone`, `idx_users_first_name`, `idx_users_last_name`, `idx_users_deleted_at`

#### Table: `user_addresses`

Saved addresses for mobile booking convenience (e.g., Home, Work, Gym).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Address ID |
| `user_id` | bigint unsigned | FK → users.id (CASCADE), NOT NULL | Owner |
| `label` | varchar(100) | NOT NULL | Display name (Home, Work) |
| `icon_name` | varchar(50) | DEFAULT 'MapPin' | Lucide icon name |
| `full_address` | varchar(255) | NOT NULL | Full street address |
| `lat` | decimal(10,7) | NOT NULL | Latitude |
| `lng` | decimal(10,7) | NOT NULL | Longitude |
| `is_default` | tinyint(1) | DEFAULT 0 | Default address flag |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | NOT NULL, auto-update | Updated |
| `deleted_at` | datetime | nullable | Soft delete |

**Indexes:** `idx_user_addresses_user` (user_id, deleted_at)

#### Table: `salons`

The tenant entity. Each salon is a separate business.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Salon ID |
| `owner_id` | bigint unsigned | FK → users.id (RESTRICT), NOT NULL | Business owner |
| `name` | varchar(255) | NOT NULL | Business name |
| `description` | text | nullable | Business description |
| `phone` | varchar(30) | nullable | Business phone |
| `email` | varchar(255) | nullable | Business email |
| `address` | text | nullable | Street address |
| `city` | varchar(100) | nullable, indexed | City |
| `country` | varchar(100) | nullable | Country |
| `latitude` | decimal(10,7) | nullable | Geo latitude |
| `longitude` | decimal(10,7) | nullable | Geo longitude |
| `is_marketplace_enabled` | tinyint(1) | NOT NULL, DEFAULT 0 | Listed on marketplace |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 | Active status |
| `stripe_account_id` | varchar(255) | nullable, indexed | Stripe Connect account |
| `timezone` | varchar(50) | DEFAULT 'Europe/Paris' | Business timezone |
| `currency` | varchar(3) | DEFAULT 'EUR' | Currency code |
| `logo_url` | varchar(500) | nullable | Logo image |
| `cover_image_url` | varchar(500) | nullable | Cover image |
| `website` | varchar(255) | nullable | Website URL |
| `price_level` | tinyint | DEFAULT 2 | Price tier (1-4) |
| `state` | varchar(100) | nullable | State/province |
| `postal_code` | varchar(20) | nullable | Postal code |
| `status` | varchar(20) | DEFAULT 'active' | Account status |
| `plan_tier` | enum('basic','pro','enterprise') | DEFAULT 'basic' | Subscription tier |
| `deleted_at` | datetime | nullable, indexed | Soft delete |
| `deleted_by` | bigint unsigned | FK → users.id (SET NULL) | Who deleted |
| `is_physical` | tinyint(1) | NOT NULL, DEFAULT 1 | Supports in-salon |
| `is_mobile` | tinyint(1) | NOT NULL, DEFAULT 0 | Supports mobile/home visits |
| `is_virtual` | tinyint(1) | NOT NULL, DEFAULT 0 | Supports virtual |
| `travel_radius` | int | nullable | Max travel distance (km) |
| `travel_fee_type` | enum('fixed','per_km','none') | DEFAULT 'none' | Travel fee model |
| `travel_fee_amount` | decimal(10,2) | DEFAULT 0.00 | Fee amount |
| `min_booking_amount` | decimal(10,2) | DEFAULT 0.00 | Min order for mobile |
| `virtual_meeting_link` | text | nullable | Default meeting link |
| `covered_zip_codes` | text | nullable | Comma-separated zip codes |
| `travel_buffer_time` | int | DEFAULT 0 | Buffer minutes for mobile |
| `mobile_base_address` | varchar(255) | nullable | Base address for radius |

**Indexes:** `idx_salons_owner_id`, `idx_salons_marketplace_city`, `idx_salons_geo`, `idx_salons_marketplace`, `idx_salons_city`, `idx_salons_deleted`, `idx_salons_stripe_account`

#### Table: `salon_settings`

Per-salon configuration (1:1 with salons).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `salon_id` | bigint unsigned | PK, FK → salons.id (CASCADE) | Salon reference |
| `cancellation_policy_hours` | int | NOT NULL, DEFAULT 0 | Hours before for free cancel |
| `no_show_fee` | decimal(10,2) | NOT NULL, DEFAULT 0.00 | No-show charge |
| `deposit_required` | tinyint(1) | NOT NULL, DEFAULT 0 | Require deposit |
| `deposit_percentage` | int | NOT NULL, DEFAULT 0 | Deposit % |
| `working_hours_start` | time | DEFAULT '09:00:00' | Default open time |
| `working_hours_end` | time | DEFAULT '19:00:00' | Default close time |
| `online_booking_enabled` | tinyint(1) | DEFAULT 1 | Allow online booking |
| `booking_advance_min_hours` | int | DEFAULT 1 | Min advance booking hours |
| `booking_advance_max_days` | int | DEFAULT 90 | Max advance booking days |
| `auto_confirm_bookings` | tinyint(1) | DEFAULT 0 | Auto-confirm new bookings |
| `send_reminders` | tinyint(1) | DEFAULT 1 | Send reminder notifications |
| `reminder_hours_before` | int | DEFAULT 24 | Reminder lead time |


#### Table: `salon_categories`

Multi-category classification for salons (one primary, multiple secondary).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Category assignment ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `category_name` | varchar(100) | NOT NULL, indexed | Category name |
| `is_primary` | tinyint(1) | NOT NULL, DEFAULT 0 | Primary category flag |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `salon_amenities`

Amenities offered by a salon (free-text, e.g., "WiFi", "Parking").

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Amenity ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `name` | varchar(100) | NOT NULL | Amenity name |

#### Table: `salon_gallery`

Salon portfolio/gallery images.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Image ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `image_url` | varchar(500) | NOT NULL | Image URL |
| `display_order` | int | DEFAULT 0 | Sort order |

#### Table: `salon_photos`

Salon profile photos (separate from gallery — used for cover/profile images).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Photo ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `image_url` | varchar(255) | NOT NULL | Image URL |
| `is_cover` | tinyint(1) | NOT NULL, DEFAULT 0 | Cover photo flag |

#### Table: `salon_closures`

Full-day closure dates (holidays, renovations).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int unsigned | PK, AUTO_INCREMENT | Closure ID |
| `salon_id` | int unsigned | NOT NULL | Salon |
| `date` | date | NOT NULL | Closed date |
| `reason` | varchar(255) | nullable | Reason |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |

**Unique:** `uq_salon_closure_date` (salon_id, date)

#### Table: `salon_clients`

Junction table tracking the relationship between salons and their clients.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `salon_id` | bigint unsigned | PK (composite), FK → salons.id (CASCADE) | Salon |
| `client_id` | bigint unsigned | PK (composite), FK → users.id (CASCADE) | Client |
| `first_visit_date` | datetime | nullable | First appointment |
| `last_visit_date` | datetime | nullable | Most recent visit |
| `total_visits` | int | NOT NULL, DEFAULT 0 | Visit count |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 | Active relationship |
| `notes` | text | nullable | Internal notes |
| `updated_at` | datetime | nullable, auto-update | Last update |

**Indexes:** `idx_salon_clients_client_id`, `idx_salon_clients_last_visit`, `idx_salon_clients_first_visit`, `idx_salon_clients_salon_visits`, `idx_salon_clients_active`

#### Table: `business_hours`

Weekly operating hours per salon (7 rows per salon, one per day).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Hours ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `day_of_week` | tinyint | NOT NULL | 0=Sunday, 6=Saturday |
| `open_time` | time | nullable | Opening time |
| `close_time` | time | nullable | Closing time |
| `is_closed` | tinyint(1) | DEFAULT 0 | Closed flag |

**Unique:** `uq_salon_day` (salon_id, day_of_week)

---

### Domain Group: Services & Staff

#### Table: `service_categories`

Grouping for services within a salon (e.g., "Hair", "Nails", "Massage").

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Category ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `name` | varchar(100) | NOT NULL | Category name |
| `display_order` | int | DEFAULT 0 | Sort order |

**Unique:** `uq_service_categories` (salon_id, name)

#### Table: `services`

Individual services offered by a salon.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Service ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `category_id` | bigint unsigned | FK → service_categories.id (SET NULL) | Category |
| `name` | varchar(255) | NOT NULL | Service name |
| `duration_minutes` | int | NOT NULL | Duration in minutes |
| `price` | decimal(10,2) | NOT NULL | Base price |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 | Active flag |
| `description` | text | nullable | Description |
| `buffer_time_minutes` | int | DEFAULT 0 | Buffer after service |
| `display_order` | int | DEFAULT 0 | Sort order |
| `deleted_at` | datetime | nullable | Soft delete |
| `is_popular` | tinyint(1) | DEFAULT 0 | Popular flag |
| `offering_type` | enum('physical','mobile','virtual','hybrid') | NOT NULL, DEFAULT 'hybrid' | Legacy fulfillment type |
| `mobile_price_override` | decimal(10,2) | nullable | Mobile-specific price |
| `virtual_price_override` | decimal(10,2) | nullable | Virtual-specific price |
| `can_physical` | tinyint(1) | NOT NULL, DEFAULT 1 | Supports physical |
| `can_mobile` | tinyint(1) | NOT NULL, DEFAULT 1 | Supports mobile |
| `can_virtual` | tinyint(1) | NOT NULL, DEFAULT 1 | Supports virtual |

**Indexes:** `idx_services_salon_id`, `idx_services_category_id`, `idx_services_salon_active`, `idx_services_salon_active_name`, `idx_services_offering`, `idx_services_fulfillment_flags`

#### Table: `staff`

Staff members linked to a salon. Each row represents a user's employment at a specific salon.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Staff record ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `user_id` | bigint unsigned | FK → users.id (RESTRICT), NOT NULL | User account |
| `first_name` | varchar(100) | nullable | Display first name |
| `last_name` | varchar(100) | nullable | Display last name |
| `role` | enum('staff','manager','owner','receptionist') | NOT NULL, DEFAULT 'staff' | Salon role |
| `is_active` | tinyint(1) | NOT NULL, DEFAULT 1 | Active employment |
| `bio` | text | nullable | Staff bio |
| `avatar_url` | varchar(500) | nullable | Profile picture |
| `color` | varchar(7) | DEFAULT '#3B82F6' | Calendar color |
| `display_order` | int | DEFAULT 0 | Sort order |
| `title` | varchar(100) | nullable | Job title |
| `phone_secondary` | varchar(20) | nullable | Secondary phone |
| `country` | varchar(100) | nullable | Country |
| `birthday` | date | nullable | Birthday |
| `start_date` | date | nullable | Employment start |
| `end_date` | date | nullable | Employment end |
| `employment_type` | enum('employee','self_employed') | DEFAULT 'employee' | Employment type |
| `notes` | text | nullable | Internal notes |
| `is_visible` | tinyint(1) | DEFAULT 1 | Visible to clients |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |
| `permissions` | json | nullable | Custom permission overrides |
| `can_physical` | tinyint(1) | NOT NULL, DEFAULT 1 | Can do physical |
| `can_mobile` | tinyint(1) | NOT NULL, DEFAULT 0 | Can do mobile |
| `can_virtual` | tinyint(1) | NOT NULL, DEFAULT 0 | Can do virtual |
| `travel_radius` | int | nullable | Staff travel radius override |
| `home_lat` | decimal(10,7) | nullable | Home latitude |
| `home_lng` | decimal(10,7) | nullable | Home longitude |

**Unique:** `uq_staff_salon_user` (salon_id, user_id), `uq_staff_user_salon` (user_id, salon_id)
**Indexes:** `idx_staff_salon_id`, `idx_staff_user_id`, `idx_staff_visible`, `idx_staff_salon_role_active`, `idx_staff_user_active`

#### Table: `service_staff`

Many-to-many junction: which staff can perform which services.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `service_id` | bigint unsigned | PK (composite), FK → services.id (CASCADE) | Service |
| `staff_id` | bigint unsigned | PK (composite), FK → staff.id (CASCADE) | Staff |

#### Table: `staff_working_hours`

Per-staff weekly schedule (multiple shifts per day supported).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Hours ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `day_of_week` | tinyint | NOT NULL | 0=Sunday, 6=Saturday |
| `start_time` | time | NOT NULL | Shift start |
| `end_time` | time | NOT NULL | Shift end |

**Unique:** `uq_staff_hours` (staff_id, day_of_week, start_time, end_time)

#### Table: `staff_time_off`

Approved time-off periods that block booking availability.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Time-off ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `start_datetime` | datetime | NOT NULL | Start of absence |
| `end_datetime` | datetime | NOT NULL | End of absence |
| `reason` | varchar(255) | nullable | Reason |

**Indexes:** `idx_staff_time_off_staff_id`, `idx_staff_timeoff_range` (staff_id, start, end)

#### Table: `staff_invitations`

Email-based invitations for new staff members to join a salon.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | char(36) | PK | UUID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `email` | varchar(255) | NOT NULL, indexed | Invitee email |
| `role` | enum('staff','manager','owner','receptionist') | NOT NULL, DEFAULT 'staff' | Assigned role |
| `token` | varchar(255) | UNIQUE, NOT NULL | Invitation token |
| `status` | enum('pending','accepted','expired','revoked') | NOT NULL, DEFAULT 'pending' | Status |
| `expires_at` | datetime | NOT NULL | Expiry timestamp |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |
| `message` | varchar(255) | nullable | Personal message |

#### Table: `staff_addresses`

Staff home/work addresses for mobile service distance calculations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Address ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `address_type` | enum('home','work','other') | NOT NULL, DEFAULT 'home' | Type |
| `street_address` | varchar(255) | nullable | Street |
| `city` | varchar(100) | nullable | City |
| `state` | varchar(100) | nullable | State |
| `postal_code` | varchar(20) | nullable | Postal code |
| `country` | varchar(100) | nullable | Country |
| `is_primary` | tinyint(1) | DEFAULT 0 | Primary flag |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |


---

### Domain Group: Bookings & Scheduling

#### Table: `bookings`

The core appointment record.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Booking ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `client_id` | bigint unsigned | FK → users.id (RESTRICT), NOT NULL | Client |
| `staff_id` | bigint unsigned | FK → staff.id (RESTRICT), NOT NULL | Primary staff |
| `start_datetime` | datetime | NOT NULL, indexed | Appointment start |
| `end_datetime` | datetime | NOT NULL | Appointment end |
| `status` | enum('pending','confirmed','completed','cancelled','no_show') | NOT NULL, DEFAULT 'pending' | Lifecycle status |
| `source` | enum('marketplace','direct') | NOT NULL, DEFAULT 'direct' | Booking origin |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |
| `notes` | text | nullable | Client-visible notes |
| `internal_notes` | text | nullable | Staff-only notes |
| `cancelled_at` | datetime | nullable | Cancellation timestamp |
| `cancelled_by` | bigint unsigned | nullable | Who cancelled |
| `cancellation_reason` | text | nullable | Reason for cancellation |
| `deleted_at` | datetime | nullable | Soft delete |
| `fulfillment_type` | enum('physical','mobile','virtual') | NOT NULL, DEFAULT 'physical' | How fulfilled |
| `service_location_address` | text | nullable | Client address (mobile) |
| `service_lat` | decimal(10,7) | nullable | Client latitude (mobile) |
| `service_lng` | decimal(10,7) | nullable | Client longitude (mobile) |
| `client_timezone` | varchar(50) | nullable | Client timezone (virtual) |
| `virtual_meeting_link` | text | nullable | Meeting link (virtual) |
| `travel_fee_amount` | decimal(10,2) | NOT NULL, DEFAULT 0.00 | Travel fee snapshot |
| `travel_distance_km` | decimal(8,2) | nullable | Distance snapshot |

**Indexes:** `idx_bookings_salon_id`, `idx_bookings_client_id`, `idx_bookings_staff_id`, `idx_bookings_start`, `idx_bookings_staff_datetime_status`, `idx_bookings_salon_datetime`, `idx_bookings_client_status`, `idx_bookings_fulfillment`

#### Table: `booking_services`

Per-service line items within a booking (supports multi-service bookings with different staff per service).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `booking_id` | bigint unsigned | PK (composite), FK → bookings.id (CASCADE) | Booking |
| `service_id` | bigint unsigned | PK (composite), FK → services.id (RESTRICT) | Service |
| `staff_id` | bigint unsigned | FK → staff.id (SET NULL), nullable | Per-service staff override |
| `start_datetime` | datetime | NOT NULL | Service start time |
| `end_datetime` | datetime | NOT NULL | Service end time |
| `price` | decimal(10,2) | NOT NULL | Price snapshot at booking time |
| `duration_minutes` | int | NOT NULL | Duration snapshot |

#### Table: `booking_products`

Products sold during a booking (upsells at checkout).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Line item ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), NOT NULL | Booking |
| `product_id` | bigint unsigned | FK → products.id (RESTRICT), NOT NULL | Product |
| `quantity` | int | NOT NULL, DEFAULT 1 | Quantity |
| `unit_price` | decimal(10,2) | NOT NULL | Unit price snapshot |
| `total_price` | decimal(10,2) | NOT NULL | Line total |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `booking_resources`

Resources (rooms, chairs, equipment) allocated to a booking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Allocation ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), NOT NULL | Booking |
| `resource_id` | bigint unsigned | FK → resources.id (RESTRICT), NOT NULL | Resource |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

**Unique:** `uq_booking_resource` (booking_id, resource_id)

#### Table: `booking_travel_fees`

Travel fee line items for mobile bookings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Fee ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), NOT NULL | Booking |
| `fee_type` | enum('fixed','per_km') | NOT NULL, DEFAULT 'fixed' | Fee calculation type |
| `distance_km` | decimal(8,2) | nullable | Calculated distance |
| `amount` | decimal(10,2) | NOT NULL, DEFAULT 0.00 | Fee amount |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

**Unique:** `uq_booking_travel_fee` (booking_id)

#### Table: `booking_discounts`

Discount codes applied to bookings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Record ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), NOT NULL | Booking |
| `discount_id` | bigint unsigned | FK → discounts.id (RESTRICT), NOT NULL | Discount |
| `discount_code` | varchar(50) | NOT NULL | Code snapshot |
| `discount_type` | enum('percentage','fixed') | NOT NULL | Type snapshot |
| `discount_value` | decimal(10,2) | NOT NULL | Value snapshot |
| `amount_saved` | decimal(10,2) | NOT NULL | Actual savings |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `booking_gift_cards`

Gift card redemptions applied to bookings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Record ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), NOT NULL | Booking |
| `gift_card_id` | bigint unsigned | FK → gift_cards.id (RESTRICT), NOT NULL | Gift card |
| `amount_used` | decimal(10,2) | NOT NULL | Amount deducted |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `resources`

Physical resources (rooms, chairs, equipment) that can be allocated to bookings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Resource ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `name` | varchar(255) | NOT NULL | Resource name |
| `type` | enum('room','chair','equipment','other') | NOT NULL | Resource type |
| `description` | text | nullable | Description |
| `capacity` | int | DEFAULT 1 | Capacity |
| `color` | varchar(7) | DEFAULT '#6B7280' | Calendar color |
| `is_active` | tinyint(1) | DEFAULT 1 | Active flag |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `resource_blocks`

Time blocks when a resource is unavailable (maintenance, reserved).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Block ID |
| `resource_id` | bigint unsigned | FK → resources.id (CASCADE), NOT NULL | Resource |
| `start_time` | datetime | NOT NULL | Block start |
| `end_time` | datetime | NOT NULL | Block end |
| `reason` | varchar(255) | nullable | Reason |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `waitlist`

Client waitlist entries for preferred dates/times.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Waitlist ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `client_id` | bigint unsigned | FK → users.id (CASCADE), NOT NULL | Client |
| `service_id` | bigint unsigned | FK → services.id (SET NULL), nullable | Preferred service |
| `staff_id` | bigint unsigned | FK → staff.id (SET NULL), nullable | Preferred staff |
| `preferred_date` | date | NOT NULL | Desired date |
| `preferred_time_start` | time | nullable | Earliest acceptable time |
| `preferred_time_end` | time | nullable | Latest acceptable time |
| `notes` | text | nullable | Client notes |
| `status` | enum('pending','notified','booked','expired','cancelled') | DEFAULT 'pending' | Status |
| `notified_at` | datetime | nullable | When notified |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `last_minute_slots`

Discounted last-minute availability slots.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Slot ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `service_id` | bigint unsigned | FK → services.id (CASCADE), NOT NULL | Service |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `start_time` | datetime | NOT NULL | Slot start |
| `end_time` | datetime | NOT NULL | Slot end |
| `original_price` | decimal(10,2) | NOT NULL | Original price |
| `discounted_price` | decimal(10,2) | NOT NULL | Discounted price |
| `discount_percent` | int | NOT NULL | Discount percentage |
| `is_booked` | tinyint(1) | DEFAULT 0 | Booked flag |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `expires_at` | datetime | NOT NULL | Expiry time |

---

### Domain Group: Financials & Payments

#### Table: `payments`

Payment records for completed bookings.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Payment ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), UNIQUE, NOT NULL | Booking (1:1) |
| `amount` | decimal(10,2) | NOT NULL | Charged amount |
| `method` | enum('card','cash') | NOT NULL | Payment method |
| `status` | enum('pending','paid','refunded') | NOT NULL, DEFAULT 'pending' | Payment status |
| `stripe_payment_id` | varchar(255) | nullable, indexed | Stripe payment intent ID |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |
| `refunded_amount` | decimal(10,2) | DEFAULT 0.00 | Total refunded |
| `tip_amount` | decimal(10,2) | DEFAULT 0.00 | Tip amount |
| `client_package_id` | bigint unsigned | nullable | Package used for payment |
| `notes` | text | nullable | Payment notes |

**Unique:** `uq_payments_booking` (booking_id)

#### Table: `refunds`

Refund records linked to payments.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Refund ID |
| `payment_id` | bigint unsigned | FK → payments.id (CASCADE), NOT NULL | Payment |
| `amount` | decimal(10,2) | NOT NULL | Refund amount |
| `reason` | text | nullable | Reason |
| `stripe_refund_id` | varchar(255) | nullable | Stripe refund ID |
| `status` | enum('pending','processing','completed','failed') | DEFAULT 'pending' | Status |
| `processed_by` | bigint unsigned | FK → users.id (SET NULL), nullable | Who processed |
| `failure_reason` | text | nullable | Failure reason |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `processed_at` | datetime | nullable | Processing timestamp |

#### Table: `platform_fees`

Fees charged by the Fresh platform to salons.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Fee ID |
| `booking_id` | bigint unsigned | FK → bookings.id (CASCADE), NOT NULL | Booking |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `type` | enum('new_client','payment_processing') | NOT NULL | Fee type |
| `amount` | decimal(10,2) | NOT NULL | Fee amount |
| `is_paid` | tinyint(1) | NOT NULL, DEFAULT 0 | Paid flag |

#### Table: `payouts`

Payouts from the platform to salon owners.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Payout ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `amount` | decimal(10,2) | NOT NULL | Payout amount |
| `currency` | varchar(3) | DEFAULT 'EUR' | Currency |
| `status` | enum('pending','processing','completed','failed') | DEFAULT 'pending' | Status |
| `method` | enum('bank_transfer','stripe','manual') | DEFAULT 'bank_transfer' | Method |
| `reference` | varchar(255) | nullable | Reference number |
| `bank_account_last4` | varchar(4) | nullable | Last 4 digits |
| `period_start` | date | NOT NULL | Period start |
| `period_end` | date | NOT NULL | Period end |
| `bookings_count` | int | DEFAULT 0 | Bookings in period |
| `gross_amount` | decimal(10,2) | NOT NULL | Gross revenue |
| `platform_fees` | decimal(10,2) | DEFAULT 0.00 | Platform fees deducted |
| `refunds_amount` | decimal(10,2) | DEFAULT 0.00 | Refunds deducted |
| `net_amount` | decimal(10,2) | NOT NULL | Net payout |
| `failure_reason` | text | nullable | Failure reason |
| `processed_at` | datetime | nullable | Processing timestamp |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `platform_settings`

Global platform configuration key-value store.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Setting ID |
| `setting_key` | varchar(100) | UNIQUE, NOT NULL | Setting key |
| `setting_value` | text | nullable | Setting value |
| `value_type` | enum('string','number','boolean','json') | DEFAULT 'string' | Value type |
| `description` | text | nullable | Description |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |


---

### Domain Group: Marketing & Promotions

#### Table: `discounts`

Salon-specific discount codes.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Discount ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `code` | varchar(50) | NOT NULL | Discount code |
| `name` | varchar(255) | NOT NULL | Display name |
| `description` | text | nullable | Description |
| `type` | enum('percentage','fixed') | NOT NULL, DEFAULT 'percentage' | Discount type |
| `value` | decimal(10,2) | NOT NULL | Discount value |
| `min_purchase` | decimal(10,2) | nullable | Minimum purchase |
| `max_discount` | decimal(10,2) | nullable | Maximum discount cap |
| `start_date` | date | nullable | Valid from |
| `end_date` | date | nullable | Valid until |
| `max_uses` | int | nullable | Total usage limit |
| `max_uses_per_client` | int | nullable | Per-client limit |
| `current_uses` | int | DEFAULT 0 | Current usage count |
| `is_active` | tinyint(1) | DEFAULT 1 | Active flag |
| `applies_to_services` | tinyint(1) | DEFAULT 1 | Applies to services |
| `applies_to_products` | tinyint(1) | DEFAULT 1 | Applies to products |
| `first_booking_only` | tinyint(1) | DEFAULT 0 | First booking restriction |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |
| `deleted_at` | datetime | nullable | Soft delete |

**Unique:** `uq_discount_code_salon` (salon_id, code)

#### Table: `discount_services`

Junction: which services a discount applies to (when not all).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `discount_id` | bigint unsigned | PK (composite), FK → discounts.id (CASCADE) | Discount |
| `service_id` | bigint unsigned | PK (composite), FK → services.id (CASCADE) | Service |

#### Table: `discount_products`

Junction: which products a discount applies to (when not all).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `discount_id` | bigint unsigned | PK (composite), FK → discounts.id (CASCADE) | Discount |
| `product_id` | bigint unsigned | PK (composite), FK → products.id (CASCADE) | Product |

#### Table: `global_discounts`

Platform-wide promo codes (applied at checkout, cost absorbed by platform).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, AUTO_INCREMENT | Promo ID |
| `code` | varchar(50) | UNIQUE, NOT NULL | Promo code |
| `type` | enum('fixed','percentage') | NOT NULL | Discount type |
| `value` | decimal(10,2) | NOT NULL | Discount value |
| `min_purchase` | decimal(10,2) | DEFAULT 0.00 | Minimum purchase |
| `max_uses` | int | nullable | Usage limit |
| `current_uses` | int | DEFAULT 0 | Current usage |
| `is_active` | tinyint(1) | DEFAULT 1 | Active flag |
| `start_date` | date | nullable | Valid from |
| `end_date` | date | nullable | Valid until |
| `created_at` | timestamp | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | timestamp | auto-update | Updated |

#### Table: `gift_cards`

Salon-specific gift cards with balance tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Gift card ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `code` | varchar(50) | UNIQUE, NOT NULL | Redemption code |
| `initial_balance` | decimal(10,2) | NOT NULL | Original balance |
| `remaining_balance` | decimal(10,2) | NOT NULL | Current balance |
| `purchased_by` | bigint unsigned | FK → users.id (SET NULL), nullable | Purchaser |
| `recipient_email` | varchar(255) | nullable | Recipient email |
| `recipient_name` | varchar(255) | nullable | Recipient name |
| `recipient_message` | text | nullable | Personal message |
| `status` | enum('active','used','expired','cancelled') | DEFAULT 'active' | Status |
| `expires_at` | datetime | nullable | Expiry date |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `packages`

Service bundles sold at a discounted price.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Package ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `name` | varchar(255) | NOT NULL | Package name |
| `description` | text | nullable | Description |
| `original_price` | decimal(10,2) | NOT NULL | Original total price |
| `discounted_price` | decimal(10,2) | NOT NULL | Bundle price |
| `validity_days` | int | nullable | Days valid after purchase |
| `max_uses` | int | nullable | Maximum redemptions |
| `is_active` | tinyint(1) | DEFAULT 1 | Active flag |
| `image_url` | varchar(500) | nullable | Package image |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `package_services`

Junction: services included in a package.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Record ID |
| `package_id` | bigint unsigned | FK → packages.id (CASCADE), NOT NULL | Package |
| `service_id` | bigint unsigned | FK → services.id (CASCADE), NOT NULL | Service |
| `quantity` | int | NOT NULL, DEFAULT 1 | Quantity included |

**Unique:** `uq_package_service` (package_id, service_id)

#### Table: `client_packages`

Purchased package instances owned by clients.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Purchase ID |
| `client_id` | bigint unsigned | FK → users.id (CASCADE), NOT NULL | Client |
| `package_id` | bigint unsigned | FK → packages.id (RESTRICT), NOT NULL | Package |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `purchase_price` | decimal(10,2) | NOT NULL | Price paid |
| `remaining_uses` | int | nullable | Remaining uses |
| `status` | enum('active','expired','used','cancelled') | DEFAULT 'active' | Status |
| `expires_at` | datetime | nullable | Expiry date |
| `payment_id` | bigint unsigned | nullable | Payment reference |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `campaigns`

Marketing campaigns (email, SMS, push).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Campaign ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `name` | varchar(255) | NOT NULL | Campaign name |
| `type` | enum('email','sms','push') | NOT NULL, DEFAULT 'email' | Channel |
| `subject` | varchar(255) | nullable | Email subject |
| `content` | text | NOT NULL | Message content |
| `target_audience` | enum('all','new','returning','inactive') | DEFAULT 'all' | Audience segment |
| `status` | enum('draft','scheduled','sending','completed','cancelled') | DEFAULT 'draft' | Status |
| `scheduled_at` | datetime | nullable | Scheduled send time |
| `completed_at` | datetime | nullable | Completion time |
| `recipient_count` | int | DEFAULT 0 | Total recipients |
| `sent_count` | int | DEFAULT 0 | Sent count |
| `open_count` | int | DEFAULT 0 | Opens |
| `click_count` | int | DEFAULT 0 | Clicks |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

---

### Domain Group: Products & Inventory

#### Table: `product_categories`

Product category groupings per salon.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Category ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `name` | varchar(100) | NOT NULL | Category name |
| `display_order` | int | DEFAULT 0 | Sort order |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `products`

Physical products sold by salons (retail inventory).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Product ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `category_id` | bigint unsigned | FK → product_categories.id (SET NULL), nullable | Category |
| `name` | varchar(255) | NOT NULL | Product name |
| `description` | text | nullable | Description |
| `price` | decimal(10,2) | NOT NULL | Selling price |
| `cost_price` | decimal(10,2) | nullable | Cost price (for margin calc) |
| `sku` | varchar(100) | nullable, indexed | Stock keeping unit |
| `barcode` | varchar(100) | nullable | Barcode |
| `stock_quantity` | int | DEFAULT 0 | Current stock |
| `low_stock_threshold` | int | DEFAULT 5 | Low stock alert threshold |
| `is_active` | tinyint(1) | DEFAULT 1 | Active flag |
| `image_url` | varchar(500) | nullable | Product image |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |
| `deleted_at` | datetime | nullable | Soft delete |

---

### Domain Group: HR & Payroll

#### Table: `staff_wages`

Staff compensation configuration.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Wage ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `wage_type` | enum('hourly','salary','commission_only') | NOT NULL, DEFAULT 'hourly' | Compensation type |
| `hourly_rate` | decimal(10,2) | nullable | Hourly rate |
| `salary_amount` | decimal(10,2) | nullable | Salary amount |
| `salary_period` | enum('weekly','biweekly','monthly','annual') | DEFAULT 'monthly' | Salary period |
| `currency` | varchar(3) | DEFAULT 'USD' | Currency |
| `effective_from` | date | NOT NULL | Effective start |
| `effective_to` | date | nullable | Effective end |
| `notes` | text | nullable | Notes |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |

#### Table: `staff_commissions`

Commission rate configuration per staff member.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Commission ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `commission_type` | enum('percentage','fixed') | NOT NULL, DEFAULT 'percentage' | Type |
| `service_commission` | decimal(5,2) | DEFAULT 0.00 | Service commission % |
| `product_commission` | decimal(5,2) | DEFAULT 0.00 | Product commission % |
| `tip_commission` | decimal(5,2) | DEFAULT 100.00 | Tip commission % |
| `effective_from` | date | NOT NULL | Effective start |
| `effective_to` | date | nullable | Effective end |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |

#### Table: `staff_timesheets`

Clock-in/clock-out records for time tracking.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Timesheet ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `clock_in` | datetime | NOT NULL | Clock-in time |
| `clock_out` | datetime | nullable | Clock-out time |
| `break_duration` | int | DEFAULT 0 | Break minutes |
| `total_hours` | decimal(5,2) | nullable | Total hours worked |
| `notes` | text | nullable | Notes |
| `status` | enum('clocked_in','clocked_out','approved','disputed') | DEFAULT 'clocked_in' | Status |
| `approved_by` | bigint unsigned | nullable | Approver |
| `approved_at` | datetime | nullable | Approval time |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |

#### Table: `staff_pay_runs`

Payroll run records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Pay run ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `pay_period_start` | date | NOT NULL | Period start |
| `pay_period_end` | date | NOT NULL | Period end |
| `pay_date` | date | NOT NULL | Payment date |
| `status` | enum('draft','processing','completed','cancelled') | DEFAULT 'draft' | Status |
| `total_amount` | decimal(12,2) | DEFAULT 0.00 | Total payout |
| `currency` | varchar(3) | DEFAULT 'USD' | Currency |
| `notes` | text | nullable | Notes |
| `created_by` | bigint unsigned | nullable | Creator |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |

#### Table: `staff_pay_run_items`

Individual staff line items within a pay run.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Item ID |
| `pay_run_id` | bigint unsigned | FK → staff_pay_runs.id (CASCADE), NOT NULL | Pay run |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `base_pay` | decimal(10,2) | DEFAULT 0.00 | Base pay |
| `commission_amount` | decimal(10,2) | DEFAULT 0.00 | Commission earned |
| `bonus_amount` | decimal(10,2) | DEFAULT 0.00 | Bonus |
| `tips_amount` | decimal(10,2) | DEFAULT 0.00 | Tips |
| `deductions_amount` | decimal(10,2) | DEFAULT 0.00 | Deductions |
| `total_pay` | decimal(10,2) | DEFAULT 0.00 | Net pay |
| `hours_worked` | decimal(6,2) | nullable | Hours worked |
| `notes` | text | nullable | Notes |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |

#### Table: `staff_emergency_contacts`

Emergency contact information for staff members.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Contact ID |
| `staff_id` | bigint unsigned | FK → staff.id (CASCADE), NOT NULL | Staff |
| `contact_name` | varchar(150) | NOT NULL | Contact name |
| `relationship` | varchar(100) | nullable | Relationship |
| `phone_primary` | varchar(20) | NOT NULL | Primary phone |
| `phone_secondary` | varchar(20) | nullable | Secondary phone |
| `email` | varchar(255) | nullable | Email |
| `is_primary` | tinyint(1) | DEFAULT 0 | Primary contact flag |
| `notes` | text | nullable | Notes |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | datetime | auto-update | Updated |

---

### Domain Group: Reviews & Notifications

#### Table: `reviews`

Client reviews for salons (with moderation support).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Review ID |
| `salon_id` | bigint unsigned | FK → salons.id (CASCADE), NOT NULL | Salon |
| `client_id` | bigint unsigned | FK → users.id (CASCADE), NOT NULL | Reviewer |
| `rating` | int | NOT NULL | Rating (1-5) |
| `comment` | text | nullable | Review text |
| `created_at` | datetime | NOT NULL, DEFAULT CURRENT_TIMESTAMP | Created |
| `status` | enum('pending','approved','flagged','removed') | DEFAULT 'approved' | Moderation status |
| `moderation_note` | text | nullable | Moderator note |
| `moderated_by` | bigint unsigned | nullable | Moderator |
| `moderated_at` | datetime | nullable | Moderation time |
| `booking_id` | bigint unsigned | nullable | Related booking |
| `owner_reply` | text | nullable | Owner's reply |
| `owner_reply_at` | datetime | nullable | Reply timestamp |
| `staff_id` | int | nullable | Reviewed staff |
| `service_id` | int | nullable | Reviewed service |
| `deleted_at` | datetime | nullable | Soft delete |

#### Table: `notifications`

In-app notification records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Notification ID |
| `user_id` | bigint unsigned | FK → users.id (CASCADE), NOT NULL | Recipient |
| `type` | enum('email','sms','push') | NOT NULL | Channel |
| `title` | varchar(255) | NOT NULL | Title |
| `message` | text | NOT NULL | Message body |
| `sent_at` | datetime | nullable | Send time |
| `is_read` | tinyint(1) | DEFAULT 0 | Read flag |
| `data` | json | nullable | Structured metadata |
| `read_at` | datetime | nullable | Read timestamp |
| `is_system_banner` | tinyint(1) | DEFAULT 0 | System banner flag |

---

### Domain Group: Support & Audit

#### Table: `support_tickets`

User support tickets.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | int | PK, AUTO_INCREMENT | Ticket ID |
| `user_id` | bigint unsigned | FK → users.id (CASCADE), NOT NULL | Reporter |
| `subject` | varchar(255) | NOT NULL | Subject |
| `description` | text | NOT NULL | Description |
| `status` | enum('open','in_progress','resolved','closed') | DEFAULT 'open' | Status |
| `priority` | enum('low','normal','high','urgent') | DEFAULT 'normal' | Priority |
| `created_at` | timestamp | DEFAULT CURRENT_TIMESTAMP | Created |
| `updated_at` | timestamp | auto-update | Updated |

#### Table: `audit_logs`

System-wide audit trail for all significant actions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | bigint unsigned | PK, AUTO_INCREMENT | Log ID |
| `user_id` | bigint unsigned | nullable | Actor |
| `action` | varchar(50) | NOT NULL | Action type |
| `entity_type` | varchar(50) | NOT NULL | Entity type |
| `entity_id` | bigint unsigned | nullable | Entity ID |
| `old_data` | json | nullable | Previous state |
| `new_data` | json | nullable | New state |
| `ip_address` | varchar(45) | nullable | Client IP |
| `user_agent` | text | nullable | User agent |
| `created_at` | datetime | DEFAULT CURRENT_TIMESTAMP | Timestamp |

**Indexes:** `idx_audit_logs_user`, `idx_audit_logs_entity`, `idx_audit_logs_created`, `idx_audit_logs_entity_date`, `idx_audit_logs_user_date`

---

### Domain Group: Widget & Embeds

#### Table: `widget_settings`

Configuration for the embeddable booking widget (1:1 with salons).

| Column | Type | Constraints | Description |
|---|---|---|---|
| `salon_id` | bigint unsigned | PK, FK → salons.id (CASCADE) | Salon |
| `enabled` | tinyint(1) | DEFAULT 1 | Widget enabled |
| `primary_color` | varchar(20) | DEFAULT '#000000' | Primary color |
| `secondary_color` | varchar(20) | DEFAULT '#FFFFFF' | Secondary color |
| `button_text` | varchar(100) | DEFAULT 'Book Now' | CTA text |
| `show_services` | tinyint(1) | DEFAULT 1 | Show services |
| `show_staff` | tinyint(1) | DEFAULT 1 | Show staff |
| `show_prices` | tinyint(1) | DEFAULT 1 | Show prices |
| `require_phone` | tinyint(1) | DEFAULT 1 | Require phone |
| `require_email` | tinyint(1) | DEFAULT 1 | Require email |
| `allow_notes` | tinyint(1) | DEFAULT 1 | Allow notes |
| `terms_url` | varchar(500) | nullable | Terms URL |
| `success_message` | text | nullable | Success message |

---

**Total Tables: 43**


## 6. Core Library (`/src/lib`) Deep-Dive

### `db.js` — Database Connection Layer

Exports a MySQL connection pool (mysql2/promise) with the following configuration:
- **Connection limit:** 10 concurrent connections
- **Wait for connections:** true (queues requests when pool is exhausted)
- **Date strings:** true (returns dates as strings, not JS Date objects)
- **Supports both URI and individual host/port/user/password configuration**

Exported functions:
- `query(sql, params)` — Executes a query using `pool.query()` (not `pool.execute()`) for better type coercion with LIMIT/OFFSET parameters. Returns the results array.
- `getOne(sql, params)` — Executes a query and returns the first row or null.
- `transaction(callback)` — Acquires a connection, begins a transaction, executes the callback with the connection, commits on success, rolls back on error, and always releases the connection.
- `withConnection(callback)` — Acquires a connection for session-level operations without transaction overhead. Guarantees release in `finally`.

### `auth.js` — Authentication & Session Management

- **JWT Secret:** Loaded from `JWT_SECRET` env var. Must be at least 32 characters. Encoded as UTF-8 for HMAC-SHA256.
- `hashPassword(password)` — bcrypt hash with cost factor 12.
- `verifyPassword(password, hash)` — bcrypt compare.
- `createToken(payload, { expiresIn })` — Creates a signed JWT (HS256) with configurable expiry (default: 7 days).
- `verifyToken(token)` — Verifies and decodes a JWT. Returns payload or null.
- `getSession()` — Resolves the current user session. Checks Authorization Bearer header first (for API/mobile clients), then falls back to the `token` cookie (for browser clients).
- `requireAuth()` — Calls `getSession()` and throws "Unauthorized" if no session.
- `requireRole(allowedRoles)` — Calls `requireAuth()` and throws "Forbidden" if the user's role is not in the allowed list.
- `verifyAuth(request)` — Request-based auth verification (checks header, cookie header parsing, then falls back to `getSession()`).

### `booking.js` — Booking Transaction Engine

The heart of the scheduling system. Contains the `createSafeBooking()` function which implements a multi-step transactional booking creation with full concurrency protection.

**`createSafeBooking` Parameters:**
- `salonId`, `clientId`, `primaryStaffId`, `startDatetime`, `endDatetime`
- `services[]` — Array of `{ serviceId, staffId, price, duration, bufferTime }`
- `notes`, `status` (default: "confirmed"), `source` (default: "direct")
- `isMarketplaceEnabled`, `discountCode`, `giftCardCode`
- `fulfillmentType` (physical/mobile/virtual)
- `serviceLocationAddress`, `serviceLat`, `serviceLng`
- `clientTimezone`, `virtualMeetingLink`
- `forceOverride` — Allows staff to override travel feasibility warnings

**Transaction Flow (10 Steps):**

1. **Input Validation** — Validates required fields, service array, prices (non-negative), total duration > 0.
2. **Service Fulfillment Compatibility** — Checks each service's `can_physical`/`can_mobile`/`can_virtual` flags against the requested fulfillment type. Fast-fails before transaction.
3. **Datetime Parsing** — Parses `startDatetime` as local calendar time. Computes `endDate` from service durations + buffers. Rejects bookings > 24h in the past.
4. **Smart Staff Assignment (Load Balancer)** — For services with `staffId = "ANYONE_VIRTUAL"` or `"any"`, dynamically selects the available staff member with the lowest workload for the day. Checks working hours, time-off, existing bookings, and in-flight assignments within the same request.
5. **Working Hours Check** — Validates each staff member's service windows against their working hours (with travel buffer padding for mobile bookings). Falls back to salon business hours if staff-specific hours are not set.
6. **Travel Radius Validation** — For mobile bookings, checks if the client's location is within the salon's travel radius using Haversine distance.
7. **Staff-Service Authorization** — Batch-verifies all (staff_id, service_id) pairs exist in `service_staff` junction table.
8. **Transaction with Row Locking:**
   - Locks staff rows with `SELECT ... FOR UPDATE` to prevent race conditions.
   - Per-service conflict check: Validates no overlapping bookings for each staff member's specific time windows using `booking_services.start_datetime`/`end_datetime`.
   - In-transaction travel validation: For mobile bookings, checks bidirectional travel feasibility against adjacent bookings (3-hour window).
   - Staff time-off check inside transaction.
   - Discount validation and atomic usage increment (with `FOR UPDATE` lock).
   - Gift card validation and atomic balance deduction (with `FOR UPDATE` lock).
9. **Insert Operations:**
   - Inserts `bookings` row with all fulfillment metadata.
   - Bulk-inserts all `booking_services` rows in a single multi-row statement.
   - Inserts `booking_discounts` and updates `discounts.current_uses`.
   - Inserts `booking_gift_cards`, updates `gift_cards.remaining_balance`, and records in audit ledger.
   - Calculates and inserts `booking_travel_fees` for mobile bookings.
   - Upserts `salon_clients` (INSERT ... ON DUPLICATE KEY UPDATE).
   - Inserts `platform_fees` for new marketplace clients (20% acquisition fee).
10. **Commit** — On success, returns `{ bookingId, totalPrice, totalDuration, isNewClient, discountAmount, giftCardAmountUsed, finalAmountDue }`.

**Error Handling:** All errors trigger rollback. The connection is always released in `finally`. Custom `BookingError` class carries error codes for client-friendly messages.

**Concurrency Protection:**
- `SELECT ... FOR UPDATE` on staff rows prevents double-booking race conditions.
- `SELECT ... FOR UPDATE` on discount and gift card rows prevents over-redemption.
- In-flight assignment tracking prevents assigning the same staff to overlapping services within a single multi-service booking request.

### `checkout.js` — Payment Processing

**`calculateBookingTotal(bookingId, conn)`:**
Computes the final amount due by summing:
- Services total (from `booking_services.price`)
- Products total (from `booking_products.total_price`)
- Travel fees (from `booking_travel_fees.amount`)
- Minus: Discounts (from `booking_discounts.amount_saved`)
- Minus: Gift cards (from `booking_gift_cards.amount_used`)
- Result is floored at 0 (never negative).

**`processCheckout(bookingId, { method, tipAmount, promoCode }, conn)`:**
1. Locks the booking row with `FOR UPDATE`.
2. Validates booking status is "confirmed" (rejects other statuses).
3. Checks for existing paid payment (prevents double-charge).
4. Calculates total from DB (authoritative, not from client).
5. Validates and applies global promo code if provided (with `FOR UPDATE` lock).
6. Inserts payment record (with `ON DUPLICATE KEY UPDATE` for idempotency).
7. If promo applied: inserts negative platform fee (platform absorbs cost) and increments usage.
8. Marks booking as "completed".
9. Updates `salon_clients.total_visits` and `last_visit_date`.
10. Returns payment details, booking status, and full breakdown.

**`addProductToBooking(bookingId, productId, quantity, salonId, conn)`:**
Adds a product line item to a booking during checkout. Validates product exists, belongs to the salon, is active, and has sufficient stock. Decrements stock atomically.

### `client.js` — Client Management

**`findOrCreateClient({ email, firstName, lastName, phone, salonId })`:**
- Normalizes phone number format.
- Searches for existing user by email.
- If found: returns existing user, upserts `salon_clients` relationship.
- If not found: creates new user with `role = 'client'`, generates a random password hash, creates `salon_clients` relationship.
- Returns `{ user, isNew }`.

### `permissions.js` — Role-Based Access Control (Client-Safe)

Exports the full permission engine used by both client components (sidebar visibility) and server-side authorization:

- `ROLE_RANK` — Hierarchy: staff(1) < receptionist(2) < manager(3) < owner(4)
- `hasMinRole(currentRole, requiredRole)` — Checks if current role rank >= required rank.
- `PERMISSION_KEYS` — Object defining all 17 permission keys with labels, descriptions, categories, and role-default functions.
- `resolvePermission(staffRole, customPermissions, key)` — Core resolution: owner always true → check custom override → fall back to role default.
- `getDefaultPermissions(role)` — Returns all permission defaults for a role.
- `getPermissionsByCategory()` — Groups permissions by category for settings UI.
- `getVisibleSidebarItems(navItems, staffRole, customPermissions)` — Filters navigation items by permission.
- `getVisibleSettingsItems(settingsNav, staffRole, customPermissions)` — Filters settings items.
- `canAccessPage(staffRole, pageName, customPermissions)` — Page-level access check.
- `canEditServices`, `canCreateBookingsForOthers`, `canSeeAllBookings`, `canSeeAllCalendar`, `canSeeFinancials`, `canManageTeam`, `canAddLocation`, `canAccessDangerZone`, `canManageGallery` — Convenience wrappers.

### `permissions-server.js` — Server-Side Authorization

**`assertSalonAccess({ session, salonId, perm, ownerOnly })`:**
The centralized authorization gate for all salon-scoped API endpoints. Performs the full decision matrix (documented in Section 4). Returns `{ ok, status, role, salonId }` or `{ ok: false, code, status }`.

### `gift-card-ledger.js` — Gift Card Audit Trail

**`recordGiftCardTransaction({ giftCardId, type, amount, balanceAfter, referenceType, referenceId, notes, createdBy, conn })`:**
Records every balance change in the `gift_card_transactions` table. Supports transaction types: purchase, redemption, refund, manual_adjustment, expiry. Accepts an optional connection for use within existing transactions.

### `stripe.js` — Stripe Client

Initializes the Stripe SDK with:
- API version: `2023-10-16`
- App info: `Fresh Platform v0.1.0`
- Secret key from `STRIPE_SECRET_KEY` env var (throws on missing).

### `geo.js` — Geographic Utilities

- `haversineDistanceKm(lat1, lng1, lat2, lng2)` — Calculates great-circle distance between two coordinates.
- `calculateTravelFee(feeType, feeAmount, salonLat, salonLng, clientLat, clientLng)` — Computes travel fee based on fee type (fixed returns feeAmount directly, per_km multiplies distance by rate).
- `isValidCoordinatePair(lat, lng)` — Validates coordinate values are within valid ranges.

### `travel.js` — Travel Feasibility

**`checkBidirectionalTravel({ prevLat, prevLng, prevEndTime, newLat, newLng, newStartTime, newEndTime, nextLat, nextLng, nextStartTime, baseLat, baseLng, salonBufferTime })`:**
Validates that a staff member can physically travel between consecutive mobile bookings. Checks both arrival (from previous booking to new location) and departure (from new location to next booking). Uses average travel speed assumptions to determine feasibility.

### `email.js` — Email Delivery

Wraps the Resend SDK for transactional email sending. Uses templates defined in `constants/email-templates.js`.

### `notifications.js` — In-App Notifications

Creates notification records in the `notifications` table for real-time in-app notification delivery.

### `rate-limit.js` — API Rate Limiting

Implements request rate limiting for API endpoints to prevent abuse.

### `response.js` — Standardized API Responses

Helper functions for consistent API response formatting: `success()`, `error()`, `unauthorized()`, `forbidden()`, `notFound()`, `validationError()`.

### `validate.js` — Input Validation

Validation utilities for common input patterns (email, phone, required fields).

### `format.js` — Formatting Utilities

Number and date formatting helpers for display purposes.

### `csv.js` — CSV Export

Utilities for generating CSV exports (products, payments).

### `id.js` — ID Generation

Utilities for generating unique identifiers (gift card codes, invitation tokens).

---

## 7. API Routes Map


### Authentication Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| POST | `/api/auth/register` | Create new user account | Public |
| POST | `/api/auth/login` | Authenticate and receive JWT | Public |
| POST | `/api/auth/logout` | Clear session cookie | Any authenticated |
| GET | `/api/auth/me` | Get current user profile | Any authenticated |
| PATCH | `/api/auth/me` | Update current user profile | Any authenticated |
| PUT | `/api/auth/me/password` | Change password | Any authenticated |
| POST | `/api/auth/forgot-password` | Request password reset email | Public |
| POST | `/api/auth/reset-password` | Reset password with token | Public |
| POST | `/api/auth/verify-email` | Verify email with token | Public |
| POST | `/api/auth/resend-verification` | Resend verification email | Any authenticated |
| GET | `/api/auth/check` | Check if session is valid | Public |
| POST | `/api/auth/refresh` | Refresh JWT token | Any authenticated |
| POST | `/api/auth/upgrade` | Upgrade client to owner role | client |

### Booking Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/bookings` | List bookings (salon-scoped) | owner, staff, admin |
| POST | `/api/bookings` | Create new booking | owner, staff, admin |
| GET | `/api/bookings/[id]` | Get booking details | owner, staff, admin |
| PATCH | `/api/bookings/[id]` | Update booking (notes, status) | owner, staff, admin |
| DELETE | `/api/bookings/[id]` | Soft-delete (cancel) booking | owner, staff, admin |
| POST | `/api/bookings/[id]/confirm` | Confirm pending booking | owner, staff, admin |
| POST | `/api/bookings/[id]/no-show` | Mark as no-show | owner, staff, admin |
| POST | `/api/bookings/[id]/reschedule` | Reschedule booking | owner, staff, admin |
| POST | `/api/bookings/[id]/assign-staff` | Reassign staff | owner, manager, admin |
| POST | `/api/bookings/[id]/checkout` | Process checkout/payment | owner, staff, admin |
| GET | `/api/bookings/[id]/products` | Get products added to booking | owner, staff, admin |
| POST | `/api/bookings/[id]/products` | Add product to booking | owner, staff, admin |
| GET | `/api/bookings/[id]/total` | Calculate booking total | owner, staff, admin |
| DELETE | `/api/bookings/[id]/permanent` | Permanently delete booking | owner, admin |

### Checkout Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| POST | `/api/checkout/[bookingId]` | Process full checkout | owner, staff, admin |
| POST | `/api/checkout/cancel` | Cancel booking with refund logic | owner, staff, admin |
| POST | `/api/checkout/refund` | Issue refund | owner, manager, admin |

### Client (My) Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/my/bookings` | List current user's bookings | Any authenticated |
| GET | `/api/my/bookings/upcoming` | List upcoming bookings | Any authenticated |
| GET | `/api/my/bookings/past` | List past bookings | Any authenticated |
| GET | `/api/my/reviews` | List current user's reviews | Any authenticated |

### Client Management Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/clients` | List salon clients | owner, staff (with perm) |
| GET | `/api/clients/[id]` | Get client details | owner, staff (with perm) |
| PATCH | `/api/clients/[id]` | Update client notes | owner, staff (with perm) |
| GET | `/api/clients/[id]/bookings` | Get client's booking history | owner, staff (with perm) |
| GET | `/api/clients/[id]/notes` | Get client notes | owner, staff (with perm) |
| POST | `/api/clients/[id]/notes` | Add client note | owner, staff (with perm) |

### Salon Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/salons` | List user's salons | owner, staff |
| POST | `/api/salons` | Create new salon | owner |
| GET | `/api/salons/[id]` | Get salon details | owner, staff |
| PATCH | `/api/salons/[id]` | Update salon | owner |
| DELETE | `/api/salons/[id]` | Soft-delete salon | owner |
| GET | `/api/salons/[id]/availability` | Get available time slots | Public (marketplace) |
| GET | `/api/salons/[id]/calendar` | Get calendar events | owner, staff |
| GET | `/api/salons/[id]/campaigns` | List campaigns | owner, manager |
| POST | `/api/salons/[id]/campaigns` | Create campaign | owner, manager |
| GET | `/api/salons/[id]/categories` | Get service categories | owner, staff |
| GET | `/api/salons/[id]/clients` | List salon clients | owner, staff (with perm) |
| GET | `/api/salons/[id]/clients/[clientId]` | Get client detail | owner, staff (with perm) |
| GET | `/api/salons/[id]/closures` | List closure dates | owner, manager |
| POST | `/api/salons/[id]/closures` | Add closure date | owner, manager |
| DELETE | `/api/salons/[id]/closures/[closureId]` | Remove closure | owner, manager |
| GET | `/api/salons/[id]/commissions` | Get commission settings | owner, manager |
| GET | `/api/salons/[id]/dashboard` | Get dashboard statistics | owner, staff (with perm) |
| GET | `/api/salons/[id]/discounts` | List discounts | owner, manager |
| POST | `/api/salons/[id]/discounts` | Create discount | owner, manager |
| GET | `/api/salons/[id]/discounts/[code]` | Get discount by code | owner, manager |
| PATCH | `/api/salons/[id]/discounts/[code]` | Update discount | owner, manager |
| DELETE | `/api/salons/[id]/discounts/[code]` | Delete discount | owner, manager |
| GET | `/api/salons/[id]/gallery` | List gallery images | Public |
| POST | `/api/salons/[id]/gallery` | Upload gallery image | owner, manager |
| DELETE | `/api/salons/[id]/gallery/[imageId]` | Delete gallery image | owner, manager |
| GET | `/api/salons/[id]/gift-cards` | List salon gift cards | owner, manager |
| GET | `/api/salons/[id]/last-minute` | List last-minute slots | Public |
| POST | `/api/salons/[id]/last-minute` | Create last-minute slot | owner, manager |
| POST | `/api/salons/[id]/marketplace/enable` | Enable marketplace listing | owner |
| POST | `/api/salons/[id]/marketplace/disable` | Disable marketplace listing | owner |
| GET | `/api/salons/[id]/packages` | List packages | Public |
| POST | `/api/salons/[id]/packages` | Create package | owner, manager |
| GET | `/api/salons/[id]/payouts` | List salon payouts | owner |
| GET | `/api/salons/[id]/photos` | List salon photos | Public |
| POST | `/api/salons/[id]/photos` | Upload photo | owner, manager |
| GET | `/api/salons/[id]/products` | List products | owner, staff (with perm) |
| POST | `/api/salons/[id]/products` | Create product | owner, manager |
| GET | `/api/salons/[id]/resources` | List resources | owner, staff |
| POST | `/api/salons/[id]/resources` | Create resource | owner, manager |
| GET | `/api/salons/[id]/reviews` | List salon reviews | owner, staff |
| GET | `/api/salons/[id]/services` | List services | Public |
| POST | `/api/salons/[id]/services` | Create service | owner, manager |
| GET | `/api/salons/[id]/settings` | Get salon settings | owner, manager |
| PATCH | `/api/salons/[id]/settings` | Update salon settings | owner, manager |
| GET | `/api/salons/[id]/staff` | List staff members | owner, staff |
| POST | `/api/salons/[id]/staff` | Add staff member | owner, manager |
| GET | `/api/salons/[id]/staff/[staffId]` | Get staff details | owner, staff |
| PATCH | `/api/salons/[id]/staff/[staffId]` | Update staff | owner, manager |
| DELETE | `/api/salons/[id]/staff/[staffId]` | Remove staff | owner, manager |
| POST | `/api/salons/[id]/staff/invite` | Send staff invitation | owner, manager |
| GET | `/api/salons/[id]/staff-requests` | List join requests | owner, manager |
| POST | `/api/salons/[id]/staff-requests/[requestId]/accept` | Accept join request | owner, manager |
| POST | `/api/salons/[id]/staff-requests/[requestId]/decline` | Decline join request | owner, manager |
| GET | `/api/salons/[id]/waitlist` | List waitlist entries | owner, staff |
| POST | `/api/salons/[id]/waitlist` | Add to waitlist | Any authenticated |
| GET | `/api/salons/[id]/widget` | Get widget settings | owner |
| PATCH | `/api/salons/[id]/widget` | Update widget settings | owner |

### Service Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/services` | List services (salon-scoped) | owner, staff |
| POST | `/api/services` | Create service | owner, manager |
| GET | `/api/services/[serviceId]` | Get service details | owner, staff |
| PATCH | `/api/services/[serviceId]` | Update service | owner, manager |
| DELETE | `/api/services/[serviceId]` | Soft-delete service | owner, manager |

### Service Category Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/categories` | List service categories | owner, staff |
| POST | `/api/categories` | Create category | owner, manager |
| GET | `/api/categories/[categoryId]` | Get category | owner, staff |
| PATCH | `/api/categories/[categoryId]` | Update category | owner, manager |
| DELETE | `/api/categories/[categoryId]` | Delete category | owner, manager |

### Staff Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/staff` | List staff (salon-scoped) | owner, staff |
| POST | `/api/staff` | Create staff record | owner, manager |
| GET | `/api/staff/[staffId]` | Get staff details | owner, staff |
| PATCH | `/api/staff/[staffId]` | Update staff | owner, manager |
| DELETE | `/api/staff/[staffId]` | Deactivate staff | owner, manager |
| GET | `/api/staff/[staffId]/commissions` | Get commission config | owner, manager |
| POST | `/api/staff/[staffId]/commissions` | Set commission config | owner, manager |
| GET | `/api/staff/[staffId]/schedule` | Get staff schedule | owner, staff |
| GET | `/api/staff/[staffId]/services` | Get assigned services | owner, staff |
| POST | `/api/staff/[staffId]/services` | Assign services | owner, manager |
| GET | `/api/staff/[staffId]/time-off` | List time-off | owner, staff |
| POST | `/api/staff/[staffId]/time-off` | Create time-off | owner, manager |
| GET | `/api/staff/[staffId]/working-hours` | Get working hours | owner, staff |
| POST | `/api/staff/[staffId]/working-hours` | Set working hours | owner, manager |
| POST | `/api/staff/request-join` | Request to join a salon | Any authenticated |

### Product Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/products` | List products (salon-scoped) | owner, staff (with perm) |
| POST | `/api/products` | Create product | owner, manager |
| GET | `/api/products/[productId]` | Get product details | owner, staff (with perm) |
| PATCH | `/api/products/[productId]` | Update product | owner, manager |
| DELETE | `/api/products/[productId]` | Soft-delete product | owner, manager |
| PATCH | `/api/products/[productId]/stock` | Adjust stock quantity | owner, manager |
| GET | `/api/products/stats` | Get product statistics | owner, manager |
| GET | `/api/products/export.csv` | Export products as CSV | owner, manager |

### Product Category Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/product-categories` | List product categories | owner, staff (with perm) |
| POST | `/api/product-categories` | Create product category | owner, manager |
| GET | `/api/product-categories/[id]` | Get category | owner, staff (with perm) |
| PATCH | `/api/product-categories/[id]` | Update category | owner, manager |
| DELETE | `/api/product-categories/[id]` | Delete category | owner, manager |

### Payment Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/payments` | List payments (salon-scoped) | owner, manager |
| GET | `/api/payments/[id]` | Get payment details | owner, manager |
| POST | `/api/payments/intent` | Create Stripe payment intent | Any authenticated |
| POST | `/api/payments/confirm` | Confirm Stripe payment | Any authenticated |
| GET | `/api/payments/daily-totals` | Get daily payment totals | owner, manager |
| GET | `/api/payments/export.csv` | Export payments as CSV | owner, manager |

### Payout Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/payouts/[payoutId]` | Get payout details | owner |

### Discount Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/discounts` | List discounts (salon-scoped) | owner, manager |
| POST | `/api/discounts` | Create discount | owner, manager |
| GET | `/api/discounts/[discountId]` | Get discount | owner, manager |
| PATCH | `/api/discounts/[discountId]` | Update discount | owner, manager |
| DELETE | `/api/discounts/[discountId]` | Delete discount | owner, manager |
| POST | `/api/discounts/validate` | Validate discount code | Any authenticated |

### Gift Card Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/gift-cards` | List gift cards (salon-scoped) | owner, manager |
| POST | `/api/gift-cards` | Create gift card | owner, manager |
| GET | `/api/gift-cards/[code]` | Get gift card by code | Any authenticated |
| PATCH | `/api/gift-cards/[code]` | Update gift card | owner, manager |
| POST | `/api/gift-cards/check` | Check gift card balance | Public |
| POST | `/api/gift-cards/purchase` | Purchase gift card (Stripe) | Any authenticated |

### Package Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/packages` | List packages (salon-scoped) | owner, manager |
| POST | `/api/packages` | Create package | owner, manager |
| GET | `/api/packages/[packageId]` | Get package | owner, manager |
| PATCH | `/api/packages/[packageId]` | Update package | owner, manager |
| DELETE | `/api/packages/[packageId]` | Delete package | owner, manager |
| POST | `/api/packages/[packageId]/purchase` | Purchase package | Any authenticated |

### Campaign Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/campaigns` | List campaigns (salon-scoped) | owner, manager |
| POST | `/api/campaigns` | Create campaign | owner, manager |
| GET | `/api/campaigns/[campaignId]` | Get campaign | owner, manager |
| PATCH | `/api/campaigns/[campaignId]` | Update campaign | owner, manager |
| DELETE | `/api/campaigns/[campaignId]` | Delete campaign | owner, manager |
| POST | `/api/campaigns/[campaignId]/send` | Send campaign | owner, manager |

### Review Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/reviews` | List reviews (salon-scoped) | owner, staff |
| POST | `/api/reviews` | Create review | client |
| GET | `/api/reviews/[reviewId]` | Get review | owner, staff |
| PATCH | `/api/reviews/[reviewId]` | Update review | owner, admin |
| DELETE | `/api/reviews/[reviewId]` | Delete review | owner, admin |
| POST | `/api/reviews/[reviewId]/reply` | Reply to review | owner |
| GET | `/api/reviews/stats` | Get review statistics | owner, staff |

### Resource Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/resources/[resourceId]` | Get resource | owner, staff |
| PATCH | `/api/resources/[resourceId]` | Update resource | owner, manager |
| DELETE | `/api/resources/[resourceId]` | Delete resource | owner, manager |
| GET | `/api/resources/[resourceId]/availability` | Get resource availability | owner, staff |

### Waitlist Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/waitlist` | List waitlist (salon-scoped) | owner, staff |
| POST | `/api/waitlist` | Add to waitlist | Any authenticated |
| GET | `/api/waitlist/[waitlistId]` | Get waitlist entry | owner, staff |
| PATCH | `/api/waitlist/[waitlistId]` | Update entry | owner, staff |
| DELETE | `/api/waitlist/[waitlistId]` | Remove entry | owner, staff |
| POST | `/api/waitlist/[waitlistId]/notify` | Notify client of availability | owner, staff |

### Notification Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/notifications` | List user notifications | Any authenticated |
| POST | `/api/notifications/read` | Mark notifications as read | Any authenticated |
| GET | `/api/notifications/banners` | Get system banners | Any authenticated |

### Report Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/reports/overview` | Dashboard overview stats | owner, manager |
| GET | `/api/reports/revenue` | Revenue report | owner, manager |
| GET | `/api/reports/bookings` | Bookings report | owner, manager |
| GET | `/api/reports/clients` | Client analytics | owner, manager |
| GET | `/api/reports/staff` | Staff performance report | owner, manager |

### Marketplace Endpoints (Public)

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/marketplace/salons` | Search/browse salons | Public |
| GET | `/api/marketplace/salons/[id]` | Get salon public profile | Public |
| GET | `/api/marketplace/salons/[id]/services` | Get salon services | Public |
| GET | `/api/marketplace/salons/[id]/staff` | Get salon staff | Public |
| GET | `/api/marketplace/salons/[id]/staff-services` | Get staff-service mapping | Public |
| GET | `/api/marketplace/salons/[id]/reviews` | Get salon reviews | Public |
| GET | `/api/marketplace/cities` | List cities with salons | Public |

### Location Management Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/locations/overview` | Multi-location overview | owner |
| POST | `/api/locations/copy-services` | Copy services between locations | owner |
| POST | `/api/locations/transfer-staff` | Transfer staff between locations | owner |

### User Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/users` | List users | admin |
| GET | `/api/users/[id]` | Get user details | admin, self |
| PATCH | `/api/users/[id]` | Update user | admin, self |
| GET | `/api/users/[id]/locations` | Get user's salon locations | owner, staff |
| GET | `/api/users/[id]/packages` | Get user's purchased packages | owner, staff, self |

### User Address Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/user/addresses` | List saved addresses | Any authenticated |
| POST | `/api/user/addresses` | Add saved address | Any authenticated |
| PATCH | `/api/user/addresses/[id]` | Update address | Any authenticated |
| DELETE | `/api/user/addresses/[id]` | Soft-delete address | Any authenticated |

### Invitation Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| POST | `/api/invitations/accept` | Accept staff invitation | Any authenticated |

### Invoice Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/invoices/[id]` | Get/generate invoice | owner, staff |

### Support Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/support` | List user's tickets | Any authenticated |
| POST | `/api/support` | Create support ticket | Any authenticated |
| GET | `/api/support/[ticketId]` | Get ticket details | Any authenticated |
| PATCH | `/api/support/[ticketId]` | Update ticket | Any authenticated, admin |

### Platform Fee Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/platform-fees` | List platform fees | admin |

### Upload Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| POST | `/api/upload` | Upload file/image | Any authenticated |

### Widget Endpoints (Embeddable)

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/widget/[salonId]` | Get widget configuration | Public |
| GET | `/api/widget/[salonId]/services` | Get services for widget | Public |
| GET | `/api/widget/[salonId]/staff` | Get staff for widget | Public |
| GET | `/api/widget/[salonId]/availability` | Get availability for widget | Public |
| POST | `/api/widget/[salonId]/book` | Create booking from widget | Public |

### Webhook Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| POST | `/api/webhooks/stripe` | Stripe webhook handler | Stripe signature |
| POST | `/api/webhooks/sms` | SMS webhook handler | Provider signature |

### Cron Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| POST | `/api/cron/reminders` | Send booking reminders | Cron secret |
| POST | `/api/cron/no-shows` | Auto-mark no-shows | Cron secret |
| POST | `/api/cron/gift-cards/expire` | Expire gift cards | Cron secret |

### Admin Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/admin/analytics/gmv` | Gross merchandise value | admin |
| GET | `/api/admin/analytics/churn` | Churn analytics | admin |
| GET | `/api/admin/analytics/engagement` | Engagement metrics | admin |
| GET | `/api/admin/audit-logs` | List audit logs | admin |
| GET | `/api/admin/bookings` | List all bookings | admin |
| POST | `/api/admin/bookings/[id]/refund` | Admin refund | admin |
| POST | `/api/admin/broadcasts` | Send system broadcast | admin |
| GET | `/api/admin/fees` | List platform fees | admin |
| POST | `/api/admin/fees/[feeId]/resolve` | Resolve/mark fee paid | admin |
| GET | `/api/admin/global-discounts` | List global promos | admin |
| POST | `/api/admin/global-discounts` | Create global promo | admin |
| GET | `/api/admin/global-discounts/[id]` | Get global promo | admin |
| PATCH | `/api/admin/global-discounts/[id]` | Update global promo | admin |
| DELETE | `/api/admin/global-discounts/[id]` | Delete global promo | admin |
| POST | `/api/admin/impersonate` | Start impersonation | admin |
| POST | `/api/admin/impersonate/stop` | Stop impersonation | admin |
| GET | `/api/admin/onboarding` | Get onboarding stats | admin |
| GET | `/api/admin/payouts` | List all payouts | admin |
| POST | `/api/admin/payouts` | Create/process payout | admin |
| GET | `/api/admin/reviews` | List all reviews | admin |
| GET | `/api/admin/reviews/[reviewId]` | Get review | admin |
| PATCH | `/api/admin/reviews/[reviewId]` | Moderate review | admin |
| GET | `/api/admin/salons` | List all salons | admin |
| GET | `/api/admin/salons/[salonId]` | Get salon details | admin |
| PATCH | `/api/admin/salons/[salonId]` | Update salon | admin |
| PATCH | `/api/admin/salons/[salonId]/status` | Change salon status | admin |
| PATCH | `/api/admin/salons/[salonId]/tier` | Change plan tier | admin |
| GET | `/api/admin/settings` | Get platform settings | admin |
| PATCH | `/api/admin/settings` | Update platform settings | admin |
| GET | `/api/admin/tickets` | List support tickets | admin |
| GET | `/api/admin/tickets/[id]` | Get ticket | admin |
| PATCH | `/api/admin/tickets/[id]` | Update ticket | admin |
| GET | `/api/admin/users` | List all users | admin |
| GET | `/api/admin/users/[userId]` | Get user details | admin |
| PATCH | `/api/admin/users/[userId]` | Update user | admin |
| DELETE | `/api/admin/users/[userId]` | Delete user | admin |

### Miscellaneous Endpoints

| Method | Path | Purpose | Required Role |
|---|---|---|---|
| GET | `/api/test-db` | Test database connection | Public (dev only) |
| GET | `/api/tickets` | List tickets (alias) | Any authenticated |

---

## 8. Frontend Pages Map


### Public / Marketplace Pages

| Route | Purpose |
|---|---|
| `/` | Landing page / marketplace homepage |
| `/salons` | Browse all marketplace-listed salons |
| `/[category]` | Browse salons by category (e.g., /hair, /nails) |
| `/[category]/[city]` | Browse salons by category and city |
| `/salon/[slug]` | Individual salon public profile page |
| `/salon/[slug]/gift-cards` | Purchase gift cards for a salon |
| `/salon/[slug]/gift-cards/check` | Check gift card balance |
| `/bookings` | Client's booking list (upcoming + past) |
| `/profile` | Client profile management |
| `/contact` | Contact page |
| `/help` | Help / FAQ page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |

### Authentication Pages

| Route | Purpose |
|---|---|
| `/login` | Login form |
| `/register` | Registration form |
| `/forgot-password` | Password reset request |
| `/reset-password` | Password reset form (with token) |
| `/auth/choose` | Post-login role/salon selection |
| `/verify-email` | Email verification page |

### Onboarding Pages

| Route | Purpose |
|---|---|
| `/onboarding` | Onboarding start page |
| `/onboarding/choose` | Choose account type (client vs. owner) |
| `/onboarding/join` | Join existing salon as staff |

### Booking Flow Pages

| Route | Purpose |
|---|---|
| `/book/[salonId]` | Standalone multi-step booking flow |
| `/gift-card/success` | Gift card purchase success page |
| `/gift-card/cancelled` | Gift card purchase cancelled page |

### Staff Invitation Pages

| Route | Purpose |
|---|---|
| `/invite` | Staff invitation acceptance page |

### Dashboard Pages (Salon Owner/Staff)

| Route | Purpose |
|---|---|
| `/dashboard` | Dashboard home (redirects based on role) |
| `/dashboard/settings` | User account settings |
| `/dashboard/locations/new` | Create new salon location |
| `/dashboard/salon/[salonId]` | Salon dashboard home (overview stats) |
| `/dashboard/salon/[salonId]/bookings` | Booking management |
| `/dashboard/salon/[salonId]/calendar` | Visual calendar (FullCalendar) |
| `/dashboard/salon/[salonId]/checkout/[bookingId]` | Checkout flow for a booking |
| `/dashboard/salon/[salonId]/clients` | Client CRM list |
| `/dashboard/salon/[salonId]/clients/[clientId]` | Individual client profile |
| `/dashboard/salon/[salonId]/gallery` | Gallery management |
| `/dashboard/salon/[salonId]/marketing` | Marketing hub |
| `/dashboard/salon/[salonId]/marketing/campaigns` | Campaign management |
| `/dashboard/salon/[salonId]/marketing/discounts` | Discount code management |
| `/dashboard/salon/[salonId]/marketing/gift-cards` | Gift card management |
| `/dashboard/salon/[salonId]/marketing/packages` | Package management |
| `/dashboard/salon/[salonId]/marketing/waitlist` | Waitlist management |
| `/dashboard/salon/[salonId]/products` | Product inventory management |
| `/dashboard/salon/[salonId]/reports` | Reports hub |
| `/dashboard/salon/[salonId]/reports/revenue` | Revenue report |
| `/dashboard/salon/[salonId]/reports/bookings` | Bookings report |
| `/dashboard/salon/[salonId]/reports/clients` | Client analytics report |
| `/dashboard/salon/[salonId]/reports/staff` | Staff performance report |
| `/dashboard/salon/[salonId]/reviews` | Review management |
| `/dashboard/salon/[salonId]/sales` | Sales/payment history |
| `/dashboard/salon/[salonId]/sales/[paymentId]/receipt` | Payment receipt |
| `/dashboard/salon/[salonId]/services` | Service management |
| `/dashboard/salon/[salonId]/settings` | Settings hub |
| `/dashboard/salon/[salonId]/settings/general` | General business settings |
| `/dashboard/salon/[salonId]/settings/hours` | Business hours configuration |
| `/dashboard/salon/[salonId]/settings/policies` | Cancellation/no-show policies |
| `/dashboard/salon/[salonId]/settings/marketplace` | Marketplace settings |
| `/dashboard/salon/[salonId]/settings/widget` | Booking widget configuration |
| `/dashboard/salon/[salonId]/settings/notifications` | Notification preferences |
| `/dashboard/salon/[salonId]/settings/billing` | Billing/subscription |
| `/dashboard/salon/[salonId]/settings/account` | Account/danger zone |
| `/dashboard/salon/[salonId]/settings/reviews` | Review settings |
| `/dashboard/salon/[salonId]/support` | Support ticket management |
| `/dashboard/salon/[salonId]/team` | Team/staff management |
| `/dashboard/salon/[salonId]/team/[staffId]` | Individual staff profile |
| `/dashboard/salon/support` | Support page (non-salon-scoped) |

### Admin Dashboard Pages

| Route | Purpose |
|---|---|
| `/dashboard/admin` | Admin dashboard home |
| `/dashboard/admin/analytics` | Platform analytics |
| `/dashboard/admin/audit-logs` | Audit log viewer |
| `/dashboard/admin/bookings` | All bookings management |
| `/dashboard/admin/fees` | Platform fee management |
| `/dashboard/admin/marketing` | Global marketing (promos, broadcasts) |
| `/dashboard/admin/payouts` | Payout management |
| `/dashboard/admin/reviews` | Review moderation |
| `/dashboard/admin/salons` | Salon management |
| `/dashboard/admin/settings` | Platform settings |
| `/dashboard/admin/support` | Support ticket management |
| `/dashboard/admin/users` | User management |

---

## 9. Golden Rules & Business Logic Invariants

### Soft-Delete Rules

The following tables implement soft deletion via a `deleted_at` datetime column:
- `users` — Soft-deleted users cannot log in. Email remains unique.
- `salons` — Soft-deleted salons are hidden from marketplace and dashboard. `deleted_by` tracks who deleted.
- `services` — Soft-deleted services are hidden from booking flows but preserved for historical booking records.
- `products` — Soft-deleted products are hidden from inventory but preserved for historical sales records.
- `discounts` — Soft-deleted discounts cannot be redeemed.
- `reviews` — Soft-deleted reviews are hidden from public view.
- `user_addresses` — Soft-deleted addresses are hidden from the user but preserved for booking history.

**Rule:** All queries that display active data MUST include `WHERE deleted_at IS NULL`. Historical/reporting queries may include soft-deleted records.

### Booking Status Lifecycle

```
pending → confirmed → completed
pending → cancelled
confirmed → cancelled
confirmed → no_show
confirmed → completed
```

**Rules:**
- Only `confirmed` bookings can be checked out (transition to `completed`).
- Cancelled bookings set `cancelled_at`, `cancelled_by`, and `cancellation_reason`.
- Soft-deleted bookings (`deleted_at IS NOT NULL`) are excluded from all conflict checks and availability calculations.
- The `source` field (`marketplace` vs `direct`) is immutable after creation.

### Concurrency Rules

1. **Double-booking prevention:** `createSafeBooking` uses `SELECT ... FOR UPDATE` on staff rows before checking for conflicts. This serializes concurrent booking attempts for the same staff member.
2. **Discount over-redemption prevention:** Discount rows are locked with `FOR UPDATE` before checking `current_uses` against `max_uses`.
3. **Gift card over-spending prevention:** Gift card rows are locked with `FOR UPDATE` before checking `remaining_balance`.
4. **Payment idempotency:** The `payments` table has a UNIQUE constraint on `booking_id`. The checkout uses `ON DUPLICATE KEY UPDATE` to prevent double-charges.
5. **Salon client upsert:** Uses `INSERT ... ON DUPLICATE KEY UPDATE` to atomically create or update the salon-client relationship.

### Financial Integrity Rules

1. **Price snapshots:** Service prices are snapshotted at booking time in `booking_services.price`. The final charged amount is ALWAYS recalculated from DB rows by `calculateBookingTotal()` — never from client-supplied values.
2. **Travel fee snapshots:** Travel fees are calculated inside the transaction and stored on both `booking_travel_fees` and `bookings.travel_fee_amount` for O(1) reporting.
3. **Gift card ledger:** Every gift card balance change is recorded in `gift_card_transactions` for full audit trail.
4. **Platform fees:** New marketplace clients incur a 20% acquisition fee on their first booking value. Global promo costs are absorbed by the platform via negative platform fees.
5. **Refund tracking:** Refunds are tracked separately from payments. `payments.refunded_amount` is updated alongside `refunds` table entries.

### Multi-Tenancy Rules

1. **Salon isolation:** All salon-scoped data is filtered by `salon_id`. No cross-salon data leakage is permitted.
2. **Staff-salon binding:** A user can be staff at multiple salons (multi-location). Each `staff` record is unique per (salon_id, user_id).
3. **Owner privilege:** The salon owner (matched by `salons.owner_id = session.userId`) always has full access regardless of staff permissions.
4. **Admin bypass:** Users with `users.role = 'admin'` bypass all salon-level authorization checks.

### Fulfillment Rules

1. **Service compatibility:** A service can only be booked in a fulfillment mode it supports (`can_physical`, `can_mobile`, `can_virtual`).
2. **Staff capability:** A staff member can only be assigned to a booking in a fulfillment mode they support (`staff.can_physical`, `staff.can_mobile`, `staff.can_virtual`).
3. **Travel radius:** Mobile bookings must be within the salon's `travel_radius` (or staff-specific override). Validated using Haversine distance.
4. **Travel feasibility:** For mobile bookings, bidirectional travel checks ensure staff can physically travel between consecutive appointments.
5. **Travel buffer:** Mobile bookings automatically account for `travel_buffer_time` minutes before and after the appointment when checking working hours.

---

## 10. Git History & State of Play

### Current Branch: `devalop`

The active development branch, 8 commits ahead of `main`.

### Recent Commit History (Last 30 Commits)

| Hash | Message |
|---|---|
| `898ac4b` | Now products are function on the dashboard |
| `ea8bc93` | Made minor changes to the calendar |
| `abcafc1` | Improved calendar |
| `571ec5f` | Before changing the week calendar |
| `181dd9c` | Refactored Salons page |
| `fea88c0` | Now Hybrid booking is working |
| `3a6ed66` | Added hybrid fulfillment, and a new design for the dashboard |
| `4a165b5` | New design for the dashboard |
| `b2d7c69` | Added permissions settings for roles, added support system, avatar customization |
| `6af7a4b` | Now users can join a business |
| `4761eae` | Upgraded login / registration flows (HEAD of main) |
| `f573125` | Fixed url was using simple ID, finished onboarding |
| `1ff467c` | Enhanced onboarding |
| `50189ec` | Enhanced SEO, added email verification, fixed categories, enhanced onboarding |
| `ad8ba21` | Added promo codes, fixed working hours for salons, changed currency system |
| `c8017ec` | Redesigned landing page |
| `7cc4663` | Redesigned calendar, bookings page for clients |
| `b7ce4dd` | Applied migration to the db |
| `4168501` | Now the map is fully functional |
| `ee71eda` | Finished merging |
| `2dea713` | Remove jest __mocks__ folder |
| `1830d7b` | Remove error.txt test output |
| `d8a9f37` | Remove out.txt test output dump |
| `533f41c` | Remove root level jest output and config files |
| `6db9ab7` | Remove jest and testing files |
| `6dbe06b` | Merge and resolve conflicts |
| `f317157` | Migrated to google maps |
| `c3ecf10` | Before google maps |
| `51d4311` | Working on the marketplace map |
| `519bf26` | Fixed search bar |

### Key Development Milestones (Chronological)

1. **Marketplace Map** — Migrated from Leaflet to Google Maps for the salon discovery map.
2. **SEO & Email Verification** — Added meta tags, email verification flow, category fixes.
3. **Promo Codes & Currency** — Global promo code system, multi-currency support.
4. **Calendar Redesign** — FullCalendar integration with week/day/list views.
5. **Login/Registration Upgrade** — Enhanced auth flows (current `main` HEAD).
6. **Staff Joining** — Users can request to join existing salons.
7. **Permissions & Support** — Role-based permission system, support ticket system, avatar customization.
8. **Hybrid Fulfillment** — Full mobile/virtual booking support with travel validation.
9. **Dashboard Redesign** — New dashboard layout and navigation.
10. **Products** — Product inventory management on the dashboard.

---

## 11. Roadmap & Known Issues

### Pending Database Migrations (Not Yet Applied)

- `20260601_products_sales_overhaul.sql` — Products and sales system overhaul (future migration).

### Known Technical Debt

1. **Branch naming:** The development branch is named `devalop` (typo of "develop"). Consider renaming.
2. **Backup register page:** `src/app/(auth)/register/page.js.bak` exists — should be removed.
3. **Mixed file extensions:** Some pages use `.js`, others use `.jsx`. No consistent convention.
4. **No TypeScript:** The entire codebase is JavaScript. Type safety relies on Zod validation at API boundaries.
5. **Test coverage:** Testing infrastructure (Vitest) is set up but test coverage appears minimal based on the lack of test files in the source tree.
6. **Stripe API version:** Using `2023-10-16` which may be outdated. Consider upgrading.

### Missing Integrations / Next Logical Tasks

1. **SMS notifications:** The `notifications` table supports SMS type but no SMS provider is integrated (only Resend for email).
2. **Push notifications:** The `notifications` table supports push type but no push provider is configured.
3. **Real-time updates:** No WebSocket or Server-Sent Events for real-time booking notifications.
4. **Stripe Connect onboarding:** The `stripe_account_id` column exists but the full Connect onboarding flow may be incomplete.
5. **Invoice generation:** The `/api/invoices/[id]` endpoint exists but PDF generation is not confirmed.
6. **Campaign sending:** Campaign infrastructure exists but actual email/SMS delivery integration may be partial.
7. **Automated payouts:** Payout records exist but automated Stripe payout processing may not be fully implemented.
8. **Product e-commerce:** Products can be added to bookings but standalone product purchases (without a booking) are not supported.
9. **Multi-language support:** No i18n infrastructure. All strings are hardcoded in English/French.
10. **Image optimization:** No image processing pipeline (resizing, WebP conversion) for uploaded images.

### UI/UX Gaps

1. **Mobile responsiveness:** Dashboard pages may not be fully optimized for mobile devices.
2. **Accessibility:** No explicit ARIA patterns or screen reader testing documented.
3. **Loading states:** Some pages may lack proper skeleton/loading states during data fetching.
4. **Error boundaries:** No documented React error boundary strategy for graceful failure handling.
5. **Offline support:** No service worker or offline-first capabilities.

### Security Considerations

1. **Rate limiting:** `rate-limit.js` exists but coverage across all endpoints is not confirmed.
2. **CSRF protection:** Relies on SameSite cookies and Bearer token pattern. No explicit CSRF tokens.
3. **Input sanitization:** Zod validation at API boundaries. SQL injection prevented by parameterized queries.
4. **File upload validation:** Upload endpoint exists but file type/size validation depth is not confirmed.
5. **Audit logging:** `audit_logs` table exists but coverage of all sensitive operations is not confirmed.

---

## 12. Environment Variables

The application requires the following environment variables (referenced in code):

| Variable | Purpose | Required |
|---|---|---|
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Yes |
| `MYSQL_URL` | MySQL connection URI (alternative to individual vars) | One of |
| `DB_HOST` | MySQL host | If no MYSQL_URL |
| `DB_PORT` | MySQL port (default: 3306) | No |
| `DB_USER` | MySQL user (default: root) | If no MYSQL_URL |
| `DB_PASSWORD` | MySQL password (default: root) | If no MYSQL_URL |
| `DB_NAME` | MySQL database name (default: fresh) | If no MYSQL_URL |
| `STRIPE_SECRET_KEY` | Stripe secret key | Yes |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Google Maps API key | Yes (client) |
| `RESEND_API_KEY` | Resend email API key | Yes |

---

*End of Complete Project Context — 43 tables, 150+ API endpoints, 60+ frontend pages documented.*
