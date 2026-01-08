# Phase 8: Settings & Configuration

## Overview
Complete settings management system for salon configuration including business information, booking policies, notifications, widget customization, marketplace presence, reviews management, and user account settings.

## Files Created

### Hook
- **src/hooks/use-settings.js** - Settings data fetching and mutations
  - Query Keys: `settingsKeys` (salon, widget, notifications, policies)
  - Queries: `useSalonSettings`, `useWidgetSettings`
  - Mutations: `useUpdateSalonSettings`, `useUpdateSalonPolicies`, `useUpdateWidgetSettings`, `useUploadSalonPhoto`, `useDeleteSalonPhoto`, `useToggleMarketplace`, `useUpdateUserAccount`, `useChangePassword`
  - Constants: `DEFAULT_BUSINESS_HOURS`, `REMINDER_OPTIONS`, `CANCELLATION_POLICIES`, `WIDGET_THEMES`
  - Utilities: `generateEmbedCode()`, `formatTime()`

### Layout
- **src/app/dashboard/salon/[salonId]/settings/layout.js** - Settings navigation layout
  - Sidebar with section groupings
  - 4 sections: Business, Booking, Online Presence, Account
  - 9 navigation items with icons
  - Active state highlighting

### Pages

#### 1. General Settings (`/settings/general`)
- **src/app/dashboard/salon/[salonId]/settings/general/page.js**
  - **Basic Information**: Salon name, description
  - **Contact Details**: Email, phone, website
  - **Location**: Address, city, state, zip, country
  - **Photos**: Grid display, upload, delete functionality

#### 2. Business Hours (`/settings/hours`)
- **src/app/dashboard/salon/[salonId]/settings/hours/page.js**
  - 7-day weekly schedule
  - Enable/disable toggle per day
  - Open/close time selects (30-minute intervals)
  - "Copy to all days" feature
  - AM/PM time formatting

#### 3. Booking Policies (`/settings/policies`)
- **src/app/dashboard/salon/[salonId]/settings/policies/page.js**
  - **Auto-Confirm Toggle**: Automatic booking confirmation
  - **Cancellation Policy**: Flexible/moderate/strict/custom options
  - **Custom Window**: Hours before appointment for cancellation
  - **Deposits**: Enable, type (percentage/fixed), amount
  - **No-Show Fee**: Enable, type, amount
  - **Booking Rules**: Buffer between bookings, max advance booking days

#### 4. Notifications (`/settings/notifications`)
- **src/app/dashboard/salon/[salonId]/settings/notifications/page.js**
  - **Client Notifications**:
    - Booking confirmation (email/SMS toggles)
    - Appointment reminders (timing select, email/SMS)
    - Cancellation/reschedule notifications
  - **Staff Notifications**:
    - New booking alerts
    - Cancellation alerts
    - Daily schedule summary with time select
  - **Owner Notifications**:
    - New booking notification
    - Daily business summary
    - Weekly report
    - Low availability alerts

#### 5. Widget Settings (`/settings/widget`)
- **src/app/dashboard/salon/[salonId]/settings/widget/page.js**
  - **Appearance**:
    - Theme selection (default/modern/minimal/dark)
    - Primary color picker
    - Text color picker
    - Background color picker
    - Border radius
    - Button text customization
  - **Embed Code**: 
    - Script snippet for website embedding
    - Direct link for sharing
    - Copy to clipboard functionality
  - **Live Preview**: 
    - Real-time widget preview
    - Mock service list display
    - Dynamic styling

#### 6. Marketplace Settings (`/settings/marketplace`)
- **src/app/dashboard/salon/[salonId]/settings/marketplace/page.js**
  - **Listing Toggle**: Show/hide on public marketplace
  - **Profile Completeness**: Progress indicator with suggestions
  - **Public Profile**:
    - Tagline (100 char max)
    - Business highlights (bullet points)
    - Specialties (comma-separated)
    - Years in business
    - Languages spoken
  - **Listing Preview**: How salon appears in search

