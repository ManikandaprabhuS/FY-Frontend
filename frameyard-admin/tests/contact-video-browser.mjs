import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const {webkit,chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const video=process.env.CONTACT_TEST_VIDEO_URL;
if(!video)throw new Error("Set CONTACT_TEST_VIDEO_URL to the current public Home video URL.");
const data={videoUrl:null,posterUrl:null,bannerImageUrl:null,defaultVideoUrl:video,contactDetails:{phone:null,email:null,studioName:null,address:null}};
for(const engine of [webkit,chromium]){
 const browser=await engine.launch();
 try{
  const page=await browser.newPage({...devices[engine===webkit?"iPhone 14":"Pixel 7"]});
  await page.route("**/api/**",route=>route.fulfill({json:{success:true,data}}));
  await page.goto("http://127.0.0.1:5174/tests/fixtures/contact-page.html");
  const player=page.locator(".fy-contact video");
  await page.getByRole("button",{name:"Play FrameYaad story",exact:true}).waitFor();
  assert.equal(await player.evaluate(v=>v.paused),true);
  await page.getByRole("button",{name:"Play FrameYaad story",exact:true}).click();
  await page.waitForFunction(()=>{const v=document.querySelector(".fy-contact video");return v&&!v.paused&&v.currentTime>0;},null,{timeout:45000});
  assert.equal(await player.getAttribute("playsinline"),"");
  await page.getByRole("button",{name:"Unmute story video"}).click();
  await page.waitForFunction(()=>!document.querySelector(".fy-contact video").muted);
  await page.getByRole("button",{name:"Pause FrameYaad story",exact:true}).click();
  await page.waitForFunction(()=>document.querySelector(".fy-contact video").hasAttribute("controls"));
  await page.getByRole("button",{name:"Play FrameYaad story",exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector(".fy-contact video").paused);
  await page.locator(".fy-contact-banner").scrollIntoViewIfNeeded();
  await page.waitForFunction(()=>document.querySelector(".fy-contact video").paused);
  await page.waitForFunction(()=>document.querySelector(".fy-contact video").hasAttribute("controls"));
  await player.scrollIntoViewIfNeeded();await page.getByRole("button",{name:"Play FrameYaad story",exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector(".fy-contact video").paused);
  await page.evaluate(()=>{Object.defineProperty(document,"hidden",{configurable:true,value:true});document.dispatchEvent(new Event("visibilitychange"));});
  await page.waitForFunction(()=>document.querySelector(".fy-contact video").paused);
  console.info(JSON.stringify({engine:engine.name(),existingHomeVideo:"plays",inline:true,mutedToggle:"passed",scrollPause:"passed",simulatedHiddenTabPause:"passed"}));
 }finally{await browser.close();}
}
