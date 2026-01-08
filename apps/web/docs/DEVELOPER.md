# Fresh Salon - Developer Documentation

## Project Overview

Fresh is a comprehensive salon management platform built with Next.js 16, featuring:
- **Dashboard**: Complete backoffice for salon owners
- **Public Booking Widget**: Client-facing booking experience
- **Marketplace**: Discovery platform for salons

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.1.1 | React framework with App Router |
| React | 19.x | UI library |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | Latest | Component library |
| TanStack Query | 5.x | Server state management |
| Recharts | 2.x | Charts and analytics |
| date-fns | 4.x | Date manipulation |
| Playwright | Latest | E2E testing |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Authentication pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   ├── (public)/          # Public pages
│   │   ├── book/[salonId]/ # Booking widget
│   │   ├── salon/[id]/    # Salon profile
│   │   └── salons/        # Marketplace
│   ├── dashboard/         # Protected dashboard
│   │   └── salon/[salonId]/
│   │       ├── calendar/
│   │       ├── bookings/
│   │       ├── clients/
│   │       ├── services/
│   │       ├── products/
│   │       ├── staff/
│   │       ├── sales/
│   │       ├── reports/
│   │       ├── marketing/
│   │       └── settings/
│   └── api/               # API routes
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── bookings/
│   ├── calendar/
│   ├── clients/
│   ├── help/
│   ├── layout/
│   ├── marketing/
│   ├── onboarding/
│   ├── products/
│   ├── sales/
│   ├── services/
│   └── staff/
├── hooks/                # Custom React hooks
├── lib/                  # Utilities
│   ├── api.js           # API client
│   ├── auth.js          # Auth utilities
│   ├── db.js            # Database connection
│   ├── security.js      # Security utilities
│   └── utils.js         # General utilities
└── providers/           # React context providers
```

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- PostgreSQL database

### Installation

```bash
# Clone the repository
git clone <repository-url>

# Navigate to web app
cd apps/web

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/fresh

# Authentication
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:e2e:ui` | Run Playwright with UI |

## API Reference

### Authentication

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | User login |
| `/api/auth/register` | POST | User registration |
| `/api/auth/logout` | POST | User logout |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/auth/forgot-password` | POST | Request password reset |
| `/api/auth/reset-password` | POST | Reset password |

### Bookings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bookings` | GET, POST | List/create bookings |
| `/api/bookings/[id]` | GET, PATCH, DELETE | Manage booking |
| `/api/bookings/[id]/confirm` | POST | Confirm booking |
| `/api/bookings/[id]/reschedule` | POST | Reschedule booking |

### Services

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/services/[serviceId]` | GET, PATCH, DELETE | Manage service |

### Clients

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/clients` | GET, POST | List/create clients |
| `/api/clients/[id]` | GET, PATCH, DELETE | Manage client |

### Staff

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/staff/[id]` | GET, PATCH, DELETE | Manage staff |

### Widget (Public)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/widget/[salonId]` | GET | Get salon widget config |

## Component Library

### UI Components (shadcn/ui)

27 components installed:
- Accordion, Alert, AlertDialog
- Avatar, Badge, Button
- Calendar, Card, Checkbox
- Collapsible, Command, Dialog
- DropdownMenu, Form, Input
- Label, Popover, Progress
- RadioGroup, ScrollArea, Select
- Separator, Sheet, Skeleton
- Switch, Table, Tabs
- Textarea, Toast, Tooltip

### Custom Components

#### Help Components
- `HelpTooltip` - Inline help
- `InfoTooltip` - Information markers
- `HelpPopover` - Extended help content
- `HelpCard` - Contextual help panels
- `KeyboardShortcut` - Shortcut display

#### Onboarding
- `OnboardingWizard` - First-time user wizard
- `OnboardingChecklist` - Dashboard checklist

#### Accessibility
- `SkipToContent` - Skip link for keyboard users
- `LiveRegion` - Screen reader announcements
- `useFocusTrap` - Focus management hook

## Testing

### E2E Tests with Playwright

```bash
# Install browsers
npx playwright install

# Run all tests
npm run test:e2e

# Run specific test file
npx playwright test e2e/auth.spec.js

# Run with UI mode
npm run test:e2e:ui

# Run specific browser
npx playwright test --project=chromium
```

### Test Files

- `e2e/auth.spec.js` - Authentication tests
- `e2e/booking.spec.js` - Booking widget tests
- `e2e/cross-browser.spec.js` - Browser compatibility

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy (Vercel)

```bash
npm run build
vercel --prod
```

## Security

See `src/lib/security.js` for:
- Security audit checklist
- Input sanitization utilities
- Password validation
- CSRF token generation
- Rate limiting helpers

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test:e2e`
4. Run linting: `npm run lint`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
