# Fresh - How It Works

A complete guide explaining how the Fresh salon booking platform works for everyone.

---

## 🎯 What is Fresh?

Fresh is a **salon booking platform** (like Fresha or Planity) with 3 main parts:

| Part               | URL                       | Who uses it          | What it does                                 |
| ------------------ | ------------------------- | -------------------- | -------------------------------------------- |
| **Dashboard**      | `/dashboard/salon/[id]/*` | Salon owners & staff | Manage bookings, clients, services, payments |
| **Booking Widget** | `/book/[salonId]`         | Customers            | Book appointments online (embeddable)        |
| **Marketplace**    | `/salons`, `/salon/[id]`  | Customers            | Discover and find salons                     |

---

## 👥 User Types

| Role        | Description                     | Access                                             |
| ----------- | ------------------------------- | -------------------------------------------------- |
| **Client**  | Customer who books appointments | Mobile app (future), Booking widget                |
| **Owner**   | Salon owner                     | Full dashboard access                              |
| **Staff**   | Salon employee                  | Limited dashboard (own calendar, assigned clients) |
| **Manager** | Senior staff                    | More access than staff (reports, all clients)      |
| **Admin**   | Platform admin                  | Everything (manage all salons)                     |

---

## 📱 User Flows

### Flow 1: Customer Books Online

```
┌─────────────────────────────────────────────────────────────────┐
│                    CUSTOMER BOOKING FLOW                        │
└─────────────────────────────────────────────────────────────────┘

1. Customer visits salon website or marketplace
         ↓
2. Clicks "Book Now" → Opens booking widget
         ↓
3. Selects:
   • Service (e.g., Haircut - 30min - €25)
   • Staff member (or "Any available")
   • Date & Time from available slots
         ↓
4. Signs in or creates account:
   • Choose role: Customer (e.g., booking an appointment)
   • Register with: name, email, phone, password
         ↓
5. Reviews and confirms booking
         ↓
6. System creates:
   • salon_clients entry (links customer to this salon)
   • Booking record
         ↓
7. Both receive confirmation:
   • Customer: Email/SMS with details
   • Salon: Notification + appears on calendar
```

**Database result:**

```
users table:           { id: 100, email: "customer@email.com", role: "client", country: "" }
salon_clients table:   { salon_id: 1, client_id: 100, total_visits: 1 }
bookings table:        { id: 500, salon_id: 1, client_id: 100, status: "confirmed" }
```

---

### Flow 2: Salon Owner Adds Walk-in Client

```
┌─────────────────────────────────────────────────────────────────┐
│                    WALK-IN CLIENT FLOW                          │
└─────────────────────────────────────────────────────────────────┘

1. Customer walks into salon (no appointment)
         ↓
2. Receptionist opens Dashboard → Clients → "Add Client"
         ↓
3. Fills in customer info:
   • First name, Last name
   • Email (optional), Phone
   • Gender, Birthday, Address (optional)
   • Notes: "Prefers natural products"
         ↓
4. Clicks "Save"
         ↓
5. System creates:
   • User account (with placeholder email if none given)
   • salon_clients entry (links to this salon with notes)
         ↓
6. Receptionist creates booking for them on calendar
```

**Database result:**

```
users table:           { id: 101, email: "client_xxx@placeholder.local", role: "client", first_name: "Jane" }
salon_clients table:   { salon_id: 1, client_id: 101, notes: "Prefers natural products" }
```

---

### Flow 3: Returning Customer Books at Different Salon

```
┌─────────────────────────────────────────────────────────────────┐
│                 MULTI-SALON CUSTOMER FLOW                       │
└─────────────────────────────────────────────────────────────────┘

1. Jane already visited Salon A
   users:          { id: 100, email: "jane@email.com", country: "" }
   salon_clients:  { salon_id: 1 (Salon A), client_id: 100 }
         ↓
2. Jane finds Salon B on marketplace
         ↓
3. Books appointment at Salon B using same email
         ↓
4. System recognizes email → uses existing user
         ↓
5. Creates NEW salon_clients entry for Salon B
         ↓
Result:
   users:          { id: 100, email: "jane@email.com", country: "" }  ← Same user
   salon_clients:  { salon_id: 1, client_id: 100, notes: "Salon A notes" }
   salon_clients:  { salon_id: 2, client_id: 100, notes: "Salon B notes" }
```

