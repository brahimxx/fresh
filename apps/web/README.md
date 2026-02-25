# 🪒 Fresh — Salon Management & Booking Platform

A comprehensive SaaS platform for salon management and booking built with **Next.js 16.1**, **React 19**, and **MySQL**.

---

## Overview

Fresh connects salon owners, staff, and clients through three distinct surfaces:

| Surface            | Route                         | For                     | Description                                                        |
| ------------------ | ----------------------------- | ----------------------- | ------------------------------------------------------------------ |
| **Dashboard**      | `/dashboard/salon/[id]/*`     | Owners, Managers, Staff | Calendar, bookings, clients, staff, inventory, payments, marketing |
| **Booking Widget** | `/book/[salonId]`             | Clients                 | Embeddable 4-step appointment booking wizard                       |
| **Marketplace**    | `/`, `/salons`, `/salon/[id]` | Clients                 | Public directory to discover salons, view profiles & book          |

---

## Tech Stack

| Layer     | Technology                                                                                                               |
| --------- | ------------------------------------------------------------------------------------------------------------------------ |
| Framework | [Next.js 16.1](https://nextjs.org) (App Router)                                                                          |
| UI        | [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com), [shadcn/ui](https://ui.shadcn.com) (Radix)     |
| State     | [TanStack Query v5](https://tanstack.com/query), [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Database  | MySQL via [mysql2](https://github.com/sidorares/node-mysql2)                                                             |
| Auth      | JWT (HttpOnly cookies) + [bcryptjs](https://github.com/nicolo-ribaudo/bcryptjs)                                          |
| Payments  | [Stripe](https://stripe.com)                                                                                             |
| Email     | [Resend](https://resend.com)                                                                                             |
| Icons     | [Lucide React](https://lucide.dev)                                                                                       |
| Calendar  | [FullCalendar](https://fullcalendar.io)                                                                                  |

---

## Project Structure

```
apps/web/
├── database/             # SQL schema, migrations, seed data
│   ├── fresh.sql         # Full database dump
│   ├── fresh_structure.sql # Schema only
│   └── migrations/       # Incremental migrations
├── docs/                 # Project documentation
├── public/               # Static assets
├── scripts/              # Utility scripts
└── src/
    ├── app/
    │   ├── (auth)/       # Login, register, forgot-password
    │   ├── (marketplace)/ # Homepage, salon search, salon profiles, static pages
    │   ├── api/          # API routes (~139 files)
    │   ├── book/         # Public booking widget
    │   ├── dashboard/    # Protected backoffice
    │   └── onboarding/   # New salon setup
    ├── components/       # UI components grouped by domain
    ├── hooks/            # Custom React hooks
    ├── lib/              # Core utilities (auth, db, validation, formatting)
    ├── providers/        # Context providers (theme, query client)
    └── styles/           # Global CSS
```

---

## Getting Started

### Prerequisites

- **Node.js** 18+
- **MySQL** 8+

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
DATABASE_URL=mysql://user:password@localhost:3306/fresh
JWT_SECRET=...          # Min 32 chars — generate below
NEXT_PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=...
RESEND_API_KEY=...      # Optional — falls back to console logging
```

Generate a secure JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Database Setup

```bash
# Import schema + seed data
mysql -u root -p fresh < database/fresh.sql

# Or structure only + seed separately
mysql -u root -p fresh < database/fresh_structure.sql
mysql -u root -p fresh < database/seed_data.sql
```

**Seed accounts:** `owner@fresh.com` through `owner6@fresh.com` — password: `password123`

### Run

```bash
npm run dev     # Development server → http://localhost:3000
npm run build   # Production build
npm run start   # Production server
npm run lint    # ESLint
```

---

## Key Features

- **Multi-Service Booking** — Fresha-style: select multiple services, assign a different staff member per service
- **Calendar Management** — FullCalendar with staff color-coding, drag & drop, filtering
- **Client CRM** — Smart dedup (phone/email), per-salon notes, soft delete with auto-reactivation
- **Checkout & Payments** — Server-computed totals, product add-ons, discounts, gift cards, transactional processing
- **Marketing** — Email/SMS campaigns, audience segmentation (all / new / returning / inactive)
- **Notifications** — In-app popover with 30s polling, email via Resend, cron-based reminders
- **Reviews** — Client reviews linked to bookings, owner reply endpoint
- **Marketplace** — Public salon discovery with search by service, location, price, rating
- **Salon Soft Delete** — Pre-deletion checks (pending bookings, gift cards), force delete option
- **Multi-Salon** — Owners can manage multiple salons from a single account

---

## User Roles

| Role        | Access                         |
| ----------- | ------------------------------ |
| **Client**  | Booking widget, Marketplace    |
| **Owner**   | Full dashboard access          |
| **Manager** | Reports, all clients, settings |
| **Staff**   | Own calendar, assigned clients |
| **Admin**   | Platform-wide administration   |

---

## Security

All 11 identified vulnerabilities audited and fixed. Status: **Excellent** ✅

- JWT with HttpOnly + SameSite=Strict cookies
- Bcrypt hashing (cost factor 12)
- Rate limiting on auth endpoints (5 attempts / 15 min)
- Password complexity enforcement
- Parameterized SQL queries (no raw string interpolation)
- Input validation via Zod schemas
- HSTS, CSP, X-Frame-Options headers
- Request size limits (2MB max)

---

## Deployment

Recommended: **[Vercel](https://vercel.com)** or Docker/VPS.

```bash
npm run build
```

Required production environment variables:

- `DATABASE_URL`
- `JWT_SECRET` (min 32 chars)
- `STRIPE_SECRET_KEY`
- `NEXT_PUBLIC_APP_URL`

> **Note:** The in-memory rate limiter works for single-server deployments. Consider Redis for multi-server production environments.

---

## Documentation

Full project documentation is available in [`docs/FRESH_DOCUMENTATION.md`](docs/FRESH_DOCUMENTATION.md), including:

- Complete API contract
- Database model & migrations history
- Detailed changelog
- Security audit report
- Known issues & roadmap

---

## License

Private — All rights reserved.
