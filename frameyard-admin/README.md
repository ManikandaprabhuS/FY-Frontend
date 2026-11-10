# FrameYaad Admin

## Shared toast notifications

Customer and admin notifications use `src/utils/toast.ts`: `showSuccess` (green/check), `showError` (red/cross), and `showWarning` (amber/triangle). All use 700-weight text, dark readable text on explicit light tinted backgrounds, and matching colored icons. Existing top-right position, gutter, toast entrance/exit animations, radius and shadow are retained; success stays 3.5 seconds and errors/warnings use 4.5 seconds. Repeated type/message pairs reuse one ID; callers can pass an existing ID to replace an optimistic toast with its failure instead of stacking it.

Missing fields/selections, login requirements, invalid OTP/coupon and upload validation use warnings. Success events stay green; server/network failures, wrong credentials and authorization failures stay red. `showApiError` uses HTTP status/error codes rather than message-text guesses; inline form errors and all auth/cart/save behavior remain unchanged. Direct library calls outside the helper were removed (the shared Toaster remains in App). Tests exercise the shared store/render configuration, deduplication, original text, status mapping and AA text/background contrast without creating real accounts, sending OTPs or changing records. Live browser/mobile visual verification is not claimed by these unit tests.

## Product-card discount and action-icon fix

Verified the Shop All examples: 500→449=10%, 550→450=18%, 790→690=13%, 1149→999=13%, 1400→1200=14%, rounded to the nearest integer. The Shop All formula was correct; two older carousel paths instead manufactured an original price as selling price ×1.35. All existing customer discount badges now use `discountPercent` in `product-pricing.ts`, with shared variant-price resolution for catalog/cards, details, hero, wishlist and local-cart additions. Raw backend `mrp/price` and normalized frontend `price/offerPrice` resolve consistently. No original price is invented. Missing/zero/non-finite/non-discounted originals and rounded 100% discounts hide badges/strikethroughs.

Color changes now select a matching actual variant when available, so badge/current/original prices update together; color images with no separate variant retain the selected variant's price. Featured Add to Bag uses the same variant as its displayed price. Removed only the small decorative bag icon underneath the heart in the shared Shop All card (desktop/mobile/reused cards); heart and main Add to Bag controls are unchanged. No stored prices/offers, backend/API/schema, or checkout business logic was changed. Nine pricing tests, including all five requested examples and edge/color cases, pass; frontend build and targeted lint pass.

Checkout limitation found during verification: the customer Checkout page is a placeholder and does not submit these local variant cart lines to the backend order endpoint. The backend cart/order flow prices the product's primary variant and stores no selected variant ID. It does not compute product-card discount percentages. Therefore selected-variant charging parity cannot be certified by a display-only patch. Fixing that requires a separately scoped cart/order API/data-contract change, which was deliberately not made under the request's no-unrelated-API/schema-change constraint. Existing cart/checkout screens that have no product discount badge were not redesigned or given new badges.

## Customer preview crop-switching fix

Follow-up: visually inspected the 1343×1500 main image for “Modern Family Frame - Test” and added its measured angled photo-opening polygon to the existing asset calibration map. This fixes that product's missing-opening warning and enables its uploaded-photo layer; unknown color/variant previews fall back to this calibrated default. Crop ratios still come from the shared variant-size helper, not this image calibration. Admin forms/backend/database are unchanged. Future unrelated image assets still need their own opening metadata/calibration; this is a targeted fix for the supplied product, not automatic frame detection.

Compared an older catalog product with the new “Modern Family Frame - Test”: both API records have images/variants but no saved frame-opening metadata. The old preview works because `framePreviewConfig.ts` contains filename-specific calibrated openings; new upload/color/variant filenames are absent. Separately, selecting another size previously looked up only that size's saved crop, hiding an already uploaded photo.

Per the requested follow-up scope, admin forms, backend, schema and stored product records are unchanged. A shared size/geometry helper now keeps the uploaded source (or an existing saved crop) available across variant switches, applies the selected fixed ratio immediately, preserves explicit per-size clears, and remounts the crop editor when the size changes. Known frame openings use a masked frame-over-photo composition with no photo spill; unknown optional color/variant images fall back to a calibrated default when one exists. Without an upload, normal product/color/variant gallery behavior is retained. Existing crop storage stays compatible; large original uploads are kept in-session rather than filling localStorage.

Validation: production build and targeted preview ESLint pass; 12 focused tests cover 5x5, both catalog 8x10/12x10 spellings, landscape/portrait sizes, safe defaults, saved crops, clear behavior and optional image selection. These are geometry/data-selection tests, not a claim of full browser visual coverage. Exact in-frame placement for entirely new, uncalibrated images remains unresolved: the user chose to keep admin unchanged and fix crop switching first, so no guessed frame openings or extra per-product hardcoding were added.

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

## Admin global search and header cleanup

GlobalAdminSearch is shared by desktop/mobile headers. It debounces one staff-search endpoint by 300ms, cancels stale suggestions, and renders keyboard-accessible Orders/Customers groups with icons and detail lines. Order IDs (including long FY- IDs and numeric matches) route to Orders; normalized 7–15-digit phones route to Customers; names/emails search both groups. Enter uses the highlighted result or the matching section, with the top order chosen when both groups match; clicking chooses a specific result. Empty results show one deduplicated warning and never navigate.

Search values are encoded into URLs. A single order opens its details popup through openOrder, including on refresh; a single customer opens the existing detail route with the search retained in the query string. Multiple matches go to the filtered section. Orders reset stale date/status filters for incoming search links. The Customers field remains usable after arrival by debouncing the same backend search rather than locally filtering an already-filtered page.

Removed the Help icon and both desktop/mobile sidebar avatars. The bell and sidebar logout controls remain. The top-right avatar now has staff name/role, Profile and Log Out, with Escape/outside-close behavior. No order/customer data, statuses or database schema changed. Live checks verified FY-99053085, partial/numeric IDs, 8910943111 with/without +91, and grouped Mahesh/email matches. No-result and five-per-group cases were also checked.

## Shared colours and immutable order-item details

