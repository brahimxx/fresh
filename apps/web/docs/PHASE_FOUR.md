# Phase 4: Services & Team Management ✅

**Last Updated:** January 15, 2026

## Overview
This phase implements comprehensive Services and Team Management features, including an advanced staff detail page with multi-tab interface similar to Fresha's team management system.

## Components Created

### 1. Services Management

#### Services Page
**Location:** `src/app/dashboard/salon/[salonId]/services/page.js`

Features:
- **Category Accordion View** - Services grouped by categories with collapsible sections
- **Service Stats** - Total services, categories count, average price
- **CRUD Operations** - Add, edit, delete services and categories
- **Uncategorized Section** - Services without category shown separately
- **Empty States** - Helpful prompts when no services/categories exist

#### Service Form
**Location:** `src/components/services/service-form.jsx`

Features:
- Service name and description
- Category selection dropdown
- Duration picker (15min to 3 hours presets)
- Price input in EUR
- Buffer time (before/after) for prep and cleanup
- Form validation with Zod
- Create and edit modes

#### Category Form
**Location:** `src/components/services/category-form.jsx`

Features:
- Category name and description
- Lightweight form for quick category creation
- Create and edit modes

### 2. Team Management

#### Team Page
**Location:** `src/app/dashboard/salon/[salonId]/team/page.js`

Features:
- **Staff Cards** - Visual cards with avatar, contact info, role badges
- **Role Grouping** - Staff organized by role (Owner, Manager, Staff, Receptionist)
- **Role Stats** - Quick counts by role type
- **Color-coded Avatars** - Consistent colors per staff member
- **Quick Actions** - Edit profile, edit schedule, remove member
- **Empty State** - Prompt to add first team member

#### Staff Form
**Location:** `src/components/staff/staff-form.jsx`

Features:
- Full name and contact info (email, phone)
- Role selection (Owner, Manager, Staff, Receptionist)
- Job title (displayed to clients)
- Bio text area
- Form validation with Zod
- Create and edit modes

#### Staff Schedule
**Location:** `src/components/staff/staff-schedule.jsx`

Features:
- **Weekly Schedule Grid** - All 7 days with working hours
- **Day Toggle** - Enable/disable working days
- **Time Inputs** - Start time, end time, break start, break end
- **Copy to All** - Copy one day's schedule to all days
- **Quick Presets** - Mon-Fri 9-18, Mon-Sat 10-19, Clear All
- **Visual Feedback** - Different background for enabled/disabled days

#### Staff Detail Page (Enhanced January 15, 2026)
**Location:** `src/app/dashboard/salon/[salonId]/team/[staffId]/page.js`

Comprehensive staff management with tabbed interface:

**Main Tabs:**
1. **Personal** - Profile and work details
2. **Addresses** - Home, work, and other addresses
3. **Emergency Contacts** - Emergency contact information
4. **Workplace** - Services, locations, and settings
5. **Pay** - Wages, commissions, and pay runs

**Personal Tab Components:**

**Profile Section** (`staff-personal-tab.jsx`):
- First name, last name (separate fields)
- Email (primary contact)
- Phone number (primary)
- Additional phone number (secondary)
- Country
- Birthday (calendar picker)
- Calendar color selector (8 colors)
- Job title (displayed to clients)
- Bio (public, shown to clients)

**Work Details Section:**
- Start date (employment start)
- End date (optional, for terminated employees)
- Employment type (employee/self-employed)
- Internal notes (private, not shown to clients)

**Addresses Tab** (`staff-addresses-tab.jsx`):
- Add/edit/delete multiple addresses
- Address types: home, work, other
- Primary address designation
- Full address fields: street, city, state, postal code, country

**Emergency Contacts Tab** (`staff-emergency-contacts-tab.jsx`):
- Add multiple emergency contacts
- Contact name and relationship
- Primary phone (required)
- Secondary phone (optional)
- Email address
- Primary contact designation
- Notes field

**Workplace Tab** (3 sub-tabs):

1. **Services Sub-tab** (`staff-services-tab.jsx`):
   - Checkbox list of all salon services
   - Grouped by category
   - Assign/unassign services staff can perform
   - Shows duration and price for each service

2. **Locations Sub-tab** (`staff-locations-tab.jsx`):
   - Multi-location support
   - Assign staff to different salon locations
   - Primary location designation
   - Start/end dates per location

