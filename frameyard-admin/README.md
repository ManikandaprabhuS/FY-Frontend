# FrameYaad Admin

This is the admin dashboard for the FrameYaad backend. It is a React + TypeScript + Vite application that talks directly to the backend APIs and keeps the admin workflow focused on store operations.

## Backend/API Notes

- The dashboard uses the FrameYaad backend API at `VITE_API_URL` or `http://localhost:5000/api/v1`.
- Authentication is cookie/token based through the existing backend auth flow.
- Global search in the top bar now routes by intent:
  - `FY-2345` style order numbers go to the Orders section and filter to that order.
  - Phone numbers go to the matching customer profile.
- Order numbers are now generated in the simpler `FY-2345` format.

## Completed UI and UX Work

- Overview KPI cards use white icon tiles.
- Order fulfillment indicators use colored status dots.
- Loading states now use a clean spinner instead of the old GIF background.
- Success and error toasts display in the top-right corner.
- Heavy admin pages were cleaned up to avoid duplicate fetches and reduce navigation lag.
- Wishlist analytics section added for Admin and Employee access.
- Coupon management is available to Admins under Marketing > Coupons. It includes a searchable, filterable paginated list, four-step create/edit wizard, details view, status activation/deactivation, and deletion.

## Completed Modules and Features

- Authentication
- User management
- Employee management
- Product management
- Cart
- Orders
- Wishlist analytics
- Notifications
- Coupons (Admin only)
- Product Discounts (Admin only, variant-based)

## Key Pages

- Overview
- Products
- Orders
- Customers
- Employees
- Notifications
- Wishlists
- Marketing > Coupons
- Profile

## Coupon Frontend

- Routes: `/admin/marketing/coupons`, `/admin/marketing/coupons/new`, `/admin/marketing/coupons/:id`, and `/admin/marketing/coupons/:id/edit`.
- Reusable API service, Zustand store, wizard form, status badge, loading skeleton, responsive table, and details cards were added under `src/services`, `src/store`, `src/hooks`, and `src/pages/marketing/coupon`.
- All create, read, update, status, and delete actions use the existing backend coupon API. Client-side required-field checks, loading states, empty/error handling, and success/error toasts are included.
- Coupon list actions use an eye icon for details navigation, and the details page follows the reference card layout with coupon information, rules, validity, and usage summary.
- Product Discount, checkout, and coupon application logic are intentionally out of scope.

### Add Product Wizard Validation

- The Add Product wizard now blocks progression when required basic information is incomplete.
- Material and at least one colour are required before continuing from the materials step.
- At least one variant is required before continuing to product images.
- At least one image is required before review and before final product creation.
- Validation messages are shown inline in red and are cleared when navigating back or correcting the flow.

## Performance Optimization Checklist

### Completed

- Removed Overview refetch loops caused by array-length dependencies.
- Removed duplicate product fetches on customer Home and Products pages.
- Removed duplicate notification polling on the Notifications page; polling remains centralized in the admin layout.
- Prevented Product Discount product metadata from refetching on every assignment page change.
- Added module-level Product/Coupon reference caching for Product Discount assignment screens.
- Debounced Product search requests by 350ms.
- Debounced Coupon search requests by 350ms.
- Added request sequencing to Product, Customer, and Order stores so stale responses cannot overwrite newer filters.
- Added route-level lazy loading with Suspense fallbacks for admin and customer pages.
- Memoized the shared DataTable and Product Discount row transformation to reduce repeated table work.
- Coalesced session restoration so layouts, protected routes, and customer profile pages share one in-flight authentication request.
- Centralized customer wishlist hydration in `CustomerLayout` and removed duplicate Navbar/profile/drawer/hook fetches.
- Throttled Premium Hero pointer updates to one render per animation frame without changing its loop, wheel, autoplay, or card geometry.
- Limited the hero carousel working set and cache the five Favorites products instead of serializing the complete catalog.
- Mount only the active mobile or desktop Favorites carousel so hidden duplicate cards no longer render.
- Poll notifications every 30 seconds only while the tab is visible; overlapping and unchanged responses no longer rewrite layout state.
- Lazy-loaded Recharts into a separate `RevenueChart` chunk, reducing the Overview page chunk from roughly 338 KB to 18 KB.
- Added stale-response protection to Coupon and Product Discount list/detail stores and granular Zustand selectors.
- Overview now uses server totals/status aggregates rather than partial cached arrays, while retaining its existing UI and report controls.
- Customer list rows receive order summaries with the paginated users response instead of downloading the first 100 global orders separately.

### Pending

- Replace Overview’s compact order history download used for revenue charts with a date-range aggregate endpoint.
- Consolidate customer export order lookups to avoid one request per order.
- Split the large Product editor into memoized sections and memoized table rows.
- Add request cancellation with `AbortController` where supported by the API client.
- Split the remaining large Product/Order table renderers into memoized row components.

### Coupon Type Dynamic Form Behaviour