**Key point:** Each salon has their OWN notes about the client. Personal info (name, phone, address) is shared.

---

### Flow 4: Daily Salon Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                    TYPICAL SALON DAY                            │
└─────────────────────────────────────────────────────────────────┘

MORNING:
┌─────────────────────────────────────────┐
│ Owner opens Dashboard                   │
│ • Checks today's calendar               │
│ • Sees 8 appointments booked            │
│ • Notices 1 new online booking          │
└─────────────────────────────────────────┘
         ↓
CLIENT ARRIVES:
┌─────────────────────────────────────────┐
│ Receptionist clicks booking             │
│ • Marks as "Confirmed/Arrived"          │
│ • Staff sees it on their calendar       │
└─────────────────────────────────────────┘
         ↓
SERVICE COMPLETED:
┌─────────────────────────────────────────┐
│ Staff clicks "Checkout"                 │
│ • Service price shown                   │
│ • Add products if purchased             │
│ • Apply discount code if any            │
│ • Process payment (card/cash)           │
│ • Booking marked "Completed"            │
└─────────────────────────────────────────┘
         ↓
CLIENT NO-SHOW:
┌─────────────────────────────────────────┐
│ If client doesn't arrive:               │
│ • Mark as "No Show"                     │
│ • System tracks no-show count           │
│ • Optional: add to blacklist            │
└─────────────────────────────────────────┘
         ↓