3. **Settings Sub-tab** (`staff-settings-tab.jsx`):
   - Active status toggle
   - Visible on booking widget toggle
   - Accept online bookings toggle
   - Email notifications toggle

**Pay Tab** (3 sub-tabs):

1. **Wages & Timesheets Sub-tab** (`staff-wages-tab.jsx`):
   - Wage type: hourly, salary, commission-only
   - Hourly rate or salary amount
   - Salary period: weekly, biweekly, monthly, annual
   - Currency selection
   - Effective date range
   - Timesheet entries with clock in/out

2. **Commissions Sub-tab** (`staff-commissions-tab.jsx`):
   - Service commission percentage
   - Product commission percentage
   - Tip commission percentage
   - Effective date range
   - Commission type: percentage or fixed

3. **Pay Runs Sub-tab** (`staff-pay-runs-tab.jsx`):
   - Payment history
   - Pay period start/end dates
   - Pay date
   - Total payment breakdown (base, commission, bonus, tips, deductions)
   - Hours worked
   - Status badges (draft, processing, completed, cancelled)

### 3. Enhanced Hooks

#### use-services.js
**Location:** `src/hooks/use-services.js`

New exports:
- `serviceKeys` - Query key factory
- `useServices(salonId)` - Fetch all services
- `useService(serviceId)` - Fetch single service
- `useCreateService()` - Create mutation
- `useUpdateService()` - Update mutation
- `useDeleteService()` - Delete mutation
- `useCategories(salonId)` - Fetch all categories
- `useCategory(categoryId)` - Fetch single category
- `useCreateCategory()` - Create mutation
- `useUpdateCategory()` - Update mutation
- `useDeleteCategory()` - Delete mutation
- `useReorderCategories()` - Reorder mutation

#### use-staff.js
**Location:** `src/hooks/use-staff.js`

New exports:
- `staffKeys` - Query key factory (includes services, commissions)
- `useStaff(salonId)` - Fetch all staff
- `useStaffMember(staffId)` - Fetch single staff with full details
- `useStaffSchedule(staffId)` - Fetch schedule
- `useStaffServices(staffId)` - Fetch assigned service IDs
- `useStaffCommissions(staffId)` - Fetch commission structure
- `useAvailability(salonId, params)` - Check availability
- `useCreateStaff()` - Create mutation
- `useUpdateStaff()` - Update mutation (supports all new fields)
- `useDeleteStaff()` - Delete mutation
- `useUpdateStaffSchedule()` - Schedule mutation
- `useUpdateStaffServices()` - Assign services mutation
- `STAFF_COLORS` - Color palette for avatars (with bg, light, text variants)
- `STAFF_ROLES` - Role definitions (owner, manager, staff, receptionist)

## Database Schema Enhancements (January 15, 2026)

### Enhanced Staff Table
**Migration:** `database/enhance_staff_schema.sql`

New columns added to `staff` table:
- `first_name` VARCHAR(100) - First name (separate from full name)
- `last_name` VARCHAR(100) - Last name
- `phone_secondary` VARCHAR(20) - Additional phone number
- `country` VARCHAR(100) - Country
- `birthday` DATE - Date of birth
- `start_date` DATE - Employment start date
- `end_date` DATE - Employment end date (optional)
- `employment_type` ENUM('employee', 'self_employed') - Employment classification
- `notes` TEXT - Internal notes
- `role` ENUM updated to include: 'staff', 'manager', 'owner', 'receptionist'

### New Tables Created

#### staff_addresses
```sql
CREATE TABLE staff_addresses (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  address_type ENUM('home', 'work', 'other') DEFAULT 'home',
  street_address VARCHAR(255),
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  is_primary TINYINT(1) DEFAULT 0,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
```

#### staff_emergency_contacts
```sql
CREATE TABLE staff_emergency_contacts (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  contact_name VARCHAR(150) NOT NULL,
  relationship VARCHAR(100),
  phone_primary VARCHAR(20) NOT NULL,
  phone_secondary VARCHAR(20),
  email VARCHAR(255),
  is_primary TINYINT(1) DEFAULT 0,
  notes TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
```

