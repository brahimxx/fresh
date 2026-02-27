# Component & Architecture Map

## 1. Full File Tree
```text
web/
├── .env.local
├── .gitignore
├── check-staff-hours.js
├── components.json
├── database
│   ├── fresh.sql
│   ├── fresh_structure.sql
│   └── migrations
│       ├── 20260120_add_performance_indexes.sql
│       ├── 20260121_add_default_working_hours.sql
│       ├── 20260121_add_staff_to_booking_services.sql
│       ├── 20260219_add_salon_soft_delete.sql
│       ├── 20260222_add_client_search_indexes.sql
│       ├── 20260222_add_salon_clients_soft_delete.sql
│       └── 20260226_add_financial_operations.sql
├── docs
│   ├── archive
│   │   ├── AUDIT_AND_FIXES.md
│   │   ├── DEPLOYMENT.md
│   │   ├── DEVELOPER.md
│   │   ├── FRESH_MASTER_CONTEXT.md
│   │   ├── FRONTEND_PLAN.md
│   │   ├── HOW_IT_WORKS.md
│   │   ├── PHASE_1.md
│   │   ├── PHASE_10.md
│   │   ├── PHASE_11.md
│   │   ├── PHASE_12.md
│   │   ├── PHASE_13.md
│   │   ├── PHASE_2.md
│   │   ├── PHASE_3.md
│   │   ├── PHASE_4.md
│   │   ├── PHASE_5.md
│   │   ├── PHASE_6.md
│   │   ├── PHASE_7.md
│   │   ├── PHASE_8.md
│   │   ├── PHASE_9.md
│   │   ├── RESUME.md
│   │   ├── SECURITY_AUDIT.md
│   │   ├── SECURITY_AUDIT_SUMMARY.md
│   │   ├── SECURITY_FIXES_APPLIED.md
│   │   └── SECURITY_FIXES_COMPLETE.md
│   └── FRESH_DOCUMENTATION.md
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs
├── next_output.log
├── notebooklm
├── package.json
├── postcss.config.mjs
├── public
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── README.md
├── scripts
│   ├── add-country-column.js
│   ├── check-customer-country.js
│   ├── check-user-country.js
│   └── gen-tree.js
├── seed-payment.js
├── setup-tickets.js
├── src
│   ├── app
│   │   ├── (auth)
│   │   │   ├── choose
│   │   │   ├── forgot-password
│   │   │   │   └── page.js
│   │   │   ├── layout.js
│   │   │   ├── login
│   │   │   │   └── page.js
│   │   │   ├── register
│   │   │   │   └── page.js
│   │   │   └── reset-password
│   │   │       └── page.js
│   │   ├── (marketplace)
│   │   │   ├── bookings
│   │   │   │   └── page.js
│   │   │   ├── contact
│   │   │   │   └── page.js
│   │   │   ├── help
│   │   │   │   └── page.js
│   │   │   ├── layout.js
│   │   │   ├── page.js
│   │   │   ├── privacy
│   │   │   │   └── page.js
│   │   │   ├── salon
│   │   │   │   └── [id]
│   │   │   │       └── page.js
│   │   │   ├── salons
│   │   │   │   └── page.js
│   │   │   └── terms
│   │   │       └── page.js
│   │   ├── api
│   │   │   ├── admin
│   │   │   │   ├── analytics
│   │   │   │   │   ├── churn
│   │   │   │   │   │   └── route.js
│   │   │   │   │   ├── engagement
│   │   │   │   │   │   └── route.js
│   │   │   │   │   └── gmv
│   │   │   │   │       └── route.js
│   │   │   │   ├── audit-logs
│   │   │   │   │   └── route.js
│   │   │   │   ├── bookings
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── [id]
│   │   │   │   │       └── refund
│   │   │   │   │           └── route.js
│   │   │   │   ├── broadcasts
│   │   │   │   │   └── route.js
│   │   │   │   ├── fees
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── [feeId]
│   │   │   │   │       └── resolve
│   │   │   │   │           └── route.js
│   │   │   │   ├── global-discounts
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── [id]
│   │   │   │   │       └── route.js
│   │   │   │   ├── impersonate
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── stop
│   │   │   │   │       └── route.js
│   │   │   │   ├── onboarding
│   │   │   │   │   └── route.js
│   │   │   │   ├── payouts
│   │   │   │   │   └── route.js
│   │   │   │   ├── reviews
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── [reviewId]
│   │   │   │   │       └── route.js
│   │   │   │   ├── salons
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── [salonId]
│   │   │   │   │       ├── route.js
│   │   │   │   │       ├── status
│   │   │   │   │       │   └── route.js
│   │   │   │   │       └── tier
│   │   │   │   │           └── route.js
│   │   │   │   ├── settings
│   │   │   │   │   └── route.js
│   │   │   │   ├── tickets
│   │   │   │   │   ├── route.js
│   │   │   │   │   └── [id]
│   │   │   │   │       └── route.js
│   │   │   │   └── users
│   │   │   │       ├── route.js
│   │   │   │       └── [userId]
│   │   │   │           └── route.js
│   │   │   ├── auth
│   │   │   │   ├── forgot-password
│   │   │   │   │   └── route.js
│   │   │   │   ├── login
│   │   │   │   │   └── route.js
│   │   │   │   ├── logout
│   │   │   │   │   └── route.js
│   │   │   │   ├── me
│   │   │   │   │   ├── password
│   │   │   │   │   │   └── route.js
│   │   │   │   │   └── route.js
│   │   │   │   ├── refresh
│   │   │   │   │   └── route.js
│   │   │   │   ├── register
│   │   │   │   │   └── route.js
│   │   │   │   ├── reset-password
│   │   │   │   │   └── route.js
│   │   │   │   └── upgrade
│   │   │   │       └── route.js
│   │   │   ├── bookings
│   │   │   │   ├── route.js
│   │   │   │   └── [id]
│   │   │   │       ├── assign-staff
│   │   │   │       │   └── route.js
│   │   │   │       ├── checkout
│   │   │   │       │   └── route.js
│   │   │   │       ├── confirm
│   │   │   │       │   └── route.js
│   │   │   │       ├── no-show
│   │   │   │       │   └── route.js
│   │   │   │       ├── permanent
│   │   │   │       │   └── route.js
│   │   │   │       ├── products
│   │   │   │       │   └── route.js
│   │   │   │       ├── reschedule
│   │   │   │       │   └── route.js
│   │   │   │       ├── route.js
│   │   │   │       └── total
│   │   │   │           └── route.js
│   │   │   ├── campaigns
│   │   │   │   ├── route.js
│   │   │   │   └── [campaignId]
│   │   │   │       ├── route.js
│   │   │   │       └── send
│   │   │   │           └── route.js
│   │   │   ├── categories
│   │   │   │   ├── route.js
│   │   │   │   └── [categoryId]
│   │   │   │       └── route.js
│   │   │   ├── checkout
│   │   │   │   ├── refund
│   │   │   │   │   └── route.js
│   │   │   │   └── [bookingId]
│   │   │   │       └── route.js
│   │   │   ├── clients
│   │   │   │   ├── route.js
│   │   │   │   └── [id]
│   │   │   │       ├── bookings
│   │   │   │       │   └── route.js
│   │   │   │       └── route.js
│   │   │   ├── cron
│   │   │   │   └── reminders
│   │   │   │       └── route.js
│   │   │   ├── discounts
│   │   │   │   ├── route.js
│   │   │   │   ├── validate
│   │   │   │   │   └── route.js
│   │   │   │   └── [discountId]
│   │   │   │       └── route.js
│   │   │   ├── gift-cards
│   │   │   │   ├── check
│   │   │   │   │   └── route.js
│   │   │   │   ├── route.js
│   │   │   │   └── [code]
│   │   │   │       └── route.js
│   │   │   ├── invoices
│   │   │   │   └── [id]
│   │   │   │       └── route.js
│   │   │   ├── locations
│   │   │   │   ├── copy-services
│   │   │   │   │   └── route.js
│   │   │   │   ├── overview
│   │   │   │   │   └── route.js
│   │   │   │   └── transfer-staff
│   │   │   │       └── route.js
│   │   │   ├── marketplace
│   │   │   │   └── salons
│   │   │   │       ├── route.js
│   │   │   │       └── [id]
│   │   │   │           ├── reviews
│   │   │   │           │   └── route.js
│   │   │   │           ├── route.js
│   │   │   │           ├── services
│   │   │   │           │   └── route.js
│   │   │   │           ├── staff
│   │   │   │           │   └── route.js
│   │   │   │           └── staff-services
│   │   │   │               └── route.js
│   │   │   ├── my
│   │   │   │   └── bookings
│   │   │   │       ├── past
│   │   │   │       │   └── route.js
│   │   │   │       ├── route.js
│   │   │   │       └── upcoming
│   │   │   │           └── route.js
│   │   │   ├── notifications
│   │   │   │   ├── banners
│   │   │   │   │   └── route.js
│   │   │   │   ├── read
│   │   │   │   │   └── route.js
│   │   │   │   └── route.js
│   │   │   ├── packages
│   │   │   │   ├── route.js
│   │   │   │   └── [packageId]
│   │   │   │       ├── purchase
│   │   │   │       │   └── route.js
│   │   │   │       └── route.js
│   │   │   ├── payments
│   │   │   │   ├── confirm
│   │   │   │   │   └── route.js
│   │   │   │   ├── intent
│   │   │   │   │   └── route.js
│   │   │   │   ├── route.js
│   │   │   │   ├── [id]
│   │   │   │   │   └── route.js
│   │   │   │   └── __tests__
│   │   │   │       └── stripe-integration.test.js
│   │   │   ├── payouts
│   │   │   │   └── [payoutId]
│   │   │   │       └── route.js
│   │   │   ├── platform-fees
│   │   │   │   └── route.js
│   │   │   ├── products
│   │   │   │   ├── route.js
│   │   │   │   └── [productId]
│   │   │   │       └── route.js
│   │   │   ├── reports
│   │   │   │   ├── bookings
│   │   │   │   │   └── route.js
│   │   │   │   ├── clients
│   │   │   │   │   └── route.js
│   │   │   │   ├── overview
│   │   │   │   │   └── route.js
│   │   │   │   ├── revenue
│   │   │   │   │   └── route.js
│   │   │   │   └── staff
│   │   │   │       └── route.js
│   │   │   ├── resources
│   │   │   │   └── [resourceId]
│   │   │   │       ├── availability
│   │   │   │       │   └── route.js
│   │   │   │       └── route.js
│   │   │   ├── RESUME.md
│   │   │   ├── reviews
│   │   │   │   ├── route.js
│   │   │   │   ├── stats
│   │   │   │   │   └── route.js
│   │   │   │   └── [reviewId]
│   │   │   │       ├── reply
│   │   │   │       │   └── route.js
│   │   │   │       └── route.js
│   │   │   ├── salons
│   │   │   │   ├── route.js
│   │   │   │   └── [id]
│   │   │   │       ├── availability
│   │   │   │       │   └── route.js
│   │   │   │       ├── calendar
│   │   │   │       │   └── route.js
│   │   │   │       ├── campaigns
│   │   │   │       │   ├── route.js
│   │   │   │       │   └── [campaign_id]
│   │   │   │       │       └── send
│   │   │   │       │           └── route.js
│   │   │   │       ├── categories
│   │   │   │       │   └── route.js
│   │   │   │       ├── clients
│   │   │   │       │   ├── route.js
│   │   │   │       │   └── [clientId]
│   │   │   │       │       └── route.js
│   │   │   │       ├── commissions
│   │   │   │       │   └── route.js
│   │   │   │       ├── dashboard
│   │   │   │       │   └── route.js
│   │   │   │       ├── discounts
│   │   │   │       │   ├── route.js
│   │   │   │       │   └── [code]
│   │   │   │       │       └── route.js
│   │   │   │       ├── gift-cards
│   │   │   │       │   └── route.js
│   │   │   │       ├── last-minute
│   │   │   │       │   └── route.js
│   │   │   │       ├── marketplace
│   │   │   │       │   ├── disable
│   │   │   │       │   │   └── route.js
│   │   │   │       │   └── enable
│   │   │   │       │       └── route.js
│   │   │   │       ├── packages
│   │   │   │       │   └── route.js
│   │   │   │       ├── payouts
│   │   │   │       │   └── route.js
│   │   │   │       ├── photos
│   │   │   │       │   └── route.js
│   │   │   │       ├── products
│   │   │   │       │   └── route.js
│   │   │   │       ├── resources
│   │   │   │       │   └── route.js
│   │   │   │       ├── reviews
│   │   │   │       │   ├── route.js
│   │   │   │       │   └── [reviewId]
│   │   │   │       │       └── reply
│   │   │   │       │           └── route.js
│   │   │   │       ├── route.js
│   │   │   │       ├── services
│   │   │   │       │   └── route.js
│   │   │   │       ├── settings
│   │   │   │       │   └── route.js
│   │   │   │       ├── staff
│   │   │   │       │   ├── route.js
│   │   │   │       │   └── [staffId]
│   │   │   │       │       └── route.js
│   │   │   │       ├── waitlist
│   │   │   │       │   └── route.js
│   │   │   │       └── widget
│   │   │   │           └── route.js
│   │   │   ├── services
│   │   │   │   ├── route.js
│   │   │   │   └── [serviceId]
│   │   │   │       └── route.js
│   │   │   ├── staff
│   │   │   │   ├── route.js
│   │   │   │   └── [staffId]
│   │   │   │       ├── commissions
│   │   │   │       │   └── route.js
│   │   │   │       ├── route.js
│   │   │   │       ├── schedule
│   │   │   │       │   └── route.js
│   │   │   │       ├── services
│   │   │   │       │   └── route.js
│   │   │   │       ├── time-off
│   │   │   │       │   └── route.js
│   │   │   │       └── working-hours
│   │   │   │           └── route.js
│   │   │   ├── tickets
│   │   │   │   └── route.js
│   │   │   ├── users
│   │   │   │   ├── route.js
│   │   │   │   └── [id]
│   │   │   │       ├── locations
│   │   │   │       │   └── route.js
│   │   │   │       ├── packages
│   │   │   │       │   └── route.js
│   │   │   │       └── route.js
│   │   │   ├── waitlist
│   │   │   │   ├── route.js
│   │   │   │   └── [waitlistId]
│   │   │   │       ├── notify
│   │   │   │       │   └── route.js
│   │   │   │       └── route.js
│   │   │   ├── webhooks
│   │   │   │   ├── sms
│   │   │   │   │   └── route.js
│   │   │   │   └── stripe
│   │   │   │       └── route.js
│   │   │   └── widget
│   │   │       └── [salonId]
│   │   │           ├── availability
│   │   │           │   └── route.js
│   │   │           ├── book
│   │   │           │   └── route.js
│   │   │           ├── route.js
│   │   │           ├── services
│   │   │           │   └── route.js
│   │   │           └── staff
│   │   │               └── route.js
│   │   ├── auth
│   │   │   └── choose
│   │   │       └── page.js
│   │   ├── book
│   │   │   ├── layout.js
│   │   │   └── [salonId]
│   │   │       └── page.js
│   │   ├── dashboard
│   │   │   ├── admin
│   │   │   │   ├── analytics
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── audit-logs
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── bookings
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── fees
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── layout.js
│   │   │   │   ├── marketing
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── page.jsx
│   │   │   │   ├── payouts
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── reviews
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── salons
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── settings
│   │   │   │   │   └── page.jsx
│   │   │   │   ├── support
│   │   │   │   │   └── page.jsx
│   │   │   │   └── users
│   │   │   │       └── page.jsx
│   │   │   ├── layout.js
│   │   │   ├── locations
│   │   │   │   └── new
│   │   │   │       └── page.js
│   │   │   ├── page.js
│   │   │   ├── salon
│   │   │   │   ├── support
│   │   │   │   │   └── page.jsx
│   │   │   │   └── [salonId]
│   │   │   │       ├── bookings
│   │   │   │       │   └── page.js
│   │   │   │       ├── calendar
│   │   │   │       │   └── page.js
│   │   │   │       ├── checkout
│   │   │   │       │   └── [bookingId]
│   │   │   │       │       └── page.js
│   │   │   │       ├── clients
│   │   │   │       │   ├── page.js
│   │   │   │       │   └── [clientId]
│   │   │   │       │       └── page.js
│   │   │   │       ├── marketing
│   │   │   │       │   ├── campaigns
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── discounts
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── gift-cards
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── packages
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── page.js
│   │   │   │       │   └── waitlist
│   │   │   │       │       └── page.js
│   │   │   │       ├── page.js
│   │   │   │       ├── products
│   │   │   │       │   └── page.js
│   │   │   │       ├── reports
│   │   │   │       │   ├── bookings
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── clients
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── page.js
│   │   │   │       │   ├── revenue
│   │   │   │       │   │   └── page.js
│   │   │   │       │   └── staff
│   │   │   │       │       └── page.js
│   │   │   │       ├── reviews
│   │   │   │       │   └── page.js
│   │   │   │       ├── sales
│   │   │   │       │   └── page.js
│   │   │   │       ├── services
│   │   │   │       │   └── page.js
│   │   │   │       ├── settings
│   │   │   │       │   ├── account
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── general
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── hours
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── layout.js
│   │   │   │       │   ├── marketplace
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── notifications
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── page.js
│   │   │   │       │   ├── policies
│   │   │   │       │   │   └── page.js
│   │   │   │       │   ├── reviews
│   │   │   │       │   │   └── page.js
│   │   │   │       │   └── widget
│   │   │   │       │       └── page.js
│   │   │   │       └── team
│   │   │   │           ├── page.js
│   │   │   │           └── [staffId]
│   │   │   │               └── page.js
│   │   │   └── settings
│   │   │       └── page.js
│   │   ├── favicon.ico
│   │   ├── globals.css
│   │   ├── layout.js
│   │   └── onboarding
│   │       └── page.js
│   ├── components
│   │   ├── booking-widget
│   │   │   ├── booking-auth.jsx
│   │   │   ├── booking-confirmation.jsx
│   │   │   ├── client-details.jsx
│   │   │   ├── datetime-selection.jsx
│   │   │   ├── service-selection.jsx
│   │   │   └── staff-selection.jsx
│   │   ├── bookings
│   │   │   ├── booking-detail.jsx
│   │   │   └── booking-form.jsx
│   │   ├── calendar
│   │   │   ├── calendar-view.jsx
│   │   │   ├── event-quick-actions.jsx
│   │   │   └── event-tooltip.jsx
│   │   ├── checkout
│   │   │   ├── add-product-dialog.jsx
│   │   │   └── payment-success.jsx
│   │   ├── clients
│   │   │   ├── client-booking-history.jsx
│   │   │   ├── client-form.jsx
│   │   │   └── client-notes.jsx
│   │   ├── command-palette.jsx
│   │   ├── help
│   │   │   └── help-tooltips.jsx
│   │   ├── ImpersonationBanner.jsx
│   │   ├── layout
│   │   │   ├── header.jsx
│   │   │   ├── notification-popover.jsx
│   │   │   └── sidebar.jsx
│   │   ├── marketing
│   │   │   ├── campaign-form.jsx
│   │   │   ├── discount-form.jsx
│   │   │   ├── gift-card-detail.jsx
│   │   │   ├── gift-card-form.jsx
│   │   │   ├── notify-dialog.jsx
│   │   │   ├── package-form.jsx
│   │   │   └── waitlist-form.jsx
│   │   ├── onboarding
│   │   │   └── onboarding-wizard.jsx
│   │   ├── products
│   │   │   ├── product-form.jsx
│   │   │   └── stock-update.jsx
│   │   ├── providers.jsx
│   │   ├── sales
│   │   │   ├── payment-detail.jsx
│   │   │   └── refund-dialog.jsx
│   │   ├── services
│   │   │   ├── category-form.jsx
│   │   │   └── service-form.jsx
│   │   ├── staff
│   │   │   ├── staff-addresses-tab.jsx
│   │   │   ├── staff-commissions-tab.jsx
│   │   │   ├── staff-creation-wizard.jsx
│   │   │   ├── staff-emergency-contacts-tab.jsx
│   │   │   ├── staff-form.jsx
│   │   │   ├── staff-locations-tab.jsx
│   │   │   ├── staff-pay-runs-tab.jsx
│   │   │   ├── staff-personal-tab.jsx
│   │   │   ├── staff-schedule.jsx
│   │   │   ├── staff-services-tab.jsx
│   │   │   ├── staff-settings-tab.jsx
│   │   │   └── staff-wages-tab.jsx
│   │   └── ui
│   │       ├── accessibility.jsx
│   │       ├── alert-dialog.jsx
│   │       ├── alert.jsx
│   │       ├── avatar.jsx
│   │       ├── badge.jsx
│   │       ├── breadcrumbs.jsx
│   │       ├── button.jsx
│   │       ├── calendar.jsx
│   │       ├── card.jsx
│   │       ├── checkbox.jsx
│   │       ├── collapsible.jsx
│   │       ├── command.jsx
│   │       ├── confirm-dialog.jsx
│   │       ├── data-error.jsx
│   │       ├── dialog.jsx
│   │       ├── dropdown-menu.jsx
│   │       ├── empty-states.jsx
│   │       ├── error-boundary.jsx
│   │       ├── form.jsx
│   │       ├── input.jsx
│   │       ├── label.jsx
│   │       ├── loading-skeletons.jsx
│   │       ├── loading.jsx
│   │       ├── optimized-image.jsx
│   │       ├── popover.jsx
│   │       ├── progress.jsx
│   │       ├── radio-group.jsx
│   │       ├── scroll-area.jsx
│   │       ├── select.jsx
│   │       ├── separator.jsx
│   │       ├── sheet.jsx
│   │       ├── skeleton.jsx
│   │       ├── switch.jsx
│   │       ├── table.jsx
│   │       ├── tabs.jsx
│   │       ├── textarea.jsx
│   │       ├── theme-toggle.jsx
│   │       ├── tooltip.jsx
│   │       └── virtualized-table.jsx
│   ├── hooks
│   │   ├── use-bookings.js
│   │   ├── use-campaigns.js
│   │   ├── use-clients.js
│   │   ├── use-discounts.js
│   │   ├── use-gift-cards.js
│   │   ├── use-marketplace.js
│   │   ├── use-notifications.js
│   │   ├── use-packages.js
│   │   ├── use-payments.js
│   │   ├── use-products.js
│   │   ├── use-reports.js
│   │   ├── use-reviews.js
│   │   ├── use-services.js
│   │   ├── use-settings.js
│   │   ├── use-staff.js
│   │   ├── use-toast.js
│   │   └── use-waitlist.js
│   ├── lib
│   │   ├── api-client.js
│   │   ├── auth.js
│   │   ├── booking.js
│   │   ├── checkout.js
│   │   ├── client.js
│   │   ├── constants
│   │   │   └── countries.js
│   │   ├── db.js
│   │   ├── format.js
│   │   ├── notifications.js
│   │   ├── rate-limit.js
│   │   ├── response.js
│   │   ├── security.js
│   │   ├── utils.js
│   │   └── validate.js
│   ├── middleware.js
│   ├── providers
│   │   ├── auth-provider.jsx
│   │   ├── query-provider.jsx
│   │   ├── salon-provider.jsx
│   │   ├── theme-provider.jsx
│   │   └── toast-provider.jsx
│   ├── scripts
│   │   └── generate-jwt.mjs
│   └── styles
│       └── calendar.css
├── test-payouts.js
├── test-refund.js
├── test-sql.js
└── test_broadcast.js

```

## 2. Directory Responsibilities

### `/app`
Contains all the Next.js App Router definitions, encompassing layouts, pages, and API routes. It directly handles routing, server components, and the main structure for the Marketplace and Dashboard.

### `/components`
Houses reusable React components used across the platform, including UI elements, layout shells, and specific feature components. These are primarily presentation and client-side interactive elements.

### `/api` (located within `/app/api`)
Serves as the backend API layer for the platform, containing Next.js Route Handlers. It processes requests from the frontend or external clients for operations like payments, bookings, webhooks, and data mutations.

### `/lib`
Stores core business logic, utility functions, database configurations, and shared middleware. This acts as the "Internal Brain", providing the robust functions that enforce permissions and handle global setups.

## 3. Entry Points

- **The Backoffice Dashboard**: 
  - Admin Dashboard: `src/app/dashboard/admin/page.js`
  - Salon Owner Dashboard: `src/app/dashboard/salon/page.js`
- **The Booking Widget**: 
  - Frontend Components: `src/components/booking-widget/`
  - Backend API: `src/app/api/widget/`
- **The Marketplace**: 
  - Main Landing Page: `src/app/(marketplace)/page.js`
