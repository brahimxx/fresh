# Phase 2: Calendar & Booking System - COMPLETE ✅

## Overview
Implemented the full calendar and booking management system using FullCalendar and custom React components. Extended with multi-step staff wizard, service assignments, working hours, and public booking widget. Includes comprehensive availability system with timezone handling and business hours fallback.

## Last Updated
January 19, 2026

---

## Dependencies Installed

```bash
npm install @fullcalendar/core @fullcalendar/react @fullcalendar/daygrid @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/list
```

| Package | Version | Purpose |
|---------|---------|---------|
| @fullcalendar/core | ^6.x | Core calendar engine |
| @fullcalendar/react | ^6.x | React wrapper |
| @fullcalendar/daygrid | ^6.x | Month view |
| @fullcalendar/timegrid | ^6.x | Week/Day time views |
| @fullcalendar/interaction | ^6.x | Drag-and-drop, clicking |
| @fullcalendar/list | ^6.x | List/agenda view |

---

## Files Created

### Hooks (Data Fetching)

| File | Purpose | Key Exports |
|------|---------|-------------|
| src/hooks/use-bookings.js | Booking CRUD and mutations | bookingKeys, useCalendarBookings, useBookings, useBooking, useCreateBooking, useUpdateBooking, useConfirmBooking, useRescheduleBooking, useCancelBooking, useNoShowBooking, useAssignStaff |
| src/hooks/use-services.js | Service queries | serviceKeys, useServices, useCategories |
| src/hooks/use-staff.js | Staff queries and colors | staffKeys, useStaff, useAvailability, STAFF_COLORS, getStaffColor |
| src/hooks/use-clients.js | Client CRUD | clientKeys, useClientSearch, useClients, useClient, useCreateClient |

### Styles

| File | Purpose |
|------|---------|
| src/styles/calendar.css | FullCalendar theme integration with CSS variables |

### Components

| File | Purpose | Features |
|------|---------|----------|
| src/components/calendar/calendar-view.jsx | Main calendar wrapper | Day/Week/Month views, staff filtering, drag-and-drop, custom toolbar |
| src/components/bookings/booking-form.jsx | New booking dialog | Client search/create, service selector, staff selector, date/time picker, Zod validation |
| src/components/bookings/booking-detail.jsx | Booking detail sheet | View details, confirm, cancel, no-show, reschedule actions |
| src/components/staff/staff-creation-wizard.jsx | Multi-step staff onboarding | 5-step wizard: Basic Info, Personal, Employment, Emergency Contact, Services |
| src/components/staff/staff-schedule.jsx | Working hours editor | Weekly schedule with day toggles, start/end times, copy to all days |
| src/components/booking-widget/service-selection.jsx | Public widget service step | Service cards with pricing and duration |
| src/components/booking-widget/staff-selection.jsx | Public widget staff step | Staff cards with "Any Available" option |
| src/components/booking-widget/datetime-selection.jsx | Public widget date/time step | Calendar with time slot selection grouped by period |
| src/components/booking-widget/booking-auth.jsx | Public widget auth step | Login/register for clients |
| src/components/booking-widget/booking-confirmation.jsx | Public widget confirmation | Booking success with details |

### Pages

| File | Route | Purpose |
|------|-------|---------|
| srPublic Booking Widget
- **5-Step Flow**: Service → Staff → Date/Time → Auth → Confirmation
- **Service Selection**: Visual cards with pricing and duration
- **Staff Selection**: Choose specific staff or "Any Available"
- **Date/Time Selection**: Calendar with grouped time slots (Morning/Afternoon/Evening)
- **Timezone Handling**: Correct local date formatting (fixed UTC conversion bug)
- **Authentication**: Login/register step for clients
- **Confirmation**: Success page with booking details and add-to-calendar option
- **Availability Logic**: 
  - Checks staff working hours (falls back to salon business hours)
  - Validates service assignments
  - Checks for existing bookings
  - Filters out past times
  - Generates 15-minute slots

### c/app/dashboard/salon/[salonId]/calendar/page.js | /dashboard/salon/:id/calendar | Calendar view page |
| src/app/dashboard/salon/[salonId]/bookings/page.js | /dashboard/salon/:id/bookings | Bookings list page with table |
| src/app/book/[salonId]/page.js | /book/:salonId | Public booking widget (5-step flow) |

### API Routes