#### staff_wages
```sql
CREATE TABLE staff_wages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  wage_type ENUM('hourly', 'salary', 'commission_only') DEFAULT 'hourly',
  hourly_rate DECIMAL(10, 2),
  salary_amount DECIMAL(10, 2),
  salary_period ENUM('weekly', 'biweekly', 'monthly', 'annual') DEFAULT 'monthly',
  currency VARCHAR(3) DEFAULT 'USD',
  effective_from DATE NOT NULL,
  effective_to DATE,
  notes TEXT,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
```

#### staff_timesheets
```sql
CREATE TABLE staff_timesheets (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  salon_id BIGINT UNSIGNED NOT NULL,
  clock_in DATETIME NOT NULL,
  clock_out DATETIME,
  break_duration INT DEFAULT 0 COMMENT 'in minutes',
  total_hours DECIMAL(5, 2),
  notes TEXT,
  status ENUM('clocked_in', 'clocked_out', 'approved', 'disputed'),
  approved_by BIGINT UNSIGNED,
  approved_at DATETIME,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

#### staff_pay_runs
```sql
CREATE TABLE staff_pay_runs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  salon_id BIGINT UNSIGNED NOT NULL,
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,
  status ENUM('draft', 'processing', 'completed', 'cancelled') DEFAULT 'draft',
  total_amount DECIMAL(12, 2) DEFAULT 0.00,
  currency VARCHAR(3) DEFAULT 'USD',
  notes TEXT,
  created_by BIGINT UNSIGNED,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

#### staff_pay_run_items
```sql
CREATE TABLE staff_pay_run_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  pay_run_id BIGINT UNSIGNED NOT NULL,
  staff_id BIGINT UNSIGNED NOT NULL,
  base_pay DECIMAL(10, 2) DEFAULT 0.00,
  commission_amount DECIMAL(10, 2) DEFAULT 0.00,
  bonus_amount DECIMAL(10, 2) DEFAULT 0.00,
  tips_amount DECIMAL(10, 2) DEFAULT 0.00,
  deductions_amount DECIMAL(10, 2) DEFAULT 0.00,
  total_pay DECIMAL(10, 2) DEFAULT 0.00,
  hours_worked DECIMAL(6, 2),
  notes TEXT,
  FOREIGN KEY (pay_run_id) REFERENCES staff_pay_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
);
```

#### staff_locations
```sql
CREATE TABLE staff_locations (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  staff_id BIGINT UNSIGNED NOT NULL,
  salon_id BIGINT UNSIGNED NOT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  start_date DATE,
  end_date DATE,
  UNIQUE KEY uq_staff_locations (staff_id, salon_id),
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE,
  FOREIGN KEY (salon_id) REFERENCES salons(id) ON DELETE CASCADE
);
```

## UI Components Used

From shadcn/ui:
- Dialog / DialogContent / DialogHeader / DialogTitle / DialogFooter
- Form / FormField / FormItem / FormLabel / FormControl / FormMessage / FormDescription
- Select / SelectTrigger / SelectContent / SelectItem / SelectValue
- Collapsible / CollapsibleTrigger / CollapsibleContent
- AlertDialog (for delete confirmations)
- Input / Textarea
- Button / Badge / Avatar / Skeleton
- DropdownMenu (for actions)
- Switch (for day toggles)
- Label

## Navigation

Already integrated in sidebar:
- `Services` - Links to `/dashboard/salon/[salonId]/services`
- `Team` - Links to `/dashboard/salon/[salonId]/team`

**New Routes:**
- `/dashboard/salon/[salonId]/team/[staffId]` - Staff detail page with tabs

Team page dropdown menu now includes:
- **View Details** - Navigate to full staff detail page
- **Quick Edit** - Simple profile edit dialog (legacy)
- **Edit Schedule** - Schedule management dialog
- **Remove** - Delete confirmation

## API Endpoints Used

### Services
- `GET /api/services?salon_id=X` - List services
- `GET /api/services/:id` - Get single service
- `POST /api/services` - Create service
- `PUT /api/services/:id` - Update service
- `DELETE /api/services/:id` - Delete service

### Categories
- `GET /api/categories?salon_id=X` - List categories
- `GET /api/categories/:id` - Get single category
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

