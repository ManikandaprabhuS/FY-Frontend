# FrameYaad Admin

## 2026-11-21: Compact mobile Home banners

The Home slider and matching offer-upload preview now use a shorter 3:2 mobile frame (minimum 200px for readable copy and 44px controls), replacing the tall 6:5 crop. Mobile copy is compacted to avoid control overlap and show the image with less vertical cropping. Desktop/tablet, Contact page banner, links and 4-second rotation are unchanged.

## 2026-11-21: Banner rotation timing adjustment

Home banner rotation is now every 4 seconds with a smooth 500ms opacity transition. The existing dots, pause/play control, two slides, links and interaction/reduced-motion pause rules are retained. This supersedes the earlier 3-second timing note; no backend changes.

## 2026-11-21: Netlify merged-hero build correction

The merged main branch retained an obsolete VideoSlide IntersectionObserver calling the removed `start(element)` helper and listing `start` as an effect dependency. Removed that entire duplicate effect; the existing `createHeroVideoPlayback` remains the single playback owner. Added a regression assertion against the stale calls. Verified on the current main working copy: `npm run build` succeeds and all 25 focused hero tests pass. Commit/push these corrections to the deployment branch before retrying Netlify; no backend or deployment settings changed.

## 2026-11-21: Banner slider and featured-offer dropdown

The Homepage banner selector now lists enabled offers only, with live percentages/minimums. Offer toggles update it optimistically and roll back on failure. A disabled saved selection remains a disabled `(inactive)` snapshot with the amber explanation; when none are enabled, the select says `No active offers. Turn one on first` and saving is disabled. The existing backend save transaction locks/checks the selected offer and returns a clear **400** for inactive/missing offers (including re-saving the same code); unknown codes, roles, rate limits, audit and cache invalidation retain their existing checks. Turning off a featured offer still hides only the offer slide.

Home now reuses the dynamic offer visual and Contact's admin-managed Custom Framing banner in one fixed-ratio slider: **3:1 desktop**, **5:2 tablet**, **6:5 small mobile**, matching the offer upload preview. It rotates every **3,000ms**, with a **500ms opacity crossfade**, and pauses on mouse hover, touch, focus within, hidden tab, full viewport exit or the pause control. Dots, arrow keys and horizontal swipes reset the timer. Reduced motion disables auto-rotation/transitions and starts on the first available slide; manual controls remain usable. Single-slide cases have no controls/timer; if neither slide is available, there is no banner/gap. Skeleton and slide heights match; inactive slides are inert/hidden to assistive technology, controls have 44px targets, and announcements are polite only when paused.

Contact media is fetched after first paint using the existing public API, coalesced/cached in the frontend for 60 seconds and invalidated after existing admin media/detail mutations. The shared image is loaded early for the switch, falls back to the existing static Contact image on request/image failure, and the Contact slide is removed only if that fallback also fails. API failure alone therefore does not hide a working fallback. No new endpoint, storage/schema change, dependency or customer/private cache was added. The offer API/session-cache/auth rules remain unchanged: **this application's current First Order marketing banner is public for all visitors; checkout eligibility remains authoritative**. This task does not reintroduce the older logged-in banner hiding behavior.

The Contact slide links to `/contact#get-in-touch`; `/contact` is an alias for the existing `/contact-us` page, which remains unchanged/available. The cards now have the requested anchor, smooth scrolling with the existing sticky-header offset, and reduced-motion instant scrolling. Repeating the link from Contact works; the old `#contact-cards` hash is still handled by the scroll helper. The Contact layout, phone/email links, story video and wider banner crop are unchanged.

Both banner uploaders show: **Recommended size: 1800 x 600 px (3:1). JPG, PNG or WebP, max 2 MB. Keep the main subject in the center/right and the left side clear for text. The image is cropped to fit.** One helper reads the existing size config; limits/type checks are unchanged. The offer preview matches Home's responsive frame; Contact retains its wider real-page preview crop and now previews the selected local image during upload. Existing small-image warnings remain and a very different Contact image ratio warns without blocking.

Verification (local read-only fixtures/mocked database; **no production or dev records changed**): **31/31 focused frontend tests**, **33/33 backend tests** passed; frontend production build, backend typecheck and scoped frontend lint passed. Chromium at **320/375/768/1440**, WebKit **iPhone 14**, and Android Chromium **Pixel 7** passed timer/loop, interaction/visibility pauses, dots/arrow/swipe/pause controls, reduced motion, stable banner height/no horizontal overflow, Contact anchor (including re-click on Contact), and tappable phone/email checks. Chromium LayoutShift checks stayed below 0.01 in the fixture; WebKit uses the stable-height geometry check because LayoutShift API is unavailable. No uncaught page errors. Single offer, single Contact, both images unavailable, inactive/no-active admin state and both upload helper texts passed. API 400/unknown-code/customer/guest/RBAC, size boundaries, public-cache coalescing/invalidation/retry and existing offer rollback are automated regressions. No live-database setting writes were needed, so no dummy-record cleanup was needed.

Rerun: `node --test tests/banner-slider.test.mjs tests/banner-images.test.mjs tests/admin-offers.test.mjs tests/contact-media-validation.test.mjs tests/seasonal-offers.test.mjs`. Start Vite on 127.0.0.1:5177 and run `node tests/banner-slider-browser.cjs` with PLAYWRIGHT_MODULE pointing to an existing installation; screenshots/results go to tests/artifacts/banner-slider or BANNER_TEST_OUTPUT. Backend: `npx vitest run --configLoader runner tests/home-banner.test.ts tests/home-banner-rbac.test.ts tests/seasonal-offers.test.ts`. Real iPhone/Safari and deployed-site confirmation remain a manual follow-up after deploying both frontend and backend; no deployment was performed.

## 2026-11-21: Hero video plays fully (all platforms)

### RCA

| Cause/check | Evidence | Fixed? |
| --- | --- | --- |
| Deployed carousel clock cut the video short | The live Netlify CustomerLayout-Jnn0q7mp.js still contains a looping video and an unconditional `fy-hero-ring` completion handler. Its approximately 5-second slide clock advances independently of the 9.16-second video and buffering. | Local controller already replaced that partial implementation; retained one controller, with normal video completion exclusively from the native `ended` event. Deploy the updated frontend to replace the stale live bundle. |
| Stale playhead on the next cycle | Earlier commit c46ae2b (same timer/loop/no-reset behavior as the deployed bundle) reproduced early cutoffs and mid-video resumes on all four tested profiles; numbers below. | Each active visit starts at zero; manual slide changes, route exit, tab hiding and fully leaving the viewport pause/reset to zero. Retained DOM/buffer is not a retained playhead. |
| Visibility/reduced-motion edge cases | Local code had no video-specific reduced-motion guard; visibility relied on observer state without an explicit geometric full-exit check. A percentage threshold alone does not prove an early pause. | One observer now checks actual viewport intersection, allowing even a 20px visible slice; 120ms confirmed-full-exit grace avoids boundary jitter. Reduced motion shows the poster without video autoplay/spinner; existing static-slide timing/manual controls remain. |
| Slow connection and short clip buffering | Existing faststart H.264 mobile file is 1,161,033 bytes, 1280x720, Main/yuv420p, 25fps, no B-frames/audio, duration 9.16s. Desktop file is 4,154,429 bytes, 1920x1080. | Reused these files, no re-encoding/dependencies. Small screens/iOS/Save-Data/slow connections (reported downlink <=2Mbps or 2G/3G) use the existing mobile copy; normal desktop keeps 1080p. Admin replacement URLs remain unchanged. |

The video progress ring follows playback; it has no independent slide timer. Hover/focus, small scrolls, progress state updates and observer percentage changes do not stop the video. Poster/spinner show until `playing` and during real waiting; moving buffered frames clear false download-stall indications. Startup deadlines are **4,000ms first activation**, **2,000ms later**; stalled/no-progress playback is bounded at **3,000ms**. Short clips (<=15s) prefer `canplaythrough`, with a **750ms** bounded preference inside the startup deadline. Autoplay rejection hides the spinner, keeps the poster, permits a user-pointer retry and skips within the same startup deadline if still blocked. Missing `ended` is treated as a bounded failure, not fabricated successful completion from elapsed time. One-shot completion and per-visit cleanup prevent double advances/listeners/play requests.

### Before/after verification

Real browser media playback, local fixture APIs (no database writes), media throttled to ~1.6Mbps with 150ms initial latency; app JS/CSS served locally, not a whole-page cellular benchmark. Fresh before timelines used the earlier committed partial implementation c46ae2b, not a modified production deployment. Times below are milliseconds since navigation.

| Profile | Before: entry -> playing -> early slide exit (media time) | Next pass resumed at | After: entry -> playing -> native ended | Full passes |
| --- | --- | --- | --- | --- |
| Chromium desktop | 1847 -> 1919 -> 6879 (2.807s) | 2.808s | 1629 -> 1833 -> 11002 (9.160s) | 5/5 |
| Android Chromium / Pixel 7 | 1685 -> 1865 -> 6748 (4.859s) | 4.860s | 1632 -> 1814 -> 10998 (9.160s) | 5/5 |
| WebKit / iPhone 14 | 1898 -> 2464 -> 7336 (3.116s) | 3.157s | 3035 -> 5375 -> 14629 (9.160s) | 5/5 |
| WebKit / iPhone 15 | 1969 -> 1994 -> 7115 (3.125s) | 3.176s | 2231 -> 3047 -> 13919 (9.160s) | 5/5 |

All 20 after-fix passes reached 9.16s and fired native `ended` before returning to the wall. Every new pass started near zero (sub-frame timing; later `playing` events after buffering are not new passes). Timestamped logs include metadata/canplay/canplaythrough/waiting/stalled/playing/pause/ended, duration, currentTime, readyState, buffered end and slide changes. All four profiles also passed: partial/small scrolling does not pause; full exit resets; manual navigation is honored; hidden tab and route changes reset; retained node survives route return; reduced motion has no video autoplay or spinner. No uncaught page errors were observed. WebKit startup withholding and forced mid-play waiting passed bounded skips (~4s/~3s); simulated autoplay rejection passed poster/touch retry. These fault injections are not claims of testing actual iPhone Low Power Mode.