| File | Endpoint | Purpose | Methods |
|------|----------|---------|---------|
| src/app/api/staff/[staffId]/services/route.js | /api/staff/:id/services | Manage staff service assignments | GET, PUT |
| src/app/api/staff/[staffId]/schedule/route.js | /api/staff/:id/schedule | Manage staff working hours | GET, PUT |
| src/app/api/widget/[salonId]/availability/route.js | /api/widget/:id/availability | Get available time slots for booking | GET |
| src/app/api/widget/[salonId]/book/route.js | /api/widget/:id/book | Create booking from public widget | POST |
| src/app/api/widget/[salonId]/staff/route.js | /api/widget/:id/staff | Get available staff filtered by service | GET |
| src/app/api/widget/[salonId]/services/route.js | /api/widget/:id/services | Get public services for booking | GET |
| src/app/api/salons/route.js | /api/salons | Create salon (auto-adds owner to staff) | POST |

---

## Features Implemented

### Staff Management
- **Multi-Step Wizard**: 5-step onboarding flow for comprehensive staff data collection
  - Step 1 (Required): Name, email, phone, role, title
  - Step 2: Personal details (birthday, country, secondary phone)
  - Step 3: Employment (type, start/end dates, notes)
  - Step 4: Emergency contact
  - Step 5: Service assignments
- **Service Assignments**: Assign services to staff with real-time validation
- **Working Hours**: Weekly schedule editor with day-by-day configuration
- **Auto-Owner Assignment**: Salon owners automatically added to team on salon creation

### Working Hours System
- **Staff Schedule Editor**: Set working hours for each day of the week
- **Visual Interface**: Clean card-based layout with day toggles
- **Quick Copy**: Copy Monday's schedule to all days
- **Business Hours Fallback**: Staff without schedules inherit salon business hours
- **Availability Integration**: Working hours enforced in both availability API and booking validation

### Calendar View
- Multiple Views: Day, Week, Month, and List views
- Staff Filtering: Filter calendar by staff member via popover
- Staff Colors: 8-color palette for distinguishing staff members
- Drag-and-Drop: Reschedule bookings by dragging events
- Event Click:taff/:id/services | Get staff service assignments |
| PUT | /api/staff/:id/services | Update staff service assignments |
| GET | /api/staff/:id/schedule | Get staff working hours |
| PUT | /api/staff/:id/schedule | Update staff working hours |
| GET | /api/widget/:id/services | List public services for widget |
| GET | /api/widget/:id/staff | List available staff for widget |
| GET | /api/widget/:id/availability | Get available time slots |
| POST | /api/widget/:id/book | Create booking from widget |
| GET | /api/s Open booking details on event click
- Date Click: Create new booking when clicking empty time slot
- Custom Toolbar: Navigation, view toggle, new booking button
- Time Grid: 7 AM - 9 PM with 15-minute slots
- Responsive: Adjusts layout for mobile

### Booking Form (New Booking)
- Client Search: Autocomplete search for existing clients
- New Client: Inline form to create new client
- Service Selection: Dropdown with all salon services
- Staff Selection: Dropdown with available staff
- Date Picker: Calendar popup for date selection
- Time Slots: 15-minute intervals from 7 AM to 9 PM
- Notes Field: Optional notes for the booking
- Validation: Zod schema validation

### Booking Detail Sheet
- SDatabase Schema Updates

### Tables Used
- `staff_working_hours`: Day-specific working hours (falls back to business_hours if empty)
- `service_staff`: Junction table for staff-service assignments (composite PK: service_id, staff_id)
- `staff_emergency_contacts`: Emergency contact information
- `business_hours`: Salon-wide business hours (used as fallback)
- `bookings`: Appointment records with status tracking
- `booking_services`: Services included in each booking

### Migrations Applied
- `20260118_add_missing_owners_to_staff.sql`: Verified salon owners are in staff table (0 changes needed)

---
Critical Fixes (Session Jan 18-19, 2026)

#### 1. Timezone Issues ⏰
- **Problem**: Monday Jan 19 showing "No available times" but API returning slots
- **Root Cause**: `toISOString()` converting local midnight to UTC, shifting date backward (CET → UTC)
  - Example: Mon Jan 19 00:00 CET → Sun Jan 18 23:00 UTC → "2026-01-18" ❌