END OF DAY:
┌─────────────────────────────────────────┐
│ Owner checks Reports                    │
│ • Revenue: €450 today                   │
│ • 7/8 bookings completed                │
│ • 1 no-show                             │
│ • Staff performance                     │
└─────────────────────────────────────────┘
```

---

## 🏪 Dashboard Features (Detailed)

### 📅 Calendar (`/dashboard/salon/[id]/calendar`)

| Feature                  | Description                                    |
| ------------------------ | ---------------------------------------------- |
| **Day/Week/Month Views** | Switch between calendar views                  |
| **Staff Filtering**      | Filter to show one staff member's appointments |
| **Drag & Drop**          | Reschedule bookings by dragging                |
| **Click to Book**        | Click empty slot to create new booking         |
| **Color Coding**         | Each staff has unique color                    |
| **Time Grid**            | 7 AM - 9 PM, 15-minute slots                   |

### 📋 Bookings (`/dashboard/salon/[id]/bookings`)

| Feature            | Description                                             |
| ------------------ | ------------------------------------------------------- |
| **Booking List**   | Table of all bookings with search                       |
| **Status Filter**  | Filter by pending/confirmed/completed/cancelled/no-show |
| **Quick Actions**  | Confirm, cancel, no-show from dropdown                  |
| **Booking Detail** | Click to see full details in side panel                 |
| **Checkout**       | Go to payment screen                                    |

### 👥 Clients (`/dashboard/salon/[id]/clients`)

| Feature            | Description                                      |
| ------------------ | ------------------------------------------------ |
| **Client List**    | Table with search, sort by name/date/visits      |
| **Stats Cards**    | Total clients, new this month, active, avg spend |
| **Add Client**     | Walk-in client registration                      |
| **Client Profile** | `/clients/[id]` - Full profile page              |

**Client Profile Page includes:**

- Contact info (email, phone, address, birthday)
- Stats (total visits, total spent, last visit)
- Booking history (upcoming + past)
- Notes (salon-specific, add/delete notes)

### ✂️ Services (`/dashboard/salon/[id]/services`)

| Feature          | Description                                               |
| ---------------- | --------------------------------------------------------- |
| **Categories**   | Group services (Hair, Nails, Massage, etc.)               |
| **Add Category** | Create new category with name/description                 |
| **Add Service**  | Name, description, duration, price, category, buffer time |
| **Reorder**      | Drag to reorder categories                                |
| **Toggle**       | Enable/disable services                                   |

### 👨‍💼 Team (`/dashboard/salon/[id]/team`)

| Feature           | Description                                       |
| ----------------- | ------------------------------------------------- |
| **Staff Cards**   | Grid view with avatar, role, contact              |
| **Add Staff**     | Name, email, phone, role, job title, bio          |
| **Roles**         | Owner, Manager, Staff, Receptionist               |
| **Schedule**      | Set working hours per day of week                 |
| **Working Hours** | Start/end time, break start/end, copy to all days |

### 🛒 Products (`/dashboard/salon/[id]/products`)

| Feature              | Description                                        |
| -------------------- | -------------------------------------------------- |
| **Product List**     | Table with search, filter by category/stock status |
| **Add Product**      | Name, brand, SKU, category, price, cost, stock     |
| **Stock Management** | Track quantity, low stock alerts                   |
| **Categories**       | Hair Care, Skincare, Makeup, Tools, etc.           |

### 💰 Sales (`/dashboard/salon/[id]/sales`)

| Feature             | Description                                |
| ------------------- | ------------------------------------------ |
| **Checkout**        | `/checkout/[bookingId]` - Process payments |
| **Add Products**    | Add retail products to booking sale        |
| **Discounts**       | Apply discount codes                       |
| **Gift Cards**      | Redeem gift cards                          |
| **Tips**            | Add tip (10%, 15%, 20%, 25%, custom)       |
| **Payment Methods** | Cash, Card, Card Terminal, Bank Transfer   |
| **Sales History**   | List all transactions with filters         |
| **Refunds**         | Process full/partial refunds               |

### 📊 Reports (`/dashboard/salon/[id]/reports`)

**Overview Dashboard:**

- Revenue with trend
- Bookings count with trend
- Client count with trend
- Staff utilization %

**Revenue Report** (`/reports/revenue`):

- Daily revenue bar chart
- Revenue by payment method (Card/Cash/Gift Card)
- Revenue by category
- Revenue by service
- Export to CSV

**Bookings Report** (`/reports/bookings`):

- Daily bookings trend
- Status breakdown (completed, cancelled, no-show)
- Booking source (direct, marketplace, mobile)
- Peak hours visualization
- Most booked services

**Clients Report** (`/reports/clients`):

- New vs returning clients
- Client retention rate
- Top spending clients
- Acquisition sources

**Staff Report** (`/reports/staff`):

- Bookings per staff member
- Revenue per staff member
- Utilization rate
- Performance ranking

### 📣 Marketing (`/dashboard/salon/[id]/marketing`)

**Discounts** (`/marketing/discounts`):
| Field | Description |
|-------|-------------|
| Code | e.g., "SUMMER20" |
| Type | Percentage or Fixed amount |
| Value | 20% or €10 |
| Min Purchase | Minimum order amount |
| Max Uses | Total redemption limit |
| Valid Dates | Start and end date |
| Toggle | Enable/disable |

**Gift Cards** (`/marketing/gift-cards`):
| Field | Description |
|-------|-------------|
| Code | XXXX-XXXX-XXXX-XXXX format |
| Initial Amount | €50, €100, etc. |
| Remaining Balance | Track usage |
| Recipient | Name and email |
| Expiry Date | When it expires |
| Status | Active, Redeemed, Expired, Cancelled |

**Packages** (`/marketing/packages`):
| Field | Description |
|-------|-------------|
| Name | "5 Haircuts Bundle" |
| Services | Select included services |
| Regular Price | Sum of individual prices |
| Package Price | Discounted bundle price |
| Savings | Auto-calculated % |
| Validity | Days valid after purchase |

**Campaigns** (`/marketing/campaigns`):
| Field | Description |
|-------|-------------|
| Type | Email or SMS |
| Subject/Title | Message subject |
| Content | Message body |
| Audience | All, Active, Inactive, New, Loyal, Birthday |
| Schedule | Send now or schedule for later |
| Stats | Recipients, sent count |

**Waitlist** (`/marketing/waitlist`):
| Field | Description |
|-------|-------------|
| Client | Who's waiting |
| Service | Requested service |
| Preferred Date | When they want |
| Time Range | Preferred time window |
| Priority | Low, Normal, High, Urgent |
| Status | Waiting, Notified, Booked, Expired |
| Actions | Notify, Convert to booking |

### ⚙️ Settings (`/dashboard/salon/[id]/settings`)

**General** (`/settings/general`):

- Salon name, description
- Contact (email, phone, website)
- Address (street, city, state, zip, country)
- Photos (upload, delete, set cover)

**Business Hours** (`/settings/hours`):

- 7-day schedule
- Enable/disable per day
- Open/close time
- Copy to all days

**Booking Policies** (`/settings/policies`):

- Auto-confirm bookings (yes/no)
- Cancellation policy (flexible/moderate/strict/custom)
- Cancellation window (hours before)
- Deposit required (% or fixed amount)
- No-show fee
- Buffer between bookings
- Max advance booking days

**Notifications** (`/settings/notifications`):

- **Client notifications:**
  - Booking confirmation (email/SMS)
  - Reminders (24h, 2h, etc.)
  - Cancellation notices
- **Staff notifications:**
  - New booking alerts
  - Cancellation alerts
  - Daily schedule summary
- **Owner notifications:**
  - New bookings
  - Daily/weekly summaries
  - Low availability alerts

**Widget** (`/settings/widget`):

- Theme (default/modern/minimal/dark)
- Colors (primary, text, background)
- Button text customization
- Embed code (copy script)
- Direct booking link

**Marketplace** (`/settings/marketplace`):

- Show on marketplace (yes/no)
- Profile completeness indicator
- Tagline
- Business highlights
- Specialties
- Years in business
- Languages spoken

**Reviews** (`/settings/reviews`):

- Average rating display
- Total reviews
- Response rate
- Reply to reviews

**Account** (`/settings/account`):

- Update personal info
- Change password
- Notification preferences

---

## 🎫 Booking Widget (Detailed)

The booking widget is a **5-step wizard** that can be embedded on any salon website.

**URL:** `/book/[salonId]`

### Step 1: Select Services

- Browse services grouped by category
- Search functionality
- Multi-select support
- Shows: name, description, duration, price
- Running total in sidebar

### Step 2: Choose Staff

- "Any Available" option (flexible scheduling)
- Staff cards with:
  - Avatar
  - Name and title
  - Rating and review count
  - Specialties
- Filtered by selected services (only staff who can do those services)

### Step 3: Pick Date & Time

- Calendar for date selection
- Disables past dates
- Available time slots fetched from API
- Grouped by time of day:
  - Morning (before 12 PM)
  - Afternoon (12 PM - 5 PM)
  - Evening (after 5 PM)
- Shows total duration

### Step 4: Enter Details

- First Name (required)
- Last Name (required)
- Email (required)
- Phone (required)
- Additional Notes (optional)
- Marketing consent checkbox
- Terms acceptance checkbox (required)

### Step 5: Confirmation

- ✓ Success checkmark
- Booking reference number
- Email confirmation notice
- Appointment details:
  - Date and time
  - Location with address
  - Assigned staff
  - Services with prices
  - Total amount
- Actions:
  - Add to Google Calendar
  - Print confirmation
- Cancellation policy notice

---

## 🌍 Marketplace (Detailed)

The marketplace is the **public discovery platform** for customers.

### Homepage (`/`)

- **Hero Section**: Search box for services and location
- **Popular Services**: Quick badges (Haircut, Manicure, Massage, etc.)
- **Browse by Category**: Hair, Nails, Spa, Barber
- **Featured Salons**: Top-rated venues grid
- **How It Works**: 3-step guide
- **Business CTA**: "Are you a salon owner?" link

### Salon Search (`/salons`)

- **Search Bar**: Service/salon name + location
- **Filters**:
  - Category (Hair, Nails, Spa, Barber)
  - Price range ($ to $$$$)
  - Minimum rating (4+, 4.5+)
  - Open Now toggle
- **Sort By**: Recommended, Highest Rated, Most Reviews, Nearest, Price
- **View Modes**: Grid or List
- **Salon Cards**: Image, name, category, rating, reviews, location, price level

### Salon Profile (`/salon/[id]`)

- **Hero Image**: Full-width cover photo
- **Actions**: Share, Favorite (heart)
- **Salon Header**: Logo, name, category, rating, Book Now button

**Tabs:**
| Tab | Content |
|-----|---------|
| **Services** | Grouped by category with book buttons |
| **Team** | Staff cards with ratings and bio |
| **Reviews** | Rating summary, star distribution, review list |
| **About** | Description and amenities checklist |

**Sidebar:**

- Book Now button (sticky)
- Business hours (highlights today)
- Contact info (address, phone, website)

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│   USERS     │      │  SALON_CLIENTS   │      │   SALONS    │
│             │      │                  │      │             │
│ id          │◄────►│ client_id        │      │ id          │
│ email       │      │ salon_id         │◄────►│ name        │
│ first_name  │      │ notes            │      │ owner_id ───┼──► (users.id)
│ last_name   │      │ first_visit      │      │ address     │
│ phone       │      │ last_visit       │      │             │
│ gender      │      │ total_visits     │      └─────────────┘
│ date_of_birth      └──────────────────┘             │
│ address     │                                       │
│ city        │      ┌──────────────────┐             │
│ postal_code │      │    BOOKINGS      │             │
│ role        │      │                  │             │
└─────────────┘      │ id               │             │
      │              │ salon_id ────────┼─────────────┘
      │              │ client_id ───────┼──► (users.id)
      └──────────────┼► staff_id        │
                     │ service_id       │
                     │ start_time       │
                     │ end_time         │
                     │ status           │
                     │ total_price      │
                     │ country          │
                     └──────────────────┘
```