Focused automated tests: **25/25 passed**; production build and scoped ESLint passed. Full existing frontend suite: **286/309 passed**, with the same **23 unrelated pre-existing failures** (older checkout/header/review/fixture contracts); they were not changed in this scoped fix. Generated PDF test artifacts were restored. No backend, API, database, hero copy, CSS/layout, other clip timing or dependencies changed.

Rerun focused tests with `node --test tests/hero-video-playback.test.mjs tests/hero-video-performance.test.mjs tests/performance-hero-loading.test.mjs`. Browser harness: start Vite on 127.0.0.1:5177, set PLAYWRIGHT_MODULE to an existing Playwright installation (no dependency added), then run `node tests/hero-video-browser.cjs` and `node tests/hero-video-browser.cjs behavior`. It uses local read-only fixtures and writes event logs under tests/artifacts/hero-video (or HERO_TEST_OUTPUT); HERO_PROFILES can restrict profiles and HERO_TEST_PORT changes the proxy port. Normal desktop video quality/source selection is additionally covered by the helper tests.

Real-device checklist (pending owner verification after deploying): Safari and Chrome iOS, Android Chrome and desktop; five full cycles; Wi-Fi/cellular; private first visit; Low Power Mode/Data Saver on/off; Reduce Motion; slight scroll/full scroll away; manual slide change; Shop All -> Home; background/foreground. Expect poster rather than a black/frozen frame when autoplay is blocked, bounded skip on failure, and every successful return starting at 0:00. **The live Netlify site has not been deployed by this task; deploy this frontend build before retesting it there.**

## 2026-11-20: Seasonal offers (New Year, Christmas, Pongal)

Final verification completed 2026-11-21 (IST). The existing offers system now has five fixed codes, ordered First Order, Big Order, then the Seasonal offers group: NEW_YEAR ("New Year Offer"), CHRISTMAS ("Christmas Offer"), PONGAL ("Pongal Offer"). Each new missing record starts at **10%**, minimum **Rs. 1,000**, **disabled**, version 1, with the same updater/timestamp fields as Big Order. These are placeholders, not scheduled promotions: staff enable/edit them manually. The existing insert-only seed uses skipDuplicates and never overwrites edited settings, including seasonal records.

All four threshold offers share one eligibility rule: server-recomputed cart subtotal must be **strictly greater than** that offer's live database minimum. Percentage/minimum/enabled/version come from the database, not client constants. First Order eligibility, existing Big Order values, money rounding, COD, stock/order logic and historical orders are unchanged. Only one offer applies; choosing another replaces it and the existing largest-discount "Best offer" rule remains. Disabled/changed versions are rejected and refreshed with an amber warning, including a change between checkout preflight and order submission. Local/temporary customer photos are retained on that validation failure.

Admin/employee cards reuse the same component, input validation, high-discount/deactivation confirms, optimistic rollback, version conflicts, usage totals and audit history. Codes/titles are not editable and no create/delete endpoints or controls were added. The existing update whitelist remains percentage, minOrderAmount and enabled, plus the required optimistic version. The banner selector and public response/session-cache validator accept all five codes; live title/percentage/minimum drive the label and copy, and a disabled featured offer returns no banner. Existing cache keys, authentication and private/public cache boundaries remain unchanged.

Order snapshots already store code/title/percent/discount/subtotal/paid total generically. Admin/customer details, confirmation and order exports reuse those snapshots; revenue responses now include the same saved offer fields and the existing PDF detail table displays them without changing revenue calculations. No separate order invoice or order-email generator was found in these repositories, so no new invoice/sending workflow was invented; authentication/appointment email integrations are untouched.

### Required compatibility setup

The Prisma fields are strings, but PostgreSQL had three additional CHECK constraints restricted to two codes. The narrow idempotent compatibility migration extends only offers_code_check, offers_check and homepage_banner_featuredOfferCode_check. No Prisma model/column, existing row, RLS policy or storage behavior is changed.

On the reviewed dev database, run from the backend folder:

```powershell
npx tsx prisma/apply-seasonal-offers.ts --apply
```

This transaction applies prisma/compatibility/seasonal-offers.sql and invokes the existing insert-only seed; it checks existing offer settings and order count/total invariants. It was run twice successfully on the explicitly confirmed dedicated dev database. Normal admin-offer setup now includes this compatibility SQL, and fresh banner setup accepts five codes. The guarded helper refuses NODE_ENV=production: for production, review/apply the SQL **in a transaction before deploying/restarting the updated backend**, then let the existing startup seed insert missing disabled records. No production database or deployment was touched here.

### Results

| Check | Result |
| --- | --- |
| Seed twice / preserve edited values | Passed in dev and automated tests; five records, no overwrite or duplicate |
| Each seasonal offer at 12%, minimum Rs. 2,000 | Rs. 1,999 and exactly Rs. 2,000 ineligible; Rs. 2,500 saves Rs. 300, total Rs. 2,200 |
| Multiple eligible / replacement | Five cards rendered; unique larger discount tagged Best offer; only one selected |
| Disable/change after apply | New order intent rejected with refreshed offers/totals; client shows amber warning and can choose another |
| Validation / permissions | Invalid percentage 0/-5/101/blank/text and invalid minimum 0/negative/blank/text rejected; ADMIN and EMPLOYEE allowed, customer/guest denied; no create/delete |
| Five featured banners | Guest/logged-in responses match live settings; each hides while its featured offer is disabled; seasonal session-cache acceptance tested |
| Orders / details / export / revenue / PDF | All three saved snapshots verified; PDF table tests include their title, 12%, Rs. 300 discount and Rs. 2,200 paid total |
| Responsive UI | Actual admin/checkout components checked at 1440px and 375px with five offers, no page overflow; mobile order confirmation passed |
| Automated | Backend 655/655 (58 files); 31 focused frontend/banner/PDF tests pass; both production builds, backend typecheck and focused lint pass |
| Broad frontend regression | 284/307 pass; 23 existing unrelated missing-mock/module and stale UI assertions remain, logged without changing unrelated features |

Dev tests used isolated "Dummy Test Order" users/products/orders and a test-process token-verification adapter (real role/ownership checks still read the DB), not real Supabase Auth accounts or external email sending. All dummy orders/items/notifications/fixtures and test audit entries were removed; fixture stock was restored before removal. Existing stock/timestamps, revenue/counts, notification counts, offer settings/versions/updaters and banner settings were compared with the baseline and restored. No photos were uploaded. The three new disabled placeholder records remain as the requested feature. Original order retry/idempotency behavior was preserved; separate test checkouts used distinct intents.

Results: D:\FrameYaad\seasonal-offers-results.json (cleanup=true), seasonal-backend-tests.log, seasonal-frontend-tests.log; responsive screenshots: seasonal-admin-1440.png / seasonal-admin-375.png and seasonal-checkout-1440.png / seasonal-checkout-375.png. Browser harness: D:\FrameYaad\seasonal-offers-dev-check.cjs. Existing broad-test verification artifacts under tmp may be regenerated by the suite; they are not application/data changes. No dependencies added or removed.


## 2026-11-20: iOS hero video plays fully

This supersedes the earlier resume-from-last-position policy: the video DOM and downloaded buffer remain persistent, but every visible video visit starts at 0:00 and plays once. No re-encoding, backend changes, new dependencies, hero redesign or changes to the other slide's timing.

| RCA | Evidence | Fixed? |
| --- | --- | --- |
| Fixed carousel clock cut a longer clip | The same 5,000ms CSS progress-ring animation advanced both slides; media duration is 9.16s. WebKit baseline cut at 2.768s / 3.528s of playback, without ended | Yes: only the wall retains the 5s clock; video progress is currentTime/duration and completion follows ended (with an actual-ended-state guard for delayed events), never a duration timer |
| Re-entry resumed the previous playhead | Previous effect paused without seeking; second playing events began at 2.809s / 3.572s. The video also had loop enabled | Yes: loop removed; pause/reset on leave and seek to zero before each visible visit; duplicate/stale completion guarded |
| Startup/buffering consumed the fixed slide window | Baseline waiting at entry preceded playing by roughly 0.85s / 1.47s, while the ring already ran | Yes: poster plus existing FrameSpinner until playing; waiting/stalled recovery and bounded skips; progress is zero before playing |
| Viewport/tab controls suspected | IntersectionObserver only sets inView (35% threshold); it does not change slides. Visibility and route state only gate playback | Not the slide-advance cause; retained, now pausing/resetting and restarting at zero on return |

Timeouts live together in `src/features/customer/utils/heroVideoPlayback.ts`: first startup **4s**, subsequent visible attempts **2s**, playback waiting/stall/no-progress **3s**. Repeated waiting events do not extend a deadline; actual advancing buffered frames clear false download-stall indications. Short clips prefer canplaythrough for up to **750ms** after readiness, inside the startup deadline. A bounded play request also initiates loading when iOS ignores preload. Muted/playsinline, existing auto preload, early metadata/poster fetch, the compressed assets and fade are retained. NotAllowedError hides the spinner and retains the poster; touch retries during the visible video visit, otherwise the bounded deadline returns to the wall and the next cycle retries. All listeners, timers and pending outcomes are guarded/cleaned up.

Before timeline (milliseconds from navigation, captured on the same optimized asset under a 1.6Mbps/150ms media-origin throttle):

| Profile | Video entry | playing at media 0 | Wall shown early | Next playing began at |
| --- | --- | --- | --- | --- |
| WebKit iPhone 14 | 2043ms | 2891ms | 7263ms, media 2.768s | 12817ms, media 2.809s |
| WebKit iPhone 15 | 2731ms | 4202ms | 7867ms, media 3.528s | 13347ms, media 3.572s |

After timeline (first pass, milliseconds from navigation):

| Profile | Video entry | playing at media 0 | ended at media 9.16 | Wall shown |
| --- | --- | --- | --- | --- |
| WebKit iPhone 14 | 2209ms | 2985ms | 13317ms | 13347ms |
| WebKit iPhone 15 | 2346ms | 3121ms | 13378ms | 13393ms |

