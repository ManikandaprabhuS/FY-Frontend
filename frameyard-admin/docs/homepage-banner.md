# Homepage offer banner and plant props

## Settings and live offers
Manage the Homepage banner card at /admin/offers (ADMIN and EMPLOYEE only).
The homepage_banner singleton stores only enabled, featuredOfferCode, updatedBy and updatedAt. The idempotent seed starts enabled with BIG_ORDER and never overwrites edited settings. Banner copy is derived from the current offer's percentage and minimum, not stored as content.

- GET /api/v1/home/banner is public, with optional verified customer authentication. It returns only code, title, percentage and minOrderAmount, or banner: null.
- GET/PATCH /api/v1/offers/homepage-banner require verified staff authentication.
- Only enabled and featuredOfferCode can be patched. The two fixed codes are validated. Updates are limited to 20 per staff/IP per minute.
- Changes are recorded in the existing offer_audit table as banner.enabled and banner.featuredOfferCode, linked to the selected offer.
- Shared configuration is cached server-side for 30 seconds and invalidated on local banner/offer changes. First-order eligibility is checked per authenticated customer using the existing normalized email-or-phone history rules, never shared across users. Public HTTP responses use private/no-store. The Home component refreshes every 30 seconds while visible, so other-process changes appear within roughly 60 seconds.
- Disabled banners, missing/disabled featured offers, and ineligible First Order customers receive null without a reason. Guests see First Order banners.
- The banner is informational; checkout offer validation, totals and order snapshots are unchanged.
- The 220px loading skeleton matches the visible banner. A null result removes the wrapper entirely, leaving no reserved empty gap.

## Database setup
The reviewed backend script prisma/apply-homepage-banner.ts --apply creates the singleton settings table, seeds safely and expands the existing audit-field CHECK constraint to allow the two banner fields in addition to percentage, minOrderAmount and enabled. No existing audit rows, offers or orders are changed.
Apply this setup before deploying/starting the new backend, then regenerate Prisma. Automatic startup seeding never overwrites edits.

## Existing collection visuals
The frame geometry, original frame/photo assets, card sizes, crop, corners, Shop controls, links and filters remain unchanged. Only decorative plant props were added to Classic, Wooden and Premium; Metal remains unchanged. Props are lazy-loaded alpha-preserving WebP overlays (contain, not cropped through their leaves).

Final generated assets:
- D:/frameYaad Admin/frameyard-admin/src/assets/collection-plant-classic.webp — 400 x 600, 32,160 bytes
- D:/frameYaad Admin/frameyard-admin/src/assets/collection-plant-wooden.webp — 400 x 600, 51,732 bytes
- D:/frameYaad Admin/frameyard-admin/src/assets/collection-plant-premium.webp — 400 x 600, 45,400 bytes

Generated using the built-in image generation tool, transparent_background=true. Original PNGs are retained in Codex generated_images; final project assets are the WebP files above.

### Generation prompts
Classic:
Photorealistic product cutout for a small decorative prop beside a picture frame on an ecommerce collection card. A slender matte white ceramic cylinder vase holding delicate dark green eucalyptus-like stems, restrained arrangement, entire plant and vase visible front-on, soft daylight from upper left, realistic slight contact shadow. Isolated on a genuinely transparent background. No frame, no picture, no wall, no surface backdrop, no text, no logo. Tall compact composition with clean alpha edges; natural premium interior decor.

Wooden:
Photorealistic product cutout for a small decorative prop beside a picture frame on an ecommerce collection card. A narrow sculptural cream-white ceramic bud vase holding airy warm brown dried botanical branches, entire stems and vase visible front-on, soft daylight from upper left, realistic slight contact shadow. Isolated on a genuinely transparent background. No frame, no picture, no wall, no surface backdrop, no text, no logo. Tall compact composition with clean alpha edges; natural premium interior decor.

Premium:
Photorealistic product cutout for a small decorative prop beside a picture frame on an ecommerce collection card. A small round matte black ceramic vase holding fresh upright green leafy stems, entire plant and vase visible front-on, soft daylight from upper left, realistic slight contact shadow. Isolated on a genuinely transparent background. No frame, no picture, no wall, no surface backdrop, no text, no logo. Tall compact composition with clean alpha edges; natural premium interior decor.

