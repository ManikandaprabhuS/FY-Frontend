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