- **Solution**: Format dates using local values directly
  ```javascript
  // Before (WRONG)
  var dateStr = selectedDate.toISOString().slice(0, 10);
  
  // After (CORRECT)
  var year = selectedDate.getFullYear();
  var month = String(selectedDate.getMonth() + 1).padStart(2, '0');
  var day = String(selectedDate.getDate()).padStart(2, '0');
  var dateStr = year + '-' + month + '-' + day;
  ```
- **Impact**: Fixed for all timezones, Monday now correctly shows as Monday

#### 2. Availability System 🕐
**Fixed**: "No available times" despite valid staff and business hours

**Issue 2a - Date Mutation Bug**
- **Problem**: While loop mutating Date object causing incorrect slot generation
- **Solution**: Create new Date objects for each slot
  ```javascript
  // Before
  while (start.getTime() + duration * 60000 <= end.getTime()) {
    const slotEnd = new Date(start.getTime() + duration * 60000);
    // ... mutations affect original
  }
  
  // After  
  let currentSlot = new Date(startTime);
  while (currentSlot.getTime() + duration * 60000 <= endTime.getTime()) {
    const slotStart = new Date(currentSlot);
    const slotEnd = new Date(currentSlot.getTime() + duration * 60000);
    // ... safe copies
  }
  ```

**Issue 2b - Wrong Column Names**
- **Problem**: Query using `start_date`/`end_date` but table has `start_datetime`/`end_datetime`
- **Error**: `Unknown column 'start_date' in 'where clause'`
- **Solution**: Corrected column names in time-off check query

**Issue 2c - No Business Hours Fallback**
- **Problem**: Staff without `staff_working_hours` records returned no slots
- **Solution**: Added fallback to `business_hours` table
  ```javascript
  let workingHours = await getOne('SELECT ... FROM staff_working_hours WHERE ...');
  if (!workingHours) {
    workingHours = await getOne('SELECT open_time as start_time, close_time as end_time FROM business_hours WHERE ...');
  }
  ```
- **Impact**: Now works for staff without specific schedules

#### 3. Service Assignment Issues 🔧
**Fixed**: Services not persisting after save/reload

**Root Causes**:
1. **Data Format Mismatch**: Hook expected `serviceIds` array but API returned service objects
2. **State Sync**: Component didn't update when data loaded
3. **Response Format**: API wrapped vs unwrapped inconsistently

**Solution**: Multi-file fix
- **Hook** (`use-staff.js`): Extract IDs from both formats
  ```javascript
  select: function(response) { 
    if (Array.isArray(response.data)) {
      return response.data.map(function(s) { return s.id; });
    }
    return response.data?.serviceIds || []; 
  }
  ```
- **Component** (`staff-services-tab.jsx`): Sync state with useEffect
- **API** (`services/route.js`): Return consistent unwrapped array

#### 4. Staff Filtering 👥
**Fixed**: Staff appearing for services they can't perform

- **Problem**: Fallback showing all unassigned staff
  ```sql
  -- Before (WRONG)
  WHERE s.id IN (...) OR NOT EXISTS (SELECT 1 FROM service_staff WHERE staff_id = s.id)
  ```
- **Solution**: Strict filtering only
  ```sql
  -- After (CORRECT)  
  WHERE s.id IN (SELECT staff_id FROM service_staff WHERE service_id IN (?))
  ```
- **Locations Fixed**: Both `/api/widget/[salonId]/staff` and booking form
- **Impact**: "Any Available" only shows qualified staff

#### 5. Booking Creation Errors 💳
**Fixed**: Multiple validation failures during booking

**Issue 5a - Invalid Enum Value**
- **Problem**: Inserting `source = 'widget'` but enum only allows `'marketplace'` or `'direct'`
- **Error**: `Data truncated for column 'source'`
- **Solution**: Changed to `'marketplace'` for public bookings

**Issue 5b - Wrong Table Column**
- **Problem**: Querying `SELECT id FROM service_staff` but table has composite PK
- **Error**: `Unknown column 'id' in 'field list'`
- **Solution**: Changed to `SELECT service_id FROM service_staff`

**Issue 5c - Working Hours Validation Too Strict**
- **Problem**: Booking validation checking `staff_working_hours` only (no fallback)
- **Error**: "Staff is not working at this time" despite valid business hours
- **Solution**: Added same fallback logic as availability system

#### 6. UI/UX Improvements 🎨