## Validation
Backend tests cover safe public fields, eligibility isolation, enabled gates, invalidation, strict update fields, seeds, audit entries, staff RBAC and rate limits.
The rollback-only check-homepage-banner.ts verifies live 12%/3000 settings, disabled offer/banner, guests/new customers, history by email and phone, edited seed preservation and audit entries; all fixture changes are rolled back and original settings/offers/audit/orders compare unchanged.
Frontend tests cover shared live copy, no-gap null state, loading skeleton, optimistic toggle rollback, selector save, preserved links and plant-only overlays.
The component fixture tests/fixtures/homepage-banner.html was checked in the browser at 360/768/1280px: no horizontal overflow, no missing plant assets or console errors, fixed banner height, and original frame visuals preserved.
Final verification: 482 backend tests and 206 frontend tests passed; backend/frontend builds, backend typecheck/lint, scoped frontend lint and Prisma validation passed. The local backend was not responding at handoff, so restart it before testing the new endpoint on Home.

## Admin-uploadable banner artwork
- Backend configuration: SUPABASE_BANNER_BUCKET (default site-banners). The name is listed in .env.example; service credentials remain backend-only.
- Setup: stop the backend if Windows has locked Prisma, run npm run prisma:generate, then npx tsx prisma/setup-banner-images.ts --apply. This idempotently creates/updates ONLY the public site-banners bucket (2,097,152 bytes; image/jpeg, image/png, image/webp) and adds nullable bannerImageUrl/bannerImagePath to homepage_banner. Existing settings are not overwritten; customer-photos is compared before/after and never modified.
- Staff API: POST /api/v1/admin/homepage-banner/image, multipart field image; DELETE on the same path restores the default. Both enforce verified ADMIN/EMPLOYEE, rate limits, byte limits and real signatures. Exactly 2 MB is accepted. Filenames are generated server-side as banner-{timestamp}.{verified extension}; client filenames never become Storage keys.
- Upload stores the object, updates the settings/audit within a row-locked transaction, invalidates the existing banner cache, and removes the previous object. Failed DB writes compensate by removing the new object once it is confirmed unused. Ambiguous commits are checked before deletion, avoiding deletion of an active image. Interrupted removals are recovered by an hourly, bounded orphan sweep in this dedicated bucket (objects older than an hour). No new image library was added; original verified JPG/PNG/WebP bytes are retained rather than resized.
- Image paths are internal. Public/settings responses expose only the public image URL. Image changes are recorded as banner.image in the existing offers audit history with staff ID/name/time.
- /admin/offers > Homepage banner now has Upload/Replace, drag-and-drop, Remove confirmation, size/type validation, dimension warnings, progress, Retry, and a shared live preview. Save/toggle are disabled while image upload/removal is running.
- Recommended artwork: 1200 x 400 px (3:1), JPG/PNG/WebP, up to 2 MB. Width below 800 px or a very different ratio warns without blocking.
- Public GET /api/v1/home/banner includes bannerImageUrl (or null), preserving existing visibility/eligibility and cache rules. Artwork uses the existing right-hand area, clipped inside the rounded banner, cover/center fitting, a soft white edge gradient, lazy loading and async decoding. The admin preview uses the same renderer and responsive crop rules. Failed images and removed images restore the existing static SVG frame-corner artwork. Banner OFF still returns no banner/no gap.
- Verification: 538 backend tests pass, including 18 banner-image API/service checks; all 9 new frontend banner-image tests pass. Backend types/lint/build and frontend build/scoped lint pass. Live disposable Storage upload/public-read/delete passed with existing settings and customer-photos unchanged.
- Browser fitting checks: 4000x400, 400x4000 and 100x100 artwork fixtures at 320/375/768/1440px all loaded, used cover fitting, stayed inside the banner and caused no horizontal overflow or console warnings/errors.
- Full frontend regression run: 219/224 passed. Five unrelated existing failures remain in customer-header tests (2), the collection-plant expectation (1), and review form/display tests (2, including a missing ShopSortMenu test stub). Those components/data/tests were not changed for this task.