### Staff (Core)
- `GET /api/staff?salon_id=X` - List staff
- `GET /api/staff/:id` - Get single staff (with all enhanced fields)
- `POST /api/staff` - Create staff
- `PUT /api/staff/:id` - Update staff (supports all new fields)
- `DELETE /api/staff/:id` - Delete staff
- `GET /api/staff/:id/schedule` - Get schedule
- `PUT /api/staff/:id/schedule` - Update schedule
- `GET /api/staff/:id/services` - Get assigned services
- `PUT /api/staff/:id/services` - Assign services
- `GET /api/staff/:id/commissions` - Get commission structure
- `PUT /api/staff/:id/commissions` - Update commissions

### Staff (Extended - To Be Implemented)
- `GET /api/staff/:id/addresses` - Get addresses
- `POST /api/staff/:id/addresses` - Add address
- `PUT /api/staff/:id/addresses/:addressId` - Update address
- `DELETE /api/staff/:id/addresses/:addressId` - Delete address
- `GET /api/staff/:id/emergency-contacts` - Get emergency contacts
- `POST /api/staff/:id/emergency-contacts` - Add emergency contact
- `PUT /api/staff/:id/emergency-contacts/:contactId` - Update contact
- `DELETE /api/staff/:id/emergency-contacts/:contactId` - Delete contact
- `GET /api/staff/:id/wages` - Get wage history
- `POST /api/staff/:id/wages` - Add wage record
- `PUT /api/staff/:id/wages/:wageId` - Update wage
- `GET /api/staff/:id/timesheets` - Get timesheets
- `POST /api/staff/:id/timesheets` - Clock in/out
- `GET /api/staff/:id/pay-runs` - Get pay run history

## Data Models

### Service
```javascript
{
  id: number,
  salon_id: number,
  category_id: number | null,
  name: string,
  description: string,
  duration: number, // minutes
  price: decimal,
  buffer_before: number, // minutes
  buffer_after: number, // minutes
}
```

### Category
```javascript
{
  id: number,
  salon_id: number,
  name: string,
  description: string,
  sort_order: number,
}
```

### Staff Member
```javascript
{
  id: number,
  salon_id: number,
  user_id: number | null,
  first_name: string,              // New: separate first name
  last_name: string,               // New: separate last name
  email: string,
  phone: string,
  phone_secondary: string,         // New: additional phone
  role: 'owner' | 'manager' | 'staff' | 'receptionist',
  title: string,                   // Job title
  bio: string,
  country: string,                 // New: country
  birthday: date,                  // New: date of birth
  start_date: date,                // New: employment start
  end_date: date,                  // New: employment end (optional)
  employment_type: 'employee' | 'self_employed', // New
  notes: string,                   // New: internal notes
  avatar_url: string,
  color: string,                   // Calendar color
  is_active: boolean,
  is_visible: boolean,
}
```

### Staff Schedule
```javascript
{
  staff_id: number,
  day_of_week: 'monday' | 'tuesday' | ... | 'sunday',
  is_working: boolean,
  start_time: 'HH:MM:SS',
  end_time: 'HH:MM:SS',
  break_start: 'HH:MM:SS' | null,
  break_end: 'HH:MM:SS' | null,
}
```

## File Structure
```
src/
├── app/dashboard/salon/[salonId]/
│   ├── services/
│   │   └── page.js                    # Services list with categories
│   └── team/
│       ├── page.js                    # Team list with roles
│       └── [staffId]/
│           └── page.js                # Staff detail with tabs (NEW)
├── components/
│   ├── services/
│   │   ├── service-form.jsx           # Service create/edit dialog
│   │   └── category-form.jsx          # Category create/edit dialog
│   └── staff/
│       ├── staff-form.jsx             # Quick staff create/edit dialog
│       ├── staff-schedule.jsx         # Weekly schedule dialog
│       ├── staff-personal-tab.jsx     # Personal info tab (NEW)
│       ├── staff-addresses-tab.jsx    # Addresses tab (NEW)
│       ├── staff-emergency-contacts-tab.jsx  # Emergency contacts (NEW)
│       ├── staff-services-tab.jsx     # Service assignment tab (NEW)
│       ├── staff-locations-tab.jsx    # Multi-location tab (NEW)
│       ├── staff-settings-tab.jsx     # Settings tab (NEW)
│       ├── staff-wages-tab.jsx        # Wages & timesheets tab (NEW)
│       ├── staff-commissions-tab.jsx  # Commissions tab (NEW)
│       └── staff-pay-runs-tab.jsx     # Pay runs tab (NEW)
└── hooks/
    ├── use-services.js                # Enhanced with full CRUD
    └── use-staff.js                   # Enhanced with full CRUD + new queries

database/
├── enhance_staff_schema.sql           # Staff enhancements migration (NEW)
└── fix_staff_roles.sql                # Role enum fix (NEW)
```