**Working Hours Dialog Redesign**
- **Removed**: Confusing break fields (not implemented in backend)
- **Simplified**: 2 fields per day (start/end) instead of 4
- **Enhanced**: Card-based layout with clear labels
- **Added**: Time summary showing "Available from X to Y"
- **Improved**: Quick copy button at top, disabled state clarity

**Date/Time Display**
- **Fixed**: React error rendering Date objects directly
  ```javascript
  // Before (ERROR)
  <span>{selectedDate}</span>
  
  // After (WORKS)
  <span>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', ... })}</span>
  ```
- **Added**: Proper formatting for booking summary
- **Handled**: MySQL datetime format conversion

**Bookings Table**
- **Fixed**: Empty booking objects causing errors
- **Added**: Validation guards and null filtering
- **Fixed**: Parameter mismatch (`salon_id` → `salonId`)
- **Improved**: Error handling with fallback dates

#### 7. Database Consistency 💾

**Auto-Owner Assignment**
- **Implementation**: Salon creation now auto-adds owner to staff
  ```javascript
  // After creating salon
  await query(`
    INSERT INTO staff (salon_id, user_id, title, role, is_visible, is_active)
    VALUES (?, ?, 'Owner', 'owner', 1, 1)
  `, [salonId, userId]);
  ```
- **Migration**: Verified existing salons (all 19 already had owners)
- **Impact**: Owners can immediately take bookings

### Known Limitations

1. **Break Times**: UI removed (backend doesn't support meal breaks yet)
2. **Staff Working Hours**: Most staff use business hours fallback
3. **Bookings Display**: Frontend pagination showing empty objects (under investigation)

---

## Working Hours System

### Implementation Details
- **Staff Schedule**: Optional per-staff working hours in `staff_working_hours` table
- **Fallback Logic**: Uses salon `business_hours` when staff schedule not set
- **Day Format**: 0=Sunday, 1=Monday, ..., 6=Saturday
- **Time Format**: HH:MM:SS (MySQL TIME)
- **API Endpoints**:
  - GET `/api/staff/:id/schedule` - Returns day names (monday, tuesday, etc.)
  - PUT `/api/staff/:id/schedule` - Accepts day names, converts to numbers

### Editor Features
- Toggle days on/off
- Set start/end time per day
- Copy one day to all days
- Visual feedback for enabled/disabled days
- Validation guards for invalid times

---

## Public Booking Widget
---

## tatus Badge: Color-coded status display
- Client Info: Name and email
- Service Info: Name and duration
- Date/Time Display: Formatted date and time range
- Staff Display: Assigned staff member
- Notes: Booking notes if present
- Price: Total price with payment status
- Actions: Confirm, Cancel, No Show, Reschedule, Checkout

### Bookings List Page
- Data Table: Responsive table with all bookings
- Search: Search by client name, email
- Status Filter: Filter by booking status
- Pagination: Navigate through pages
- Quick Actions: Confirm, cancel from dropdown
- View Details: Open detail sheet from dropdown
- Calendar Toggle: Switch to calendar view

---

## API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | /api/bookings | List bookings with filters |
| GET | /api/bookings/:id | Get booking details |
| POST | /api/bookings | Create new booking |
| PUT | /api/bookings/:id | Update booking |
| POST | /api/bookings/:id/confirm | Confirm booking |
| POST | /api/bookings/:id/reschedule | Reschedule booking |
| DELETE | /api/bookings/:id | Cancel booking |
| POST | /api/bookings/:id/no-show | Mark as no-show |
| POST | /api/bookings/:id/assign-staff | Assign staff member |
| GET | /api/services | List services |
| GET | /api/categories | List categories |
| GET | /api/staff | List staff members |
| GET | /api/staff/availability | Get staff availability |
| GET | /api/clients | List/search clients |
| POST | /api/clients | Create client |

---

## Booking Status Flow

pending -> confirmed -> completed
pending -> cancelled
confirmed -> no_show

| Status | Badge Color | Description |
|--------|-------------|-------------|
| pending | Yellow | Awaiting confirmation |
| confirmed | Green | Confirmed appointment |
| completed | Blue | Service completed |
| cancelled | Gray | Booking cancelled |
| no_show | Red | Client did not show up |

---

## Next Steps (Phase 3)

Phase 3 will implement the Client Management system:
- Client list with search and filters
- Client detail page with history
- Client profile editing
- Visit history and spending
- Notes and tags