- Coupon Information and Coupon Rules now respond to the selected coupon type without a page reload.
- Percentage and Flat enable discount fields; Limited Count additionally enables Usage Limit; Order Price Above enables Minimum Order Value.
- Once Per User and New User automatically set Usage Per User to `1`; New User and Festival automatically select their matching flags.
- Buy One Get One and Buy Two Get One set their matching flags and disable discount/minimum-order inputs.
- Switching types clears values that are no longer applicable and disables them with muted styling.
- Validation runs only for enabled fields, with contextual helper text shown below Coupon Type.
- Coupon form validation and backend failures are surfaced inline in the red error panel; success and failure toasts retain the shared dashboard styling.

## Product Discount Frontend

- Added Admin-only Product Discounts under Marketing, directly below Coupons.
- Routes: `/admin/marketing/product-discounts`, `/admin/marketing/product-discounts/new`, `/admin/marketing/product-discounts/:id`, and `/admin/marketing/product-discounts/:id/edit`.
- Added API service, Zustand store, hook, responsive assignment table, loading skeleton, search, pagination, assign wizard, review step, detail view, edit expiry, and assignment deletion.
- Assignments are always made to a Product Variant and use the existing `/product-discounts` backend APIs. Product, Coupon, and Product CRUD remain unchanged.

## Folder Structure

```text
src/
├── assets/
├── components/
├── features/
├── hooks/
├── layouts/
├── pages/
├── routes/
├── services/
├── store/
├── types/
└── utils/
```

## Environment Variables

Create a `.env` file in the frontend root if needed:

```env
VITE_API_URL=http://localhost:5000/api/v1
```

## Installation

```bash
npm install
```

## Run Locally

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Notes

- The dashboard is designed to stay thin and rely on backend APIs for business logic.
- Search and navigation are intentionally role-aware for faster admin workflows.

## Recent Fixes and Completed Work

- Products use backend pagination (10 products per page) with server-side search and Active/Draft filtering.
- Orders use backend pagination (5 orders per page) with responsive status/search/date filtering.
- Customers use backend pagination (8 customers per page).
- Product, order, and customer exports download escaped CSV files with success/error toasts.
- Customer exports fetch full order details so product/order-item fields are included.
- Global search routes `FY-####` order numbers to Orders and phone numbers to the matching customer profile.
- Product add/edit supports multiple variants and image persistence through the existing APIs.
- Removed duplicate fetches and unnecessary render delays from product, order, notification, and employee pages.
- Shared toasts now use green success styling/check icons and red error styling/icons.

## Newsletter Module

### Customer Website

- The existing footer newsletter form now calls `POST /api/v1/newsletter/subscribe` through the shared API client.
- Includes required/format validation, whitespace trimming, lowercase normalization, duplicate-click prevention, and a `Subscribing...` loading state.
- Displays distinct messages for a new subscription, a reactivated subscription, an already-subscribed email, and a safe generic network/server failure.
- The form remains horizontal on wider screens and stacks cleanly on mobile.

### Admin and Employee Dashboard

- Added `Newsletter` to the staff sidebar and `/admin/newsletter` to the protected lazy-loaded routes.
- The responsive page includes API-driven Total, Active, and Unsubscribed summary cards; a 350 ms debounced email search; server-side status filtering; skeleton, empty, error, and retry states; and 20-row server pagination.
- `Export CSV` calls the protected backend export endpoint, downloads `frameyaad-newsletter-subscribers.csv`, and uses the shared success/error toast system.
- Desktop uses the existing black-and-white table treatment; mobile uses subscriber cards.

### Frontend Files

- `src/services/newsletter.service.ts` — typed subscribe, unsubscribe, list, and CSV export integration.
- `src/pages/newsletter/NewsletterSubscribersPage.tsx` — subscriber management screen.
- `src/features/customer/components/Footer.tsx` — public subscription UI and validation states.
- `src/layouts/AdminLayout.tsx` and `src/routes/index.tsx` — staff navigation and protected route registration.

## Appointment Booking Module

### Customer Website

- `/book-appointment` now provides the responsive public booking form for name, email, Indian phone, future booking date/time, Oddanchatram/Coimbatore location, and one or more frame requirements.
- Selecting `Others` reveals a required custom-requirement field.
- Includes inline client validation, disabled `Submitting...` state, duplicate-submit protection, safe API errors, and a booking success summary.

### Admin and Employee Dashboard

- Added `Appointments` to the staff sidebar for both Admin and Employee roles.
- `/admin/appointments` provides server-side pagination, debounced name/email/phone search, status tabs, location and booking-date filters, responsive desktop table/mobile cards, loading skeletons, empty state, and retry handling.
- `/admin/appointments/:id` displays customer details, original/current booking dates, frame requirements, aggregate email delivery status, reasons, and timestamps.
- Status-aware actions enforce the supported UI flow: Confirm, Reschedule, Cancel, and Mark Completed. Reschedule and cancellation use the existing modal component; backend validation remains authoritative.

### Frontend Files

- `src/services/appointment.service.ts` — typed public and staff API integration.
- `src/features/customer/pages/BookAppointmentPage.tsx` — public form and success state.
- `src/pages/appointments/AppointmentsPage.tsx` — staff list and filters.
- `src/pages/appointments/AppointmentDetailsPage.tsx` — details and lifecycle actions.
- `src/layouts/AdminLayout.tsx` and `src/routes/index.tsx` — staff navigation and route registration.
