const fs=require('node:fs'),http=require('node:http'),assert=require('node:assert/strict');
const path=require('node:path');
const {webkit,chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const output=process.env.HERO_TEST_OUTPUT||path.resolve(__dirname,'artifacts/hero-video');fs.mkdirSync(output,{recursive:true});
const port=Number(process.env.HERO_TEST_PORT||5189),base='http://127.0.0.1:'+port;
const original='https://kiltmzomecjeucdeawmp.supabase.co/storage/v1/object/public/product-images/site/hero-video/1794317454303-76b64098-d874-460f-bfda-23bc8feafc62.mp4';
const server=http.createServer((req,res)=>{
 if(req.url.includes('/api/v1/')){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({success:true,data:req.url.includes('/site-media/hero-video')?{video:{url:original,updatedAt:null}}:{banner:null,products:[],pagination:{total:0,totalPages:1}}}));}
 if(!req.url.startsWith('/hero/')){const proxy=http.request({hostname:'127.0.0.1',port:5177,path:req.url,method:req.method,headers:{...req.headers,host:'127.0.0.1:5177'}},up=>{res.writeHead(up.statusCode,up.headers);up.pipe(res)});proxy.on('error',()=>{res.writeHead(502);res.end()});req.pipe(proxy);return;}
 const file=path.join(__dirname,'../public',req.url.split('?')[0]);if(!fs.existsSync(file)){res.writeHead(404);return res.end();}
 const b=fs.readFileSync(file),range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||''),start=range?Number(range[1]):0,end=range&&range[2]?Math.min(Number(range[2]),b.length-1):b.length-1;
 res.writeHead(range?206:200,{'Content-Type':file.endsWith('.mp4')?'video/mp4':'image/webp','Content-Length':end-start+1,'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${b.length}`}:{})});
 let pos=start,timer;const send=()=>{if(res.destroyed||pos>end)return res.end();const next=Math.min(pos+16384,end+1);res.write(b.subarray(pos,next));pos=next;timer=setTimeout(send,82)};timer=setTimeout(send,150);res.on('close',()=>clearTimeout(timer));
});
async function run(profile,engine){const browser=await(engine==='webkit'?webkit.launch():chromium.launch({channel:'chrome'}));const context=await browser.newContext({...devices[profile],reducedMotion:'no-preference'});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(({original,nonce,base})=>{
  Object.defineProperty(navigator,'connection',{configurable:true,value:{downlink:1.6,effectiveType:'4g',saveData:false}});
  const set=Element.prototype.setAttribute;Element.prototype.setAttribute=function(name,value){if(name==='src'&&this.tagName==='VIDEO'&&String(value).startsWith('/hero/'))value=String(value)+'?run='+nonce;return set.call(this,name,value)};
  const rewrite=url=>String(url).includes('/api/v1/')?base+String(url).slice(String(url).indexOf('/api/v1/')):url;const open=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(method,url,...args){return open.call(this,method,rewrite(url),...args)};const fetch=window.fetch;window.fetch=(url,...args)=>fetch(rewrite(url),...args);
  window.heroTimeline=[];let previous;function record(event,v){window.heroTimeline.push({event,at:Math.round(performance.now()),slide:document.querySelector('.fy-hero')?.dataset.slide,time:v?.currentTime??0,duration:Number.isFinite(v?.duration)?v.duration:null,readyState:v?.readyState??0,bufferedEnd:v?.buffered.length?v.buffered.end(v.buffered.length-1):0})}
  new MutationObserver(()=>{const root=document.querySelector('.fy-hero'),v=document.querySelector('.fy-hero__video');if(v&&!v.dataset.traced){v.dataset.traced='true';for(const event of ['loadedmetadata','canplay','canplaythrough','waiting','stalled','playing','pause','ended','timeupdate','error'])v.addEventListener(event,()=>record(event,v));}if(root&&root.dataset.slide!==previous){previous=root.dataset.slide;record('slide',v)}}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['data-slide']});
 },{original,base,nonce:Date.now()+Math.random().toString()});
 const file=path.join(output,'hero-20261121-'+profile.replaceAll(' ','-')+'.json');
 try{await page.goto(base+'/',{waitUntil:'domcontentloaded'});await page.locator('.fy-hero__video').waitFor({state:'attached'});await page.locator('[aria-label="Go to slide 2"]').evaluate(b=>b.click());
  if(process.argv[2]==='behavior'){
   const playing=()=>page.waitForFunction(()=>{const v=document.querySelector('.fy-hero__video');return v&&!v.paused&&v.currentTime>.4});
   const reset=()=>page.waitForFunction(()=>{const v=document.querySelector('.fy-hero__video');return v.paused&&v.currentTime<.1});
   await playing();
   await page.evaluate(()=>window.savedHeroVideo=document.querySelector('.fy-hero__video'));
   const before=await page.locator('.fy-hero__video').evaluate(v=>v.currentTime);
   await page.evaluate(()=>{const r=document.querySelector('.fy-hero').getBoundingClientRect();scrollTo(0,scrollY+r.bottom-20)});
   await page.waitForTimeout(350);
   assert(await page.locator('.fy-hero__video').evaluate((v,t)=>!v.paused&&v.currentTime>t,before),'20px visible must not pause');
   await page.evaluate(()=>scrollBy(0,-15));await page.waitForTimeout(150);await page.evaluate(()=>scrollBy(0,10));
   assert(await page.locator('.fy-hero__video').evaluate(v=>!v.paused),'small scroll must not pause');
   await page.evaluate(()=>{const r=document.querySelector('.fy-hero').getBoundingClientRect();scrollTo(0,scrollY+r.bottom+20)});await reset();
   await page.evaluate(()=>scrollTo(0,0));await playing();
   await page.locator('[aria-label="Go to slide 1"]').evaluate(b=>b.click());await reset();await page.waitForTimeout(300);assert.equal(await page.locator('.fy-hero').getAttribute('data-slide'),'0');
   await page.locator('[aria-label="Go to slide 2"]').evaluate(b=>b.click());await playing();
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))});await reset();
   await page.evaluate(()=>{Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'))});await playing();
   await page.evaluate(()=>document.querySelector('a[href="/products"]').click());await page.waitForURL('**/products');await reset();
   await page.evaluate(()=>document.querySelector('a[href="/"]').click());await page.waitForURL(base+'/');await playing();assert(await page.evaluate(()=>window.savedHeroVideo===document.querySelector('.fy-hero__video')));
   await page.emulateMedia({reducedMotion:'reduce'});await reset();assert.equal(await page.locator('.fy-hero').getAttribute('data-video-mode'),'poster-only');assert.equal(await page.locator('[aria-label="Loading video"]').count(),0);
   const count=await page.evaluate(()=>window.heroTimeline.filter(e=>e.event==='playing').length);await page.waitForTimeout(5500);assert.equal(await page.evaluate(()=>window.heroTimeline.filter(e=>e.event==='playing').length),count);
   assert.deepEqual(errors,[]);fs.writeFileSync(file.replace('.json','-behavior.json'),JSON.stringify({profile,passed:['partial visibility','small scroll','fully offscreen reset','manual slide reset','tab reset','route reset and retained node','reduced-motion poster/no autoplay'],errors,timeline:await page.evaluate(()=>window.heroTimeline)},null,2));console.log('PASS behavior',profile);return;
  }
  await page.waitForFunction(()=>window.heroTimeline.filter(e=>e.event==='ended').length>=5,{},{timeout:105000});
  const timeline=await page.evaluate(()=>window.heroTimeline),ends=timeline.filter(e=>e.event==='ended'),entries=timeline.filter(e=>e.event==='slide'&&e.slide==='1'),starts=entries.slice(0,5).map(entry=>timeline.find(e=>e.event==='playing'&&e.at>=entry.at));assert.equal(ends.length,5);assert(starts.every(e=>e&&e.time<0.2));assert(ends.every(e=>e.time>=e.duration-.05));
  // Every transition out of the video during these five passes follows native ended.
  for(const exit of timeline.filter(e=>e.event==='slide'&&e.slide==='0').slice(1))assert(timeline.some(e=>e.event==='ended'&&e.at<=exit.at&&exit.at-e.at<500));
  assert.deepEqual(errors,[]);
  const result={profile,engine,network:'media: 1.6 Mbps, 150ms initial latency; app shell local',passes:5,starts:starts.map(e=>e.time),ends:ends.map(e=>e.time),errors,timeline};fs.writeFileSync(file,JSON.stringify(result,null,2));console.log('PASS',profile,JSON.stringify({starts:result.starts,ends:result.ends}));
 }catch(error){fs.writeFileSync(file,JSON.stringify({profile,error:String(error),errors,timeline:await page.evaluate(()=>window.heroTimeline)},null,2));throw error}finally{await browser.close()}}
(async()=>{await new Promise(r=>server.listen(port,'127.0.0.1',r));for(const [profile,engine] of [['iPhone 14','webkit'],['iPhone 15','webkit'],['Pixel 7','chromium'],['Desktop Chrome','chromium']])if(!process.env.HERO_PROFILES||process.env.HERO_PROFILES.includes(profile))await run(profile,engine)})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{server.closeAllConnections();server.close()});

