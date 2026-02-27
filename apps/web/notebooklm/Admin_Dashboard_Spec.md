# Administrative "Mission Control" Specification

This document summarizes the current state of the Admin Dashboard for the Fresh platform.

## 1. Functional Features
The Mission Control dashboard provides extensive platform-wide management capabilities. The directory structure indicates that the following features are currently built and functionally complete:
- **Analytics**: Top-level platform statistics and KPIs.
- **Audit Logs**: Tracking of significant administrative or system actions.
- **Bookings Management**: Admin oversight for all platform bookings.
- **Fees**: Management of platform and acquisition fees.
- **Marketing**: Global promotional code distributions and campaigns.
- **Payouts**: Partner payout management with calculation of net payables.
- **Reviews**: Global overview and moderation of client reviews.
- **Salon & User Management**: Dedicated interfaces to search, moderate, and control all users and salons on the platform.
- **Settings & Support**: Global configuration and customer support ticketing interfaces.

## 2. Incomplete Logic & TODOs
There is a clear gap in the current implementation regarding live financial transactions:
- **Payouts Processing**: In `src/app/api/admin/payouts/route.js`, the actual transfer of funds via Stripe is heavily mocked:
  ```javascript
  const stripeTransferId = \`mock_tr_\${Math.random().toString(36).substring(7)}\`;
  ```
- **Refunds Processing**: Similarly, in `src/app/api/admin/bookings/[id]/refund/route.js`, refunds are mocked:
  ```javascript
  // Mock Stripe refund (In production, call stripe.refunds.create)
  const stripeRefundId = \`mock_rf_\${Math.random().toString(36).substring(7)}\`;
  ```
**Conclusion:** The logic for tracking balances, aggregating gross volume, and determining "Net Payable" is fully functional and precise, but the final mile (the actual money movement API calls to Stripe) needs to be implemented for production readiness.

## 3. Current UI Layout
The dashboard employs a modern, clean, and responsive design system:
- **Component Library**: Leverages standard `shadcn/ui` components (`Cards`, `Buttons`, `Data Tables`, `Skeletons` for loading states).
- **Iconography**: Uses `lucide-react` line icons (`Users`, `Building2`, `DollarSign`, `CheckCircle2`) to provide a consistent visual language.
- **Overview Layout**: The primary entry page (`/dashboard/admin`) features a hero header followed by a responsive grid. The top section is a row of metric cards highlighting "Total Users" and "Total Salons", followed by larger "Quick Action" cards linking out to dedicated management pages.
- **Detailed Data Pages (e.g., Payouts)**: Features a row of high-level financial summary cards (Gross Volume, Platform Fees, Refunds, Total Pending), sitting directly above a comprehensive, paginated data `Table`. Bulk actions (like "Pay Selected") are positioned prominently at the top alongside page headings.

## 4. Primary Data Sources
- **Client-Side Fetching**: The UI relies on `@tanstack/react-query` for data fetching, caching, and mutations.
- **Internal API Layer**: The React Query hooks call custom Next.js backend routes (e.g., `GET /api/admin/users`, `GET /api/admin/salons`, `GET /api/admin/payouts`).
- **Database Backend**: These API routes directly interface with the MySQL database via `pool.query` or `pool.execute`, providing real-time data from the `users`, `salons`, `bookings`, `payments`, and `platform_fees` tables.