Three full passes per iPhone 14/15 profile started at media 0 and reached 9.16s before returning to the wall; later native playing notifications stayed near zero, not the previous cut position. The spinner is absolute/centered, so hero bounds remained unchanged. Desktop Chrome and Pixel 7 Chromium also completed the clip without JavaScript page errors. Other slides, swipe/dot controls, text, buttons, images and desktop/mobile crop remain unchanged.

Fallback checks: held first response skipped in about 4.09s; forced waiting/pause skipped about 3.00s after waiting. Simulated autoplay rejection hid the spinner; a real Playwright touch recovered playback. Navigating away/back retained the same DOM node but paused/reset it, as did background/foreground and off-screen return. 23 focused Node tests, production build and focused ESLint pass, including exact 4s/2s/3s boundaries, missing waiting events, stale pause/ended events, ignored preload and one-shot completion.

Event traces include loadedmetadata, canplay, canplaythrough, waiting, stalled, playing, pause, ended and timeupdate with timestamp, duration, readyState and buffered end: `D:\FrameYaad\hero-full-before.json`, `hero-full-after.json`, `hero-full-failures.json` and `hero-full-chromium.json`; harness: `D:\FrameYaad\hero-full-playback-check.cjs`. Fixtures use public media and mock API data only, no database writes. Per-run media URLs isolate Windows native cache; JS/CSS are local/unthrottled. Windows WebKit reported empty buffered ranges and inconsistent clock/ended state when a partial MP4 was cut mid-stream, so the recovery test uses explicit waiting/pause after playback begins; this is not claimed as a real-iPhone network-interruption result. The actual-startup hold is a real withheld HTTP response. OS Low Power Mode is simulated by play rejection, not emulated hardware.

Real-iPhone checklist: Safari and Chrome iOS, Wi-Fi/cellular and Low Power Mode on/off; fresh private-tab visit and at least three loops (each 0:00 -> end); interrupt a playing download and verify spinner/skip within about 3s; blocked autoplay retains poster without endless spinner and a touch retries; Shop All -> Home, app background/foreground and scroll away/back restart at zero without recreating the media node; confirm unchanged hero crop/layout and wall-slide timing.

## 2026-11-20: iOS hero video RCA and fix

Scope: hero media/loading only; existing wall/video carousel order, 5-second slide clock, hero crop/layout/text/buttons and other animations remain unchanged. No backend, database, Supabase objects/policies or application dependencies changed. The original remains in Supabase and an analysis copy is at `D:\FrameYaad\hero-original-20261120.mp4`.

Original URL: https://kiltmzomecjeucdeawmp.supabase.co/storage/v1/object/public/product-images/site/hero-video/1794317454303-76b64098-d874-460f-bfda-23bc8feafc62.mp4 (public `product-images/site/hero-video`, selected by the existing public hero-video API).

