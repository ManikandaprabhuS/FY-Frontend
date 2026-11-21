const {chromium,webkit,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),assert=require('node:assert/strict'),path=require('node:path');
const output=process.env.BANNER_TEST_OUTPUT||path.join(__dirname,'artifacts/banner-slider');fs.mkdirSync(output,{recursive:true});
const base=process.env.BANNER_TEST_URL||'http://127.0.0.1:5177/tests/fixtures/banner-slider.html';
const results=[];
async function open(browser,options={},query=''){
 const page=await browser.newPage(options),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.bannerCLS=0;try{new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.bannerCLS+=entry.value;}).observe({type:'layout-shift',buffered:true})}catch{}});
 await page.route('**/api/v1/**',r=>r.fulfill({json:{success:true,data:r.request().url().includes('homepage-banner')?{settings:{featuredOfferCode:'BIG_ORDER',enabled:true,updatedAt:'2026-11-21T00:00:00Z',bannerImageUrl:null}}:{videoUrl:null,posterUrl:null,bannerImageUrl:null,defaultVideoUrl:null,contactDetails:{phone:'+919876543210',email:'test@example.invalid',studioName:'Test studio',address:'Test address'}}}}));
 await page.goto(base+query);await page.locator('.fy-banner-slider, [aria-label="Featured homepage offer"], [aria-label="Upload custom framing banner image"]').waitFor();return {page,errors};
}
async function matrix(engine,name,width,device){
 const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));
 try{const {page,errors}=await open(browser,{...(device?devices[device]:{viewport:{width,height:900}}),reducedMotion:'no-preference'});const root=page.locator('.fy-banner-slider');await page.locator('[aria-label="Show banner 1"]').waitFor();
  const first=await root.boundingBox();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.clock.install();const advance=page.clock.runFor.bind(page.clock);const tick=async ms=>{await page.waitForTimeout(100);await advance(ms);await page.waitForTimeout(100);};
  const select=async n=>{await page.locator(`[aria-label="Show banner ${n}"]`).evaluate(b=>b.click());await page.waitForFunction(n=>document.querySelector('.fy-banner-slider').dataset.active===(n===1?'offer':'contact'),n);};
  await select(1);await tick(3100);assert.equal(await root.getAttribute('data-active'),'contact');await tick(3100);assert.equal(await root.getAttribute('data-active'),'offer');
  if(!device){await page.mouse.move(first.x+10,first.y+10);await tick(3500);assert.equal(await root.getAttribute('data-active'),'offer');await page.mouse.move(0,0);await tick(3100);assert.equal(await root.getAttribute('data-active'),'contact');}else await select(2);
  await page.locator('[aria-label="Show banner 2"]').focus();await tick(3500);assert.equal(await root.getAttribute('data-active'),'contact');await page.locator('[aria-label="Show banner 2"]').press('ArrowRight');assert.equal(await root.getAttribute('data-active'),'offer');await page.evaluate(()=>document.activeElement.blur());
  await page.locator('[aria-label="Pause banner rotation"]').evaluate(b=>b.click());await tick(3500);assert.equal(await root.getAttribute('data-active'),'offer');await page.locator('[aria-label="Play banner rotation"]').evaluate(b=>b.click());
  await root.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerType:'touch',clientX:260,clientY:100})));await tick(3500);assert.equal(await root.getAttribute('data-active'),'offer');await root.evaluate(el=>el.dispatchEvent(new PointerEvent('pointerup',{bubbles:true,pointerType:'touch',clientX:100,clientY:100})));assert.equal(await root.getAttribute('data-active'),'contact');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await tick(3500);assert.equal(await root.getAttribute('data-active'),'contact');await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
  await page.evaluate(()=>scrollTo(0,1000));await page.waitForTimeout(100);await tick(3500);assert.equal(await root.getAttribute('data-active'),'contact');await page.evaluate(()=>scrollTo(0,0));await page.waitForTimeout(100);
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForFunction(()=>document.querySelector('.fy-banner-slider').dataset.active==='offer');await tick(6500);assert.equal(await root.getAttribute('data-active'),'offer');
  assert.equal((await root.boundingBox()).height,first.height);assert((await page.evaluate(()=>window.bannerCLS))<.01);
  await select(2);await tick(600);await page.screenshot({path:`${output}/banner-${name}-${width}.png`,fullPage:false});
  const copy=await page.locator('.fy-banner-slider__contact-cta').boundingBox(),controls=await page.locator('.fy-banner-slider__controls').boundingBox();assert(copy.y+copy.height<=controls.y+1,'CTA must not overlap controls');
  await page.locator('.fy-banner-slider__contact').click();await page.locator('#get-in-touch').waitFor();await tick(1200);
  assert(await page.evaluate(()=>document.querySelector('#get-in-touch').getBoundingClientRect().top>=69));assert.equal(await page.locator('a[href^="tel:"]').count(),1);assert.equal(await page.locator('a[href^="mailto:"]').count(),1);
  await page.evaluate(()=>scrollTo(0,0));await page.getByText('Contact anchor',{exact:true}).click();await tick(1200);assert(await page.evaluate(()=>document.querySelector('#get-in-touch').getBoundingClientRect().top>=69));assert.deepEqual(errors,[]);
  results.push({name,width,timing:true,pauses:true,manual:true,reduced:true,stableHeight:true,contactAnchor:true,errors});console.log('PASS',name,width);await page.close();
 }finally{await browser.close()}
}
(async()=>{if(!process.env.MOBILE_ONLY)for(const width of [320,375,768,1440])await matrix('chromium','desktop',width);await matrix('webkit','iPhone14',390,'iPhone 14');await matrix('chromium','Android',393,'Pixel 7');
 const browser=await chromium.launch({channel:'chrome'});try{
  let {page}=await open(browser,{viewport:{width:375,height:900}},'?noOffer');assert.equal(await page.locator('.fy-banner-slider__slide').count(),1);assert.equal(await page.locator('.fy-banner-slider__controls').count(),0);await page.locator('.fy-contact-banner img').evaluate(img=>img.dispatchEvent(new Event('error')));await page.waitForFunction(()=>!document.querySelector('.fy-banner-slider'));await page.close();
  ({page}=await open(browser,{viewport:{width:375,height:900}}));await page.locator('.fy-contact-banner img').evaluate(img=>img.dispatchEvent(new Event('error')));await page.waitForFunction(()=>document.querySelectorAll('.fy-banner-slider__slide').length===1);assert.equal(await page.locator('.fy-banner-slider__controls').count(),0);await page.close();
  ({page}=await open(browser,{viewport:{width:768,height:900}},'?admin&inactive'));assert(await page.getByLabel('Featured homepage offer').isDisabled());assert(await page.getByText('This offer is off, so the offer slide is hidden on the Home page. Choose an active offer.',{exact:false}).isVisible());await page.close();results.push({singleOffer:true,singleContact:true,bothUnavailable:true,inactiveAdmin:true});
  ({page}=await open(browser,{viewport:{width:1440,height:900}},'?admin'));assert(await page.getByText('Recommended size: 1800 x 600 px (3:1). JPG, PNG or WebP, max 2 MB. Keep the main subject in the center/right and the left side clear for text. The image is cropped to fit.').isVisible());await page.close();
  ({page}=await open(browser,{viewport:{width:1440,height:900}},'?contactAdmin'));assert(await page.getByText('Recommended size: 1800 x 600 px (3:1). JPG, PNG or WebP, max 2 MB. Keep the main subject in the center/right and the left side clear for text. The image is cropped to fit.').isVisible());await page.close();results.push({bothAdminHelpers:true});
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(path.join(output,'results-20261121.json'),JSON.stringify(results,null,2)));

