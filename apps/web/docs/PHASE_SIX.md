# Phase 6: Marketing & Promotions - COMPLETE ✅

## Overview
This phase implements a comprehensive marketing and promotions system for the salon booking platform, including discount codes, gift cards, service packages, email/SMS campaigns, and waitlist management.

## Completed Features

### 1. Hooks Created

#### `src/hooks/use-discounts.js`
- **Query Keys**: `discountKeys` for cache management
- **Queries**: `useDiscounts`, `useDiscount`
- **Mutations**: `useCreateDiscount`, `useUpdateDiscount`, `useDeleteDiscount`, `useToggleDiscount`
- **Constants**: `DISCOUNT_TYPES` (percentage, fixed), `DISCOUNT_STATUSES` (active, inactive, expired, scheduled)
- **Helpers**: `getDiscountStatus()`, `generateDiscountCode()`

#### `src/hooks/use-gift-cards.js`
- **Query Keys**: `giftCardKeys` for cache management
- **Queries**: `useGiftCards`, `useGiftCard`, `useCheckGiftCard`
- **Mutations**: `useCreateGiftCard`, `useUpdateGiftCard`, `useCancelGiftCard`
- **Constants**: `GIFT_CARD_STATUSES` (active, redeemed, expired, cancelled)
- **Helpers**: `getGiftCardStatus()`, `generateGiftCardCode()` (XXXX-XXXX-XXXX-XXXX format), `formatCurrency()`

#### `src/hooks/use-packages.js`
- **Query Keys**: `packageKeys` for cache management
- **Queries**: `usePackages`, `usePackage`
- **Mutations**: `useCreatePackage`, `useUpdatePackage`, `useDeletePackage`, `usePurchasePackage`
- **Constants**: `PACKAGE_STATUSES` (active, inactive, sold_out)
- **Helpers**: `formatCurrency()`, `calculateSavings()` (returns amount and percentage)

#### `src/hooks/use-campaigns.js`
- **Query Keys**: `campaignKeys` for cache management
- **Queries**: `useCampaigns`, `useCampaign`
- **Mutations**: `useCreateCampaign`, `useUpdateCampaign`, `useDeleteCampaign`, `useSendCampaign`, `useScheduleCampaign`
- **Constants**: `CAMPAIGN_TYPES` (email, sms), `CAMPAIGN_STATUSES` (draft, scheduled, sending, sent, failed), `AUDIENCE_TYPES` (all, active, inactive, new, loyal, birthday, custom)

#### `src/hooks/use-waitlist.js`
- **Query Keys**: `waitlistKeys` for cache management
- **Queries**: `useWaitlist`, `useWaitlistEntry`
- **Mutations**: `useAddToWaitlist`, `useUpdateWaitlist`, `useRemoveFromWaitlist`, `useNotifyWaitlist`, `useConvertWaitlistToBooking`
- **Constants**: `WAITLIST_STATUSES` (waiting, notified, booked, expired, cancelled), `PRIORITY_LEVELS` (low, normal, high, urgent)

---

### 2. Pages Created

#### Discounts Page
**Path**: `src/app/dashboard/salon/[salonId]/marketing/discounts/page.js`
- Stats cards (total, active, total uses)
- Search and status filter
- Discount codes table with:
  - Code display with copy button
  - Type badge (percentage/fixed)
  - Min purchase, max uses, usage count
  - Date range display
  - Toggle active switch
  - Delete action

#### Gift Cards Page
**Path**: `src/app/dashboard/salon/[salonId]/marketing/gift-cards/page.js`
- Stats cards (total, active, sold, outstanding balance)
- Search and status filter
- Gift cards table with:
  - Code with copy button
  - Initial/remaining balance
  - Recipient info
  - Expiry date with warning
  - Status badge
  - Cancel action

#### Packages Page
**Path**: `src/app/dashboard/salon/[salonId]/marketing/packages/page.js`
- Stats cards (total, active, total sales)
- Search filter
- Package cards grid with:
  - Savings badge (percentage)
  - Price display with regular total
  - Included services list
  - Validity period
  - Toggle active switch
  - Edit/delete actions

#### Campaigns Page
**Path**: `src/app/dashboard/salon/[salonId]/marketing/campaigns/page.js`
- Stats cards (total, sent, total recipients, drafts)
- Type filter (email/sms) and status filter
- Campaign cards with:
  - Type icon (Mail/MessageSquare)
  - Audience badge
  - Status badge with colors
  - Recipient count and sent date
  - Send now confirmation dialog
  - Edit/delete actions

#### Waitlist Page
**Path**: `src/app/dashboard/salon/[salonId]/marketing/waitlist/page.js`
- Stats cards (total entries, waiting, notified, converted)
- Search and status filter
- Waitlist table with:
  - Client info (name, phone, email)
  - Requested service
  - Preferred date/time
  - Priority badge
  - Status badge
  - Actions: Notify, Convert to Booking, Remove

---

### 3. Components Created

#### `src/components/marketing/discount-form.jsx`
- Add/edit discount dialog
- Auto-generate discount code
- Type selector (percentage/fixed amount)
- Value input with dynamic validation
- Min purchase and max uses
- Date range picker (start/end)
- Active toggle switch

