const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const output=process.env.HERO_TEST_OUTPUT||path.join(__dirname,'artifacts/hero-ios');fs.mkdirSync(output,{recursive:true});
const url='https://kiltmzomecjeucdeawmp.supabase.co/storage/v1/object/public/product-images/site/hero-video/1795268150335-9c75fe36-ded0-441e-9260-59f9e990300d.mp4';
const banner={code:'FIRST_ORDER',title:'First Order Offer',percentage:5,minOrderAmount:null,bannerImageUrl:null};
const results=[];
async function open(browser,options,debug=false){const page=await browser.newPage({...options,reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/api/v1/**',r=>{const path=r.request().url();const data=path.includes('/site-media/hero-video')?{video:{url,updatedAt:null}}:path.includes('/site/contact-media')?{videoUrl:null,posterUrl:null,bannerImageUrl:null,defaultVideoUrl:null,contactDetails:{phone:null,email:null,studioName:null,address:null}}:{banner,products:[],pagination:{total:0,totalPages:1}};return r.fulfill({json:{success:true,data}})});
 await page.addInitScript(()=>{Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:10,effectiveType:'4g',saveData:false}});window.heroEvents=[];const record=(event,v)=>{window.heroEvents.push({event,at:Math.round(performance.now()),slide:document.querySelector('.fy-hero')?.dataset.slide,time:v.currentTime,duration:Number.isFinite(v.duration)?v.duration:null,readyState:v.readyState,src:v.currentSrc,paused:v.paused,rectLeft:Math.round(v.getBoundingClientRect().left),muted:v.hasAttribute('muted'),inline:v.hasAttribute('playsinline')})};const play=HTMLMediaElement.prototype.play;HTMLMediaElement.prototype.play=function(){record('play-call',this);return play.call(this)};new MutationObserver(()=>{const v=document.querySelector('.fy-hero video');if(v&&!v.dataset.traced){v.dataset.traced='true';for(const e of ['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','playing','waiting','stalled','suspend','abort','error','pause','ended','fyhero:finish'])v.addEventListener(e,()=>record(e,v));}}).observe(document,{childList:true,subtree:true});});
 await page.goto((process.env.HERO_TEST_URL||'http://127.0.0.1:5177/')+(debug?'?debugVideo=1':''),{waitUntil:'domcontentloaded'});await page.locator('.fy-hero video').waitFor({state:'attached'});return {page,errors};}
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 for(const [name,options] of [['desktop',{viewport:{width:1440,height:1000}}],['Android',{...devices['Pixel 7']}]] ){
  const {page,errors}=await open(browser,options,true);
  await page.waitForFunction(()=>window.heroEvents.some(e=>e.event==='playing'),{},{timeout:12000});
  const attrs=await page.locator('.fy-hero video').evaluate(v=>({muted:v.hasAttribute('muted'),inline:v.hasAttribute('playsinline'),autoplay:v.hasAttribute('autoplay'),loop:v.loop,type:v.querySelector('source').type,poster:v.poster,opacity:getComputedStyle(v).opacity,preload:v.preload,count:document.querySelectorAll('.fy-hero video').length}));
  assert(attrs.muted&&attrs.inline&&attrs.autoplay&&!attrs.loop&&attrs.type==='video/mp4'&&attrs.poster&&attrs.opacity==='1'&&attrs.count===1);
  assert(await page.locator('.fy-hero video').evaluate((v,name)=>v.currentSrc.includes(name==='desktop'?'desktop-acbd8e83f55a':'mobile-4c170a80ef5f'),name),'must play the expected safe encode, not original fallback');
  assert.equal(await page.locator('.fy-hero__dots,.fy-hero__video-loading,.fy-banner-slider__controls').count(),0);
  assert(await page.locator('.fy-hero-debug').isVisible());
  await page.screenshot({path:path.join(output,'hero-'+name+'-debug.png')});
  await page.waitForFunction(()=>window.heroEvents.filter(e=>e.event==='ended').length>=2,{},{timeout:35000});
  const events=await page.evaluate(()=>window.heroEvents),ends=events.filter(e=>e.event==='ended'),calls=events.filter(e=>e.event==='play-call');
  assert(ends.every(e=>e.time>=9.1));assert.equal(calls.length,2,'one play request per full pass; no mid-pass reset');assert(calls.every(e=>e.time<.1&&e.readyState>=3&&Math.abs(e.rectLeft)<=2));assert.deepEqual(errors,[]);
  results.push({name,attrs,ends:ends.map(e=>e.time),events,errors});console.log('PASS playback',name);await page.close();
 }
 for(const width of [320,375,768,1440]){const {page,errors}=await open(browser,{viewport:{width,height:900}});await page.locator('.fy-banner-slider').waitFor();assert.equal(await page.locator('.fy-hero-debug,.fy-hero__dots,.fy-hero__video-loading,.fy-banner-slider__controls').count(),0);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,'controls-hidden-'+width+'.png')});assert.deepEqual(errors,[]);results.push({width,controlsGone:true,debugHidden:true});await page.close();}
 }finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>fs.writeFileSync(path.join(output,'results-20261121.json'),JSON.stringify(results,null,2)));