**Key relationships:**

- A **User** can be a client at MANY salons → via `salon_clients`
- A **Salon** has MANY clients → via `salon_clients`
- Each salon has their OWN **notes** about a client
- **Personal info** (name, email, address) is on `users` table (shared)
- **Bookings** link a user to a salon for a specific service/time

---

## 📋 Scenarios

### Scenario A: New Salon Onboarding

1. Owner registers account via `/register?type=professional`
   • Must select their **Business Country** during registration.
2. System creates user → `users` table (role: owner, country: "DZ")
3. Owner starts onboarding → `/onboarding`
   • **Step 2 (Salon Details)**: Country is auto-filled from user profile.
4. Owner creates salon → `salons` table (country: "DZ" pre-filled)
5. Owner adds services → `services` table
6. Owner adds staff → `staff` table + `users` table
7. Owner sets working hours → `working_hours` table
8. Owner enables online booking → widget is live
9. Customers start booking online

### Scenario B: Customer Lifecycle

1. **First visit**: Customer books online → account created
2. **After service**: Checkout → payment recorded
3. **Next day**: Customer receives "Thank you" email
4. **1 month later**: Customer gets "We miss you" campaign
5. **Returns**: Books again → loyalty increases
6. **Becomes VIP**: Owner sees high spend → offers discount