| Cause/check | Evidence | Fixed? |
| --- | --- | --- |
| Expensive single rendition | ffprobe: 6,156,314 bytes, 9.16s, 1920x1080, H.264 High, yuv420p, 25fps, 5.377Mbps, 2 B-frames | New 720p mobile/iOS/Save-Data and 1080p desktop copies; original retained |
| Route remount and seek | Hero lived inside Home; video effect assigned currentTime=0 whenever the slide activated | Hero alone is retained in the customer layout, hidden/paused off Home; no reset or blob cache |
| Late setup/no poster | Settings fetched after Home mounted; metadata-only preload; no poster | Settings start at initial Home app boot, coalesced public-only 60s memory cache; high-priority poster preload, auto media preload, fade on playing, caught play retry on canplay/touch |
| Faststart/audio suspected | ffprobe trace: moov before mdat (atom offsets 32/3418); original has no audio | Not root causes; new files also faststart and audio-free |
| Hosting/cache | Public HEAD: 200, video/mp4, 6,156,314 bytes, Accept-Ranges, ETag and Last-Modified, but private/no-cache. Range: 206, bytes 0-1023/6156314, 1024 bytes, public max-age=31536000 | No missing-range bug. Copies use content-hashed same-origin Netlify paths and /hero/* public max-age=31536000, immutable rule; production confirmation pending deployment |
| Apparent initial wait | Existing carousel deliberately starts on the frame wall, then shows video after 5s | Intentional behavior retained, not counted as a loading regression |

### Media facts and measurements

| Item | Before | After |
| --- | --- | --- |
| Mobile media | 6,156,314 bytes / 1080p | 1,161,033 bytes / 1280x720 / H.264 Main / 1.014Mbps |
| Desktop media | Same original | 4,154,429 bytes / 1920x1080 / H.264 High / 3.628Mbps |
| Poster | None | 10,440-byte 960x540 WebP, same object-fit crop |
| New encoding | 25fps, 2 B-frames | Both 9.16s, 25fps, yuv420p, no audio, no B-frames, 50-frame (2s) GOP; moov before mdat checked automatically |
| WebKit iPhone 14/15 first poster | None | 1.040s / 0.984s from navigation in the final production-build preview |
| WebKit iPhone 14/15 first decoded frame | Throttled Windows baseline failed with MEDIA_ERR_SRC_NOT_SUPPORTED after a short metadata range; original does decode directly, so no valid comparable iOS baseline timing is claimed | 1.804s / 1.693s in production-build preview; dev mode previously measured 2.686s / 2.183s |
| Home -> Shop All -> Home | Chromium baseline recreated the node; an additional request and 491,520 streamed bytes during return observation | Same video node, readyState 4; 0 new requests and 0 bytes in both iPhone profiles after buffering |
| Full same-tab reload | Separate from SPA return; baseline request interception disables HTTP caching, so before/after cache ratios are not comparable | Windows WebKit still requested a fresh partial range (229,376 / 278,528 bytes observed over 1.2s). Do not claim zero-byte full reload; verify on deployed Netlify/iPhone |

Timing method: real HTTP reverse proxy streaming media at 1.6Mbps with 150ms latency, iPhone 14/15 Playwright WebKit profiles. Final after numbers use the production-build preview; app JS/CSS are local and unthrottled, so this is not a whole-page production 4G benchmark. Route checks wait for both actual URL transitions to complete. First-frame measurements force the existing video slide immediately rather than counting its intentional 5s carousel delay. A previous routing-only measurement was discarded because WebKit's native media requests bypassed it. Raw results/screenshots are in `D:\FrameYaad\hero-after-metrics.json`, `hero-before-chromium-metrics.json` and `hero-lifecycle-results.json`.

Validation: 7 focused Node tests pass; production build and focused ESLint pass. WebKit iPhone 14/15 and Chromium Pixel 7/desktop checks pass for poster under simulated autoplay rejection, first touch retry, reduced motion, stable hero bounds, retained node, pause off route/scroll/hidden tab, responsive source selection, no page-level overflow and no page errors. Direct decoding of original and optimized desktop MP4s also passed. Local curl confirms video/mp4, Content-Length, ETag/Last-Modified and 206 with Accept-Ranges; Vite intentionally sends no-cache in development, not the production _headers policy. No real iPhone, Safari Responsive Mode or OS Low Power Mode was available.

Optimized mappings are tied to the exact original admin URL, so replacing/removing the admin video still works and cannot show a stale static copy. A future replacement falls back to its original URL until its own renditions/poster are generated; no heavy server encoder was added. Contact remains route-mounted with metadata preload and is not eagerly fetched; no other video/animation was changed. Supabase media remains permitted by the existing deployed CSP allowance, now retained in local _headers too.

Encoding commands (portable FFmpeg tooling only, not application dependencies):

```powershell
ffmpeg -i hero-original-20261120.mp4 -an -vf "scale=1280:720,fps=25" -c:v libx264 -profile:v main -pix_fmt yuv420p -preset slow -b:v 1000k -maxrate 1200k -bufsize 2000k -g 50 -keyint_min 50 -sc_threshold 0 -bf 0 -movflags +faststart hero-mobile.mp4
ffmpeg -i hero-original-20261120.mp4 -an -vf fps=25 -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf 18 -maxrate 4500k -bufsize 9000k -g 50 -keyint_min 50 -sc_threshold 0 -bf 0 -movflags +faststart hero-desktop.mp4
ffmpeg -ss 2 -i hero-original-20261120.mp4 -frames:v 1 -vf scale=960:-2 -c:v libwebp -quality 72 hero-poster.webp
```

Real-iPhone/deployment checklist: deploy the frontend including public/hero and _headers; use curl -I and curl -r 0-1023 against /hero/mobile-6bbf68c78f67.mp4 to confirm immutable caching, correct MIME, validators and 206. Test Safari and Chrome iOS in a fresh private tab, Wi-Fi/cellular, Low Power Mode on/off; check poster before playback, touch retry when blocked, full carousel, no crop/layout change, scroll/background pause, Shop All -> Home instant resume without a new media request, and separate full-page revisit/cache behavior. Desktop/Android visual confirmation and the final production first-frame target remain deployment checks.

## Customer notification history

2026-11-18: Customer notifications now use one source for the navbar popup and Profile page, show full history, and are read-only (no delete).

Diagnosis: Profile used the legacy notifications source while the popup used CustomerNotification with separate state/count requests. The newer source also restricted history to 90 days and omitted the legacy welcome message.
Fix: one authenticated customer endpoint merges both owned sources read-only, deduplicates matching events, preserves original timestamps/read state, and returns newest-first pages of 20 with shared counts. No migration, copying, schema changes or new dependencies; both views share optimistic state with rollback. Customer delete/clear requests return 403; admin notifications remain unchanged.

Retention: automatic customer-history pruning is disabled (indefinite retention); the dev database has no pg_cron extension. Previously physically deleted history requires a backup to recover. Existing account-deletion behavior is unchanged.

Verification: backend suite 641/641 passed; 20 focused frontend notification tests passed. Dev API/browser checks at 1440px and 375px passed for welcome plus placed/status/cancel/refund history, matching lists/counts, reads in both directions, mark-all, failure rollback, empty state, ownership isolation, delete 403 and 62-record pagination including history older than 90 days. Tests used isolated dev users and a test-only token verifier, not real Supabase sign-in/accounts. Dummy orders, notifications and fixture records were removed; original stock, revenue, counts and notification read states matched the baseline. No photos were uploaded. The broad frontend run had 249/272 passing with 23 existing unrelated failures; these were left unchanged.


2026-11-18: Product Details view redesigned (UI only).

Read-only view now fills the existing admin content area with a product breadcrumb/header, Basic Information and Material & Colours cards, variant mini-cards, horizontal images/cover badges and a pinned Edit/Close footer. Existing compact sidebar/search/bell/avatar, list/actions, routes, API/data, fetch/retry and Close/Escape/focus behavior are retained; colour metadata is read from already-loaded state only, and the unset photo-size label uses the existing shared default. No new requests, writes, backend/schema changes, dependencies or lightbox.

Click test: an existing dev product was read without writes and its response replayed through the real Products list and details components; desktop/mobile name and thumbnail clicks passed, all four sections displayed, Close restored identical list content/focus, and Edit used the existing route. Before/after API methods, URLs, parameters and counts were identical (one existing product GET per open). Screenshots/checks at 1440/1024/768/375px passed with no page overflow, pinned-footer scrolling, 10 images, many colours/25 variants, no images/colours/variants, Draft, long name/description and retry. Production build and 16 focused UI/shell tests pass. Broad suite: 241/265 pass; the prior 23 failures remain, plus an older notification test still expecting the row-navigation behavior intentionally replaced in the preceding task. Those unrelated assertions were not changed here; the new notification-navigation tests pass. The reference's expanded sidebar was not imposed on the existing compact shell, and unavailable colour metadata was not invented.

2026-11-18: In the navbar notification popup, clicking a notification opens the Notifications page without marking it as read; clicking its order ID link marks it as read and opens the order.

Verification: production build and 12 navigation/optimistic-read regression tests pass. Confirmed DEV DB: placed one isolated **Dummy Test Order**, verified stock 20 -> 19, then cancelled it to create a second order notification and restore stock to 20. Real AdminLayout/Notifications/Orders components passed browser checks at 375px and 1440px for ADMIN and EMPLOYEE: body click/Enter (including no-order notifications) leaves unread count unchanged; order-link Enter marks exactly one read, decreases the badge immediately and opens the existing order popup without row navigation; forced read failure rolls back and shows the existing red Retry toast; Mark all remains optimistic. Browser requests used a test-only loopback bridge to the existing backend services, scoped to this run's notifications so Mark all could not modify existing staff notifications. Dummy orders/items, customer/staff notifications, users/addresses and isolated product/variant/material were deleted; original stock/timestamps, revenue/counts, photos and every original notification/read state match the baseline. No backend or Notifications-page production changes; optional row scroll/highlight was omitted to leave that page untouched.

## 2026-11-18: Stock and revenue verification

Owner-confirmed DEV database only. Full before/after scenario table, cleanup counts, bug details and test limitations are recorded in the backend README at `D:\New folder\FrameYaad-Backend\FrameYaad-Backend\README.md` under this dated heading. Backend stock deduction/restoration is now atomic/idempotent; the shared frontend product store refreshes stock on existing order events and visible 15-second checks without changing filters/page, Add/Edit forms, photos, layout or calculations.

| Check | Before | After | Result |
|---|---|---|---|
| Qty 1 / qty 3 stock | 20 / 20 | 19 / 17; each cancellation restores 20 once | PASS (live dev services) |
| Multi-variant stock A/B | 20/20 | 18/17; admin cancel restores 20/20 once | PASS |
| Last-unit race | 1 | 0; one order succeeds, one stock rejection | PASS |
| Revenue after full cleanup | INR 15,690.20; 7 active; INR 2,241.46 AOV | identical | PASS |
| Current-month chart / summary / PDF after cleanup | INR 8,095.20; 3 orders; INR 2,698.40 AOV | identical across outputs | PASS |
| Big Order cancellation | INR 6,000 subtotal / 5,400 final | only 5,400 removed | PASS |
| First Order cancellation | INR 1,000 subtotal / 950 final | only 950 removed | PASS |
| Refund INITIATED / COMPLETED | revenue already excludes cancelled order | no further deduction | PASS |
| Shared store + stock/wishlist tests | filters/page and photo preview inputs retained | 26/26 tests pass; hidden tabs/Add/Edit skipped | PASS |

Live cleanup verified original orders/notifications/photos/users and every original stock value/timestamp. Backend/frontend builds pass. Chart/PDF generation checked against 44 measured snapshots; a current-month PDF was rendered and inspected. The broad frontend suite has 23 failures (234/257 pass), including missing-module resolution and older UI-contract assertions, left outside this task. Authenticated browser verification of every notification/badge state remains manual; live data checks and mocked display/helper checks are distinguished in the backend report. No photo/storage/schema/auth/provider changes or new dependencies.

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

## Dynamic homepage offer banner and plant props
Added the Homepage banner card to /admin/offers and a singleton homepage_banner setting (idempotent default: enabled, BIG_ORDER). The public /api/v1/home/banner endpoint exposes only safe live offer values, hides disabled/missing offers and checks First Order customer eligibility privately. Configuration caches for 30 seconds, invalidates on offer/banner changes, and Home refreshes while visible. Audit entries use the existing offer audit log; its field constraint now permits the two banner fields. Checkout/order calculations and stored data are unchanged.
The Home banner is directly below the hero, shares its live preview with admin, and uses a same-height skeleton. Existing collection frames/photos/cards/links/filters are unchanged; only three generated transparent plant-and-vase props were added as compressed lazy WebP overlays.
See docs/homepage-banner.md for APIs, setup, asset paths, generation prompts and validation details.

### Mobile Customize page
The existing mobile Customize tab (/studio) now shows a frame-and-plant scene, an accessible Enquiry Now appointment card, consultation copy and four benefits below 768px. The desktop page is unchanged. The card opens the existing appointment form with sticky-header-aware scrolling and reduced-motion support; booking fields and logic are unchanged. Existing compressed plant artwork is reused with CSS-built frames. Consultation copy is static: no BULK_MIN_QUANTITY config or quantity rules were added.

## Optional customer order photo
Product previews stay browser-local. Buy Now carries the selected photo to the existing checkout, with optional private upload, progress, replacement, Clear and Retry (JPG/PNG/WebP, 4 MB). Order details show download text only; staff views/exports include the snapshot filename. COD and offer calculations are unchanged. Frontend suite: 211 passed. Responsive fixture checked at 320/390/768/1280px without overflow. See backend docs/customer-order-photos.md for setup and remaining real-device checks.

## Customer header readability
The shared wordmark is 36px on desktop and fluid 21–26px on mobile/tablet, preserving its font weight and existing 60px/76px rows. One data-header-theme="on-video" state follows the existing hero-slide signal and header overlap on scroll/resize. Text/icons stay #111111 over video; a header-only 78–92% white gradient and blur protect contrast even over black footage, without editing the hero/video. Count badges are black on white in this state. Other-page colors/navigation are unchanged. Announcement typo fixed to SIGN IN; its existing static 5% message source was left unchanged. Verified expanded/compact fixtures at 320/375/768/1440px with fixed 60px/76px heights, black wordmark/badge text and no overflow. Live homepage video -> scroll past hero -> scroll back correctly switched on-video/default, and the mobile menu and Shop All navigation worked.




## Admin-uploadable homepage banner image
The existing Offers > Homepage banner card supports staff-only upload/replace/remove of public banner artwork (JPG/PNG/WebP, 2 MB; recommended 1200x400). Preview and storefront share the same clipped, responsive cover crop; failed/removed images use the existing default art. The private customer-photos bucket is unchanged. See [homepage-banner.md](docs/homepage-banner.md) for setup, API flow, cleanup, validation results and the five unrelated existing frontend test failures.

## Per-variant customer photo limits — audit and update
### Audit (before this change)
| Location | Previous rule | Current rule |
| --- | --- | --- |
| backend src/modules/order-photos/photo-file.ts | PHOTO_MAX_BYTES = 4 x 1024 x 1024; fixed 4 MB error | Absolute transport/type-validation cap derived from MAX_PHOTO_MAX_MB (10) |
| backend order-photos.routes.ts | Multer cap 4 MB + one byte; fixed 4 MB error | Global cap + one byte; authenticated cart context then enforces the stricter DB limit |
| backend order-photos.service.ts | No variant-dependent check at upload or final reservation | getPhotoMaxBytes at upload and before order creation; final maxAllowedMB snapshot |
| frontend services/order-photos.service.ts | Fixed 4 MB validation | Shared helper, default 4 or selected/cart variant limits |
| product Upload Your Photo | Fixed “up to 4 MB” hint/check | Live “Max file size: X MB” for the selected variant |
| checkout Upload your photo card | Fixed “up to 4 MB” hint/check | Lowest limit across final cart variants; shows the unique limiting item when applicable |
| Supabase customer-photos | Private, 4,194,304-byte bucket cap | Still private, 10,485,760-byte physical cap; same three MIME types |
| order_photos sizeBytes CHECK | Positive and at most 4,194,304 bytes | Positive and at most the global 10 MB cap; necessary to store permitted larger photos |

### Configuration and admin
DEFAULT_PHOTO_MAX_MB = 4, MIN_PHOTO_MAX_MB = 1, MAX_PHOTO_MAX_MB = 10 live in utils/photo-limits.ts. These independently deployed repositories carry byte-identical copies of this small shared contract; the backend is authoritative and frontend values cannot bypass it. SHA-256 parity was checked during validation. Keep both contract copies in sync when changing defaults/ranges.

Variant.maxPhotoSizeMB is nullable. Null/omitted/empty means default, not zero. Values must be numbers from 1 through 10 with at most one decimal. Add/Edit Product's existing per-variant modal now includes the optional input and helper text; variant rows/details show the effective limit. Existing required-step/Next rules remain intact. Admin/Employee role checks are unchanged, and customer updates are rejected. The API whitelist, product response types and variant CSV export include the new field.

getPhotoMaxBytes([variant]) uses that variant or the default. For several items it chooses the lowest effective limit; an empty list uses the default. Byte limits are floored to whole bytes; a file exactly at the byte limit passes. Validation messages show the file's size and allowed MB.

### Server-resolved cart context
The storefront cart is browser-local; existing checkout already resolves submitted item selections on the backend. Photo uploads therefore optionally include an items JSON field containing product/variant IDs and quantities only, never limit values. The backend reads the authenticated server cart and verifies each provided selection against current product/variant DB relations. When local selection IDs are supplied, independent lookups run in parallel. Without context, the owned server cart is used. Empty carts use the default for temporary upload; existing empty-order rejection is unchanged.

Checkout summaries return the current authoritative photo limit and limiting item. Product changes keep the local preview but warn and disable Add to Cart/Buy Now when the selected file is too large. Checkout rechecks on cart changes and immediately before placement. Oversized uploads return 413. Final order validation uses freshly loaded final variant IDs within the existing order transaction and rejects PHOTO_LIMIT_CHANGED (400, allowed MB included) before creating the order. Clear/replacement allows retry. An asynchronous Storage move failure still never fails a saved order.

OrderPhoto.maxAllowedMB is nullable for historical records and snapshots the applied limit for new uploads/final attachments. Existing attached photos/orders are not backfilled or recalculated.

### Deployment and storage
Stop the backend if Prisma is Windows-locked, run npm run prisma:generate, then npx tsx prisma/setup-variant-photo-limits.ts --apply. The script only adds the two nullable fields, validates the new variant range, raises the existing photo byte CHECK, and updates customer-photos to the global cap. It does not rewrite existing variant/photo/order values. No Prisma migrations were generated. The idempotent original photo setup script also reads the global cap now.

The bucket remains private. JPG/PNG/WebP, magic-byte validation, non-empty file checks, ownership, rate limits, one TEMP photo, one photo per order, optional upload, signed downloads, cleanup and failed-move retries remain unchanged. Admin product-media/banner uploads are separate and were not changed.

### Verification
- New backend tests cover defaults/range/empty input, 1.9 MB, exact 2 MB, one byte above, mixed 2/5 MB variants, forged context rejection, customer update denial, and a 3 MB TEMP upload becoming invalid after adding a 2 MB variant. Clearing/replacing then passes.
- Six new frontend tests pass; 18 focused affected upload/checkout/form tests pass.
- Live range/null/check-constraint tests ran in a rolled-back fixture; the private 10 MB bucket cap was verified. Existing variants and order totals/counts were unchanged.
- Shared helper sources are byte-identical. Builds/types and backend lint pass. Changed frontend limit components pass focused lint; ProductDetailsPage retains two pre-existing synchronous-effect lint findings outside this change.
- Mobile/admin/checkout fixture checked at 320/375/768/1440px: no overflow or console errors/warnings, optional 1–10 MB input, default text and limiting-item note readable.
- Full frontend suite: 225/230 pass; the same five unrelated header/collection/review failures remain untouched. No real customer order was created just for testing; a full real-device customer checkout walkthrough remains a final user acceptance check.

## Guest-local photo preview and upload at Place Order (13 November 2026)

Product photo selection and cropping no longer require login. The product page never uploads photo pixels or calls the photo API. Selected-variant JPG/PNG/WebP and exact byte-limit validation still use the shared photo-limit helper; switching to a smaller variant retains the preview but blocks adding/buying until it is cleared or replaced.

The local-photos service stores the original/crops as browser-local IndexedDB records and links a cropped photo to the cart selection (product, variant, colour). Guest login/cart merge preserves those keys. No new photo pixels are written to localStorage. Records expire after 24 hours (purged when storage is next read; expired records cannot be submitted). When IndexedDB is unavailable, an amber warning explains the memory-only fallback. Clear, cart removal, a successful move to wishlist, and successful order placement remove the relevant local photos. Existing localStorage-only previews from the older implementation are not migrated; choose the photo once again.

Checkout restores local photos, shows the filename/size, and asks the customer to choose one if multiple cart lines have photos. It enforces the strictest cart limit and rechecks the fresh server quote. Choosing a file here is local too. Only clicking Place Order triggers the authenticated private upload, then order creation with its returned photoId. Upload failure stops order creation and provides Retry; clearing the optional photo allows a photo-free order. Existing TEMP uploads remain recoverable for compatibility. Backend auth, real-file-type checks, per-variant limits, private bucket, FY naming, and attach flow are unchanged. No schema/database/backend source changes were made.

Validation:
- Production build and scoped changed-file lint passed.
- Seven new tests passed: IndexedDB reload/login-key persistence, 24-hour expiry, cart cleanup, unavailable-IndexedDB fallback, cropped bytes, local-only product flow, and upload-on-prepare with success/failure/multiple-choice/oversize/no-photo cases.
- Affected checkout/photo/cart regression tests pass. Full frontend suite: 232/237 passing; the same five pre-existing header/collection/review failures remain outside this change.
- Unchanged backend photo suites: 59 tests passed, including guest rejection and oversized-file rejection.
- Browser: guest selected/cropped the supplied family PNG, refreshed and saw the crop restored, used Buy Now and reached login, returned to the product with the crop intact, and cleared it. Checked 320px and 375px with no horizontal overflow; desktop preview remained intact.
- A real authenticated COD order and real Supabase upload were not submitted during this verification; those end-to-end acceptance checks remain for the customer test account. No real orders were created.

## Cancellation revenue and manual refund status (13 November 2026)

Cancellation is still allowed only from PLACED or PROCESSING. Admin/employee cancellation requires the amount warning and accepts an optional plain-text reason. New cancellations save cancelledBy (admin/customer), cancelledAt and cancellationReason, while the existing status history retains the authenticated actor ID/role. Retrying a cancellation returns the existing result; totals are never decremented through a stored counter.

Revenue is computed from current orders whose status is not CANCELLED. The shared backend orders/revenue helper is used by the Overview card/chart/count, fresh revenue PDF, and filtered Orders export summary. Cancelled orders remain in list/export results with their original amount and an Excluded from revenue label. Refund changes never affect revenue. Overview uses current backend data rather than the first 100 paginated orders; it refreshes on local/cross-tab order events and polls every 15 seconds while visible. No server revenue cache is retained; browser order caches are invalidated after mutations. A cancellation is removed from its original order-date chart bucket. Revenue counts and averages exclude cancellations.

Cancellation effects run asynchronously using stable status-event IDs and upserts. Customers receive the store cancellation message. The shared staff inbox (visible to all ADMIN/EMPLOYEE users, never customers) receives a red bold ORDER_CANCELLED notification with order ID, customer, amount and staff name where applicable, linking to the exact order. Existing optimistic mark-as-read behaviour is unchanged. Delivery retries are bounded; notification failure never rolls back cancellation.

Manual refunds: null -> INITIATED -> COMPLETED, or null -> COMPLETED with explicit confirmation. COMPLETED is final. Only authenticated ADMIN/EMPLOYEE can call PATCH /api/v1/orders/:id/refund; customers/guests are rejected. The endpoint verifies CANCELLED status, compares the expected refund status atomically, stores actor/timestamps, and appends refundHistory. Repeats are idempotent. INITIATED/COMPLETED customer notifications use the matching polite message and stable audit-event ID. Customer trackers infer the canceller from legacy status history when new metadata is absent. Refund badges/dates appear in Orders lists/details, CSV and the existing table PDF.

Approved nullable Order additions: cancelledBy, cancelledAt, cancellationReason, refundStatus, refundInitiatedAt, refundCompletedAt, refundUpdatedBy, refundHistory. The notification enum gains ORDER_CANCELLED. The idempotent setup-order-refunds script was applied; historical rows were not backfilled and existing order count/amount aggregates were verified unchanged. No Prisma migration was generated. The database check allows refund states only on CANCELLED orders.

Important: these are MANUAL refund tracking controls, not a transfer/payment integration. Per the approved requirement, cancellation/refund instructions also apply to COD orders; staff must verify whether money was actually collected before sending a refund.

Verification:
- Backend: 580 tests passed, including 21 new cancellation/refund/revenue/auth tests; lint, TypeScript, build and Prisma validation pass.
- Frontend: new refund/message/control tests pass, affected order/tracker/filter/PDF regressions pass; production build passes.
- Full frontend regression baseline: only the five previously documented unrelated header/collection/review failures remain (241/246 before the additional visual-fixture test).
- Existing OrdersPage effect lint error and dependency warning predate this work; new components/helpers pass scoped lint.
- Browser fixture checked at 320px and 1440px: no horizontal overflow, readable refund badges, dates and messages, no console warnings/errors. This was a disposable component fixture, not an authenticated real-order mutation.
- No real order was cancelled, marked refunded, or otherwise edited during verification. Staff/customer end-to-end acceptance against real orders remains for your test account.
- Backend left stopped so you can start exactly one instance with npm run dev.

## Delivered/Cancelled photo cleanup and storage usage (14 November 2026)

Staff can open /admin/photo-cleanup. The backend requires an authenticated ADMIN or EMPLOYEE for listing, deletion and usage metrics; customer/guest requests are rejected. Only ATTACHED photos belonging to DELIVERED or CANCELLED orders are listed. Search, terminal-status/date filters and pagination run on the server; count and reclaimable size cover all matching records. Completion dates come from cancelledAt or the matching status-history event, not refund updates. Old records with no known terminal timestamp show "-" and are excluded by a completion-date filter rather than inventing dates. Date filter boundaries use Asia/Calcutta calendar days.

Deletion is PERMANENT: download first if needed. The UI requires confirmation and deletes only selected IDs (maximum 50 per API request), with optimistic removal, per-item results, rollback of failures and count/size toasts. The backend rechecks terminal order status under the existing customer-photo advisory lock, removes the private Supabase object first, then retains its record as a DELETED tombstone. storagePath is cleared to an empty string; fileName/size/order association remain historical metadata. deletedAt, deletedBy and deletedByName preserve the deletion actor and name snapshot. Missing storage files are safe to mark deleted, and repeat requests do not double-count or duplicate audit records. If storage succeeds but the DB transaction fails, retrying completes the tombstone safely. Attachment retries share the same lock and never recreate DELETED photos. Existing TEMP retention/cleanup rules are unchanged. No notifications were added.

photo_cleanup_audit records the authenticated actor ID/name, time, order IDs, per-item count and tracked bytes reclaimed, grouped by batchId. Each photo has one successful deletion audit. The audit table has RLS enabled and direct anonymous/authenticated access revoked. Existing orders, amounts and photo snapshots are not rewritten; order responses derive photoDeleted from the associated record. Admin details show deletion date/name; customer details hide download and show "Photo removed after order completion." The download URL API returns 410 for an authorized viewer of a deleted photo (other customers still receive 404). CSV/PDF photo columns show Deleted.

Overview has one Storage widget backed by GET /api/v1/admin/storage-usage. It reads actual Postgres database allocation through a fixed-search-path, read-only SECURITY DEFINER function with public/anon/authenticated EXECUTE revoked. Photo storage is the sum of sizeBytes on non-DELETED order_photos (TEMP and ATTACHED), not a Supabase billing inventory. Banners and orphaned objects are intentionally excluded; the widget states this. Pending cleanup count/bytes link to the new page. Results are cached for 5 minutes, Refresh bypasses the cache, and successful cleanup invalidates it. A failed individual size read displays Unavailable without breaking Overview.

Optional backend environment settings (also listed blank in .env.example):
- DB_SIZE_LIMIT_MB: your actual database capacity in MB.
- STORAGE_LIMIT_MB: the photo capacity you want to monitor in MB.
Both must be positive numbers when set. No plan limits were guessed or hardcoded. Blank/unset shows usage and "Limit not configured", without a percentage bar. Bars turn amber ABOVE 80% and red ABOVE 95%. MB uses 1,048,576 bytes; GB uses 1,073,741,824 bytes. Deleting photos reduces the tracked photo total; database allocation need not shrink, since tombstones/audits remain and Postgres retains allocated pages.

Setup/deployment:
- Nullable tombstone fields, private audit table, status checks and restricted helper functions were applied to the configured database using prisma/setup-photo-cleanup.ts --apply.
- Run npx tsx prisma/setup-photo-cleanup.ts --apply on any separate deployment database before deploying this version, then regenerate Prisma with the backend stopped.
- npx tsx prisma/check-photo-cleanup.ts is a read-only verification of list queries, sizes, function permissions and unchanged photo counts/bytes.
- No Prisma migration was generated. No existing customer file or photo row was deleted during setup or testing.

Verification:
- 598 backend tests pass (55 files), including terminal-only deletion, per-item mixed failures, missing files, storage/DB failure retry, idempotency, audit, 410/ownership, cache invalidation and ADMIN/EMPLOYEE versus customer/guest access.
- Backend lint, typecheck, build and Prisma validation pass. Live DB checks were read-only and passed.
- Frontend production build and scoped new-file lint pass; all five new cleanup UI tests pass. Full frontend: 246/252 pass; six unrelated header/collection/review failures remain, including the header fixture's outdated fy-logo-mark asset stub. Those components were not changed.
- Disposable component fixture checked at 320px, 768px and 1440px: readable cards/table/widget, full-width mobile search, no document overflow and no console errors.
- Destructive storage calls were tested with mocks only. Real-file deletion and authenticated end-to-end deletion should be verified by you with a disposable photo after downloading anything needed.
- The temporary verification server was stopped; the backend remains stopped to avoid duplicate port-5000 processes.

## Homepage banner login and loading fix (15 November 2026)

Cause: the public banner used strict optional authentication, so an expired token could reject the request; the frontend also cleared the banner on request errors and replaced it with a skeleton whenever auth changed.
Fix: banner-only tolerant authentication treats invalid credentials as guest; existing protected APIs stay strict. The frontend retains the last successful banner through auth checking, login/logout, and failed refreshes.

- Added GET /api/v1/home/banner/public for public settings only, with Cache-Control: public, max-age=30, stale-while-revalidate=60. Personalized GET /api/v1/home/banner remains private, no-store. The existing 30-second in-memory cache never stores eligibility and still invalidates on admin offer/banner/image changes.
- FIRST_ORDER eligibility is one parameterized normalized email/phone history query. Accounts alone do not count; positive-value real orders do. Real cancelled orders continue counting as history, preserving the existing checkout anti-abuse policy. Failed/abandoned statuses and zero-value records do not count for this informational banner. Checkout rules and historical orders are unchanged.
- BIG_ORDER bypasses token validation and order-history queries entirely. Invalid/expired tokens and auth-provider errors on this informational endpoint are treated as guests.
- App bootstrap starts loading before React renders the hero. Public content is cached in sessionStorage (24-hour maximum stale fallback), revalidated in the background, and never replaced with an error result. Identity changes trigger fresh eligibility; stale responses are ignored. One silent retry handles request failures. Auth-checking changes do not hide or refetch the banner.
- Public banner images now preload with high priority and render eagerly with fixed dimensions; admin preview remains lazy. Existing object-fit/crop/fallback behavior is unchanged. Existing JPEG/PNG uploads are NOT automatically converted to WebP by this patch; no image-processing dependency or stored image rewrite was introduced.
- Validation: frontend production build and changed-file lint passed; backend TypeScript and changed-file lint passed. 16 backend banner tests, 4 relevant existing frontend banner tests, and 5 new cache/state regression tests passed.
- Read-only real-database measurements: cold public configuration 731.68 ms; 30 warm cached calls mean 0.0038 ms, max 0.0244 ms; normalized history query 107.70 ms. These are service/query timings, not full HTTP or browser timings, and exclude Supabase token verification. No valid customer access token was supplied, so live authenticated HTTP/Slow 3G/mobile layout and token-verification latency remain to be tested. The under-100-ms authenticated endpoint target is not claimed.
- No database schema, customer/order data, checkout discount rules, or unrelated UI was changed.

## iOS animation compatibility (15 November 2026)

Diagnosis: current Playwright WebKit reproduced the truck remaining off-screen with reduced motion, but normal-motion cart/truck playback already worked. The existing packing timeline animated left/bottom/width/height, and the dock compared raw rubber-band scroll offsets.
The cart uses an inline SVG walking-bag animation (as in the supplied video), not offset-path or a lazy-loaded truck asset. No unsupported scroll-timeline dependency was found in these three components; collection scroll-timeline rules are already feature-guarded.
A narrow iPhone visual check also showed the shipped pill covering the truck cab. Real iPhone/Low Power Mode behavior cannot be established by desktop WebKit emulation alone.

### Scoped changes

- Shared configuration: src/features/customer/animationConfig.ts centralizes principal cart/story/dock durations, reduced-motion detection, iOS detection, timeline capability detection, and scroll clamping.
- Truck/story: observe the animation stage itself, measure its unit width in pixels on resize, and use an iOS JS step clock rather than relying exclusively on CSS animationend. iOS packing animates transform and opacity only. The SVG truck has explicit compositing/transform origin hints; the iPhone shipped label sits above it instead of covering the cab. Reduced motion shows a stationary packed truck, not an invisible off-screen one.
- Dock: iOS transition is 400 ms with cubic-bezier(0.32, 0.72, 0, 1), with bottom safe-area padding. Negative/beyond-document offsets are ignored and clamped before direction changes; the existing 8 px threshold remains. Android/desktop retain the original 500 ms hide/show transition and 680 ms selection motion.
- Cart: preserve the real button click handler and existing walking-bag design, add touch-action: manipulation, a WebKit animation declaration, and compositing hint. Cart mutation still happens before visual feedback, so CSS playback does not delay the count or cart operation. No new fly-to-cart effect or business logic was introduced.
- No backend, API, database, route, product, or order changes.

### Verification

- Isolated fixture uses the real components: tests/fixtures/ios-motion.html. No customer data or backend API is needed.
- Browser runner: tests/ios-motion-browser.mjs. Supply PLAYWRIGHT_MODULE pointing to an installed Playwright module, or install Playwright separately for development; then run node tests/ios-motion-browser.mjs while Vite serves port 5174. MOTION_ENGINE=webkit or chromium runs one engine.
- WebKit uses iPhone 14/15/16/17 profiles, normal and reduced motion. Chromium compares Pixel 7 and Desktop Chrome, normal and reduced motion. Assertions cover tap/count feedback, truck visibility and drive-out, no page overflow, no runtime errors, dock duration, and synthetic negative rubber-band offsets. Device profiles emulate viewport/UA/touch, not historical iOS OS releases.
- Shared-helper unit tests: node --test tests/animation-config.test.mjs (3 passed). Changed-component lint and production build passed.
- The browser cart fixture verifies an immediate local count increment and the visual animation, not a live authenticated cart API.
- Manual hardware checklist (pending, not claimed as tested): real iPhone Safari and Chrome iOS, each with Low Power Mode OFF and ON; normal/reduced motion; tap add-to-cart; scroll truck fully into view and out; rotate; bounce at document top/bottom; check bottom safe area and cart badge.

Final browser result: all 12 scenarios passed (8 WebKit iPhone cases and 4 Chromium Android/desktop cases), including normal/reduced motion, dock timing, synthetic overscroll, cart feedback, visible truck and complete drive-out. No runtime errors or horizontal overflow were found in the fixture.

Mobile Profile (15 November 2026): removed Orders/Saved stat cards from the shared mobile/tablet hub below 1024px; header padding, Quick access, desktop cards, and shared order/wishlist counts remain unchanged.

Homepage banner visibility correction (15 November 2026): supersedes the earlier FIRST_ORDER banner eligibility rule. The enabled homepage banner and enabled featured offer now display to ALL visitors, including logged-in returning customers. Both banner endpoints return identical public, cacheable content without authentication or order-history lookups; the frontend always revalidates that public content and keeps it visible through login/logout. Checkout offer eligibility, discounts, orders, and admin enable/disable controls are unchanged. Deploy the backend and frontend changes together.

Rollback (15 November 2026, requested): restored the previous How it works component, CSS animation clock, container-unit fallback, packing timeline, label position, and reduced-motion behavior. This supersedes the story/truck portion of the iOS compatibility note; cart, dock, banner, and profile changes remain intact.

Mobile navigation drawer (15 November 2026): one shared CustomerMenuDrawer now renders a guest benefits/sign-in card or the signed-in customer avatar/full-name card, with live wishlist counts from existing state. Guest Wishlist/Orders links use the existing login return path; auth checking shows neutral skeletons. The 380 ms left-slide drawer includes focus trapping, Escape/backdrop/link closing, body scroll lock and safe-area/100dvh sizing; desktop navigation is unchanged. WebKit and Chromium checks passed at 320/375/414px for both variants, long names, counts 0/3/123, login return destinations, auth changes, active links, reduced motion and closing behavior; build and scoped lint passed.


## Contact page and admin media (15 November 2026)

The public Contact page now has a curved video hero, tap-to-play inline player, contact cards and a responsive Custom Framing banner. Book appointment, Home and bottom navigation are unchanged.

Admin > Settings > Storyboard video manages the Contact video, optional poster and banner; Contact details manages public phone/email/studio/address. No verified business details were supplied, so those fields remain blank until configured.

Public bucket site-media has backend-only writes. Limits: MP4/WebM 50 MB; JPG/PNG/WebP poster/banner 2 MB. Backend magic-byte checks, staff authorization, rate/concurrency limits and generated filenames protect uploads. Replacements/removals clean old files; failed writes compensate uploads, with a startup/daily orphan retry that rechecks active references. Private customer-photos is unchanged.

Three records in site_contact_settings hold storyboard_video, custom_framing_banner and contact_details, including updater/time. Idempotent setup was applied: npx tsx prisma/setup-contact-media.ts --apply. SUPABASE_SITE_MEDIA_BUCKET defaults to site-media; existing service credentials stay backend-only. Namespaced contact.* changes use the existing offer_audit log's required BIG_ORDER partition, without changing offers.

Default video references Home's current file without copying/changing it; poster/banner reuse the existing gallery-wall asset. Public GET /api/v1/site/contact-media is identical for guests/logged-in visitors, caches 60s and invalidates on changes. Media failures use defaults.

Verified: backend suite 630 passed, frontend validation 3 passed, builds/type checks/scoped lint passed; WebKit/Chromium layouts at 320/375/768/1440, extreme-image crops/fallbacks and mocked admin image upload/removal passed. The real Home video played inline in both engines with mute/pause/resume and scroll/hidden-tab pausing. A live temporary PNG upload/public GET returned 200 and was deleted. Live 50 MB network upload and physical-iPhone checks remain manual. Restart/redeploy both applications.

## Performance audit - Section 1 - 16 November 2026

Scope: architecture inspection and unchanged baseline only. No optimization has been applied yet. Work stops after this section for review. Forgot-password/recovery validation is excluded.

### Architecture and safety findings

- Frontend: React 19, Vite 8, TypeScript, Tailwind 4, Zustand, React Router and Axios. Route pages are lazy-loaded; PDF generation and revenue charts are already separate dynamic chunks.
- Backend: Express 5, Prisma 6, PostgreSQL, Supabase Auth/Storage, Zod, Multer and Pino. Existing request/error/auth boundaries are retained.
- Existing token/session migration, cart browser storage, banner/order caches and local photo IndexedDB recovery must remain unchanged.
- Checkout and authenticated offers routes explicitly use no-store. No customer-specific shared cache was added. Public catalog/banner caching and mutation invalidation require targeted verification before any cache optimization.
- Deployment uses Netlify SPA redirects and CSP headers. Potential compatibility risk, not yet live-confirmed: the CSP has no explicit media-src, so default-src self may block externally hosted video. Security policy was left unchanged.
- Backend startup runs existing seeds and maintenance jobs; it was not started during this read-only audit to avoid unintended data/file changes.

### Production JavaScript baseline

Fresh frontend production build passed. Sizes below use bytes and Node zlib gzip; dynamic chunks are not all downloaded on initial navigation.

| Measurement | Before (raw bytes) | Before (gzip bytes) | After |
| --- | ---: | ---: | --- |
| Entry JavaScript | 315182 | 98993 | Unchanged; no optimization yet |
| Initial static import graph | 388971 | 128106 | Unchanged; no optimization yet |
| All 139 JavaScript chunks combined | 2199502 | 689339 | Unchanged; no optimization yet |
| Lazy PDF report chunk | 436582 | 139927 | Unchanged |
| Lazy revenue chart chunk | 329092 | 96904 | Unchanged |

Lighthouse mobile/desktop scores, image loading and runtime endpoint timings: NOT MEASURED. No local frontend/backend listener was available at audit time; measuring a failed API page would not be a valid baseline. No before/after improvement is claimed.

### Existing regression baseline

- Backend: 53 files, 595 tests passed (recovery/forgot-password files excluded). These are isolated automated tests, not live registration, checkout or email delivery validation.
- Frontend: 263 tests; 248 passed, 15 failed, 0 skipped. Failures existed before optimization, spanning banner/checkout source expectations, header/checkout visual fixtures, collection integration, order metadata and review integration expectations. They need individual triage; they are not assumed harmless.
- Live Supabase Auth/database/storage connectivity and actual notification sender/receiver delivery are not certified by this section.
- Full requested feature regressions (including COD, photo recovery, appointments, notifications and responsive browser checks) remain pending after a safe runtime baseline is available.

### Changes, limits and next gate

Files changed in this section: frontend README.md and backend README.md only. Application source, API contracts, UI, business rules, Prisma schema/migrations, records, browser storage keys, Storage policies and image paths remain unchanged. Dependencies added/removed: none. API/image-loading changes: none.

Skipped for safety: speculative cache changes, broad dependency removal, schema/index changes, and starting backend maintenance jobs against existing data. Existing frontend test failures and dashboard-managed deployment configuration remain outstanding.

Next: start the normal local frontend/backend, establish reproducible Lighthouse/API baselines, triage the existing failing tests, then propose one small evidence-backed optimization. Wait for user review/approval before proceeding.

## Performance audit - Section 2 - 16 November 2026

Read-only runtime baseline completed against the running local backend and the existing production build served on 127.0.0.1:5174. User dev servers were not restarted or changed. Lighthouse 13.6.0 ran in fresh headless Chrome profiles, performance category only; mobile uses default simulated throttling and desktop the desktop preset. These are single-run local laboratory results, not deployed-site scores or a statistically stable benchmark.

| Page / profile | Performance | FCP | LCP | Total blocking time | CLS | Speed index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Home / mobile | 72 | 2.0 s | 6.2 s | 190 ms | 0 | 3.8 s |
| Home / desktop | 94 | 0.6 s | 1.5 s | 0 ms | 0 | 1.1 s |
| Shop All / mobile | 78 | 1.9 s | 5.1 s | 160 ms | 0 | 2.4 s |

Reports: D:/FrameYaad/performance-section2-mobile.json, performance-section2-desktop.json and performance-section2-products-mobile.json. No application dependency was added: Lighthouse ran from an existing external npm tool cache. The preview server was audit-only.

### Public API measurements

Client-observed localhost HTTP times include network/database/pool overhead, not isolated SQL execution time. First observed catalog response: 1057 ms, 200, 10514 response bytes. Six follow-up catalog requests: 422, 300, 260, 259, 293, 275 ms. A further 30 sequential requests using the storefront query parameters had 0 failures: minimum 242 ms, median 262 ms, p95 291 ms, maximum 521 ms. This does not prove intermittent failures impossible.

Banner: first observed 226 ms, then 6/7/6/5/6 ms. Contact media: first observed 162 ms, then 4/4/6/7/5 ms. All returned 200. Existing public caches are effective; no new cache was introduced.

### Findings and next safe optimization

Lighthouse identifies image delivery as a major opportunity. The unchanged footer illustration is 708250 bytes; Lighthouse estimates 662170 bytes of mobile image savings (an estimate, not achieved savings). Hero decorative images are larger than displayed; the mobile LCP image is discovered through JavaScript without a high-priority hint. CSS/render-blocking and unused JavaScript are additional investigation candidates. No assets, presentation, timing or animation behavior were changed.

Catalog code performs a parameterized filtering/facet query followed by product hydration. It already avoids a query-per-product loop. Changing query shape, caching or response selection without further measurement could risk filters, stock freshness or API equivalence, so it remains unchanged.

Next proposed section: optimize only an existing static image delivery path while preserving identical artwork, dimensions and transparency, then rebuild and repeat measurements and responsive checks. Defer broader query/cache/dependency changes until individually proven safe.

Changes this section: both README files only; generated audit JSON reports in the workspace. JavaScript bundle sizes remain the Section 1 baseline (initial graph 388971 raw / 128106 gzip bytes). No before/after optimization improvement is claimed yet. No accounts, orders, uploads or customer data were created/modified by the audit. Authenticated workflows, live notification delivery and full regression checks remain pending; forgot-password testing remains excluded. Stop here for user review before optimization.

## Performance optimization - Section 3 - 16 November 2026

Completed one narrowly scoped static-asset optimization: Footer.tsx now imports a lossless WebP copy of the existing footer illustration. The original PNG is retained unchanged. No markup, styles, dimensions, crop, lazy-loading behavior, links, newsletter logic, animation or other functionality changed.

| Footer asset | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Encoded size | 708250 bytes | 376536 bytes | 331714 bytes (46.8%) |
| Dimensions | 1942 x 484 | 1942 x 484 | Unchanged |

Decoded RGBA verification found zero visible color differences and zero alpha differences. Chromium and WebKit comparisons at 320/375/414/768/1440 pixels used the live footer's computed size/object-fit/object-position in a stable isolated capture (to avoid asynchronous page-scroll movement). All 10 comparisons were pixel-identical. The normal localhost:5173 page had no horizontal overflow or captured page errors. An initial live scrolling screenshot comparison was unstable; the isolated comparison distinguishes image differences from capture timing.

### Build, tests and measurements

- Production build and scoped Footer.tsx ESLint passed.
- New focused footer-delivery regression test passed.
- Full frontend suite: 264 tests, 249 passed, 15 failed, 0 skipped. The failing test names match Section 1; no new failures were introduced.
- Backend code/API/schema were not changed; no backend mutation or live account/order test was performed.
- Entry JavaScript: 315182 raw / 98998 gzip bytes (before: 315182 / 98993).
- All 139 JavaScript chunks: 2199503 raw / 689370 gzip bytes (before: 2199502 / 689339). Tiny filename/hash/compression variation is not a JavaScript optimization; the measurable saving is the image payload.

| Home Lighthouse profile | Before score | After score | Before LCP | After LCP | Before/after CLS |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mobile | 72 | 73 | 6.2 s | 6.1 s | 0 / 0 |
| Desktop | 94 | 95 | 1.5 s | 1.5 s | 0 / 0 |

Same Lighthouse 13.6.0 production-preview settings as Section 2, one run per profile. Small score changes may be run-to-run noise and are NOT claimed as a proven improvement caused by a below-fold footer image. The report confirms the footer resource is now 376536 bytes. Reports: D:/FrameYaad/performance-section3-mobile.json and performance-section3-desktop.json.

Important baseline qualification: WebKit found API CORS/access-control errors on the temporary 127.0.0.1:5174 preview origin. Therefore both Section 2 and Section 3 preview scores are provisional local laboratory comparisons, not certified full-backend/deployed-site measurements. The footer verification was rerun successfully on the normal localhost:5173 origin. CORS/security configuration was intentionally not changed. A matching-origin deployment audit remains outstanding.

Files: src/features/customer/components/Footer.tsx (one import), new src/assets/footer-craftsmanship.webp, new tests/performance-footer-image.test.mjs, and the two project README files. Workspace-only diagnostic script: D:/FrameYaad/performance-footer-check.cjs. No application dependencies added/removed; conversion/verification used bundled external Sharp/Playwright tools. No API, database, customer storage or upload paths changed.

Skipped: lossy compression, resizing/cropping, changing hero artwork, or rewriting image components, to preserve visual equivalence. Review the footer on Home/Shop/Contact at mobile and desktop widths before approving another section. Work stops here for user testing.

## Performance optimization - Section 4 - 16 November 2026

Scope: earlier discovery of the existing Home hero palm image only. main.tsx now calls React DOM's existing preload API for that image before mounting React, guarded by pathname === '/'. The existing hero image has fetchPriority="high". Its bytes, crop, styles, dimensions, alt/accessibility behavior, carousel, video, timing and reveal toggle are unchanged. Other entry routes do not preload/download the palm image. No global HTML preload was added.

### Verification and measured trade-off

Chromium and WebKit checks on the normal localhost:5173 origin passed at 375 and 1440 pixels: preload present on Home, high priority on the existing image, no horizontal overflow or captured page errors. Shop All direct entry has no palm preload or actual palm image download (Vite's development asset import module is not an image download).

| Browser / width | Before image request start | After image request start | After hero module response end |
| --- | ---: | ---: | ---: |
| Chromium / 375 | 712.7 ms | 307.1 ms | 472.5 ms |
| Chromium / 1440 | 504.4 ms | 284.1 ms | 437.8 ms |
| WebKit / 375 | 1119 ms | 292 ms | 819 ms |
| WebKit / 1440 | 1003 ms | 284 ms | 853 ms |

These development-server samples are not controlled statistical production benchmarks. The directly verified improvement is request ordering: the image now starts from a preload link before the hero module finishes, instead of starting from the rendered image afterward. Reports: D:/FrameYaad/performance-section4-before.json and performance-section4-after.json. Workspace browser check: D:/FrameYaad/performance-hero-check.cjs.

Build and scoped lint passed. Focused performance tests: 3 passed. Full frontend suite: 266 tests, 251 passed, the same 15 existing failing test names, 0 skipped. No new regression-suite failures. Backend was not changed; full authenticated transaction tests and a physical-iPhone check are not claimed in this section.

### Lighthouse comparison (provisional local preview)

| Home profile | Previous section score | This section score | Previous LCP | This LCP | CLS before / after |
| --- | ---: | ---: | ---: | ---: | ---: |
| Mobile | 73 | 70 | 6.1 s | 6.4 s | 0 / 0 |
| Desktop | 95 | 95 | 1.5 s | 1.4 s | 0 / 0 |

Mobile LCP request-discovery audit passes after the hint; overall score did not improve in this single run. Do not interpret the development timing samples or discovery audit as proof of an overall production speedup. Both preview-origin CORS limitations from Section 3 and run-to-run variation remain; investigate a reproducible matched-origin production audit before claiming an aggregate performance gain. Reports: D:/FrameYaad/performance-section4-mobile.json and performance-section4-desktop.json.

Bundle trade-off: entry 315292 raw / 99055 gzip bytes versus 315182 / 98998 previously (+110 raw / +57 gzip). All 139 JS chunks: 2199637 raw / 689465 gzip versus 2199503 / 689370. No image bytes changed and no application dependency was added/removed.

Files changed: src/main.tsx, src/features/customer/components/HeroSection.tsx, new tests/performance-hero-loading.test.mjs, and both README files. No API, schema, data, browser storage, business rules, fonts, security policy or image paths changed. Skipped: preloading all hero assets, global preloads on unrelated pages, and modifying animations or hero visuals. Please test Home loading/reveal/carousel and Shop All on mobile/desktop; pause here for approval.

**17 November 2026 — Admin Overview UI-only restyle:** scoped cards, storage columns, pastel KPIs, header report controls and responsive tables; existing hooks, state, calculations, handlers, request parameters, chart rules, permissions and caching remain unchanged (source-parity check passed).
Build/lint, synthetic-data PDF/range/refresh/link/empty-state checks and 1440/1024/768/375px screenshots passed; suite remains 251 passed / 15 pre-existing failures. No fake sparklines, product-search promise or new row navigation was added; live authenticated before/after Network comparison remains manual.

**17 November 2026 — Customers UI-only restyle:** list/profile cards, scoped desktop sidebar/top bar, responsive customer cards/order items and shared StatusBadge; all requests, calculations, hooks, handlers, routes, role rules, export and pagination logic preserved. Reference-only filters/actions/rows-per-page/Reports/submenu controls and sparklines were not invented.
Build, AST guards, mocked before/after Network parity (including search/pagination/export/profile/notifications), interactions and eight 1440/1024/768/375px screenshots passed; 253 tests pass with the same 15 existing failures, and three original list-page lint findings remain. Original conditional collapse is retained; no dependencies or backend changes.

2026-11-18: Clicking a product name in the admin Products list opens a read-only Product Details popup (same UI as Order Details).
Click check: mocked existing-product GET at 1440px/375px passed all four sections, no colours/images, Draft/long name, 25 variants, Escape/focus return, close X and failed-fetch retry; all requests were GETs and no records were changed. Uses the existing Edit product fetch and shared Modal; no lightbox was added because none exists in the product UI. Live authenticated product check remains manual; toggle/delete actions were not executed against real data.

2026-11-18: Order IDs in admin notifications are now links to the order details.
Verification: production build and mocked new-order/cancellation/status link checks passed (safe text, single mark-read/navigation, popup close, missing order and request failure). Dummy-order database check NOT run: configured remote DB was not verified as dev; no orders, notifications, stock, photos, revenue or records were created/changed, so no cleanup was required. Backend and customer notifications unchanged.

**18 November 2026 — Collection card title size:** verified in this frontend that the shared title variable is 18px (+3px desktop/tablet, +2px mobile), preserving font family, bold weight and colour, with single-line ellipsis and unchanged cards/buttons/images/links/trust strip. Previously completed screenshot/alignment checks at 1440/1024/768/375px (all four cards, Classic focus/hover) and production build passed; no further styling changes were needed on this verification.

**18 November 2026 — Collections Safari diagnosis:** WebKit reproduced heading occlusion on direct scroll/anchor navigation by the 60px sticky header (heading opacity 1, black, no reveal animation); older Safari also lacked the scroll-timeline-only carousel indicator.
**Fix/checks:** collection/title scroll margins clear the header without changing layout; unsupported timelines use a scroll-position indicator fallback. Build and mocked-API WebKit iPhone 14/15/SE/landscape plus Chromium Pixel/desktop checks pass with reduced motion on/off, four cards/trust items and anchor reload; real iPhone Low Power Mode remains a manual check.

**17 November 2026 — Wishlists UI-only restyle:** pink header/count pills, display-rank highlight, placeholder icons, responsive table and existing pagination; original compact Customers sidebar restored. Build/lint, request/logic parity and 1440/1024/768/375px synthetic checks pass; 254 tests pass with the same 15 existing failures. No backend/dependency changes; absent search/sort/retry handlers and image data were not invented.

**17 November 2026 — Products list UI-only restyle:** scoped header/stats/table/mobile cards, stock pills, four swatches/+N, accessible existing toggles/actions and local missing-image icon; hooks/calculations/handlers and API methods/parameters/bodies/counts preserved. Build, parity and synthetic 1440/1024/768/375px controls/0/105-product checks pass; 255 tests pass with the same 15 failures and two original lint findings. No backend/dependency changes; absent material/sort/bulk controls, retry panel and sparklines omitted; original conditional pagination retained.

**17 November 2026 — Add/Edit Product UI-only restyle:** shared card/input/upload styling, five-step shell, state-only previews/review and responsive layouts; no backend, dependency, payload, validation, upload-limit, toast or step-rule changes. Build, logic guard, mocked Create/Edit request/payload parity and 24 screenshots pass (draft, custom colour, optional uploads, four variants, photo limits, ten images); 256 tests pass with the same 15 failures and two original lint findings. Excluded blocks were not added; nonexistent Save as Draft, material description, drag/drop, variant selection/inline editing and review edit shortcuts were skipped; original upload-limit copy and first-image cover rule retained.
