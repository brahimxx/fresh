# Phase 11: Public Booking Widget

## Overview

This phase implements a public-facing booking widget that allows clients to book appointments directly on any salon's booking page. The widget is designed to be embeddable on salon websites and provides a smooth multi-step booking experience.

## Components Created

### Booking Flow Page

**Location:** `src/app/book/[salonId]/page.js`

A 5-step booking wizard:

1. **Services** - Select one or more services
2. **Staff** - Choose a specific staff member or "Any Available"
3. **Date & Time** - Pick appointment date and time slot
4. **Sign In** - Login or create account (required)
5. **Confirm** - Review and confirm booking

> **Note:** Authentication is required to complete a booking. This follows the Fresha model where customers must sign in at checkout.

Features:

- Progress indicator with icons
- Salon header with logo, name, rating, location
- Booking summary sidebar showing selected services and total
- Back/Continue navigation
- Mobile-responsive design

### Service Selection Component

**Location:** `src/components/booking-widget/service-selection.jsx`

- Fetches services from `/api/widget/[salonId]/services`
- Search functionality
- Category filtering with tabs
- Multi-select support
- Shows service name, description, duration, and price
- Selected state with checkmark indicator

### Staff Selection Component

**Location:** `src/components/booking-widget/staff-selection.jsx`

- Fetches staff from `/api/widget/[salonId]/staff`
- Filters by selected services
- "Any Available" option for flexible scheduling
- Staff cards with:
  - Avatar with initials fallback
  - Name and title
  - Rating and review count
  - Specialties badges

### Date/Time Selection Component

**Location:** `src/components/booking-widget/datetime-selection.jsx`

- Interactive calendar for date selection
- Month navigation (prev/next)
- Disables past dates
- Fetches available time slots from `/api/widget/[salonId]/availability`
- Groups slots by time of day:
  - Morning (before 12 PM)
  - Afternoon (12 PM - 5 PM)
  - Evening (after 5 PM)
- Shows total duration badge

### Booking Authentication

**Location:** `src/components/booking-widget/booking-auth.jsx`

Authentication component that replaces guest checkout:

**For unauthenticated users:**

- Tabbed interface with Login / Create Account options
- Login form with email and password
- Registration form with:
  - First Name, Last Name
  - Email, Phone
  - Password with requirements hint
  - Confirm Password
- Inline form validation
- Password visibility toggle
- Loading states during submission

**For authenticated users:**

- Displays user info (name, email, phone)
- Verified badge
- Confirmation message

Features:

- Uses AuthProvider for login/register
- No page redirect - stays in booking flow
- Immediate progression after authentication

### Client Details Form (Legacy)

**Location:** `src/components/booking-widget/client-details.jsx`

> **Deprecated:** This component is no longer used in the booking flow. Authentication is now required via `booking-auth.jsx`.

### Booking Confirmation

**Location:** `src/components/booking-widget/booking-confirmation.jsx`

Success page showing:

- Confirmation checkmark
- Booking reference number
- Email confirmation notice
- Appointment details:
  - Date and time
  - Location with address
  - Assigned staff member
- Services summary with prices
- Total amount
- Actions:
  - Add to Google Calendar
  - Print confirmation
- Cancellation policy notice

## API Endpoints Used

### GET `/api/widget/[salonId]`

Returns salon public information including:

- Name, description, logo
- Contact info
- Business hours
- Widget settings

### GET `/api/widget/[salonId]/services`

Returns:

- Service categories
- Active services with price and duration

### GET `/api/widget/[salonId]/staff`

Query params: `services` (comma-separated IDs)
Returns staff who can perform selected services with:

- Name, title, avatar
- Rating and review count
- Specialties

### GET `/api/widget/[salonId]/availability`

Query params: `date`, `serviceId`, `staffId` (optional)
Returns available time slots for the given date

### POST `/api/widget/[salonId]/book`

**Requires Authentication** ✓

Creates a new booking using the authenticated user's account:

- `serviceId` - Primary service
- `staffId` - Selected or assigned staff
- `startTime` - ISO datetime
- `notes` - Optional booking notes

> Client info (name, email, phone) is retrieved from the authenticated user's profile.

Returns:

- Booking ID
- Confirmation message
- Booking details

Error responses:

- 401 Unauthorized - User must sign in

## URL Structure

Public booking widget: `/book/[salonId]`

Example: `https://yourdomain.com/book/123`

## Layout

**Location:** `src/app/book/layout.js`

Minimal layout for public booking pages:

- No sidebar or navigation
- Clean, focused experience
- QueryProvider for data fetching

## Design Decisions

1. **Multi-Step Wizard** - Breaks down booking into digestible steps, reducing cognitive load
2. **Optional Staff Selection** - "Any Available" allows for maximum flexibility
3. **Time Slot Grouping** - Morning/Afternoon/Evening makes scanning easier
4. **Progressive Disclosure** - Only shows time slots after date selection
5. **Inline Validation** - Immediate feedback on form errors
6. **Calendar Integration** - One-click add to calendar reduces no-shows

## Mobile Considerations

- Single column layout on mobile
- Touch-friendly buttons and inputs
- Sticky header for context
- Scrollable time slot groups

## Future Enhancements

1. **Multi-Service Booking** - Support booking multiple services in sequence
2. **Package Support** - Allow booking service packages
3. **Waitlist** - Join waitlist when no slots available
4. **Deposit/Prepayment** - Collect payment during booking
5. **SMS Reminders** - Opt-in for SMS notifications
6. **Social Login** - Quick registration via Google/Facebook/Apple
7. **Recurring Bookings** - Schedule repeat appointments
8. **Gift Card Redemption** - Apply gift cards at checkout
9. **Remember Me** - Stay logged in for returning customers