## Testing Checklist

### Services
- [x] View services list with categories
- [x] Collapse/expand category sections
- [x] Add new category
- [x] Edit category
- [x] Delete category (with confirmation)
- [x] Add service to category
- [x] Add uncategorized service
- [x] Edit service
- [x] Delete service (with confirmation)
- [x] See stats update live

### Team
- [x] View team members grouped by role
- [x] Add new team member
- [x] Edit team member profile (quick edit)
- [x] Delete team member (with confirmation)
- [x] Edit staff schedule
- [x] Toggle working days
- [x] Set work hours and breaks
- [x] Use quick presets
- [x] Copy schedule to all days

### Team Detail Page (Enhanced)
- [x] Navigate to staff detail page from team list
- [x] View staff profile card with avatar and badges
- [x] **Personal Tab:**
  - [x] View/edit first name, last name
  - [x] View/edit email, phone (primary & secondary)
  - [x] View/edit country
  - [x] Select birthday with calendar picker
  - [x] Choose calendar color (8 colors)
  - [x] Set job title and bio
  - [x] Set start date, end date, employment type
  - [x] Add internal notes
  - [x] Edit mode with save/cancel
- [x] **Addresses Tab:**
  - [x] View empty state
  - [ ] Add new address (requires API)
  - [ ] Edit address (requires API)
  - [ ] Delete address (requires API)
  - [ ] Set primary address (requires API)
- [x] **Emergency Contacts Tab:**
  - [x] View empty state
  - [ ] Add emergency contact (requires API)
  - [ ] Edit contact (requires API)
  - [ ] Delete contact (requires API)
- [x] **Workplace Tab - Services:**
  - [x] View all services grouped by category
  - [x] Check/uncheck services to assign
  - [ ] Save service assignments (requires API)
- [x] **Workplace Tab - Locations:**
  - [x] View current salon location
  - [ ] Multi-location support (future)
- [x] **Workplace Tab - Settings:**
  - [x] View active status toggle
  - [x] View visibility toggle
  - [x] View booking preferences
  - [ ] Save settings (requires API)
- [x] **Pay Tab - Wages:**
  - [x] View empty state for wages
  - [x] View empty state for timesheets
  - [ ] Add wage record (requires API)
  - [ ] Clock in/out (requires API)
- [x] **Pay Tab - Commissions:**
  - [x] View commission structure
  - [ ] Update commissions (requires API enhancement)
- [x] **Pay Tab - Pay Runs:**
  - [x] View empty state
  - [ ] View pay run history (requires API)

## Implementation Status

**✅ Completed:**
- Database schema enhancements (11 tables total)
- Staff detail page with 5 main tabs
- All tab components created
- Personal information management (full CRUD)
- Navigation from team list to detail page
- Edit mode with form validation
- Calendar pickers for dates
- Color selector for staff colors
- Empty states for all sections

**🚧 Requires API Implementation:**
- Addresses CRUD endpoints
- Emergency contacts CRUD endpoints
- Wages and timesheets management
- Pay run generation and history
- Settings persistence
- Multi-location assignments

## Next Steps

To complete the staff management system:

1. **Create API Endpoints:**
   - `/api/staff/:id/addresses` (GET, POST, PUT, DELETE)
   - `/api/staff/:id/emergency-contacts` (GET, POST, PUT, DELETE)
   - `/api/staff/:id/wages` (GET, POST, PUT)
   - `/api/staff/:id/timesheets` (GET, POST)
   - `/api/staff/:id/pay-runs` (GET)

2. **Enhance Existing Endpoints:**
   - Update `/api/staff/:id` (GET) to include all new fields
   - Update `/api/staff/:id` (PUT) to save all new fields
   - Update `/api/staff/:id/services` for service assignments
   - Update `/api/staff/:id/commissions` for commission management

3. **Add Form Dialogs:**
   - Address add/edit dialog
   - Emergency contact add/edit dialog
   - Wage record add/edit dialog
   - Timesheet entry dialog

## Next Phase

**Phase 5: Sales & Products**
- Product inventory management
- Point of sale interface
- Payment processing
- Invoice generation
- Product stock tracking
