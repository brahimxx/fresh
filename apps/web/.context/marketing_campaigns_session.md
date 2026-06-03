# Marketing & Campaigns Module: Session Summary

## 1. Automated Marketing Bug Fixes & Cleanup
- **State**: `Completed`
- **Details**: 
  - Fixed a `500 ER_TRUNCATED_WRONG_VALUE_FOR_FIELD` database error when creating automated campaigns by dynamically decoding the hashed `salon_id` (e.g., `w2G`) into an integer before inserting it into the `automated_campaigns` table.
  - Developed and executed `scripts/cleanup_automations.js` to purge duplicate and corrupt test data from previous buggy executions.

## 2. "Big Company Tier" UI/UX Redesign
- **State**: `Completed`
- **Details**: 
  - **Campaigns & Automations Cards**: Removed "faded" default styling. Implemented premium micro-interactions, distinct colored accent borders based on campaign status (green for sent, amber for scheduled), and premium Lucide iconography.
  - **Form Drawers**: Converted the `CampaignForm` from a basic center-screen `Dialog` to a sliding right-aligned `Sheet` drawer, aligning perfectly with the app's established design language.
  - **Interactivity**: Made campaign list cards entirely clickable (`cursor-pointer`), allowing users to click anywhere on the card to open the edit drawer, while strictly isolating `onClick` propagation for the three-dot dropdown buttons.
  - **Metrics**: Fixed a `ReferenceError: totalReached is not defined` bug and implemented sleek top-level statistical metric cards featuring floating background watermarks.

## 3. Campaign API Payload & Auth Resolution
- **State**: `Completed`
- **Details**: 
  - **Payload Mapping**: Resolved a `400 Bad Request` during campaign creation by correcting mismatched field names (`message` -> `content`, `audience_type` -> `target_audience`) in the frontend submission payload.
  - **Owner Authentication**: Fixed a `500 ER_BAD_NULL_ERROR` on `salon_id`. Global Owner accounts do not have a hardcoded `salonId` inside their session JWT. The API now intercepts the hashed `salon_id` from the payload body and decodes it (`decodeId` via `@/lib/id`) natively to fulfill the database requirements.

## 4. Live Email Dispatching (Resend Integration)
- **State**: `Completed`
- **Details**: 
  - **Database Alignment**: Fixed an `ER_BAD_FIELD_ERROR` by updating the dispatch query to use the `completed_at` column rather than the non-existent `sent_at` column.
  - **Resend SDK**: Replaced the placeholder "simulated" sending logic with actual live email dispatches using the `resend` integration in `lib/email.js`.
  - **Dynamic Templates**: Integrated live placeholder injections for `{{first_name}}` and `{{salon_name}}` within the HTML email body.
  - **Parallel Processing**: Emails are now pushed in parallel to actual users using `Promise.allSettled()` based on their target audience segment (e.g., returning clients, new clients).

## 5. Sent & Deleted Campaign Constraints
- **State**: `Completed`
- **Details**: 
  - **Edit Locking**: Enforced strict validation preventing users from editing campaigns that are already `sent` or `completed`. Removed the Edit option and disabled card clicks for dispatched broadcasts.
  - **Soft-Delete Visuals**: Cancelled (soft-deleted) campaigns are now distinctly visualized using `grayscale`, reduced opacity (`opacity-60`), a dashed border, and a strikethrough effect on the campaign title.
  - **Toggle View**: By default, cancelled campaigns are entirely hidden from the UI. Added a dedicated "Show deleted" checkbox filter switch to easily toggle them back into the view without cluttering the primary status dropdown.
