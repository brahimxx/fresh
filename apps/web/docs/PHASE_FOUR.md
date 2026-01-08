# Phase 4: Services & Team Management ✅

## Overview
This phase implements the Services and Team Management features, allowing salon owners to manage their service menu, categories, staff members, and work schedules.

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
- `staffKeys` - Query key factory
- `useStaff(salonId)` - Fetch all staff
- `useStaffMember(staffId)` - Fetch single staff
- `useStaffSchedule(staffId)` - Fetch schedule
- `useAvailability(salonId, params)` - Check availability
- `useCreateStaff()` - Create mutation
- `useUpdateStaff()` - Update mutation
- `useDeleteStaff()` - Delete mutation
- `useUpdateStaffSchedule()` - Schedule mutation
- `useUpdateStaffServices()` - Assign services mutation
- `STAFF_COLORS` - Color palette for avatars (with bg, light, text variants)
- `STAFF_ROLES` - Role definitions (owner, manager, staff, receptionist)

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

### Staff
- `GET /api/staff?salon_id=X` - List staff
- `GET /api/staff/:id` - Get single staff
- `POST /api/staff` - Create staff
- `PUT /api/staff/:id` - Update staff
- `DELETE /api/staff/:id` - Delete staff
- `GET /api/staff/:id/schedule` - Get schedule
- `PUT /api/staff/:id/schedule` - Update schedule
- `PUT /api/staff/:id/services` - Assign services

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
  name: string,
  email: string,
  phone: string,
  role: 'owner' | 'manager' | 'staff' | 'receptionist',
  title: string, // Job title
  bio: string,
  avatar_url: string,
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
│   │   └── page.js           # Services list with categories
│   └── team/
│       └── page.js           # Team list with roles
├── components/
│   ├── services/
│   │   ├── service-form.jsx  # Service create/edit dialog
│   │   └── category-form.jsx # Category create/edit dialog
│   └── staff/
│       ├── staff-form.jsx    # Staff create/edit dialog
│       └── staff-schedule.jsx # Weekly schedule dialog
└── hooks/
    ├── use-services.js       # Enhanced with full CRUD
    └── use-staff.js          # Enhanced with full CRUD + schedule
```

## Testing Checklist

### Services
- [ ] View services list with categories
- [ ] Collapse/expand category sections
- [ ] Add new category
- [ ] Edit category
- [ ] Delete category (with confirmation)
- [ ] Add service to category
- [ ] Add uncategorized service
- [ ] Edit service
- [ ] Delete service (with confirmation)
- [ ] See stats update live

### Team
- [ ] View team members grouped by role
- [ ] Add new team member
- [ ] Edit team member profile
- [ ] Delete team member (with confirmation)
- [ ] Edit staff schedule
- [ ] Toggle working days
- [ ] Set work hours and breaks
- [ ] Use quick presets
- [ ] Copy schedule to all days

## Next Phase

**Phase 5: Sales & Products**
- Product inventory management
- Point of sale interface
- Payment processing
- Invoice generation
- Product stock tracking
