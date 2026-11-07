# FrameYaad Admin

## Audit Log — 6 November 2026

### Task 1 — Pagination

Checked customer/admin lists and their API integrations. Found a customer catalog cap of 50, an unbounded wishlist and wishlist analytics, notifications restricted to the first 100 in the UI, and customer detail history restricted to the first 100 orders.

Fixed the catalog to use the server's 12-item pages and collection-wide filtering/sorting/facet counts without redesigning cards or filters. Added wishlist Load more (20/page), bounded heart-state lookups, wishlist analytics and notification page controls (20/page), and customer detail order-history pages (10/page). Complete-history KPI cards use backend aggregates rather than counts/sums from one page. Wishlist state clears on account changes; existing guest-cart merging is unchanged.

Results: production builds passed; targeted frontend lint passed; backend pagination/ownership regression suite passed (152 tests overall). Actual database read checks returned two distinct catalog pages at limit=2, total=4; unit fixtures cover a 55-product collection. Browser/mobile interaction and production latency are not claimed from these build/unit checks. No records were deleted.

### Task 2 — Database indexes

Checked backend filter/join/ordering paths against the live database. Missing query indexes and normalized uniqueness were added using additive compatibility SQL, with conflict prechecks. Across Tasks 2 and 9, 25 new indexes were verified valid. No application records were changed or deleted. The authoritative SQL/reasons are in the backend README and `prisma/compatibility` files.

### Task 3 — Query optimization

Checked customer search/detail integrations and list payloads. Replaced the customer-phone search's potential all-page request fan-out with one staff-only, parameterized lookup returning at most one minimal customer match. Independent customer detail reads run concurrently on the backend. Frontend builds and backend regression checks pass. Existing expanded customer order summaries remain compatible and are a documented scalability risk.

### Task 4 — N+1 queries

Found per-order requests in the customer report and per-variant inserts on product creation. Customer reports now read bounded batches of 100 order IDs without changing CSV columns/content; variant inserts are one atomic batch. Structural result: N order requests becomes ceil(N/100); N variant inserts becomes 1. Permissions, batch size and primary variant ordering are regression tested.

### Task 5 — Query timings

Read-only measurements used warm-up plus five samples per path; complete before/after table and methodology are in the backend README. Removing unnecessary read-only transactions reduced employee median 239.67 -> 68.22 ms, coupon 238.90 -> 76.02 ms, notification 239.62 -> 67.52 ms and customer-list 310.22 -> 140.80 ms. Catalog/products/orders still exceed 200 ms over the remote connection; no universal speed claim is made. No permanent per-query logging or private-data logging was added.

### Task 6 — Error handling

Checked shared Axios handling and admin error states. Backend validation details are displayed as safe field messages; network/timeout failures are distinct. Customer-detail and coupon-assignment failures no longer disappear silently. Coupon/discount stores always contain renderable message strings, clear stale details, and show failed detail loads instead of endless loading. Backend stacks are never returned; malformed JSON/upload/database failures use accurate statuses. Existing toasts/layouts/routes are retained.

### Task 7 — Invalid inputs

Baseline backend probes found alphabetic phones, zero prices, missing default images, null/numeric coupon dates and empty coupon updates accepted. These now reject invalid values; negative stock and >100% discounts were already rejected and remain tested. Backend README contains the full before/after input matrix. New frontend `tests/form-validation.test.mjs` covers basic names/email/phone, prices/stock/enums, colors, coupon formats/ranges/dates, and upload types/sizes. Five test suites pass without real account creation or emails.

### Task 8 — Empty fields

Product/variant forms now report missing/whitespace-only fields and required images before saving; coupons recheck validity fields at final submission; employee/profile fields use trimmed required-name/format checks. Backend tests reject missing/null/blank required fields and empty updates. A significant fix removes create-time defaults from coupon PATCH: omitted flags/status/minimum are no longer reset. Optional null clears and zero stock are retained.

### Task 9 — Duplicates

Live read-only scans found zero conflicting groups for normalized emails/coupon codes/SKUs, employee identifiers/names, product names, phones, material brand/name, color images, variants and repeated color labels. Zero rows were removed/merged, so no destructive-cleanup backup was needed. Normalized database uniqueness and duplicate color validation prevent future conflicts. Display names intentionally remain non-unique.

### Task 10 — Admin field validation

Added reusable basic validation in `src/utils/form-validation.ts` and integrated it into existing product/variant/upload, employee, profile and coupon forms. Field lengths, types, format, allowed enums and numeric bounds are checked; fractional stock is rejected rather than truncated. Backend remains authoritative for price/discount calculations, usage/eligibility, references, order transitions and permissions. No new business logic, payment workflow or UI redesign was added. The user explicitly approved requiring default images on the legacy backend POST /products API as well; its Postman example is updated. Existing callers must now send that images array.

### Final validation and remaining risks

- Backend `npm run verify` passes: Prisma schema, TypeScript, ESLint, 244 tests and production build.
- Frontend production build, targeted shared-code lint and five validation suites pass. Run the latter with Node 24: `node --experimental-strip-types --test tests/form-validation.test.mjs`.
- Full frontend lint is not clean: 38 errors and 6 warnings remain in legacy code. This is not presented as a passing full lint run.
- Local backend/frontend return HTTP 200; catalog pages report correct totals and invalid limit/extreme pages return 400.
- No browser/mobile visual or production-volume/concurrency verification is claimed. Product/order remote latency, customer nested order payloads and first-100 reference dropdowns remain documented scalability limitations.
- No customer/account/order records were changed/deleted, no emails were sent, and no credentials were added. Only additive database indexes were applied; no Prisma migration was generated/run.

Changed-file inventory: [audit file inventory](docs/audit-file-inventory.md). Detailed query timing and invalid-input tables are in the backend project's README Audit Log.

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