#### 7. Reviews (`/settings/reviews`)
- **src/app/dashboard/salon/[salonId]/settings/reviews/page.js**
  - **Stats Overview**:
    - Average rating display
    - Total reviews count
    - Response rate percentage
    - Average response time
  - **Rating Distribution**: Visual bar chart (5→1 stars)
  - **Reviews List**:
    - Filter by rating
    - Client info with avatar
    - Service badge
    - Rating stars
    - Comment text
  - **Reply System**:
    - Reply button per review
    - Inline reply form
    - Owner badge on responses
  - **Report Feature**: Flag inappropriate reviews

#### 8. Account Settings (`/settings/account`)
- **src/app/dashboard/salon/[salonId]/settings/account/page.js**
  - **Profile Information**:
    - First/last name
    - Email address
    - Phone number
  - **Password**:
    - Change password dialog
    - Current password verification
    - New password validation (8+ chars)
    - Confirm password matching
  - **Notification Preferences**:
    - Email notifications toggle
    - SMS notifications toggle
  - **Security**:
    - Two-factor authentication toggle
  - **Danger Zone**:
    - Delete account button

## Architecture

### Navigation Structure
```
Settings Layout
├── Business
│   ├── General Information
│   └── Business Hours
├── Booking
│   ├── Policies
│   └── Notifications
├── Online Presence
│   ├── Widget
│   ├── Marketplace
│   └── Reviews
└── Account
    └── Account Settings
```

### Constants

```javascript
// Reminder timing options
REMINDER_OPTIONS = [
  { value: '1h', label: '1 hour before' },
  { value: '2h', label: '2 hours before' },
  { value: '24h', label: '24 hours before' },
  { value: '48h', label: '48 hours before' },
]

// Cancellation policies
CANCELLATION_POLICIES = [
  { value: 'flexible', label: 'Flexible', description: 'Free cancellation up to 24h' },
  { value: 'moderate', label: 'Moderate', description: 'Free cancellation up to 48h' },
  { value: 'strict', label: 'Strict', description: '50% refund up to 7 days' },
  { value: 'custom', label: 'Custom', description: 'Set your own policy' },
]

// Widget themes
WIDGET_THEMES = [
  { value: 'default', label: 'Default' },
  { value: 'modern', label: 'Modern' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'dark', label: 'Dark Mode' },
]
```

## UI Components Used
- Card, CardHeader, CardContent, CardTitle, CardDescription
- Button, Input, Textarea, Label
- Switch, Checkbox
- Select, SelectTrigger, SelectContent, SelectItem
- RadioGroup, RadioGroupItem
- Tabs, TabsList, TabsTrigger, TabsContent
- Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter
- Badge, Alert, AlertDescription
- Avatar, AvatarFallback
- DropdownMenu
- Separator

## Features

### Widget Embed System
```javascript
function generateEmbedCode(salonId, settings) {
  return `<script src="${baseUrl}/widget.js" 
    data-salon-id="${salonId}"
    data-theme="${settings.theme}"
    data-primary-color="${settings.primary_color}"
    ...
  ></script>`;
}
```

### Profile Completeness Calculator
```javascript
function getProfileCompleteness() {
  var fields = [name, description, phone, email, address, tagline, specialties];
  var filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
}
```

## API Endpoints Used
- `GET /api/salons/[id]` - Fetch salon settings
- `PATCH /api/salons/[id]` - Update salon settings
- `POST /api/salons/[id]/photos` - Upload salon photo
- `DELETE /api/salons/[id]/photos/[photoId]` - Delete photo
- `GET /api/reviews?salonId=X` - Fetch salon reviews
- `POST /api/reviews/[id]/reply` - Reply to review
- `POST /api/reviews/[id]/report` - Report review
- `PATCH /api/auth/me` - Update user account
- `POST /api/auth/me/password` - Change password

## What's Next
- Phase 9: Polish & Integration
- End-to-end testing
- Performance optimization
- Error handling improvements