Add/Edit Product use ProductColorPicker and the backend /colors catalogue. Only Black (#000000) and White (#FFFFFF) are seeded defaults, with no preselected colours on a fresh product. Existing saved colours remain selected and retain their image associations. Named, accessible swatches wrap on mobile. Admins and employees can create validated custom colours; duplicate names/hexes and invalid input show one warning. Creation shows loading/success/error feedback and auto-selects the saved colour. Customer selectors use the same catalogue to resolve custom names and hexes.

Local cart lines now distinguish colour as well as product/variant and preserve name/hex metadata. Backend POST /cart/items accepts optional variantId and color, validates them against the product, and keeps distinct selection keys. Existing backend checkout saves immutable product ID/name, variant ID/size, colour name/hex and material. Order normalization, admin item popup, customer account history, /orders view, and PDF item tables display those snapshots. Old orders fall back to current catalogue details read-only; missing values show '-'. Price formulas, saved prices, order totals and statuses are unchanged.

As explicitly requested, CheckoutPage remains unchanged: it is still a placeholder with no place-order submission or payment UI. The API snapshot path is tested, but a customer cannot submit a new order from that placeholder page. No order-confirmation page, itemized order email, or invoice workflow exists to update; none was added. Apply prisma/compatibility/color-order-snapshots.sql and regenerate Prisma on other deployments before running the updated backend. It has already been applied to the configured database without rewriting old order items.

## Orders Management date/search/export alignment

Summary-card dots are replaced with neutral clock, package, check-circle, and x-circle icons. The existing 350ms search debounce and page-one resets are retained. Today/7/30/90/all-time ranges now reach backend validation and filtering on the same createdAt field displayed in the table. Status, range, and search combine server-side; empty results retain Clear filters and accurate pagination.

The Orders Export button now calls the staff-only GET /orders/export endpoint with the applied range/status/search, then builds a paginated PDF from its complete matching result and backend totals. It no longer exports only the visible page. Range metadata includes active filters; zero matches produces the shared empty table. Loading/success/error notifications and double-click protection are included. The independent Overview revenue report remains unchanged.

Live read-only checks on 8 November 2026: All Time table/export = 4/4; Today and 7/30/90 days = 0/0 (existing orders are older). FY-99053085, FY-9905, 99053085, 8910943111, +91 89109-43111, and 89109 each match one order. The combined 90-day/Processing/search case returns 0 in both table and export. No test orders were created or changed.

## Revenue Report PDF table export

The revenue export uses lazy-loaded jsPDF + jspdf-autotable instead of a hand-written, single-page text stream. It includes the existing logo, range/generated timestamp, a three-column summary, fixed-width order columns, wrapped customer names, DD/MM/YYYY dates, right-aligned INR amounts, shared status colors, repeated table headers, a final total, and Page X of Y footers. Rows stay together across automatic page breaks. Empty ranges show a clear no-orders row.

The existing report filters and revenue/order-count/average calculations are unchanged. Export includes every order already in the displayed report rather than truncating at 28 rows; it does not fetch extra data or change the existing dashboard loading limit. Customer CSV export remains unchanged; Orders Management now uses the filtered PDF export described above. No other hand-written PDF export was found. The export button prevents duplicate clicks and replaces a bold loading toast with success/error feedback.

Tests generate 0-, 4-, and 65-order PDFs for month/year/custom range labels, including long customer names. Rendered samples and extracted text verify wrapping, repeated headers, all 65 rows, totals, and four-page pagination. Build and focused regression tests pass. The dependency audit reports existing repository advisories; no advisory was reported for jsPDF/AutoTable or their PDF-rendering dependencies in this check. No unrelated dependency upgrades were applied.

## Shared order status styling

Order table/mobile controls, the details popup, dashboard recent orders, and customer account order history now use StatusBadge and one shared order-status style map. Case, spaces, underscores, and hyphens normalize for display only; stored/API values are unchanged. Placed is black/white, Processing blue/white with blue border, Ready to Ship dark/white with gray border, Shipped green/light-green, Delivered white/green, and Cancelled red/light-red. Unknown statuses (including Confirmed) use neutral gray. Native status/filter options explicitly use white backgrounds, dark text, and a light color scheme; gray hover/selection applies where the platform supports native option styling.

Summary caveats (logic unchanged): Pending counts PLACED; Processing aggregates CONFIRMED, PROCESSING, and READY_TO_SHIP, so it is not an exact PROCESSING-only count. The existing status-update store refreshes summary counts after the API refresh; the row badge updates when the status update returns. The standalone /orders customer page is currently a placeholder with no status rows; actual customer order cards in the account dashboard use the shared badge.

## Admin form validation and operation feedback

- Product creation steps validate live: trimmed basic information, material/colors, valid variants, and completed default-image uploads. Review and product edit validate the complete form. Coupon, employee, and product-discount actions use the same guarded-button behavior; color/variant uploads share the existing optional upload control.
- Incomplete actions look disabled and expose `aria-disabled`, but remain focusable so pressing them shows one deduplicated amber warning and focuses an incomplete field. During actual work they are natively disabled. Existing field-level messages are preserved; duplicate form-summary error bars are removed.
- Upload/save operations show bold, polite spinner status text. Each uploading product image has a spinner. Success shows the existing success toast; failed uploads/saves offer a user-initiated Retry action. Upload Retry reopens the picker. Request timeouts and finally cleanup release busy states; no automatic retry creates duplicate records.
- Affected admin mutation requests have a 60-second timeout. Backend validation remains authoritative; no database schema/data or page layout changed. Focused tests cover guarded actions plus upload success, failure/timeout, invalid files, and concurrent uploads.

## Auth session restoration and route guards

Auth now starts in a separate checking state, reads the stored token synchronously, and verifies the session before rendering protected content or login forms. Admin/employee role checks wait for the verified user. Customer profile, orders, checkout, and wishlist actions also wait for restoration; public pages remain available. A shared neutral screen reserves space immediately and delays its visible spinner by 150ms, including lazy-route loading.

Logged-out redirects use replace navigation and retain safe same-portal return URLs, including query strings and hashes. Only a verification HTTP 401 clears the session and shows one session-expired warning. Network errors, timeouts, and server errors retain the session and offer Retry; verification requests time out after 15 seconds. Concurrent checks are deduplicated, and stale responses cannot restore a logged-out session or overwrite a newer login. Login/logout token storage, backend APIs, database behavior, and guest cart handling are unchanged.

Validation: 18 focused tests cover delayed restoration, both portal guards, staff roles, expired tokens, transient failures/retry, stale-response races, return URLs, and the delayed loader. Browser reload, Slow 3G, and Back-button checks remain manual; these are not claimed as automated browser coverage.

## 404 handling

Negative top margins caused the heading to overlap the artwork. Normal flow, positive spacing, natural-height responsive artwork, and viewport centering fix this without changing the existing copy/design.

Customer/admin catch-all routes and detail-resource guards show 404 for unknown, malformed, or missing resources. Logged-out admin visitors still go to login. Router/application boundaries handle crashes safely without displaying URLs or stacks. Network/server failures remain distinct from missing resources.

The existing Netlify fallback supports deep-link refresh. Static hosting serves the HTML shell with HTTP 200 while React displays 404; APIs return actual HTTP 404. Build and 59 focused regression tests pass. Responsive source assertions pass; interactive desktop/tablet/mobile visual checks remain manual.

## Notifications and complete exports - 9 November 2026

The notification page previously waited for the write, then refetched both its list and the bell list. Mark-all also refetched its list. Read actions now update the shared page/bell/popup state immediately, decrement the server-backed unread count, and show one deduplicated "Marked as read" toast. Failures roll back affected records/counts and offer Retry. Polling/out-of-order responses cannot undo newer reads. Reader names appear optimistically and reconcile with the backend first-reader identity.

Single read and mark-all each use one conditional updateMany, not a per-item loop, and return unreadCount (plus notification or updatedCount). The post-write lookup/count run independently. Customer writes use authenticated userId. As clarified, staff retain the shared userId=null inbox, showing the first ADMIN/EMPLOYEE reader's name. No per-user receipt schema was added. The live database already has notifications_userId_date_idx and notifications_userId_read_date_idx; no duplicate indexes or schema changes were needed.

Exports retain existing formats/buttons: product/customer CSV and orders table PDF. Staff-only GET /products/export and /users/export reuse the list filter builders, stream all matches in 250-record batches, and handle backpressure/disconnects. Customer order totals use one aggregate per batch. Orders reuse buildOrderWhere with 500-record batches and batched coupon-code lookup. Loading/success/error toasts are deduplicated; no matches produces an amber warning and no download.

- Product CSV: one row per variant (one blank-variant row if none), with product ID/name/brand/description/status/material/category/created date/base price/active price discount/stock total; variant ID/size/color name/hex/original price/selling price/stock/status. Missing category is "-"; variant ID is used where no separate SKU exists.
- Customer CSV: ID/name/email/phone/default and all saved addresses/registered date/status/order count/amount spent/last order date/wishlist count. Explicit selects exclude passwords/tokens/OTPs/authentication internals.
- Order PDF: all matching orders, contact/address/payment/coupon/subtotal/discount/total and snapshot item product ID/name/size/color/material/quantity/unit price/line total. Missing payment fields are "-" because this schema has no payment data. Stored prices/totals/statuses are unchanged.
- CSV formula prefixes (=,+,-,@), including leading whitespace/control characters, are neutralized. Exports require ADMIN or EMPLOYEE server-side.
- jsPDF + jspdf-autotable retain repeated headers, row-safe page breaks, wrapped cells, INR amounts, DD/MM/YYYY dates, totals and page numbers. A 501-order sample produced 75 pages; first/final pages were visually checked.

### Notification timing measurements

Three rollback-only database-operation samples, milliseconds; no existing notifications changed. These exclude HTTP/authentication. Interactive transactions serialize parallel queries.

| Operation | Before (ms) | After (ms) |
| --- | --- | --- |
| Single-read DB work | 1328.39 / 264.66 / 269.91 | 534.55 / 265.40 / 233.86 (includes unread count) |
| Click completion including both refetches | 2326.26 / 582.48 / 591.34 | Synchronous optimistic UI; no refetch |
| Batched mark-all plus count, fixture-only predicate | Not measured | 137.35 / 158.56 / 162.37 |

Reproduce in backend: npx tsx scripts/benchmark-notification-reads.ts. Its fixture always rolls back. Warm single-read DB timings remain above the ~200ms target; authenticated production endpoint timing is still needed. The original multi-minute server delay was not reproduced, so no infrastructure/root-cause claim is made. Connection/retry settings were not changed.

Tests cover rollback/retry, duplicates, polling races, reader names, concurrent counts, export authorization, variant/no-variant products, safe fields, CSV injection, 0/501 records and PDF pagination. Browser interaction checks against the running application remain manual.

## Stock and instant wishlist audit - 9 November 2026

### Previous stock behavior audited
| Surface | Previous field/granularity and rule |
| --- | --- |
| Customer catalog cards | Sum of returned variants' stockQuantity; zero disabled Add to bag. A card-local threshold of 3 displayed "Only N left"; no shared stock label policy. |
| Customer product details | Selected variant stockQuantity controlled Add to Bag/quantity limits, but the visible green "In stock" text was hardcoded. |
| Admin product list | Summed stock only to detect zero; any individual variant at or below 15 made the whole product "Low Stock", even if other variants had ample stock. The summary counted non-in-stock products on the loaded page. |
| Overview low stock table | Per-variant stockQuantity at or below 15; zero was Out of Stock, 1-5 Critical, and 6-15 Low. |
| Admin variant details | Numeric quantities; one view colored values at or below 5 red. |
| Customer cart/checkout | Cart quantities silently clamped to each stored stock snapshot; no stock status label. Backend cart/checkout did not validate available variant stock. Checkout remains its existing signed-in placeholder, not a new order form. |

### Shared stock policy and enforcement
src/utils/stock.ts is the single frontend status source and defines LOW_STOCK_THRESHOLD=5 once: <=0 Out of stock; 1-5 Low stock (N), amber and bold; >=6 In stock, green without a number. Null/undefined/non-numeric/negative/non-finite/unsafe values normalize safely to zero. Listing/admin product rows use summed variant stock; product details use the selected active variant and update with size/color. Overview remains variant-grained, now using the same threshold/labels (including out-of-stock alerts). Existing loaded-page summary scope is unchanged.

Cart additions and quantity increases are rejected with an amber warning instead of silently increasing beyond stock. Combined quantities sharing a variant are checked across color lines. Checkout entry checks the known cart snapshot; backend cart add/update and checkout enforce current database stock and reject excess with HTTP 409 INSUFFICIENT_STOCK. Checkout rejects before order creation/cart clearing. No existing stock, order, price or saved cart data was rewritten, and inventory reservation/decrement behavior is unchanged.

### Wishlist causes and fix
The click path previously waited behind a shared read/mutation queue, performed a separate lookup request (including authentication), then updated the UI only after the backend write. The backend also performed a duplicate lookup and nested product reads around creation. No email/notification side effect was found on wishlist add. Authentication remains enforced on every API request; it was not bypassed or cached.

Hearts, total badge and drawer now update optimistically together. Pending clicks for the same product/customer are ignored; failed requests restore affected state and show one red error. Late page/lookup responses cannot undo a click. Only network writes are ordered per customer, separately from background reads; queued writes cannot run under a different customer's session after logout.

Add uses one parameterized PostgreSQL statement: active-product validation, INSERT ... ON CONFLICT DO NOTHING, one product payload and wishlistCount. Duplicate adds return alreadySaved=true and show only "Already in your wishlist" in amber. The existing filled-heart behavior still removes the product. A bounded fresh-snapshot retry handles a concurrent-insert visibility race. Response-field parity was checked against the previous Prisma-selected product payload, including prices.

Wishlist is product-level, keyed by canonical productIdentifier (not by variant). Live indexes already include wishlist_userId_identifier_key, wishlist_userId_createdAt_idx and wishlist_productIdentifier_idx. The unique userId/productIdentifier key prevents duplicates; no redundant indexes or schema changes were applied.

### Cart move to wishlist
The previous frontend waited for a lookup plus a queued request and only then removed the local cart item. The endpoint used the primary variant rather than the selected one and deleted every server-cart selection for that product. It could therefore reject a valid selected variant when the primary was inactive.

The existing move endpoint now accepts the selected variant/color and atomically inserts/gets the wishlist item, removes matching owned server-cart selections, refreshes affected totals and returns duplicate status/count. User identity comes exclusively from authentication; customers cannot select another user in the body. The local cart remains customer-scoped as before.

The cart, totals, count, heart and drawer update immediately. Success shows "Moved to wishlist". An existing entry shows "Already in your wishlist. Removed from cart." without a duplicate row. Failure restores the cart selection/quantity, including when the same item was re-added or the customer logged out while waiting. Guests receive "Please login / create an account to add products to wishlist" and retain the cart item.

### Wishlist timing results
Rollback-only integration benchmark using a temporary fixture customer; no existing customer's wishlist/cart was changed. Values below are database service work in milliseconds, excluding HTTP/authentication and client queue time, NOT a production endpoint latency guarantee.

| Operation | Before samples (ms) | Optimized samples (ms) |
| --- | --- | --- |
| Add service database work | 6134.74 / 581.52 / 600.95 | 141.87 / 76.56 / 65.98, including returned count |
| Click path including its extra lookup | 6966.90 / 643.62 / 661.31 | Optimistic UI is synchronous; no click-time lookup/refetch |
| Duplicate-safe add with count | Not measured | 74.38 / 61.56 / 127.03 |

The initial multi-query implementation was discarded after measurement showed extra nested reads/count queries were still slow. The final single-statement path was below 200ms for these three DB samples. Full authenticated end-to-end latency still needs verification on the deployed service. Reproduce in the backend with npx tsx scripts/benchmark-wishlist.ts; fixture writes always roll back, and no secrets/customer data are printed.

Tests cover 0/1/3/5/6/50, invalid stock, cart capacity, checkout rejection, selected variants, optimistic add/removal, duplicates, atomic move failure, same-item quantity restoration, guest protection, logout isolation, ordered writes and late-read races. Manual browser/customer testing remains the final interaction check.


## Reviews and ratings — approval workflow

Anyone, including guests and non-buyers, can submit a review. Purchase history only supplies an informational verified-purchase badge; it never gates submission. The contradictory non-buyer rejection test in the request is intentionally not implemented.

Reviews start PENDING. Only APPROVED reviews and approved-only averages/counts/breakdowns appear publicly. ADMIN and EMPLOYEE users manage reviews at /admin/reviews, including filtered pagination, approval/rejection, moderator/time audit, deletion and filtered PDF export. Product details and customer order history provide review entry points. Product cards, wishlist and the featured tile use real ratings, not placeholder stars.

The Review model has a unique (productId, email) constraint, normalized email, rating/status checks, optional author/moderator relations, and lookup/rate-limit indexes. Review-only internal hash/outbox fields support abuse protection and retryable asynchronous notifications. Existing product/order/customer columns and data are unchanged. RLS and revoked anon/authenticated table access protect private email/hash fields from direct public access.

Public API: GET /api/v1/reviews/summary?ids=..., GET/POST /api/v1/reviews/product/:id. Public reads explicitly select approved review display fields only; emails and internal fields are omitted. Staff API: GET /api/v1/reviews/admin, GET /admin/products, GET /admin/export, PATCH/DELETE /admin/:id (under the reviews prefix). These require verified ADMIN/EMPLOYEE authorization; submitted user IDs are rejected.

Submission validates trimmed plain text, limits lengths, rejects HTML/script tags, includes a honeypot, IP/email request limits, persisted submission limits and repeated-comment checks. No OTP/password/token is involved or logged. IP limits use req.ip; production must configure trusted proxy handling for the actual deployment topology rather than trusting arbitrary forwarded headers. Aggregate cache TTL is five seconds, with local invalidation on moderation/deletion (other server instances may lag up to five seconds). Notifications use the existing shared staff inbox, with a durable review-row outbox, bounded worker concurrency and links to the selected review.

Database setup: prisma/compatibility/reviews.sql contains only the new Review table, constraints, indexes and access policy. The non-production helper npx tsx prisma/apply-reviews.ts --apply applies it; no Prisma migration was generated/run. It has already been applied to the configured test database, and Prisma client regenerated. Deploy the equivalent reviewed SQL before running the updated backend.

Demo data: npx tsx prisma/seed-reviews.ts --confirm-demo added ten labelled APPROVED demo reviews across five active products and exactly two PENDING demo reviews, with two staff notifications. Reserved example.invalid emails and [DEMO] markers identify disposable fixtures. The pending titles are "[DEMO] Please approve or delete". No existing products, orders or customers were changed.

Validation: backend full verify passed (385 tests, schema validation, TypeScript, ESLint and build); frontend 169 tests and production build passed. A rollback-only real-database lifecycle check covered guest/non-buyer submission, duplicates, public privacy, approval/rejection, moderator audit, notifications and real buyer verification. PDF samples with 0, 3 and 501 rows were generated; the 63-page large sample and sample-page layout were inspected. The guest form was checked in-browser at 360px, including valid/invalid disabled-submit states, without submitting extra demo records. A stale Vite dependency render during initial navigation cleared on full reload; fresh product loading worked. Interactive authenticated staff moderation remains a final manual acceptance check.
## Cart move-to-wishlist toast timing

Cause: the store already updated cart totals/counts and wishlist state optimistically, but CartPage waited for the atomic POST /api/v1/cart/move-to-wishlist response before closing the prompt and displaying its toast. The handler now closes the prompt and emits the success/duplicate toast immediately after the synchronous store update, before awaiting the request. Failure uses the same toast ID to replace it with an error after the existing rollback. In-flight guards suppress repeated clicks. No full refetch, schema, prices, existing data or backend behavior changed.

Timing: before, toast latency equalled network/transaction latency; after, it is issued synchronously before network completion. Endpoint before/after timing is unchanged (no backend changes); no fresh authenticated endpoint benchmark was performed for this UI-only fix, so the 200ms endpoint target is not claimed. Regression tests cover deferred requests, duplicates, rollback, counts, guest protection and toast ordering; frontend production build passes. Manual Slow 3G browser acceptance remains to be checked.
## Two-offer coupon replacement — pre-change audit (10 November 2026)

Status: audit only; no coupon functionality, schema or database data removed yet. Backup location: not created yet, because no removal has begun. A source/config archive and legacy coupon export must precede removal; do not include secrets in a source archive.

Existing frontend: src/pages/marketing/coupon/{CouponReferencePages,CouponDynamicWizard,CouponPages}.tsx; src/hooks/useCoupons.ts; src/store/couponStore.ts; src/services/coupon.service.ts; coupon types and validateCouponFields in src/types/index.ts and src/utils/form-validation.ts. AdminLayout has Coupons and Product Discounts sidebar entries. Routes include marketing/coupons and marketing/product-discounts list/new/details/edit. ProductDiscountPages, its hook/store/service and coupon assignment controls depend on coupon CRUD. CartPage has the free-text promo input, validation call and temporary discount summary.

CheckoutPage currently enforces customer login and renders only a signed-in placeholder, not contact/address inputs, an order summary or a place-order form. Guest checkout is not supported. The order checkout API is authenticated and requires an owned userAddressId. Implementing the requested guest contact eligibility checks therefore needs an explicit choice on whether to retain existing login requirements or expand checkout.

Existing backend: src/modules/coupon contains routes/controller/service/schemas/select; /api/v1/coupons provides validation and admin CRUD/status. src/modules/product-discount and /api/v1/product-discounts depend on the legacy Coupon model. Prisma includes Coupon, CouponType, CouponDiscountType and ProductDiscount relations. Orders retain couponId; current checkout does not apply/persist a coupon discount. Order exports resolve couponId through prisma.coupon and revenue-report-pdf displays historical coupon/discount columns. These historical reads must be preserved or archived before removing the model/table. No coupon-specific event producer was found in the notification module during this audit.

Related tests: backend coupon-update-validation.test.ts plus coupon/product-discount cases in empty-input-audit.test.ts and input-validation-audit.test.ts; checkout/order RBAC, snapshots, summaries and filtered exports must remain passing. Frontend form validation and PDF/export coverage also reference coupon behavior and require review during replacement.

Replacement design constraints: exactly FIRST_ORDER (5 percent) and BIG_ORDER (10 percent strictly above INR 5000) in one backend config; backend-owned money calculations and snapshots; cancelled real orders count as history; failed/abandoned payments must not count. The current Order model has no payment status/method, normalized identity snapshot or discount snapshot fields, so the implementation must document the real-order definition and add only the necessary checkout snapshot/index storage. Old order rows and totals must not be rewritten. Race-safe first-order claiming must serialize normalized email and phone, not merely user ID.

Pending decisions before deletion: (1) preserve login-only checkout or authorize guest checkout expansion; (2) retire the old Product Discounts module too, or preserve it through a separately approved redesign; (3) keep a read-only legacy coupon archive for historical order resolution rather than destroying that data.

## Two fixed checkout offers — implementation (10 November 2026)

The earlier audit decisions are resolved: checkout remains CUSTOMER-login-only. Coupons and Product Discounts admin pages, sidebar items, list/new/edit/details routes, CRUD/status/validation APIs, forms, stores, hooks, services, validators and CRUD-only tests were retired. Old URLs now fall through to the existing 404 handling. The Cart free-text promo field and its client discount logic were removed. Guests see a login invitation, not claimable offers. Product prices, product sale prices/MRPs and existing order rows were not changed.

Backups are outside the application repositories at D:/FrameYaad/backups/coupons-2026-11-10/: legacy-coupon-source.zip, retired-files.zip and legacy-coupon-data-1794294280169.json. The database export contained zero legacy coupons and zero product assignments in this test database. The update script backs up first, clears only product_discount assignments and deactivates legacy coupons. It does not update/delete historical orders. The old coupon table is retained as a read-only application archive via Prisma LegacyCoupon for historical code resolution. Do not drop that table, and do not use destructive prisma db push/schema-sync to remove its remaining columns.

Settings source is now the offers database table, managed through /admin/offers. The config file supplies non-overwriting seed defaults only. See the Admin Offers section below for runtime settings, versions, disabling, audit and deployment.

History policy: CANCELLED orders count to prevent repeated first-order use. The current application has no payment status/model or failed/abandoned payment order path, so all persisted Order rows are real order history. No payment behavior was added or changed. When a payment workflow is introduced, explicitly exclude its failed/abandoned records before using that new data for eligibility; do not assume a status not present in this schema.

Backend APIs: authenticated CUSTOMER GET /api/v1/checkout/offers quotes the stored server cart; POST to the same path accepts only bounded item selections for the existing local-cart storefront and reprices variants from the database. Both are rate-limited. /api/v1/orders/checkout accepts couponCode FIRST_ORDER or BIG_ORDER (or no code), an owned userAddressId, and optionally bounded cart selections; price, subtotal, discount and total are never accepted from the browser. Both stored-cart and local-selection paths use server catalog prices and stock validation. Invalidated offers return 409 OFFER_UNAVAILABLE with refreshed offer/totals information. Only one selected code can apply.

Money is calculated with Prisma Decimal in src/modules/checkout/offer-pricing.ts, rounded half-up to two decimals and clamped to the subtotal. New orders save couponCode, couponTitle, discountPercent, discountAmount, subtotal and final total, plus normalized identity snapshots for lookup. Existing couponId is retained for old rows but never written by new checkout. Order views, confirmation and exports use snapshots, not a newly recalculated historic discount. Legacy code lookup is batched. Existing PDF tables and revenue calculations are preserved.

Race protection: every checkout acquires sorted transaction-scoped PostgreSQL advisory locks for normalized email/phone, checks history and creates the order in one SERIALIZABLE transaction, with bounded serialization retries. Order-number lookup now uses the same transaction connection rather than opening a second pool connection during checkout. The transaction has a bounded 20-second budget for remote DB latency/lock wait. Snapshot identity indexes and normalized legacy email/phone expression indexes support history lookup.

Checkout UI: backend-owned offer cards, best-offer tag, immediate selection/replacement/removal, saved-address selection, order summary and confirmation. Cart changes trigger a debounced new quote; BIG_ORDER is removed with the requested amber warning if it becomes ineligible. No guest offer claim, arbitrary promo entry or payment flow was added. Existing owned delivery addresses are required for order creation. The existing address table has a required updatedAt column absent from its Prisma model; this pre-existing address-creation discrepancy was not changed as part of the coupon work. The integration harness supplies that timestamp only for its disposable fixtures. New address creation remains a separate follow-up if needed.

Database deployment: prisma/compatibility/two-offers.sql adds only nullable Order snapshot columns and indexes; no historical row backfill. The guarded non-production npx tsx prisma/apply-offers.ts --apply has already been run on the configured test DB, and Prisma client regenerated. For another environment, review/apply equivalent SQL and take a fresh coupon export before clearing assignments/deactivating old coupons. No migration was generated/run.

Validation: backend typecheck, ESLint, build and 380 tests passed. Frontend build and regression suite passed; dedicated offer rendering checks cover backend-owned totals and old order fallback. Real database checks passed for first-order history by email only and phone only, cancelled history, server price/snapshot, simultaneous requests sharing a phone and simultaneous requests from the same account: exactly one succeeded and one received OFFER_UNAVAILABLE. Temporary fixture users/orders/items/notifications were removed, and existing order count/sum remained unchanged. History samples were 61-107ms (most 61-68ms), not a guarantee of deployed end-to-end latency. Reproduce using npx tsx prisma/check-offers.ts --run and --run --same-user on test only.

The actual CheckoutOffers component was rendered with a deterministic backend-quote fixture and inspected at 360px and 1280px. Cards/summary remained readable with no horizontal overflow at mobile width. Full authenticated interactive checkout and deployed PDF acceptance remain manual checks; no real customer order was placed during verification.

## Admin Offers — database settings and audit (10 November 2026)

Staff can manage FIRST_ORDER and BIG_ORDER at /admin/offers. ADMIN and EMPLOYEE are permitted by the existing protected route and verified server-side authorization. There are no create/delete endpoints or controls, and offer codes/titles cannot be edited. Percentage, BIG_ORDER minimum and enabled are the only updatable business fields; requests also require the current version. Percentages must be greater than 0, at most 100, with at most two decimals; the Big Order minimum must be a positive whole INR amount. The UI confirms discounts above 50 percent and disabling an offer, shows live rule previews, optimistic switches with rollback, version-conflict reloads, update actor/time and all-time usage from saved order snapshots.

New schema is limited to public.offers and public.offer_audit. Code is the offers primary key, constrained to the two fixed codes; percentage/minimum/version constraints are enforced in SQL. Both tables have RLS enabled and direct anon/authenticated table access revoked. The application reads/writes through the authenticated backend. The seed in src/modules/offers/offers.seed.ts runs before backend startup and uses createMany(skipDuplicates: true): repeated runs insert only missing defaults and never overwrite edited percentages, enabled flags, versions, titles or timestamps. src/modules/checkout/coupons.config.ts now contains seed defaults only, not runtime settings. Change operational values through the Offers page.

Staff endpoints under the existing API prefix: GET /api/v1/offers, PATCH /api/v1/offers/:code and GET /api/v1/offers/:code/history. Updates are rate-limited per authenticated staff user. Unknown fields (including role, code, title and updatedBy) are rejected. The backend derives the actor from the verified session, performs a version-conditional update and writes one audit row per changed field in the same transaction. A stale edit returns 409 OFFER_CONFLICT; the UI warns and reloads current values. History returns the latest 20 field changes with actor name, previous/new values and time. Usage is read-only, all-time order count and sum(discountAmount) for each saved couponCode; no historical discount is recalculated.

Runtime offer settings use a 30-second server cache. A small version probe on reads detects updates from other API instances as well as local cache invalidation after every committed update. Checkout descriptions and threshold-removal text are generated from current database numbers. Disabled offers never appear among eligible offers. The original first-order email/phone history policy and strictly-greater Big Order threshold remain unchanged.

Each checkout quote includes an offer version. The storefront refreshes on load/cart changes/window focus and rechecks immediately before Place Order. The order API accepts couponVersion with couponCode, obtains a shared lock on the selected settings row, then reads current settings and validates enabled/percentage/minimum/version inside the existing serializable order transaction. A changed or disabled selection returns 409 OFFER_UNAVAILABLE with updated totals/offers; the UI clears the selection, shows an amber warning and refreshes the quote. A client cannot omit or forge an old version to obtain an obsolete discount. Order snapshots, old invoices/reports and all existing orders remain unchanged when settings change.

Setup: prisma/compatibility/admin-offers.sql and the guarded npx tsx prisma/apply-admin-offers.ts --apply create only the two new tables/index/access policies and insert missing defaults. This has been applied to the configured test database, and Prisma client regenerated. For deployment, review/apply equivalent SQL before starting the updated backend. No Prisma migration was generated/run. Fresh defaults are 5 percent FIRST_ORDER and 10 percent BIG_ORDER above INR 5000, both enabled.

Verification: 415 backend tests, backend typecheck/ESLint/build, 178 frontend tests, affected frontend file lint and production build passed. A live database rollback check used 8 percent and INR 3000, verified idempotent seed preservation, stale edits, disabled/stale checkout, audit history and both-disabled hiding, then verified original offer rows, historical order count/sum and audit count unchanged after rollback. Full first-order concurrent checkout was rechecked with current offer versions: one order succeeded, one returned OFFER_UNAVAILABLE, and temporary records were cleaned up. The card components were visually checked at 360px and 1280px with no horizontal overflow; full authenticated browser acceptance remains available for staff testing.

After verification the two database rows remain at their initial 5/10 percent values, enabled, version 1, with no synthetic audit history left behind. All operational edits made through the admin page will persist.

## Order status flow and customer tracker (10 November 2026)

The single transition source is backend src/modules/orders/order-status-flow.ts. It defines PLACED -> PROCESSING -> READY_TO_SHIP -> SHIPPED -> DELIVERED; cancellation is permitted only from PLACED or PROCESSING. The frontend fetches this same configuration through authenticated GET /api/v1/orders/status-flow instead of maintaining another transition map. Existing CONFIRMED rows are retained unchanged: they may move to PROCESSING, are not a newly selectable status, and display at the pre-processing/Placed tracker position for compatibility. Existing status filters can still find legacy rows.

PATCH /api/v1/orders/:id/status remains verified ADMIN/EMPLOYEE-only. Customer cancellation uses the separate CUSTOMER-only POST /api/v1/orders/:id/cancel endpoint and always scopes the order lookup/update to the verified customer's ID. Both accept optional expectedStatus and a plain-text note; actor ID/role never come from request input. Invalid forward skips, backwards changes and terminal-state changes return 400. Concurrent/stale updates return 409 ORDER_STATUS_CONFLICT. A transaction performs updateMany where id AND current status match, and appends history in that same atomic update, so two staff changes cannot overwrite each other or lose history.

The only database addition is nullable Order.statusHistory JSONB, applied by prisma/compatibility/order-status-history.sql / guarded npx tsx prisma/apply-order-status-history.ts --apply on the configured test database. No migration was generated/run and no old rows were backfilled. New checkout orders create the initial PLACED entry with the same timestamp as createdAt. Each real change appends status, changedAt, changedBy {id, role}, optional note, previousStatus and a notification event UUID. Previous statuses support accurate cancellation display for a legacy order whose earlier timestamps were never recorded. Order totals, prices, offer snapshots and order items are not updated by status changes.

Customer details are at /orders/:id, protected by the existing customer guard plus backend ownership checks; another customer's order returns 404. The existing order history and account order cards include compact trackers and a link to the exact detail page. The responsive accessible tracker is horizontal on desktop and vertical on mobile, uses the shared StatusBadge, marks aria-current, shows completed/current/upcoming states and helper text, and displays cancellation actor/reason/time. Old orders infer reached steps from current status and order date only; missing timestamps display "-" rather than invented dates. Customer cancel controls and the polite Ready-to-ship/Shipped restriction message use the same server metadata.

Order details/history refresh on opening and every 45 seconds only while visible, with a visibility-return refresh, non-overlapping requests and cleanup on unmount. Failed detail refresh retains already-loaded information with an error/retry state. Admin dropdowns contain only current/next/cancel options, use the existing badge colors, lock repeated clicks, show a loading/success/error toast, and confirm SHIPPED/DELIVERED before sending. Status options have a retry state if configuration cannot load. The follow-up admin summary refresh runs in the background after the returned order is applied.

Each successful change queues a customer notification after the HTTP response, with text "Your order <number> is now <status>". Event UUIDs make notification inserts idempotent; transient notification failures retry up to three times in-process. The notification timestamp uses the change time, and customer links resolve to owned /orders/:id details. Customers can open the existing notifications UI at /notifications from order history/details. The existing configured email utility is reused in the background, with escaped content and an order link. Missing email configuration skips email; provider delivery failures are logged without failing/reversing the status change. No new provider, environment setting or notifications schema was added. This small queue is in-process; durable crash-recovery/outbox storage was not introduced under the history-only schema constraint.

Verification: backend typecheck, ESLint, build and 439 tests passed; frontend build, scoped new-component lint and 185 tests passed. Tests cover the five steps, cancellation policy, server actor/ownership, malformed/missing old history, restricted dropdown options, confirmation, hidden-tab polling and terminal/backwards/skip rejection. The real-database npx tsx prisma/check-order-status.ts --run harness created disposable orders, traversed every step, checked cancellation/ownership, verified four notifications and owned links, and ran two staff updates concurrently with only one success. Email transport was intercepted locally, not sent to real customers. Fixture cleanup verified all pre-existing order statuses, history, updatedAt and totals unchanged. The tracker component was visually inspected at 360px and 1280px with no horizontal overflow. Full authenticated browser acceptance remains available for customer/admin testing.

## COD checkout and delivery address safety
- Checkout now saves a missing delivery address using the existing customer address API, displays the selected saved address, and requires Cash on Delivery before placing an order. Saving delivery details also updates the profile address, without changing account name or verified phone.
- UserAddress now maps its existing database timestamp columns; missing updatedAt previously prevented address creation.
- New orders store COD in a nullable paymentMethod field. Historical orders remain untouched and export missing payment methods as "-".
- Checkout requires a UUID checkoutKey. A unique customer/key index and transactional checks return the original order for retries; reusing a key with different input returns 409. Identical checkout intents within 60 seconds are treated as the same order, including concurrent requests with different keys.
- The frontend blocks repeated clicks and keeps its retry key across failed requests. The server independently validates owned/complete address, products/variants, quantities, stock, positive server-priced totals, current offers, and rejects client totals.
- Checkout rate limit: 10 attempts/customer/minute and 30/IP/minute, returning 429 and Retry-After. This in-process throttle is not shared across replicas; database-backed duplicate protection remains authoritative.
- Safe setup: prisma/apply-cod-checkout.ts --apply adds only nullable COD/retry columns and indexes on the configured test database. No migrations or old-order updates were run.
- Verification: existing 439 backend tests passed; 3 additional COD schema/address/rate-limit tests passed. Live disposable integration test rejected empty carts, invalid inputs, foreign addresses, unavailable products and over-stock quantities; 3 simultaneous requests produced exactly 1 order. Address retries deduplicated and profile address synchronized. Temporary records were removed; all pre-existing orders compared unchanged.
- Measured live concurrent integration block: 13,210 ms (includes three requests, retry/conflict checks and assertions on a remote database); this is not a sub-200ms latency claim.
- Frontend production build and changed-file lint pass. Repository-wide frontend lint still reports unrelated pre-existing issues (not changed in this scope). Browser interaction/Slow 3G verification remains manual.

### Checkout: visible locked Big Order offer
The enabled BIG_ORDER offer is now advertised below (and exactly at) its database-configured minimum as a disabled card with its live percentage and requirement. It becomes selectable only above that minimum. Disabled admin offers remain hidden; returning customers still do not see an ineligible First Order offer. Eligible offers and server-side order validation are unchanged; unavailable cards cannot affect totals or be applied through the API. No schema or data changes.

## Customer checkout/orders performance and in-app notifications (10 November 2026)

### Checked and found
- Cart -> Checkout already uses the in-memory customer cart and does not need a full cart/product refetch. The checkout offers component nevertheless waited 350 ms before making its request and did not show product rows while offers/address were loading.
- Checkout pricing used one batched product query, not one query per item. Address and eligibility work could start earlier; selected variants and one thumbnail are sufficient. Authentication logic was left unchanged.
- Profile Orders requested the full shared order view (all item snapshots, related data and status history), although the preview list needed only basic order fields.
- Existing indexes already cover Cart.userId (unique), Order(userId, createdAt DESC), offerEmail, and offerPhone. No redundant order/cart indexes were added.
- Order placement wrote notifications inside the checkout transaction. Status notifications already ran in the background but included an email channel; this task now uses in-app-only delivery.

### Changes
- Added authenticated GET/POST /api/v1/checkout/summary. POST accepts the existing local-cart selection; GET uses the saved server cart. It returns minimal product rows, default/saved addresses, live eligible/locked offers and authoritative totals. Product pricing is batched, selected variants only, one thumbnail per product; product/address/account/history/settings work runs in parallel where independent.
- Checkout immediately renders local product rows. Offers, address and totals use separate loading placeholders. Removed the 350 ms delay. Cart hover/focus/pointer-down/click prefetch the same summary; a customer+selection keyed 15-second cache shares in-flight requests. Final order preflight bypasses that cache, and order creation still recomputes totals/eligibility server-side. COD/address/login/duplicate-order rules are unchanged.
- Added GET /api/v1/orders/customer-summary: customer identity comes only from verified authentication; default 10/max 20 orders per page, total count, at most three item names/thumbnails, no full history/address/customer payload. Profile retains the order-card style, detail links and review actions, with lightweight rows, lazy images, skeletons, previous-page retention, pagination and a customer-separated 30-second cache. The first page prefetches after customer authentication/layout mount. Successful placement/cancellation invalidates that cache.
- Added CustomerNotification (customer_notifications): id, userId, type, title, message, orderId, isRead, createdAt; owner/unread/date, owner/date and retention indexes. Existing notification data is not migrated, deleted or modified.
- Customer-only APIs: GET /api/v1/customer-notifications (20/page), GET /unread-count, PATCH /:id/read, PATCH /read-all. Read writes use a single owner-scoped updateMany and return the unread count. Already-read owned records succeed; foreign IDs return 404; staff/guests cannot use customer endpoints.
- notifyCustomer centralizes idempotent event-ID based writes, with a future channel integration point but NO email sending. Placed/status/cancel events run after the main transaction, with bounded background retries. A notification failure does not roll back an order/status. Staff order-placed notifications are preserved asynchronously.
- Customer header bell opens a responsive side drawer with newest-first events, order links, type icons, relative time, unread dots, pagination and mark-all. Read state/count change optimistically with rollback/retry; mutation-version checks prevent stale polling from restoring unread state. Count polling runs every 45 seconds only while the tab is visible. Account changes unmount the old customer's drawer.
- Retention: customer notifications older than 90 days are hidden from reads/counts and removed by a daily, startup-triggered cleanup job. Only the new customer-notification table is cleaned.
- Applied prisma/apply-customer-notifications.ts --apply to the configured test database and regenerated Prisma. Only the requested table/indexes were added; no existing orders/prices/status-flow/data were changed.

### Measured results
Read-only service timings from this local Windows -> configured remote database connection; these are individual samples, not load-test percentiles or authenticated HTTP/browser timings.

| Path | Before | After | Notes |
| --- | ---: | ---: | --- |
| Checkout offers / combined summary | 4,815 ms | 1,237 ms | Existing saved-cart workload; cold/connection effects can influence these samples. New summary includes minimal items/default address. |
| Profile full order response / lightweight summary | 2,074 ms | 569 ms | Original preview used limit 4; new default is 10. |
| Full versus lightweight order response in the same comparison run (limit 10) | 2,316 ms / 1,864 bytes | 569 ms / 521 bytes | About 72% smaller payload on this account; full details endpoint remains available. |
| Deliberate checkout request delay | 350 ms | 0 ms | Items no longer wait for address/offers. |
| Checkout component SSR with 1 / 5 / 20 items | Not captured | 54 / 7 / 6 ms | Test fixture render only, NOT browser first-paint or Slow 3G timing. |

The ~200 ms backend target is NOT met on this remote connection. Do not interpret instant local/cached rendering as sub-200 ms database response time. Supabase/backend region, cold connections and deployment-level connection latency need separate measurement before promising that target. Auth-provider round trips and authenticated Slow 3G end-to-end timing were not measured without a logged-in browser session.

### Validation
- 462 backend tests and 193 frontend tests passed in the final verification run; backend typecheck/lint/build, frontend production build and scoped new-file lint pass. Existing unrelated repository-wide frontend lint findings remain out of scope.
- Live disposable integration: 0, 5 and 105 orders; ten-row first page/five-row last page; another customer sees no orders; placed/status/cancel events deduplicate; notifications paginate at 20; mark-one/mark-all are idempotent and owner-scoped. Temporary users/orders/notifications removed; all pre-existing orders compared unchanged.
- Forced notification failure and bounded retries tested without affecting the main action. Frontend tests cover optimistic mark-all rollback, repeated-click suppression, in-flight request deduplication and customer-separated caches.
- Component-derived browser fixtures checked at 360, 768 and 1280 px: no horizontal overflow for checkout loading, order list or notification drawer. Logged-out real /checkout correctly redirected to login. Fixtures are not a substitute for an authenticated end-to-end Slow 3G test.
- Reproducible checks: prisma/check-customer-performance.ts --run (test DB only), tests/customer-performance-notifications.test.mjs and tests/customer-perf-visual.test.mjs.

### Remaining limits
Background notification retries are in-process, not a durable queue: an abrupt process termination between commit and delivery can still lose an event. A durable outbox/reconciliation worker would require an additional reviewed change. Existing notification rows are preserved, but the new order-event bell reads the new CustomerNotification table; historical legacy inbox rows are not backfilled. For deployment, apply the reviewed table/index setup before starting the new backend.

### Customer notification history visibility
Fixed an empty customer drawer caused by older order events remaining in the legacy notifications table. Customer list/count/read operations now idempotently import only that customer's recent legacy order events, resolving order links against owned orders. Original read/unread state and event timestamps are preserved; existing new-inbox rows, legacy records and orders are not modified. Reads and unread events remain visible together, newest first. Cards now show an explicit Read/Unread label, full local date/time with timezone, and relative time. The compatibility import is batched, concurrent calls are shared, and checks are cached for five minutes. No schema changes.

### Revenue chart calendar and curve fix
- Root causes: full current-week/month/year endpoints, a ceil-plus-one daily bucket calculation (adding an extra date), browser-local date grouping, natural spline overshoot, and a negative chart left margin.
- The Overview chart now uses explicit Asia/Calcutta calendar boundaries and buckets for backend UTC timestamps. Current periods end at the current instant (daily points through today, yearly buckets through this month, hourly Today points through the current hour). Past custom ranges remain complete; missing past buckets are zero-filled. Summary/PDF range filtering and chart buckets use the same selected orders. Revenue amount and cancellation inclusion rules are unchanged.
- This chart is aggregated in the frontend; no backend date aggregation, APIs, database rows or schema were changed. UTC order instants are converted to the same explicit India-time calendar, independent of server/browser timezone.
- Clock boundaries recalculate every 30 seconds and on focus/visibility changes; orders refetch when the India calendar day changes.
- The area now uses monotone interpolation and a zero baseline/domain, preserving stroke, dots and gradient. Positive left margin, explicit y-axis width and rupee number formatting prevent clipped labels.
- Tests: November 10 cutoff, first/last month day, India midnight, current week/year/hour cutoff, past/future custom periods, ranges over 31 days, cancellation/summary consistency, and chart baseline/spacing. Browser fixture: tests/fixtures/revenue-chart.html (test data only; no API writes).
- Verification: 201 frontend tests pass; production build and scoped chart lint pass. Browser fixture checked at desktop, 768 px and 360 px: correct current/past range endpoints, readable rupee labels, no horizontal overflow or negative spike overshoot, and no console errors. No backend/API/schema or order-data changes.