#### `src/components/marketing/gift-card-form.jsx`
- Create gift card dialog
- Auto-generate code (XXXX-XXXX-XXXX-XXXX format)
- Value presets ($25, $50, $75, $100, $150, $200)
- Custom value input
- Recipient name and email
- Personal message
- Expiry date picker
- Send email to recipient checkbox

#### `src/components/marketing/gift-card-detail.jsx`
- Gift card detail modal
- Gradient card design with code display
- Balance progress bar (remaining/initial)
- Usage stats and creation date
- Copy code button
- Print and email actions

#### `src/components/marketing/package-form.jsx`
- Add/edit package dialog
- Package name and description
- Scrollable service selection with checkboxes
- Service prices display
- Regular price calculation
- Package price with savings display
- Validity days input
- Active toggle

#### `src/components/marketing/campaign-form.jsx`
- Add/edit campaign dialog
- Campaign name input
- Type selector cards (Email/SMS)
- Subject line (email only)
- Target audience dropdown
- Message body with placeholder hints
- Character count for SMS

#### `src/components/marketing/waitlist-form.jsx`
- Add to waitlist dialog
- Existing client selector with auto-fill
- Client name, email, phone inputs
- Service selection dropdown
- Preferred date and time pickers
- Priority level selector
- Notes textarea

#### `src/components/marketing/notify-dialog.jsx`
- Notify client dialog
- Notification method (Email/SMS)
- Disabled options if contact unavailable
- Service info display
- Customizable message
- Character count for SMS

---

## File Structure

```
src/
├── hooks/
│   ├── use-discounts.js
│   ├── use-gift-cards.js
│   ├── use-packages.js
│   ├── use-campaigns.js
│   └── use-waitlist.js
├── app/dashboard/salon/[salonId]/marketing/
│   ├── discounts/
│   │   └── page.js
│   ├── gift-cards/
│   │   └── page.js
│   ├── packages/
│   │   └── page.js
│   ├── campaigns/
│   │   └── page.js
│   └── waitlist/
│       └── page.js
└── components/marketing/
    ├── discount-form.jsx
    ├── gift-card-form.jsx
    ├── gift-card-detail.jsx
    ├── package-form.jsx
    ├── campaign-form.jsx
    ├── waitlist-form.jsx
    └── notify-dialog.jsx
```

---

## API Endpoints Used

### Discounts
- `GET /api/discounts?salon_id=X` - List discounts
- `GET /api/discounts/:id` - Get discount
- `POST /api/discounts` - Create discount
- `PUT /api/discounts/:id` - Update discount
- `DELETE /api/discounts/:id` - Delete discount

### Gift Cards
- `GET /api/gift-cards?salon_id=X` - List gift cards
- `GET /api/gift-cards/:id` - Get gift card
- `GET /api/gift-cards/check?code=X` - Check gift card balance
- `POST /api/gift-cards` - Create gift card
- `PUT /api/gift-cards/:id` - Update gift card
- `DELETE /api/gift-cards/:id` - Cancel gift card

### Packages
- `GET /api/packages?salon_id=X` - List packages
- `GET /api/packages/:id` - Get package
- `POST /api/packages` - Create package
- `PUT /api/packages/:id` - Update package
- `DELETE /api/packages/:id` - Delete package
- `POST /api/packages/:id/purchase` - Purchase package

### Campaigns
- `GET /api/campaigns?salon_id=X` - List campaigns
- `GET /api/campaigns/:id` - Get campaign
- `POST /api/campaigns` - Create campaign
- `PUT /api/campaigns/:id` - Update campaign
- `DELETE /api/campaigns/:id` - Delete campaign
- `POST /api/campaigns/:id/send` - Send campaign

### Waitlist
- `GET /api/waitlist?salon_id=X` - List waitlist entries
- `GET /api/waitlist/:id` - Get entry
- `POST /api/waitlist` - Add to waitlist
- `PUT /api/waitlist/:id` - Update entry
- `DELETE /api/waitlist/:id` - Remove from waitlist
- `POST /api/waitlist/:id/notify` - Notify client
- `POST /api/waitlist/:id/convert` - Convert to booking

---

## Usage Examples

### Creating a Discount
```jsx
import { DiscountForm } from '@/components/marketing/discount-form';
import { useState } from 'react';

function DiscountsPage() {
  const [showForm, setShowForm] = useState(false);
  
  return (
    <>
      <Button onClick={() => setShowForm(true)}>
        Create Discount
      </Button>
      <DiscountForm
        open={showForm}
        onOpenChange={setShowForm}
        salonId={salonId}
        onSuccess={() => setShowForm(false)}
      />
    </>
  );
}
```

### Checking Gift Card Balance
```jsx
import { useCheckGiftCard } from '@/hooks/use-gift-cards';

function CheckoutPage() {
  const checkGiftCard = useCheckGiftCard();
  
  async function handleApplyGiftCard(code) {
    const result = await checkGiftCard.mutateAsync(code);
    // result contains: { valid: true, balance: 50.00 }
  }
}
```

### Sending a Campaign
```jsx
import { useSendCampaign } from '@/hooks/use-campaigns';

function CampaignActions({ campaign }) {
  const sendCampaign = useSendCampaign();
  
  function handleSend() {
    sendCampaign.mutate(campaign.id, {
      onSuccess: () => toast({ title: 'Campaign sent!' })
    });
  }
}
```

---

## Next Phase

**Phase 7: Reports & Analytics**
- Revenue reports
- Booking analytics
- Staff performance
- Client insights
- Export functionality
