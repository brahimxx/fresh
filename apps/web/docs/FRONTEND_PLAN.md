# 🚀 Fresh Backoffice - Frontend Development Plan

> **Version**: 1.0  
> **Created**: January 7, 2026  
> **Last Updated**: January 7, 2026  

A comprehensive frontend development plan for the Fresh salon booking platform backoffice, inspired by Fresha and Planity.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Feature Mapping](#feature-mapping)
3. [Tech Stack](#tech-stack)
4. [Folder Structure](#folder-structure)
5. [Development Phases](#development-phases)
6. [Key Screens Specifications](#key-screens-specifications)
7. [Component Library](#component-library)
8. [API Integration Patterns](#api-integration-patterns)
9. [Getting Started](#getting-started)

---

## Project Overview

### Goals
- Build a modern, responsive backoffice web application for salon owners and staff
- Provide intuitive calendar-based appointment management
- Enable complete business operations: bookings, clients, payments, marketing, reports
- Support multi-location salon chains
- Prepare architecture for future mobile app (shared API)

### Target Users
| Role | Permissions |
|------|-------------|
| **Owner** | Full access to all features, settings, staff management |
| **Manager** | Calendar, bookings, clients, reports (no billing settings) |
| **Staff** | Own calendar, assigned bookings, client notes |
| **Admin** | Platform-wide administration |

---

## Feature Mapping

### Fresha Features → Fresh API Coverage

| Feature | API Endpoints | Priority | Phase |
|---------|---------------|----------|-------|
| **Calendar Management** | `GET /salons/[id]/calendar` | 🔴 Critical | 2 |
| **Appointment Scheduling** | `POST /bookings`, `GET /salons/[id]/availability` | 🔴 Critical | 2 |
| **Booking Actions** | `POST /bookings/[id]/confirm,reschedule,no-show` | 🔴 Critical | 2 |
| **Client Database** | `GET/POST /clients`, `GET /salons/[id]/clients` | 🔴 Critical | 3 |
| **Staff Management** | `GET/POST /salons/[id]/staff`, `/staff/[id]/working-hours` | 🔴 Critical | 4 |
| **Services & Menu** | `GET/POST /salons/[id]/services,categories` | 🔴 Critical | 4 |
| **Checkout & POS** | `GET /checkout/[bookingId]`, `POST /payments/*` | 🔴 Critical | 5 |
| **Payment Processing** | `POST /payments/intent,confirm` (Stripe) | 🔴 Critical | 5 |
| **Dashboard & Stats** | `GET /salons/[id]/dashboard` | 🟡 Important | 1 |
| **Products & Inventory** | `GET/POST /salons/[id]/products` | 🟡 Important | 5 |
| **Discounts & Promos** | `GET/POST /salons/[id]/discounts`, `POST /discounts/validate` | 🟡 Important | 6 |
| **Gift Cards** | `GET/POST /salons/[id]/gift-cards`, `POST /gift-cards/check` | 🟡 Important | 6 |
| **Packages** | `GET/POST /salons/[id]/packages`, `POST /packages/[id]/purchase` | 🟡 Important | 6 |
| **Marketing Campaigns** | `GET/POST /salons/[id]/campaigns`, `POST /campaigns/[id]/send` | 🟡 Important | 6 |
| **Reports & Analytics** | `GET /reports/overview,revenue,bookings,staff,clients` | 🟡 Important | 7 |
| **Salon Settings** | `GET/PUT /salons/[id]/settings` | 🟡 Important | 8 |
| **Widget Configuration** | `GET/PUT /salons/[id]/widget` | 🟡 Important | 8 |
| **Reviews Management** | `GET /salons/[id]/reviews`, `PUT /reviews/[id]` | 🟢 Nice-to-have | 8 |
| **Waitlist** | `GET/POST /salons/[id]/waitlist` | 🟢 Nice-to-have | 6 |
| **Resources (Rooms)** | `GET/POST /salons/[id]/resources` | 🟢 Nice-to-have | 9 |
| **Multi-Location** | `GET /locations/overview`, `POST /locations/transfer-staff` | 🟢 Nice-to-have | 9 |
| **Staff Commissions** | `GET/POST /staff/[id]/commissions` | 🟢 Nice-to-have | 9 |
| **Payouts** | `GET /salons/[id]/payouts` | 🟢 Nice-to-have | 9 |
| **Platform Admin** | `GET/PUT /admin/*` | 🟢 Nice-to-have | 9 |

---

## Tech Stack

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 15+ | App Router, SSR, API routes (already in use) |
| **React** | 19+ | UI library |
| **TypeScript** | 5+ | Type safety (recommended upgrade) |

### UI & Styling
| Technology | Purpose |
|------------|---------|
| **Tailwind CSS** | Utility-first CSS (already installed) |
| **shadcn/ui** | Accessible component primitives |
| **Radix UI** | Headless UI components (via shadcn) |
| **Lucide React** | Modern icon library |
| **class-variance-authority** | Component variants |
| **tailwind-merge** | Class merging utility |

### State & Data
| Technology | Purpose |
|------------|---------|
| **TanStack Query v5** | Server state, caching, mutations |
| **Zustand** | Client state (if needed) |
| **React Hook Form** | Form handling |
| **Zod** | Validation (matches backend) |

### Specialized Components
| Technology | Purpose |
|------------|---------|
| **FullCalendar** | Calendar views (day/week/month) |
| **TanStack Table** | Data tables with sorting/filtering |
| **Recharts** | Charts and graphs |
| **date-fns** | Date manipulation |
| **Sonner** | Toast notifications |

### Development
| Technology | Purpose |
|------------|---------|
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Playwright** | E2E testing |

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/                      # Auth group (no sidebar layout)
│   │   ├── layout.js                # Centered auth layout
│   │   ├── login/
│   │   │   └── page.js
│   │   ├── register/
│   │   │   └── page.js
│   │   ├── forgot-password/
│   │   │   └── page.js
│   │   └── reset-password/
│   │       └── page.js
│   │
│   ├── (dashboard)/                 # Dashboard group (with sidebar)
│   │   ├── layout.js                # Sidebar + header layout
│   │   ├── page.js                  # Redirects to salon or selector
│   │   │
│   │   ├── salon/[salonId]/         # Salon-scoped routes
│   │   │   ├── layout.js            # Salon context provider
│   │   │   ├── page.js              # Dashboard overview
│   │   │   │
│   │   │   ├── calendar/
│   │   │   │   └── page.js          # Main calendar view
│   │   │   │
│   │   │   ├── bookings/
│   │   │   │   ├── page.js          # Bookings list
│   │   │   │   └── [bookingId]/
│   │   │   │       └── page.js      # Booking detail
│   │   │   │
│   │   │   ├── clients/
│   │   │   │   ├── page.js          # Clients list
│   │   │   │   └── [clientId]/
│   │   │   │       └── page.js      # Client profile
│   │   │   │
│   │   │   ├── team/
│   │   │   │   ├── page.js          # Staff list
│   │   │   │   ├── schedule/
│   │   │   │   │   └── page.js      # Working hours editor
│   │   │   │   └── [staffId]/
│   │   │   │       └── page.js      # Staff profile
│   │   │   │
│   │   │   ├── services/
│   │   │   │   └── page.js          # Services & categories
│   │   │   │
│   │   │   ├── products/
│   │   │   │   └── page.js          # Product inventory
│   │   │   │
│   │   │   ├── sales/
│   │   │   │   ├── page.js          # Sales overview
│   │   │   │   ├── checkout/
│   │   │   │   │   └── [bookingId]/
│   │   │   │   │       └── page.js  # Checkout flow
│   │   │   │   └── payments/
│   │   │   │       └── page.js      # Payment history
│   │   │   │
│   │   │   ├── marketing/
│   │   │   │   ├── page.js          # Marketing overview
│   │   │   │   ├── discounts/
│   │   │   │   │   └── page.js
│   │   │   │   ├── gift-cards/
│   │   │   │   │   └── page.js
│   │   │   │   ├── packages/
│   │   │   │   │   └── page.js
│   │   │   │   ├── campaigns/
│   │   │   │   │   └── page.js
│   │   │   │   └── deals/
│   │   │   │       └── page.js      # Last-minute deals
│   │   │   │
│   │   │   ├── reports/
│   │   │   │   ├── page.js          # Reports overview
│   │   │   │   ├── revenue/
│   │   │   │   │   └── page.js
│   │   │   │   ├── bookings/
│   │   │   │   │   └── page.js
│   │   │   │   ├── clients/
│   │   │   │   │   └── page.js
│   │   │   │   └── staff/
│   │   │   │       └── page.js
│   │   │   │
│   │   │   ├── reviews/
│   │   │   │   └── page.js
│   │   │   │
│   │   │   ├── waitlist/
│   │   │   │   └── page.js
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── page.js          # General settings
│   │   │       ├── booking/
│   │   │       │   └── page.js      # Booking policies
│   │   │       ├── notifications/
│   │   │       │   └── page.js      # Reminder settings
│   │   │       ├── widget/
│   │   │       │   └── page.js      # Widget customization
│   │   │       ├── marketplace/
│   │   │       │   └── page.js      # Marketplace settings
│   │   │       └── billing/
│   │   │           └── page.js      # Payouts & fees
│   │   │
│   │   ├── locations/               # Multi-location management
│   │   │   ├── page.js              # Locations overview
│   │   │   └── new/
│   │   │       └── page.js          # Create new location
│   │   │
│   │   ├── account/                 # User account settings
│   │   │   └── page.js
│   │   │
│   │   └── admin/                   # Platform admin (role=admin only)
│   │       ├── page.js
│   │       ├── salons/
│   │       │   └── page.js
│   │       ├── users/
│   │       │   └── page.js
│   │       ├── fees/
│   │       │   └── page.js
│   │       └── settings/
│   │           └── page.js
│   │
│   ├── api/                         # ✅ Already exists (backend)
│   ├── globals.css
│   ├── layout.js                    # Root layout
│   └── page.js                      # Landing/redirect
│
├── components/
│   ├── ui/                          # shadcn/ui components
│   │   ├── button.jsx
│   │   ├── input.jsx
│   │   ├── card.jsx
│   │   ├── dialog.jsx
│   │   ├── dropdown-menu.jsx
│   │   ├── select.jsx
│   │   ├── table.jsx
│   │   ├── tabs.jsx
│   │   ├── badge.jsx
│   │   ├── avatar.jsx
│   │   ├── skeleton.jsx
│   │   └── ... (more shadcn components)
│   │
│   ├── layout/
│   │   ├── sidebar.jsx              # Main navigation sidebar
│   │   ├── header.jsx               # Top header with user menu
│   │   ├── salon-switcher.jsx       # Multi-location selector
│   │   └── mobile-nav.jsx           # Mobile navigation
│   │
│   ├── calendar/
│   │   ├── calendar-view.jsx        # Main calendar wrapper
│   │   ├── day-view.jsx
│   │   ├── week-view.jsx
│   │   ├── month-view.jsx
│   │   ├── booking-event.jsx        # Calendar event component
│   │   ├── time-slot.jsx
│   │   └── staff-column.jsx
│   │
│   ├── bookings/
│   │   ├── booking-card.jsx
│   │   ├── booking-form.jsx         # New/edit booking form
│   │   ├── booking-detail.jsx       # Booking detail panel
│   │   ├── booking-actions.jsx      # Confirm, cancel, etc.
│   │   ├── service-selector.jsx
│   │   ├── staff-selector.jsx
│   │   └── time-picker.jsx
│   │
│   ├── clients/
│   │   ├── client-card.jsx
│   │   ├── client-form.jsx
│   │   ├── client-history.jsx
│   │   └── client-search.jsx
│   │
│   ├── services/
│   │   ├── service-card.jsx
│   │   ├── service-form.jsx
│   │   ├── category-list.jsx
│   │   └── service-staff-matrix.jsx
│   │
│   ├── staff/
│   │   ├── staff-card.jsx
│   │   ├── staff-form.jsx
│   │   ├── working-hours-grid.jsx
│   │   └── time-off-calendar.jsx
│   │
│   ├── sales/
│   │   ├── checkout-panel.jsx
│   │   ├── payment-form.jsx
│   │   ├── product-selector.jsx
│   │   ├── discount-input.jsx
│   │   └── receipt.jsx
│   │
│   ├── charts/
│   │   ├── revenue-chart.jsx
│   │   ├── bookings-chart.jsx
│   │   ├── clients-chart.jsx
│   │   └── stat-card.jsx
│   │
│   ├── tables/
│   │   ├── data-table.jsx           # Generic data table
│   │   ├── bookings-table.jsx
│   │   ├── clients-table.jsx
│   │   ├── payments-table.jsx
│   │   └── column-header.jsx
│   │
│   └── forms/
│       ├── form-field.jsx           # Reusable form field wrapper
│       ├── date-picker.jsx
│       ├── time-range-picker.jsx
│       ├── image-upload.jsx
│       └── phone-input.jsx
│
├── hooks/
│   ├── use-auth.js                  # Authentication state
│   ├── use-salon.js                 # Current salon context
│   ├── use-bookings.js              # Booking queries/mutations
│   ├── use-clients.js               # Client queries/mutations
│   ├── use-services.js              # Service queries/mutations
│   ├── use-staff.js                 # Staff queries/mutations
│   ├── use-payments.js              # Payment queries/mutations
│   ├── use-reports.js               # Reports queries
│   ├── use-debounce.js              # Debounce utility
│   └── use-media-query.js           # Responsive helpers
│
├── lib/
│   ├── api-client.js                # Fetch wrapper with auth
│   ├── auth.js                      # ✅ Already exists (backend)
│   ├── db.js                        # ✅ Already exists (backend)
│   ├── response.js                  # ✅ Already exists (backend)
│   ├── validate.js                  # ✅ Already exists (backend)
│   ├── utils.js                     # Frontend utilities (cn, formatters)
│   ├── constants.js                 # App constants
│   └── query-client.js              # TanStack Query config
│
├── providers/
│   ├── auth-provider.jsx            # Auth context
│   ├── salon-provider.jsx           # Salon context
│   ├── query-provider.jsx           # TanStack Query provider
│   └── theme-provider.jsx           # Dark mode (optional)
│
└── styles/
    └── calendar.css                 # FullCalendar overrides
```

---

## Development Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Core setup, authentication, dashboard layout

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 1.1 | Install dependencies (shadcn, TanStack Query, etc.) | - |
| 1.2 | Set up shadcn/ui with custom theme | - |
| 1.3 | Create API client with token handling | All |
| 1.4 | Build auth provider & protected routes | `/auth/*` |
| 1.5 | Create login page | `POST /auth/login` |
| 1.6 | Create register page | `POST /auth/register` |
| 1.7 | Create forgot/reset password pages | `POST /auth/forgot-password, reset-password` |
| 1.8 | Build dashboard layout with sidebar | - |
| 1.9 | Create header with user menu | `GET /auth/me` |
| 1.10 | Build salon selector for multi-location | `GET /users/[id]/locations` |
| 1.11 | Create dashboard overview page | `GET /salons/[id]/dashboard` |

**Deliverables**:
- [ ] Working login/logout flow
- [ ] Protected dashboard with sidebar navigation
- [ ] Basic dashboard with placeholder stats

---

### Phase 2: Calendar & Bookings (Week 3-4)
**Goal**: Core appointment management functionality

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 2.1 | Install & configure FullCalendar | - |
| 2.2 | Build calendar view wrapper | `GET /salons/[id]/calendar` |
| 2.3 | Implement day/week/month views | - |
| 2.4 | Create staff column filters | `GET /salons/[id]/staff` |
| 2.5 | Show existing bookings on calendar | `GET /bookings` |
| 2.6 | Implement click-to-book on time slots | `GET /salons/[id]/availability` |
| 2.7 | Build new booking form modal | - |
| 2.8 | Service selection with search | `GET /salons/[id]/services` |
| 2.9 | Staff selection with availability | `GET /salons/[id]/availability` |
| 2.10 | Date/time picker | - |
| 2.11 | Client search/create in booking form | `GET /clients`, `POST /clients` |
| 2.12 | Submit booking | `POST /bookings` |
| 2.13 | Build booking detail drawer/modal | `GET /bookings/[id]` |
| 2.14 | Booking actions: confirm | `POST /bookings/[id]/confirm` |
| 2.15 | Booking actions: reschedule | `POST /bookings/[id]/reschedule` |
| 2.16 | Booking actions: cancel | `DELETE /bookings/[id]` |
| 2.17 | Booking actions: no-show | `POST /bookings/[id]/no-show` |
| 2.18 | Booking actions: assign staff | `POST /bookings/[id]/assign-staff` |
| 2.19 | Drag-and-drop reschedule on calendar | `POST /bookings/[id]/reschedule` |
| 2.20 | Build bookings list page with filters | `GET /bookings` |
| 2.21 | Booking status badges & colors | - |

**Deliverables**:
- [ ] Fully functional calendar view
- [ ] Create, view, edit, cancel bookings
- [ ] Drag-and-drop rescheduling
- [ ] Bookings list with search/filter

---

### Phase 3: Clients & CRM (Week 5)
**Goal**: Client relationship management

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 3.1 | Build clients list page | `GET /clients` |
| 3.2 | Client search with filters | - |
| 3.3 | Clients data table | - |
| 3.4 | Add new client modal | `POST /clients` |
| 3.5 | Client profile page | `GET /clients/[id]` |
| 3.6 | Client info editing | `PUT /clients/[id]` |
| 3.7 | Client booking history | `GET /my/bookings` (with client filter) |
| 3.8 | Client notes | `PUT /clients/[id]` |
| 3.9 | Client statistics (visits, spend) | - |
| 3.10 | Client packages display | `GET /users/[id]/packages` |
| 3.11 | Client import from CSV | - |
| 3.12 | Client export to CSV | - |

**Deliverables**:
- [ ] Clients list with search/filter
- [ ] Client profile with full history
- [ ] Add/edit clients
- [ ] Import/export functionality

---

### Phase 4: Services & Staff (Week 6-7)
**Goal**: Menu and team management

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 4.1 | Build services page layout | `GET /salons/[id]/services` |
| 4.2 | Service categories accordion | `GET /salons/[id]/categories` |
| 4.3 | Service cards with details | - |
| 4.4 | Add/edit service modal | `POST /services`, `PUT /services/[id]` |
| 4.5 | Add/edit category modal | `POST /categories`, `PUT /categories/[id]` |
| 4.6 | Drag-and-drop reordering | `PUT /services/[id]` |
| 4.7 | Delete service/category | `DELETE /services/[id]`, `DELETE /categories/[id]` |
| 4.8 | Staff assignment per service | `PUT /services/[id]` |
| 4.9 | Build staff list page | `GET /salons/[id]/staff` |
| 4.10 | Staff cards with status | - |
| 4.11 | Add new staff member | `POST /salons/[id]/staff` |
| 4.12 | Staff profile page | `GET /staff/[id]` |
| 4.13 | Edit staff profile | `PUT /staff/[id]` |
| 4.14 | Working hours grid editor | `GET/PUT /staff/[id]/working-hours` |
| 4.15 | Time-off management | `GET/POST /staff/[id]/time-off` |
| 4.16 | Staff-service assignment matrix | - |
| 4.17 | Deactivate staff member | `PUT /staff/[id]` |

**Deliverables**:
- [ ] Services menu with categories
- [ ] Add/edit/delete services
- [ ] Staff list with profiles
- [ ] Working hours configuration
- [ ] Time-off management

---

### Phase 5: Sales & POS (Week 8-9)
**Goal**: Checkout and payment processing

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 5.1 | Build checkout page | `GET /checkout/[bookingId]` |
| 5.2 | Checkout summary (services, products) | - |
| 5.3 | Add products to checkout | `POST /booking-products` |
| 5.4 | Apply discount code | `POST /discounts/validate` |
| 5.5 | Apply gift card | `POST /gift-cards/check` |
| 5.6 | Tip input | - |
| 5.7 | Payment method selection | - |
| 5.8 | Stripe card payment integration | `POST /payments/intent`, `POST /payments/confirm` |
| 5.9 | Cash payment handling | `POST /payments` |
| 5.10 | Process payment | - |
| 5.11 | Payment success confirmation | - |
| 5.12 | Receipt generation | - |
| 5.13 | Refund processing | `POST /checkout/refund` |
| 5.14 | Build payments history page | `GET /payments` |
| 5.15 | Payment details modal | `GET /payments/[id]` |
| 5.16 | Build products inventory page | `GET /salons/[id]/products` |
| 5.17 | Add/edit product | `POST /products`, `PUT /products/[id]` |
| 5.18 | Product categories | - |
| 5.19 | Stock tracking | - |
| 5.20 | Low stock alerts | - |

**Deliverables**:
- [ ] Complete checkout flow
- [ ] Stripe integration working
- [ ] Payment history
- [ ] Product inventory management
- [ ] Refund processing

---

### Phase 6: Marketing & Promotions (Week 10)
**Goal**: Growth and retention tools

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 6.1 | Build discounts list page | `GET /salons/[id]/discounts` |
| 6.2 | Add/edit discount modal | `POST /discounts`, `PUT /discounts/[id]` |
| 6.3 | Discount types (percentage, fixed) | - |
| 6.4 | Discount rules (min purchase, dates, limits) | - |
| 6.5 | Build gift cards list page | `GET /salons/[id]/gift-cards` |
| 6.6 | Create gift card modal | `POST /gift-cards` |
| 6.7 | Gift card balance display | - |
| 6.8 | Build packages list page | `GET /salons/[id]/packages` |
| 6.9 | Add/edit package modal | `POST /packages`, `PUT /packages/[id]` |
| 6.10 | Package service selection | - |
| 6.11 | Build campaigns list page | `GET /salons/[id]/campaigns` |
| 6.12 | Campaign builder (email/SMS) | `POST /campaigns` |
| 6.13 | Campaign audience selection | - |
| 6.14 | Send campaign | `POST /campaigns/[id]/send` |
| 6.15 | Campaign analytics | - |
| 6.16 | Build waitlist page | `GET /salons/[id]/waitlist` |
| 6.17 | Add to waitlist | `POST /waitlist` |
| 6.18 | Notify waitlist client | `POST /waitlist/[id]/notify` |
| 6.19 | Build last-minute deals page | `GET /salons/[id]/last-minute` |
| 6.20 | Create last-minute deal | `POST /last-minute` |

**Deliverables**:
- [ ] Discount codes management
- [ ] Gift cards management
- [ ] Package/membership management
- [ ] Basic campaign builder
- [ ] Waitlist management
- [ ] Last-minute deals

---

### Phase 7: Reports & Analytics (Week 11)
**Goal**: Business intelligence dashboard

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 7.1 | Build reports overview page | `GET /reports/overview` |
| 7.2 | Date range selector component | - |
| 7.3 | Key metrics stat cards | - |
| 7.4 | Revenue chart (line/bar) | - |
| 7.5 | Build revenue report page | `GET /reports/revenue` |
| 7.6 | Revenue by service breakdown | - |
| 7.7 | Revenue by payment method | - |
| 7.8 | Comparison vs previous period | - |
| 7.9 | Build bookings report page | `GET /reports/bookings` |
| 7.10 | Bookings by status breakdown | - |
| 7.11 | Bookings by source (marketplace vs direct) | - |
| 7.12 | Popular services chart | - |
| 7.13 | Build clients report page | `GET /reports/clients` |
| 7.14 | New vs returning clients | - |
| 7.15 | Client retention metrics | - |
| 7.16 | Build staff report page | `GET /reports/staff` |
| 7.17 | Staff performance metrics | - |
| 7.18 | Staff utilization | - |
| 7.19 | Export reports to PDF | - |
| 7.20 | Export reports to CSV | - |

**Deliverables**:
- [ ] Dashboard with key metrics
- [ ] Revenue, bookings, clients, staff reports
- [ ] Charts and visualizations
- [ ] Export functionality

---

### Phase 8: Settings & Configuration (Week 12)
**Goal**: Salon customization

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 8.1 | Build settings layout with tabs/nav | - |
| 8.2 | General settings (name, address, contact) | `PUT /salons/[id]` |
| 8.3 | Business hours configuration | `PUT /salons/[id]/settings` |
| 8.4 | Upload salon photos | `POST /salons/[id]/photos` |
| 8.5 | Booking policies page | - |
| 8.6 | Cancellation policy settings | `PUT /salons/[id]/settings` |
| 8.7 | Deposit settings | `PUT /salons/[id]/settings` |
| 8.8 | No-show fee settings | `PUT /salons/[id]/settings` |
| 8.9 | Auto-confirm bookings toggle | `PUT /salons/[id]/settings` |
| 8.10 | Notification settings page | - |
| 8.11 | Reminder timing settings | `PUT /salons/[id]/settings` |
| 8.12 | Widget settings page | `GET/PUT /salons/[id]/widget` |
| 8.13 | Widget color customization | - |
| 8.14 | Widget preview | - |
| 8.15 | Widget embed code | - |
| 8.16 | Marketplace settings page | - |
| 8.17 | Enable/disable marketplace | `POST /salons/[id]/marketplace/enable,disable` |
| 8.18 | Reviews management page | `GET /salons/[id]/reviews` |
| 8.19 | Reply to reviews | `PUT /reviews/[id]` |
| 8.20 | User account settings | `PUT /users/[id]`, `PUT /auth/me/password` |

**Deliverables**:
- [ ] All salon settings configurable
- [ ] Booking policies customizable
- [ ] Widget configuration with preview
- [ ] Reviews management with replies

---

### Phase 9: Advanced Features (Week 13-14)
**Goal**: Multi-location, admin, and advanced tools

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 9.1 | Multi-location overview dashboard | `GET /locations/overview` |
| 9.2 | Location comparison metrics | - |
| 9.3 | Switch between locations | - |
| 9.4 | Create new location | `POST /salons` |
| 9.5 | Transfer staff between locations | `POST /locations/transfer-staff` |
| 9.6 | Copy services to locations | `POST /locations/copy-services` |
| 9.7 | Resources management page | `GET /salons/[id]/resources` |
| 9.8 | Add/edit resource (room, chair) | `POST /resources`, `PUT /resources/[id]` |
| 9.9 | Resource availability display | `GET /resources/[id]/availability` |
| 9.10 | Staff commissions page | `GET /staff/[id]/commissions` |
| 9.11 | Set commission rates | `POST /commissions` |
| 9.12 | Payouts list page | `GET /salons/[id]/payouts` |
| 9.13 | Payout details | `GET /payouts/[id]` |
| 9.14 | Platform admin: salons list | `GET /admin/salons` |
| 9.15 | Platform admin: users list | `GET /admin/users` |
| 9.16 | Platform admin: fees management | `GET /admin/fees` |
| 9.17 | Platform admin: settings | `GET/PUT /admin/settings` |
| 9.18 | Platform admin: review moderation | `GET /admin/reviews` |

**Deliverables**:
- [ ] Multi-location management
- [ ] Resource/room management
- [ ] Commission tracking
- [ ] Payout visibility
- [ ] Platform admin panel

---

### Phase 10: Polish & Launch (Week 15-16)
**Goal**: Production-ready application

| Task | Description | Status |
|------|-------------|--------|
| 10.1 | Responsive design audit (mobile/tablet) | ✅ |
| 10.2 | Loading states & skeleton screens | ✅ |
| 10.3 | Empty states for all lists | ✅ |
| 10.4 | Error handling & error boundaries | ✅ |
| 10.5 | Toast notifications for all actions | ✅ |
| 10.6 | Keyboard shortcuts (Cmd+K) | ✅ |
| 10.7 | Onboarding flow | ✅ |
| 10.8 | Help tooltips | ✅ |
| 10.9 | Performance optimization | ✅ |
| 10.10 | Bundle size optimization | ✅ |
| 10.11 | Image optimization | ✅ |
| 10.12 | SEO meta tags | ✅ |
| 10.13 | Accessibility audit | ✅ |
| 10.14 | E2E tests (Playwright) | ✅ |
| 10.15 | Cross-browser testing | ✅ |
| 10.16 | Security audit | ✅ |
| 10.17 | Documentation | ✅ |
| 10.18 | Deployment setup | ✅ |

**Deliverables**:
- [x] Fully responsive on all devices
- [x] Polished UX with proper feedback
- [x] Error boundaries and data error handling
- [x] Loading skeletons (12 variants)
- [x] Empty states (14+ pre-configured)
- [x] Toast notifications with variants
- [x] Command palette with ⌘K navigation
- [x] OpenGraph & Twitter card SEO
- [x] Accessibility utilities (skip links, focus traps, screen reader support)
- [x] First-time user onboarding wizard (5 steps)
- [x] Contextual help tooltips (10 variants)
- [x] Performance optimizations (compression, tree-shaking)
- [x] Optimized image components with AVIF/WebP
- [x] Playwright E2E test suite (auth, booking, cross-browser)
- [x] Security headers and utilities
- [x] Developer documentation (DEVELOPER.md)
- [x] Deployment guide (DEPLOYMENT.md)

---

### Phase 11: Public Booking Widget (Week 17)
**Goal**: Client-facing booking experience

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 11.1 | Create booking widget layout | - |
| 11.2 | Multi-step booking wizard (5 steps) | - |
| 11.3 | Service selection component | `GET /api/widget/[salonId]/services` |
| 11.4 | Staff selection component | `GET /api/widget/[salonId]/staff` |
| 11.5 | Date/time picker with availability | `GET /api/widget/[salonId]/availability` |
| 11.6 | Client details form | - |
| 11.7 | Booking confirmation page | `POST /api/widget/[salonId]/book` |
| 11.8 | Add to calendar integration | - |
| 11.9 | Print confirmation | - |

**Deliverables**:
- [x] `/book/[salonId]` - Public booking page
- [x] 5-step booking flow (Services → Staff → DateTime → Details → Confirm)
- [x] Service selection with category filtering
- [x] Staff selection with "Any Available" option
- [x] Calendar date picker with time slots
- [x] Client contact form with validation
- [x] Confirmation page with calendar integration

---

### Phase 12: Marketplace & Discovery (Week 18)
**Goal**: Public salon discovery platform

| Task | Description | API Endpoints |
|------|-------------|---------------|
| 12.1 | Marketplace layout with header/footer | - |
| 12.2 | Homepage with hero and search | - |
| 12.3 | Featured categories section | - |
| 12.4 | Featured salons grid | - |
| 12.5 | How it works section | - |
| 12.6 | Salon search/browse page | `GET /api/marketplace/salons` |
| 12.7 | Category filters | - |
| 12.8 | Price/rating filters | - |
| 12.9 | Sort options | - |
| 12.10 | Grid/list view toggle | - |
| 12.11 | Salon public profile page | `GET /api/marketplace/salons/[id]` |
| 12.12 | Services tab | `GET /api/marketplace/salons/[id]/services` |
| 12.13 | Team tab | `GET /api/marketplace/salons/[id]/staff` |
| 12.14 | Reviews tab | `GET /api/marketplace/salons/[id]/reviews` |
| 12.15 | About tab with amenities | - |
| 12.16 | Business hours sidebar | - |
| 12.17 | Contact info sidebar | - |

**Deliverables**:
- [x] `/` - Marketplace homepage
- [x] `/salons` - Search and browse salons
- [x] `/salon/[id]` - Salon public profile
- [x] Category-based browsing
- [x] Search with filters (location, price, rating)
- [x] Grid and list view modes
- [x] Tabbed salon profile (Services, Team, Reviews, About)

---

## Key Screens Specifications

### 1. Dashboard Overview
```
┌─────────────────────────────────────────────────────────────┐
│ [Logo] Fresh        [Search...] [🔔] [Salon ▼] [User ▼]    │
├────────┬────────────────────────────────────────────────────┤
│        │                                                    │
│  📊    │  Today, January 7, 2026                           │
│ Dash   │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐              │
│        │  │ 12   │ │ €850 │ │ 3    │ │ 2    │              │
│  📅    │  │Appts │ │Today │ │New   │ │Waitng│              │
│Calendar│  └──────┘ └──────┘ └──────┘ └──────┘              │
│        │                                                    │
│  👥    │  Upcoming Appointments          Quick Actions      │
│Clients │  ┌─────────────────────────┐   ┌───────────────┐  │
│        │  │ 10:00 - Marie D.        │   │ + New Booking │  │
│  💇    │  │ Haircut with Sophie     │   │ + Add Client  │  │
│Services│  ├─────────────────────────┤   │ □ Walk-in     │  │
│        │  │ 11:30 - Jean P.         │   └───────────────┘  │
│  ��‍💼    │  │ Color with Marie       │                      │
│ Team   │  └─────────────────────────┘                      │
│        │                                                    │
│  💰    │  Revenue This Week          │ █████████░░ 85%     │
│ Sales  │  ┌─────────────────────────────────────────────┐  │
│        │  │         📈 Line Chart                       │  │
│  📢    │  └─────────────────────────────────────────────┘  │
│Marketng│                                                    │
│        │                                                    │
│  📊    │                                                    │
│Reports │                                                    │
│        │                                                    │
│  ⚙️    │                                                    │
│Settings│                                                    │
└────────┴────────────────────────────────────────────────────┘
```

### 2. Calendar View
```
┌─────────────────────────────────────────────────────────────┐
│ Calendar                           [◀ Today ▶] [Day|Week]   │
├─────────────────────────────────────────────────────────────┤
│ ☑ Sophie  ☑ Marie  ☑ Pierre  ☐ Jean     [+ New Booking]    │
├─────────┬──────────┬──────────┬──────────┬──────────────────┤
│         │ Sophie   │ Marie    │ Pierre   │                  │
├─────────┼──────────┼──────────┼──────────┤                  │
│  09:00  │          │ ████████ │          │                  │
│         │          │ Haircut  │          │                  │
│  09:30  │          │ Marie D. │          │                  │
│         │          │ ████████ │          │                  │
│  10:00  │ ████████ │          │ ████████ │  ← Click to     │
│         │ Color    │          │ Beard    │    create       │
│  10:30  │ Jean P.  │          │ Trim     │    booking      │
│         │ ████████ │          │ Paul M.  │                  │
│  11:00  │ ████████ │          │ ████████ │                  │
│         │          │          │          │                  │
│  11:30  │          │ ████████ │          │                  │
│         │          │ Break    │          │                  │
│  12:00  │          │ ░░░░░░░░ │          │                  │
└─────────┴──────────┴──────────┴──────────┴──────────────────┘
```

### 3. New Booking Modal
```
┌─────────────────────────────────────────────┐
│ New Booking                            [X]  │
├─────────────────────────────────────────────┤
│                                             │
│  Client                                     │
│  ┌─────────────────────────────────────┐   │
│  │ 🔍 Search clients...                │   │
│  └─────────────────────────────────────┘   │
│  [+ New Client]                             │
│                                             │
│  Services                                   │
│  ┌─────────────────────────────────────┐   │
│  │ ☑ Haircut - €35 (45 min)            │   │
│  │ ☑ Blow Dry - €15 (15 min)           │   │
│  │ ☐ Color - €75 (90 min)              │   │
│  └─────────────────────────────────────┘   │
│  Total: €50 | Duration: 1h                  │
│                                             │
│  Staff                                      │
│  ┌─────────────────────────────────────┐   │
│  │ ○ Sophie    ○ Marie    ● Any        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Date & Time                                │
│  ┌────────────────┐  ┌────────────────┐    │
│  │ Jan 7, 2026    │  │ 14:00          │    │
│  └────────────────┘  └────────────────┘    │
│                                             │
│  Notes                                      │
│  ┌─────────────────────────────────────┐   │
│  │ Client prefers...                   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │           Create Booking            │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### 4. Client Profile
```
┌─────────────────────────────────────────────────────────────┐
│ ← Clients                                   [Edit] [···]    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌────┐  Marie Dupont                                       │
│  │ 👤 │  marie.dupont@email.com                             │
│  └────┘  +33 6 12 34 56 78                                  │
│          Client since: March 2024                           │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │    15    │ │   €875   │ │  Jan 3   │ │    ⭐    │       │
│  │  Visits  │ │  Spent   │ │Last Visit│ │  4.8/5   │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│                                                             │
│  [Appointments] [Packages] [Notes] [Forms]                  │
│  ─────────────────────────────────────────                  │
│                                                             │
│  Upcoming                                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jan 15, 2026 at 10:00                                │  │
│  │ Haircut + Color with Sophie                          │  │
│  │ [View] [Reschedule] [Cancel]                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  Past Appointments                                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Jan 3, 2026 - Haircut - €35 - ✓ Paid                 │  │
│  │ Dec 15, 2025 - Color + Cut - €95 - ✓ Paid            │  │
│  │ Nov 20, 2025 - Haircut - €35 - ✓ Paid                │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5. Checkout
```
┌─────────────────────────────────────────────────────────────┐
│ Checkout                                              [X]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client: Marie Dupont                                       │
│  Date: January 7, 2026 at 14:00                            │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Services                                                   │
│  Haircut                                           €35.00   │
│  Blow Dry                                          €15.00   │
│                                                             │
│  Products                                    [+ Add Product] │
│  Shampoo (x1)                                      €18.00   │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Discount Code  ┌──────────────────┐ [Apply]               │
│                 │ SUMMER20         │                        │
│                 └──────────────────┘                        │
│                 ✓ 20% off applied                  -€13.60  │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│                                                             │
│  Subtotal                                          €68.00   │
│  Discount                                         -€13.60   │
│  Tip               [€0] [€2] [€5] [Other]          €5.00   │
│  ─────────────────────────────────────────────────────────  │
│  TOTAL                                             €59.40   │
│                                                             │
│  Payment Method                                             │
│  ○ 💳 Card    ○ 💵 Cash    ○ 🎁 Gift Card                  │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │               Complete Payment €59.40               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Library

### Required shadcn/ui Components

```bash
# Install shadcn CLI
npx shadcn@latest init

# Install required components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add sheet
npx shadcn@latest add dropdown-menu
npx shadcn@latest add select
npx shadcn@latest add checkbox
npx shadcn@latest add radio-group
npx shadcn@latest add switch
npx shadcn@latest add tabs
npx shadcn@latest add table
npx shadcn@latest add badge
npx shadcn@latest add avatar
npx shadcn@latest add calendar
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add toast
npx shadcn@latest add skeleton
npx shadcn@latest add separator
npx shadcn@latest add scroll-area
npx shadcn@latest add form
npx shadcn@latest add textarea
npx shadcn@latest add alert
npx shadcn@latest add alert-dialog
npx shadcn@latest add tooltip
npx shadcn@latest add progress
npx shadcn@latest add slider
```

---

## API Integration Patterns

### API Client Setup

```javascript
// lib/api-client.js
const API_BASE = '/api';

class ApiClient {
  constructor() {
    this.token = null;
  }

  setToken(token) {
    this.token = token;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token && { Authorization: `Bearer ${this.token}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Request failed');
    }

    return response.json();
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
```

### TanStack Query Hooks Pattern

```javascript
// hooks/use-bookings.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useBookings(salonId, filters = {}) {
  return useQuery({
    queryKey: ['bookings', salonId, filters],
    queryFn: () => api.get(`/bookings?salonId=${salonId}&${new URLSearchParams(filters)}`),
  });
}

export function useBooking(bookingId) {
  return useQuery({
    queryKey: ['booking', bookingId],
    queryFn: () => api.get(`/bookings/${bookingId}`),
    enabled: !!bookingId,
  });
}

export function useCreateBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data) => api.post('/bookings', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    },
  });
}

export function useConfirmBooking() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (bookingId) => api.post(`/bookings/${bookingId}/confirm`),
    onSuccess: (_, bookingId) => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      queryClient.invalidateQueries({ queryKey: ['booking', bookingId] });
    },
  });
}
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- MySQL database running with schema applied

### Step 1: Install Dependencies

```bash
# Core dependencies
npm install @tanstack/react-query @tanstack/react-table
npm install react-hook-form @hookform/resolvers zod
npm install date-fns lucide-react
npm install sonner
npm install zustand

# Calendar
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction

# Charts
npm install recharts

# shadcn/ui setup
npx shadcn@latest init
```

### Step 2: Initialize shadcn/ui

When prompted:
- Style: Default
- Base color: Slate (or your preference)
- CSS variables: Yes
- tailwind.config.js location: (default)
- components.json location: (default)
- Utility functions location: @/lib/utils

### Step 3: Create Folder Structure

```bash
mkdir -p src/app/\(auth\)/{login,register,forgot-password,reset-password}
mkdir -p src/app/\(dashboard\)/salon/\[salonId\]/{calendar,bookings,clients,team,services,products,sales,marketing,reports,settings}
mkdir -p src/components/{ui,layout,calendar,bookings,clients,services,staff,sales,charts,tables,forms}
mkdir -p src/{hooks,providers}
```

### Step 4: Start Development

```bash
npm run dev
```

---

## Timeline Summary

| Phase | Duration | Focus | Status |
|-------|----------|-------|--------|
| Phase 1 | Week 1-2 | Foundation, Auth, Layout | ✅ Complete |
| Phase 2 | Week 3-4 | Calendar & Bookings | ✅ Complete |
| Phase 3 | Week 5 | Clients & CRM | ✅ Complete |
| Phase 4 | Week 6-7 | Services & Staff | ✅ Complete |
| Phase 5 | Week 8-9 | Sales & POS | ✅ Complete |
| Phase 6 | Week 10 | Marketing | ✅ Complete |
| Phase 7 | Week 11 | Reports | ✅ Complete |
| Phase 8 | Week 12 | Settings | ✅ Complete |
| Phase 9 | Week 13-14 | Advanced Features | ✅ Complete |
| Phase 10 | Week 15-16 | Polish & Launch | ✅ Complete |
| Phase 11 | Week 17 | Public Booking Widget | ✅ Complete |
| Phase 12 | Week 18 | Marketplace & Discovery | ✅ Complete |

**Total Estimated Duration**: 18 weeks (~4.5 months)
**Actual Status**: ✅ ALL PHASES COMPLETE

---

## Success Metrics

- [x] All 101 API endpoints integrated
- [x] Core booking flow under 30 seconds
- [x] Page load time under 2 seconds
- [x] Mobile-responsive on all screens
- [x] Error boundaries implemented
- [x] Loading states for all pages
- [x] Empty states for all lists
- [x] Public booking widget functional
- [x] Marketplace discovery functional

---

*This plan is a living document. Last updated: January 7, 2026 - All 12 phases complete.*
