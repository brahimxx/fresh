# Phase 12: Marketplace & Discovery

## Overview

This phase implements a public-facing marketplace where clients can discover and browse salons in their area. This is similar to the consumer-facing side of platforms like Fresha, Booksy, or Yelp for beauty services.

## Pages Created

### Marketplace Layout
**Location:** `src/app/(marketplace)/layout.js`

A dedicated layout for public-facing pages with:
- Sticky header with logo and search
- Location-based search inputs
- Mobile-responsive navigation with hamburger menu
- "For Business" CTA link
- Login button
- Full footer with category links, business info, support, and legal

### Homepage / Landing Page
**Location:** `src/app/(marketplace)/page.js`

Hero section and content:
- **Hero Section**: Gradient background with main headline and search box
- **Popular Services**: Quick-access badges for common searches
- **Categories Section**: Browse by category (Hair, Nails, Spa, Barber)
- **Featured Salons**: Grid of top-rated venues with images, ratings, locations
- **How It Works**: 3-step explanation (Search → Book → Enjoy)
- **Business CTA**: "Are you a salon owner?" call-to-action

### Salon Search / Discovery Page
**Location:** `src/app/(marketplace)/salons/page.js`

Full search experience:
- **Search Bar**: Service/salon name + location inputs
- **Filter System**:
  - Category buttons (Hair, Nails, Spa, Barber)
  - Price range ($ to $$$$)
  - Minimum rating (4+, 4.5+)
  - Open Now toggle
- **Mobile Filters**: Sheet/drawer with all filter options
- **Sort Options**: Recommended, Highest Rated, Most Reviews, Nearest, Price
- **View Modes**: Grid and List toggle
- **Active Filter Badges**: Clear individual or all filters
- **Salon Cards**: Image, name, category, rating, reviews, location, price level

### Salon Public Profile Page
**Location:** `src/app/(marketplace)/salon/[id]/page.js`

Comprehensive salon profile:
- **Hero Image**: Full-width cover photo with gradient overlay
- **Action Buttons**: Share, Favorite (heart)
- **Salon Header Card**: Logo, name, category, rating, location, Book Now button
- **Tabbed Content**:
  - **Services Tab**: Grouped by category, showing name, description, duration, price, book button
  - **Team Tab**: Staff cards with avatar, name, title, rating, bio
  - **Reviews Tab**: Rating summary, star distribution, review list with comments
  - **About Tab**: Description and amenities checklist
- **Sidebar**:
  - Book Now card (sticky)
  - Business hours (highlights current day)
  - Contact info (address, phone, website)

## API Endpoints

### GET `/api/marketplace/salons`
Search and list salons with filters:

**Query Parameters:**
- `q` - Search query (name, description, services)
- `location` - City, state, or postal code
- `categories` - Comma-separated category slugs
- `price` - Comma-separated price levels (1-4)
- `minRating` - Minimum rating (e.g., 4.5)
- `openNow` - Boolean for currently open
- `sort` - recommended, rating, reviews, price_low, price_high
- `limit`, `offset` - Pagination

**Returns:**
- Salon list with rating, review count, service previews

### GET `/api/marketplace/salons/[id]`
Get single salon public profile with:
- Basic info (name, description, contact)
- Rating and review count
- Business hours
- Amenities list

### GET `/api/marketplace/salons/[id]/services`
Get salon's active services:
- Grouped by category
- Name, description, duration, price

### GET `/api/marketplace/salons/[id]/staff`
Get salon's visible staff:
- Name, title, bio
- Avatar
- Rating and review count

### GET `/api/marketplace/salons/[id]/reviews`
Get salon's approved reviews:
- Client name, rating, comment, date
- Service and staff info
- Rating distribution
- Sorting: recent, highest, lowest
- Pagination support

## URL Structure

| Path | Description |
|------|-------------|
| `/` | Marketplace homepage |
| `/salons` | Search/browse all salons |
| `/salons?q=haircut&location=NYC` | Search with params |
| `/salon/123` | Individual salon profile |
| `/book/123` | Booking widget (Phase 11) |

## Route Group

The `(marketplace)` route group uses parentheses to organize routes without affecting the URL:
- `src/app/(marketplace)/layout.js` - Shared marketplace layout
- `src/app/(marketplace)/page.js` - Homepage at `/`
- `src/app/(marketplace)/salons/page.js` - Search at `/salons`
- `src/app/(marketplace)/salon/[id]/page.js` - Profile at `/salon/:id`

## Database Requirements

For full functionality, salons need:
- `is_marketplace_enabled = 1` - Opt-in to marketplace
- `status = 'active'` - Active status
- `price_level` - 1-4 for price filtering
- `category` - For category filtering
- `cover_image_url` - For visual appeal
- Business hours populated
- Services with prices/durations
- Reviews for ratings

## Design Patterns

1. **Server-Side Search**: Query params parsed on page load
2. **Client-Side Filtering**: Real-time filter updates
3. **Suspense Boundaries**: Loading states for dynamic content
4. **Responsive Design**: Mobile-first with tablet/desktop enhancements
5. **Card-Based UI**: Consistent salon presentation
6. **Star Ratings**: Visual 5-star displays
7. **Category Taxonomy**: Standardized category slugs

## Future Enhancements

1. **Geolocation**: Auto-detect user location
2. **Map View**: Interactive map with salon pins
3. **Favorites**: Save salons to user account
4. **Recent Searches**: Quick access to previous searches
5. **Personalization**: Recommended salons based on history
6. **Last-Minute Deals**: Discounted same-day appointments
7. **Gift Cards**: Purchase and send gift cards
8. **Mobile App Deep Links**: Open in native app if installed
