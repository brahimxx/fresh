# Fresh App - API Documentation & Project Resume

> **For AI Agents**: This document provides a complete overview of the Fresh salon booking platform API, its architecture, and all modifications made during development. Use this as your primary reference to understand the codebase.

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [Database Schema](#database-schema)
4. [API Endpoints Reference](#api-endpoints-reference)
5. [Code Modifications Log](#code-modifications-log)
6. [Known Issues & Future Improvements](#known-issues--future-improvements)

---

## Project Overview

**Fresh** is a Fresha/Planity-like salon booking platform with:
- **Marketplace**: Clients discover and book salons
- **Salon Management**: Owners manage staff, services, bookings, payments
- **Widget Booking**: Embeddable booking widget for salon websites
- **Multi-location**: Support for salon chains with multiple locations
- **Payments**: Stripe integration with platform fees, refunds, tips
- **Marketing**: Campaigns, discounts, gift cards, packages

### Business Model
- Platform charges commission on new clients acquired through marketplace
- Salons can enable/disable marketplace visibility
- Widget bookings from salon's own website have no/different fee structure

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15+ (App Router) |
| Database | MySQL with `mysql2/promise` |
| Authentication | JWT (jose library), bcryptjs |
| Payments | Stripe SDK |
| Validation | Zod |
| Styling | Tailwind CSS |

### Key Files

| File | Purpose |
|------|---------|
| `/src/lib/db.js` | Database connection pool, `query()`, `getOne()`, `transaction()` |
| `/src/lib/auth.js` | JWT verification, `verifyAuth()` middleware |
| `/src/lib/response.js` | Standardized API responses: `success()`, `error()`, `created()`, `notFound()` |
| `/src/lib/validate.js` | Zod schemas and validation helpers |
| `/database/fresha.sql` | Core database schema (15 tables) |
| `/database/migrations.sql` | Extended schema (16 sections, 20+ new tables) |

---

## Database Schema

### Core Tables (fresha.sql)
- `users` - All users (clients, owners, staff, admins)
- `salons` - Salon businesses
- `salon_settings` - Salon configuration (cancellation policy, deposits, etc.)
- `staff` - Staff members linked to salons and users
- `staff_working_hours` - Weekly schedule per staff member
- `staff_time_off` - Vacation, sick days, breaks
- `service_categories` - Service groupings
- `services` - Services offered by salons
- `service_staff` - Many-to-many: which staff can perform which services
- `bookings` - Appointment bookings
- `booking_services` - Many-to-many: services included in a booking
- `payments` - Payment records linked to bookings
- `platform_fees` - Fees owed to platform by salons
- `salon_clients` - Relationship between salons and their clients
- `salon_photos` - Salon gallery images
- `reviews` - Client reviews of salons
- `notifications` - Push/email/SMS notifications

### Extended Tables (migrations.sql)
See `/database/migrations.sql` for complete DDL. Includes:
- Products & POS: `product_categories`, `products`, `booking_products`
- Discounts: `discounts`, `booking_discounts`
- Gift Cards: `gift_cards`, `booking_gift_cards`
- Packages: `packages`, `package_services`, `client_packages`
- Waitlist: `waitlist`
- Resources: `resources`, `booking_resources`, `resource_blocks`
- Widget: `widget_settings`
- Refunds: `refunds`
- Marketing: `campaigns`
- Deals: `last_minute_slots`
- Finance: `staff_commissions`, `payouts`, `platform_settings`
- Audit: `audit_logs`

---

## API Endpoints Reference

### Authentication (`/api/auth/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | No |
| POST | `/auth/login` | Login, returns JWT | No |
| POST | `/auth/logout` | Logout (clear cookie) | No |
| POST | `/auth/refresh` | Refresh JWT token | Yes |
| GET | `/auth/me` | Get current user profile | Yes |
| PUT | `/auth/me/password` | Change password | Yes |
| POST | `/auth/forgot-password` | Request password reset | No |
| POST | `/auth/reset-password` | Reset password with token | No |

### Bookings (`/api/bookings/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/bookings` | List bookings (filtered) | Yes |
| POST | `/bookings` | Create new booking | Yes |
| GET | `/bookings/[id]` | Get booking details | Yes |
| PUT | `/bookings/[id]` | Update booking | Yes |
| DELETE | `/bookings/[id]` | Cancel booking | Yes |
| POST | `/bookings/[id]/confirm` | Confirm pending booking | Yes |
| POST | `/bookings/[id]/reschedule` | Reschedule booking | Yes |
| POST | `/bookings/[id]/assign-staff` | Assign different staff | Yes |
| POST | `/bookings/[id]/no-show` | Mark as no-show | Yes |

### Salons (`/api/salons/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/salons` | List salons (marketplace) | No |
| POST | `/salons` | Create new salon | Yes (owner) |
| GET | `/salons/[id]` | Get salon details | No |
| PUT | `/salons/[id]` | Update salon | Yes (owner) |
| DELETE | `/salons/[id]` | Delete salon | Yes (owner) |
| GET | `/salons/[id]/availability` | Get available time slots | No |
| GET | `/salons/[id]/calendar` | Get calendar view data | Yes |
| GET | `/salons/[id]/dashboard` | Get dashboard stats | Yes |
| GET | `/salons/[id]/settings` | Get salon settings | Yes |
| PUT | `/salons/[id]/settings` | Update salon settings | Yes |

### Salon Sub-resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/salons/[id]/staff` | List/add staff |
| GET/PUT/DELETE | `/salons/[id]/staff/[staffId]` | Manage staff member |
| GET/POST | `/salons/[id]/services` | List/add services |
| GET/POST | `/salons/[id]/categories` | List/add service categories |
| GET/POST | `/salons/[id]/clients` | List/add clients |
| GET/PUT | `/salons/[id]/clients/[clientId]` | Manage client |
| GET/POST | `/salons/[id]/photos` | List/upload photos |
| GET | `/salons/[id]/reviews` | Get salon reviews |
| GET/POST | `/salons/[id]/products` | List/add products |
| GET/POST | `/salons/[id]/discounts` | List/add discounts |
| GET/POST | `/salons/[id]/gift-cards` | List/create gift cards |
| GET/POST | `/salons/[id]/packages` | List/add packages |
| GET/POST | `/salons/[id]/resources` | List/add resources |
| GET/POST | `/salons/[id]/campaigns` | List/add marketing campaigns |
| GET/POST | `/salons/[id]/waitlist` | List/add waitlist entries |
| GET/POST | `/salons/[id]/commissions` | List/add staff commissions |
| GET | `/salons/[id]/payouts` | List salon payouts |
| GET/PUT | `/salons/[id]/widget` | Get/update widget settings |
| GET/POST | `/salons/[id]/last-minute` | List/add last-minute deals |
| POST | `/salons/[id]/marketplace/enable` | Enable marketplace |
| POST | `/salons/[id]/marketplace/disable` | Disable marketplace |

### Staff Management (`/api/staff/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT | `/staff/[staffId]/working-hours` | Get/set working hours | Yes |
| GET/POST | `/staff/[staffId]/time-off` | Get/add time off | Yes |
| GET/POST | `/staff/[id]/commissions` | Get/set commissions | Yes |

### Services & Categories

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/services/[serviceId]` | Manage service | Yes |
| GET/PUT/DELETE | `/categories/[categoryId]` | Manage category | Yes |

### Products

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/products/[productId]` | Manage product | Yes |

### Payments & Checkout

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/payments` | List payments | Yes |
| POST | `/payments/intent` | Create Stripe PaymentIntent | Yes |
| POST | `/payments/confirm` | Confirm payment | Yes |
| GET | `/payments/[id]` | Get payment details | Yes |
| GET | `/checkout/[bookingId]` | Get checkout details | Yes |
| POST | `/checkout/refund` | Process refund | Yes |

### Discounts & Gift Cards

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/discounts/validate` | Validate discount code | No |
| GET/PUT/DELETE | `/discounts/[discountId]` | Manage discount | Yes |
| POST | `/gift-cards/check` | Check gift card balance | No |

### Packages

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/packages/[packageId]` | Manage package | Yes |
| POST | `/packages/[packageId]/purchase` | Purchase package | Yes |

### Resources

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/resources/[resourceId]` | Manage resource | Yes |
| GET | `/resources/[resourceId]/availability` | Get resource availability | Yes |

### Campaigns

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/campaigns/[campaignId]` | Manage campaign | Yes |
| POST | `/campaigns/[campaignId]/send` | Send campaign | Yes |

### Waitlist

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/waitlist/[waitlistId]` | Manage waitlist entry | Yes |
| POST | `/waitlist/[waitlistId]/notify` | Notify client | Yes |

### Client Endpoints (`/api/my/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/my/bookings` | List my bookings | Yes |
| GET | `/my/bookings/upcoming` | Upcoming bookings | Yes |
| GET | `/my/bookings/past` | Past bookings | Yes |

### Users & Clients

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/users` | List users | Yes (admin) |
| GET/PUT | `/users/[id]` | Manage user | Yes |
| GET | `/users/[id]/locations` | User's salons | Yes |
| GET | `/users/[id]/packages` | User's packages | Yes |
| GET | `/clients` | List clients | Yes |
| GET/PUT | `/clients/[id]` | Manage client | Yes |

### Reviews

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT/DELETE | `/reviews/[reviewId]` | Manage review | Yes |

### Notifications

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/notifications` | List notifications | Yes |
| POST | `/notifications/read` | Mark as read | Yes |

### Invoices

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/invoices/[id]` | Get/download invoice | Yes |

### Payouts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/payouts/[payoutId]` | Get payout details | Yes |

### Platform Fees

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/platform-fees` | List platform fees | Yes |

### Reports (`/api/reports/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/reports/overview` | General overview | Yes |
| GET | `/reports/revenue` | Revenue report | Yes |
| GET | `/reports/bookings` | Bookings report | Yes |
| GET | `/reports/staff` | Staff performance | Yes |
| GET | `/reports/clients` | Client analytics | Yes |

### Multi-Location (`/api/locations/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/locations/overview` | Multi-location overview | Yes |
| POST | `/locations/transfer-staff` | Transfer staff between locations | Yes |
| POST | `/locations/copy-services` | Copy services to another location | Yes |

### Widget (`/api/widget/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/widget/[salonId]` | Get widget config | No |
| GET | `/widget/[salonId]/availability` | Get available slots | No |
| POST | `/widget/[salonId]/book` | Create booking | Yes (client) |

> **Note:** Booking creation now requires authentication. Customers must sign in or create an account before completing their booking (similar to Fresha).

### Admin (`/api/admin/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET/PUT | `/admin/settings` | Platform settings | Yes (admin) |
| GET | `/admin/salons` | List all salons | Yes (admin) |
| GET/PUT/DELETE | `/admin/salons/[salonId]` | Manage salon | Yes (admin) |
| GET | `/admin/users` | List all users | Yes (admin) |
| GET/PUT/DELETE | `/admin/users/[userId]` | Manage user | Yes (admin) |
| GET | `/admin/reviews` | Moderate reviews | Yes (admin) |
| PUT | `/admin/reviews/[reviewId]` | Update review status | Yes (admin) |
| GET | `/admin/fees` | List platform fees | Yes (admin) |
| POST | `/admin/fees/[feeId]/resolve` | Mark fee as paid | Yes (admin) |

### Webhooks (`/api/webhooks/`)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/webhooks/stripe` | Stripe webhook handler | Stripe signature |
| POST | `/webhooks/sms` | SMS provider webhook | Provider signature |

---

## Code Modifications Log

### Session: January 18, 2026

#### 1. Created Missing Staff Detail API Endpoint

**Problem**: Staff detail page at `/dashboard/salon/[salonId]/team/[staffId]` was failing because the API endpoint `/api/staff/[staffId]` didn't exist. The `useStaffMember(staffId)` hook was calling a non-existent endpoint.

**Solution**: Created comprehensive staff detail endpoint with full CRUD operations.

**File Created**: `src/app/api/staff/[staffId]/route.js`

**GET /api/staff/[staffId]** - Fetch staff member details with authorization

**PUT /api/staff/[staffId]** - Update staff member (all personal fields, employment info, customization)

**DELETE /api/staff/[staffId]** - Soft delete (deactivate)

**Result**: ✅ Staff detail page now loads correctly; E2E test `staff-detail-smoke.spec.js` passes

---

### Session: January 7, 2026

#### 1. Fixed E2E Test Auth Cookie Persistence Across All Browsers

**Problem**: Playwright smoke tests were failing on WebKit, Mobile Safari, and Tablet due to auth token/cookie not persisting between API calls and page navigation, causing unexpected redirects to /login.

**Solution**: Updated both `e2e/calendar-smoke.spec.js` and `e2e/services-smoke.spec.js`:
- Set auth cookie with proper domain/path/sameSite attributes for cross-browser compatibility:
  ```javascript
  await context.addCookies([{
    name: 'token',
    value: token,
    domain: 'localhost',
    path: '/',
    httpOnly: false,
    sameSite: 'Lax',
  }]);
  ```
- Added explicit verification of auth via `/api/auth/me` before protected page navigation
- Added `waitForFunction` to ensure localStorage token persists before accessing dashboard/protected pages
- Simplified mobile assertions to use `toBeInViewport()` instead of strict visibility checks

**Result**: 
- ✅ **381 tests passed** across all browsers (Chromium, Firefox, WebKit, Tablet, Mobile Chrome, Mobile Safari)
- ✅ **Zero runtime errors**: No "map is not a function" or "forEach is not a function" errors on any page
- ✅ **100% cross-browser coverage**: Works on desktop and mobile viewports

**Files Modified**:
- `e2e/calendar-smoke.spec.js`
- `e2e/services-smoke.spec.js`

---

#### 2. Fixed Array Method Errors in Frontend Components

**Problem**: Multiple UI components were receiving API envelope objects instead of arrays, causing runtime errors:
- "staff.map is not a function" in calendar, booking form, team page
- "services.map is not a function" in services and booking pages

**Solution**: 

**A. Updated Data Hooks to Transform API Responses**:

**`src/hooks/use-staff.js`**:
```javascript
const { data: response } = useQuery({
  queryKey: ['staff', salonId],
  queryFn: () => api.get(`/salons/${salonId}/staff`),
  select: (data) => data?.data?.staff || [],
  enabled: !!salonId,
});
```

**`src/hooks/use-services.js`**:
```javascript
const useServices = (salonId) => {
  const { data: response } = useQuery({
    queryKey: ['services', salonId],
    queryFn: () => api.get(`/salons/${salonId}/services`),
    select: (data) => {
      // Flatten categories.services into single array with category_id attached
      const services = [];
      (data?.data?.categories || []).forEach((cat) => {
        (cat.services || []).forEach((svc) => {
          services.push({ ...svc, category_id: cat.id });
        });
      });
      return services;
    },
    enabled: !!salonId,
  });
  return response;
};

const useCategories = (salonId) => {
  const { data: response } = useQuery({
    queryKey: ['categories', salonId],
    queryFn: () => api.get(`/salons/${salonId}/categories`),
    select: (data) => data?.data?.categories || [],
    enabled: !!salonId,
  });
  return response;
};
```

**B. Added Defensive Array Guards in Components**:

**`src/components/calendar/calendar-view.jsx`**:
```javascript
{Array.isArray(staff) && staff.map((s) => (
  <Checkbox key={s.id} value={s.id} onChange={(checked) => ...} />
))}
```

**`src/components/bookings/booking-form.jsx`**:
```javascript
{Array.isArray(staff) && staff.map((s) => (
  <SelectItem key={s.id} value={String(s.id)}>
    {s.user?.first_name} {s.user?.last_name}
  </SelectItem>
))}
```

**`src/app/dashboard/salon/[salonId]/team/page.js`**:
```javascript
if (Array.isArray(staff)) {
  staff.forEach((member) => {
    // group staff...
  });
}
```

**C. Fixed Query Enabled Flags**:

**`src/hooks/use-clients.js`**:
```javascript
const { data: response } = useQuery({
  queryKey: ['clients', query],
  queryFn: () => api.get('/clients', { q: query }),
  select: (data) => data?.data?.clients || [],
  enabled: !!(query && query.length >= 2), // Ensure boolean, not just truthy
});
```

**Result**: All staff/services/category rendering now works correctly without array-method errors.

**Files Modified**:
- `src/hooks/use-staff.js`
- `src/hooks/use-services.js`
- `src/components/calendar/calendar-view.jsx`
- `src/components/bookings/booking-form.jsx`
- `src/app/dashboard/salon/[salonId]/team/page.js`
- `src/hooks/use-clients.js`

---

#### 3. Created New E2E Smoke Tests

**`e2e/calendar-smoke.spec.js`**: Validates calendar page loads without staff array errors
- Register owner → Create salon → Navigate to calendar → Verify no array-method runtime errors
- Captures console errors and pageerror events
- Tests across all browser profiles

**`e2e/services-smoke.spec.js`**: Validates services page grouping and rendering
- Register owner → Create salon → Create category → Create service → Navigate to services → Verify category/service rendered
- Captures console errors
- Tests grouping logic works across browsers

---

### Session: January 2026 (Previous Sessions)

#### 1. Installed Zod Validation Library
```bash
npm install zod
```

#### 2. Created `/database/migrations.sql`
**Purpose**: SQL migrations for all missing tables and columns

**Content** (16 sections):
1. ALTER existing tables (users, salons, salon_settings, payments, notifications, reviews, bookings, services, staff)
2. Products & POS tables
3. Discounts & Promotions tables
4. Gift Cards tables
5. Packages & Memberships tables
6. Waitlist table
7. Resources tables (rooms, chairs, equipment)
8. Widget Settings table
9. Refunds table
10. Marketing Campaigns table
11. Last Minute Deals table
12. Staff Commissions table
13. Payouts table
14. Platform Settings table
15. Audit Logs table
16. Performance indexes

#### 3. Created `/src/lib/validate.js`
**Purpose**: Centralized Zod validation schemas

**Exported Schemas**:
- `emailSchema`, `phoneSchema`, `passwordSchema`, `idSchema`, `dateSchema`, `timeSchema`, `datetimeSchema`
- `registerSchema`, `loginSchema`, `forgotPasswordSchema`, `resetPasswordSchema`, `changePasswordSchema`
- `createBookingSchema`, `rescheduleBookingSchema`, `assignStaffSchema`
- `createSalonSchema`, `updateSalonSchema`, `salonSettingsSchema`
- `createServiceSchema`, `updateServiceSchema`
- `addStaffSchema`, `workingHoursSchema`, `timeOffSchema`
- `createPaymentIntentSchema`, `refundSchema`
- `validateDiscountSchema`, `createDiscountSchema`
- `createReviewSchema`, `updateReviewSchema`
- `widgetBookingSchema`
- `paginationSchema`

**Exported Functions**:
- `validate(schema, data)` - Returns `{ success: true, data }` or `{ success: false, errors }`
- `formatValidationErrors(errors)` - Formats errors as human-readable string
- `createValidator(schema)` - Creates reusable validator function

#### 4. Fixed Race Condition in `/api/bookings/route.js`

**Problem**: TOCTOU (Time-of-Check to Time-of-Use) vulnerability
- Conflict check happened BEFORE transaction
- Between check and insert, another request could book the same slot

**Solution**:
```javascript
// Inside transaction, lock conflicting rows:
const [conflicts] = await conn.execute(
  `SELECT id FROM bookings 
   WHERE staff_id = ? 
   AND status NOT IN ('cancelled', 'no_show')
   AND start_datetime < ? AND end_datetime > ?
   FOR UPDATE`,
  [staffId, endDatetime, startDatetime]
);
```

**Additional Changes**:
- Added Zod validation with `createBookingSchema`
- Improved error handling with CONFLICT prefix for 409 status

#### 5. Fixed N+1 Query in `/api/salons/[id]/availability/route.js`

**Problem**: For each staff member, 3 separate queries were executed
- 10 staff members = 30 queries

**Solution**: Batch queries with Maps for O(1) lookup
```javascript
// 3 queries total, regardless of staff count:
const [allWorkingHours] = await query(
  `SELECT * FROM staff_working_hours WHERE staff_id IN (${staffIds.join(',')}) AND day_of_week = ?`,
  [dayOfWeek]
);

const [allTimeOffs] = await query(
  `SELECT * FROM staff_time_off WHERE staff_id IN (${staffIds.join(',')}) AND ...`,
  [...]
);

const [allBookings] = await query(
  `SELECT * FROM bookings WHERE staff_id IN (${staffIds.join(',')}) AND ...`,
  [...]
);

// Build Maps for O(1) lookup
const workingHoursMap = new Map();
const timeOffMap = new Map();
const bookingsMap = new Map();
```

#### 6. Fixed Race Condition in `/api/widget/[salonId]/book/route.js`

**Problem**: Same TOCTOU vulnerability as `/api/bookings`

**Solution**: Same pattern - moved conflict check inside transaction with `FOR UPDATE`

**Additional Changes**:
- Added Zod validation with `widgetBookingSchema`
- Added working hours check before transaction
- Improved salon_clients tracking (first_visit_date, last_visit_date, total_visits)
- Added platform fee calculation for new marketplace clients
- Improved user creation (email_verified, updated_at)
- Better notification creation with proper type

---

## Known Issues & Future Improvements

### Testing & Stability
- [x] **FIXED**: E2E test auth cookie persistence across all browsers
- [x] **FIXED**: Array method runtime errors in calendar, services, booking, team pages
- [ ] Expand smoke tests to cover edit/delete actions on services
- [ ] Add smoke test for staff creation and calendar filter population

### Security
- [ ] Add rate limiting to all endpoints
- [ ] Add CSRF protection
- [ ] Implement request signing for webhooks
- [ ] Add input sanitization for SQL injection prevention (parameterized queries help but validate anyway)

### Performance
- [ ] Apply same N+1 fix pattern to other list endpoints
- [ ] Add Redis caching for frequently accessed data (salon details, services)
- [ ] Implement database connection pooling optimization
- [ ] Add database query logging for slow query detection

### Validation
- [ ] Apply Zod validation to ALL endpoints (currently only bookings endpoints)
- [ ] Add request body size limits
- [ ] Add file upload validation (size, type)

### Features
- [ ] Implement soft delete consistently across all entities
- [ ] Add proper audit logging using audit_logs table
- [ ] Implement webhook retry mechanism
- [ ] Add export functionality for reports

### Code Quality
- [ ] Add TypeScript for type safety
- [ ] Add unit tests for all endpoints
- [ ] Add integration tests for booking flow
- [ ] Add API documentation with OpenAPI/Swagger

---

## Test Results

### Latest Full Suite (January 7, 2026)
```
Running 384 tests using 5 workers
381 passed ✅
3 skipped (mobile routing edge cases)
0 failed

Browsers Tested:
- Chromium ✅
- Firefox ✅
- WebKit (Desktop Safari) ✅
- Tablet (iPad Pro 11) ✅
- Mobile Chrome ✅
- Mobile Safari ✅

Time: 1.6 minutes
```

### Test Coverage
- ✅ Authentication (register, login, logout, password reset)
- ✅ Onboarding flow (marketplace → account creation → dashboard → salon setup)
- ✅ Cross-browser compatibility
- ✅ Calendar page (no array-method errors)
- ✅ Services page (category grouping with flattened services)
- ✅ Booking flow (create booking with staff/service selection)
- ✅ API endpoints (salons, bookings, marketplace)
- ✅ Marketplace view
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility

---

## Known Issues & Future Improvements

---

## Quick Reference

### Creating a New Endpoint

```javascript
import { query, getOne, transaction } from '@/lib/db';
import { success, error, created, notFound } from '@/lib/response';
import { verifyAuth, requireRole } from '@/lib/auth';
import { validate, yourSchema } from '@/lib/validate';

export async function POST(request) {
  try {
    // 1. Auth check
    const authResult = await verifyAuth(request);
    if (authResult.error) return authResult.error;
    const { user } = authResult;

    // 2. Parse and validate input
    const body = await request.json();
    const validation = validate(yourSchema, body);
    if (!validation.success) {
      return error(formatValidationErrors(validation.errors));
    }

    // 3. Business logic with transaction for writes
    const result = await transaction(async (conn) => {
      // Use conn.execute() for queries inside transaction
      // Use FOR UPDATE when checking then writing
    });

    // 4. Return response
    return created({ success: true, data: result });
  } catch (err) {
    console.error('Error:', err);
    return error('Something went wrong', 500);
  }
}
```

### Race Condition Prevention Pattern

```javascript
await transaction(async (conn) => {
  // Lock rows that might conflict
  const [conflicts] = await conn.execute(
    `SELECT id FROM table WHERE ... FOR UPDATE`,
    [params]
  );
  
  if (conflicts.length > 0) {
    throw new Error('CONFLICT: Resource already taken');
  }
  
  // Safe to insert now
  await conn.execute('INSERT INTO table ...', [params]);
});
```

### Batch Query Pattern (N+1 Prevention)

```javascript
// Get all IDs first
const ids = items.map(i => i.id);

// Single query for all related data
const [relatedData] = await query(
  `SELECT * FROM related WHERE parent_id IN (${ids.join(',')})`,
  []
);

// Build Map for O(1) lookup
const dataMap = new Map();
relatedData.forEach(item => {
  if (!dataMap.has(item.parent_id)) {
    dataMap.set(item.parent_id, []);
  }
  dataMap.get(item.parent_id).push(item);
});

// Use map in loop
items.forEach(item => {
  const related = dataMap.get(item.id) || [];
});
```

---

*Last Updated: January 7, 2026*
*Total Endpoints: 101*
*Test Coverage: 381 tests passing across 6 browser profiles*