### Scenario C: Staff Member Day

1. Staff logs in → sees own calendar only
2. Sees 5 appointments today
3. Customer arrives → staff marks "arrived"
4. Completes service → staff clicks checkout
5. Adds product sale → processes payment
6. Next customer → repeat
7. End of day → sees own performance stats

---

## ❓ Common Questions

**Q: If a customer has no email, can they be added?**
A: Yes. System creates a placeholder email like `client_123@placeholder.local`. If they later register with a real email, they become separate accounts (unless manually merged).

**Q: Can a client see their own bookings?**
A: Not in the dashboard (that's for salon staff). In the future mobile app, clients will have their own interface.

**Q: What happens if staff is deleted?**
A: Their past bookings remain but show "Deleted Staff". Future bookings need to be reassigned.

**Q: Can a salon see another salon's clients?**
A: No. Each salon only sees clients who visited THEIR salon via `salon_clients` entries.

**Q: What's the difference between `users.notes` and `salon_clients.notes`?**
A:

- `users` has NO notes field (personal info only)
- `salon_clients.notes` = each salon's private notes about the client

---

## 🔄 Status Flows

### Booking Status Flow

```
[pending] → [confirmed] → [completed]
    ↓           ↓
[cancelled]  [no_show]
```

### Payment Status Flow

```
[unpaid] → [partial] → [paid]
             ↓
         [refunded]
```

---

## � API Structure

All API routes are in `/src/app/api/`. Here's the complete list:

### Authentication

| Route                       | Methods | Description             |
| --------------------------- | ------- | ----------------------- |
| `/api/auth/register`        | POST    | Create new account (supports role & country) |
| `/api/auth/login`           | POST    | Login and get token (returns user details)  |
| `/api/auth/logout`          | POST    | End session                                 |
| `/api/auth/forgot-password` | POST    | Request password reset                      |
| `/api/auth/reset-password`  | POST    | Set new password                            |
| `/api/auth/me`              | GET     | Get current user (includes role & country)  |

### Salons

| Route                              | Methods           | Description                |
| ---------------------------------- | ----------------- | -------------------------- |
| `/api/salons`                      | GET, POST         | List salons / Create salon |
| `/api/salons/[id]`                 | GET, PUT, DELETE  | Single salon CRUD          |
| `/api/salons/[id]/onboarding`      | GET, PUT          | Onboarding status          |
| `/api/salons/[id]/hours`           | GET, PUT          | Business hours             |
| `/api/salons/[id]/settings`        | GET, PUT          | Salon settings             |
| `/api/salons/[id]/photos`          | GET, POST, DELETE | Salon photos               |
| `/api/salons/[id]/widget-settings` | GET, PUT          | Booking widget config      |
| `/api/salons/[id]/stats`           | GET               | Dashboard statistics       |

### Services

| Route                                   | Methods          | Description          |
| --------------------------------------- | ---------------- | -------------------- |
| `/api/salons/[id]/services`             | GET, POST        | List/create services |
| `/api/salons/[id]/services/[serviceId]` | GET, PUT, DELETE | Single service       |

### Staff

| Route                                           | Methods          | Description       |
| ----------------------------------------------- | ---------------- | ----------------- |
| `/api/salons/[id]/staff`                        | GET, POST        | List/create staff |
| `/api/salons/[id]/staff/[staffId]`              | GET, PUT, DELETE | Single staff      |
| `/api/salons/[id]/staff/[staffId]/availability` | GET, PUT         | Staff schedule    |

### Clients

| Route                                 | Methods          | Description         |
| ------------------------------------- | ---------------- | ------------------- |
| `/api/salons/[id]/clients`            | GET, POST        | List/create clients |
| `/api/salons/[id]/clients/[clientId]` | GET, PUT, DELETE | Single client       |

### Bookings

| Route                                          | Methods          | Description          |
| ---------------------------------------------- | ---------------- | -------------------- |
| `/api/salons/[id]/bookings`                    | GET, POST        | List/create bookings |
| `/api/salons/[id]/bookings/[bookingId]`        | GET, PUT, DELETE | Single booking       |
| `/api/salons/[id]/bookings/[bookingId]/status` | PUT              | Update status only   |

### Payments & Sales

| Route                                          | Methods   | Description          |
| ---------------------------------------------- | --------- | -------------------- |
| `/api/salons/[id]/payments`                    | GET, POST | List/create payments |
| `/api/salons/[id]/payments/[paymentId]`        | GET, PUT  | Single payment       |
| `/api/salons/[id]/payments/[paymentId]/refund` | POST      | Issue refund         |

### Products

| Route                                   | Methods          | Description          |
| --------------------------------------- | ---------------- | -------------------- |
| `/api/salons/[id]/products`             | GET, POST        | List/create products |
| `/api/salons/[id]/products/[productId]` | GET, PUT, DELETE | Single product       |

### Marketing

| Route                                 | Methods          | Description         |
| ------------------------------------- | ---------------- | ------------------- |
| `/api/salons/[id]/discounts`          | GET, POST        | Discount codes      |
| `/api/salons/[id]/discounts/[code]`   | GET, PUT, DELETE | Single discount     |
| `/api/salons/[id]/discounts/validate` | POST             | Validate code       |
| `/api/salons/[id]/gift-cards`         | GET, POST        | Gift cards          |
| `/api/salons/[id]/gift-cards/[id]`    | GET, PUT         | Single gift card    |
| `/api/salons/[id]/packages`           | GET, POST        | Service packages    |
| `/api/salons/[id]/packages/[id]`      | GET, PUT, DELETE | Single package      |
| `/api/salons/[id]/campaigns`          | GET, POST        | Marketing campaigns |
| `/api/salons/[id]/campaigns/[id]`     | GET, PUT, DELETE | Single campaign     |
| `/api/salons/[id]/waitlist`           | GET, POST        | Waitlist entries    |
| `/api/salons/[id]/waitlist/[id]`      | GET, PUT, DELETE | Single entry        |

### Reports

| Route                               | Methods | Description       |
| ----------------------------------- | ------- | ----------------- |
| `/api/salons/[id]/reports/overview` | GET     | Dashboard stats   |
| `/api/salons/[id]/reports/revenue`  | GET     | Revenue analytics |
| `/api/salons/[id]/reports/bookings` | GET     | Booking analytics |
| `/api/salons/[id]/reports/clients`  | GET     | Client analytics  |
| `/api/salons/[id]/reports/staff`    | GET     | Staff performance |

### Categories

| Route             | Methods | Description                 |
| ----------------- | ------- | --------------------------- |
| `/api/categories` | GET     | List all service categories |

### Booking Widget (Public)

| Route                                | Methods | Description          |
| ------------------------------------ | ------- | -------------------- |
| `/api/widget/[salonId]`              | GET     | Public salon info    |
| `/api/widget/[salonId]/services`     | GET     | Public services list |
| `/api/widget/[salonId]/staff`        | GET     | Public staff list    |
| `/api/widget/[salonId]/availability` | GET     | Available slots      |
| `/api/widget/[salonId]/book`         | POST    | Create booking       |

### Marketplace (Public)

| Route                                  | Methods | Description          |
| -------------------------------------- | ------- | -------------------- |
| `/api/marketplace/salons`              | GET     | Search salons        |
| `/api/marketplace/salons/[id]`         | GET     | Public salon profile |
| `/api/marketplace/salons/[id]/reviews` | GET     | Salon reviews        |
| `/api/marketplace/featured`            | GET     | Featured salons      |

### Admin

| Route               | Methods | Description         |
| ------------------- | ------- | ------------------- |
| `/api/admin/users`  | GET     | List all users      |
| `/api/admin/salons` | GET     | List all salons     |
| `/api/admin/stats`  | GET     | Platform statistics |

---

## �🚀 Future Features (Mobile App)

For the client mobile app:

1. Client registration/login
2. Browse salons (marketplace)
3. Book appointments
4. View own bookings
5. Receive notifications
6. Leave reviews
7. Manage profile
8. View past receipts

The same `users` table will be used - clients just get their own interface.
