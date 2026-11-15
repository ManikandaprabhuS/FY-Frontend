import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const {webkit,chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const base="http://127.0.0.1:5174/tests/fixtures/contact-page.html";
const details={phone:"+91 44123 45678",email:"test@example.invalid",studioName:"Test studio",address:"Test address for layout checks"};
const empty={videoUrl:null,posterUrl:null,bannerImageUrl:null,defaultVideoUrl:null,contactDetails:details};
const video=process.env.CONTACT_TEST_VIDEO_URL;
for(const engine of [webkit,chromium]){
 const browser=await engine.launch();
 try{
  const context=await browser.newContext(engine===webkit?{...devices["iPhone 14"]}:{viewport:{width:1440,height:900}});
  for(const width of [320,375,768,1440])for(const auth of ["guest","customer"]){
   const page=await context.newPage();await page.setViewportSize({width,height:900});
   const errors=[];page.on("pageerror",error=>errors.push(error.message));
   await page.route("**/api/**",route=>route.fulfill({json:route.request().url().includes("/site/contact-media")?{success:true,data:empty}:{success:true,data:{unreadCount:0,notifications:[],video:null}}}));
   await page.goto(base+"?auth="+auth);await page.getByRole("link",{name:details.phone}).waitFor();
   assert.equal(await page.locator("form").count(),0);
   assert.equal(await page.locator(".fy-contact video").count(),0);
   assert.equal(await page.getByRole("link",{name:details.phone}).getAttribute("href"),"tel:+914412345678");
   assert.equal(await page.getByRole("link",{name:details.email}).getAttribute("href"),"mailto:test@example.invalid");
   const size=await page.locator(".fy-contact-banner").evaluate(node=>{const box=node.getBoundingClientRect(),image=node.querySelector("img");return {overflow:document.documentElement.scrollWidth>innerWidth,ratio:box.width/box.height,fit:getComputedStyle(image).objectFit};});
   assert.equal(size.overflow,false);assert.equal(size.fit,"cover");assert(Math.abs(size.ratio-(width>=1024?4.25:width>=768?8/3:4/3))<.03);
   if(auth==="guest"&&(width===375||width===1440))await page.screenshot({path:(process.env.CONTACT_ARTIFACT_DIR||"D:/FrameYaad")+"/contact-"+engine.name()+"-"+width+".png",fullPage:true});
   await page.getByRole("link",{name:"Get in touch",exact:true}).click();await page.waitForTimeout(1000);
   const scrollCheck=await page.locator("#contact-cards").evaluate(node=>({top:node.getBoundingClientRect().top,y:scrollY,height:innerHeight,max:document.documentElement.scrollHeight-innerHeight}));console.info({engine:engine.name(),width,auth,scrollCheck});
   assert(scrollCheck.top>=0);
   assert.deepEqual(errors,[]);

   console.info(JSON.stringify({engine:engine.name(),width,auth,layout:"passed",contactLinks:"passed",noForm:true}));await page.close();
  }
  const page=await context.newPage();await page.setViewportSize({width:375,height:844});
  const images=[];
  for(const [width,height]of [[4000,400],[400,4000],[100,100]]){
   const data=await page.evaluate(({width,height})=>{const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const ctx=canvas.getContext("2d");ctx.fillStyle="#92795d";ctx.fillRect(0,0,width,height);return canvas.toDataURL("image/png");},{width,height});images.push(data);
  }
  let publicContent={...empty};
  await page.route("**/api/**",route=>route.fulfill({json:{success:true,data:publicContent}}));
  for(const image of images){
   publicContent={...empty,bannerImageUrl:image};
   await page.goto(base);await page.locator(".fy-contact-banner img").waitFor();await page.locator(".fy-contact-banner").scrollIntoViewIfNeeded();
   assert.equal(await page.locator(".fy-contact-banner").evaluate(node=>{const box=node.getBoundingClientRect(),img=node.querySelector("img").getBoundingClientRect();return Math.abs(box.width-img.width)<1&&Math.abs(box.height-img.height)<1&&document.documentElement.scrollWidth<=innerWidth;}),true);
  }
  publicContent={...empty,bannerImageUrl:"/invalid-contact-image.png"};
  await page.goto(base);await page.locator(".fy-contact-banner").scrollIntoViewIfNeeded();await page.waitForFunction(()=>document.querySelector(".fy-contact-banner img")?.getAttribute("src")?.includes("shop-hero-gallery-wall"));
  if(video){
   publicContent={...empty,videoUrl:video,defaultVideoUrl:video};
   await page.goto(base);await page.getByRole("button",{name:"Play FrameYaad story",exact:true}).waitFor();
   assert.equal(await page.locator(".fy-contact video").evaluate(node=>node.paused),true);
   await page.getByRole("button",{name:"Play FrameYaad story",exact:true}).click();
   await page.waitForFunction(()=>{const v=document.querySelector(".fy-contact video");return v&&!v.paused&&v.currentTime>0;},null,{timeout:30000});
   assert.equal(await page.locator(".fy-contact video").getAttribute("playsinline"),"");
   await page.getByRole("button",{name:"Unmute story video"}).click();
   assert.equal(await page.locator(".fy-contact video").evaluate(node=>node.muted),false);
   await page.locator(".fy-contact-banner").scrollIntoViewIfNeeded();
   await page.waitForFunction(()=>document.querySelector(".fy-contact video").paused);
   assert.equal(await page.locator(".fy-contact video").getAttribute("controls"),"");
   console.info(JSON.stringify({engine:engine.name(),videoPlayback:"passed",inline:true,scrollPause:"passed"}));
  }
  // Admin upload/replace/remove checks use an intercepted settings API; server-side
  // authorization, real signatures and storage compensation are covered by backend tests.
  const admin=await context.newPage();await admin.setViewportSize({width:1440,height:1000});
  let settings={video:null,poster:null,banner:null,defaultVideoUrl:null,contactDetails:details,updatedAt:{storyboard:null,banner:null,details:null}};
  await admin.route("**/api/**",async route=>{
   const req=route.request(),path=new URL(req.url()).pathname;
   if(req.method()==="PUT"){
    const kind=path.split("/").at(-1);settings={...settings,[kind]:{url:kind==="video"?(video||"/test.mp4"):images[0],fileName:kind==="video"?"video.mp4":"banner.png",sizeBytes:1000}};
   }
   if(req.method()==="DELETE")settings={...settings,[path.split("/").at(-1)]:null};
   await route.fulfill({json:{success:true,data:settings}});
  });
  await admin.goto(base+"?admin=1");await admin.getByRole("button",{name:"Storyboard video",exact:true}).click();
  await admin.getByLabel("Upload custom framing banner image").setInputFiles({name:"banner.png",mimeType:"image/png",buffer:Buffer.from(images[2].split(",")[1],"base64")});
  await admin.getByText("Custom Framing banner image updated.",{exact:true}).waitFor();
  await admin.getByText("This image is narrower than 1000 px. It can still be uploaded.",{exact:true}).waitFor();
  admin.on("dialog",dialog=>dialog.accept());
  await admin.getByRole("button",{name:"Remove",exact:true}).click();
  await admin.getByText("Media removed. The default will be used.",{exact:true}).waitFor();
  console.info(JSON.stringify({engine:engine.name(),extremeImages:"passed",imageFallback:"passed",adminUploadRemove:"passed"}));
  await context.close();
 }finally{await browser.close();}
}
