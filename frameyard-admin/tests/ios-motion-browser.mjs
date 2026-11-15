import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const {webkit,chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const baseline=process.argv.includes("--baseline");
for(const engine of [webkit,chromium].filter(engine=>!process.env.MOTION_ENGINE||engine.name()===process.env.MOTION_ENGINE)){
 const browser=await engine.launch();
 try{
  for(const profile of (engine===webkit?["iPhone 14","iPhone 15","iPhone 16","iPhone 17"]:["Pixel 7","Desktop Chrome"])) for(const reducedMotion of ["no-preference","reduce"]){
   const context=await browser.newContext({...devices[profile],reducedMotion});
   const page=await context.newPage();const errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   await page.goto("http://127.0.0.1:5174/tests/fixtures/ios-motion.html");
   const nav=page.locator('nav[aria-label="Quick navigation"]');
   await nav.waitFor({state:"attached"});await page.waitForTimeout(150);
   const duration=await nav.evaluate(node=>getComputedStyle(node).transitionDuration);
   if(!baseline&&reducedMotion==="no-preference")assert.equal(duration,engine===webkit?"0.4s":"0.5s");
   await page.evaluate(()=>{
    Object.defineProperty(window,"scrollY",{configurable:true,value:400});window.dispatchEvent(new Event("scroll"));
   });
   await page.waitForFunction(()=>document.documentElement.hasAttribute("data-dock-tucked"));
   await page.evaluate(()=>{
    Object.defineProperty(window,"scrollY",{configurable:true,value:-40});window.dispatchEvent(new Event("scroll"));
   });
   await page.waitForTimeout(60);
   if(!baseline)assert.equal(await page.locator("html").getAttribute("data-dock-tucked"),"");
   await page.evaluate(()=>{delete window.scrollY;window.scrollTo(0,0);window.dispatchEvent(new Event("scroll"));});
   const button=page.locator(".fy-cart");
   await button.click();await page.waitForTimeout(200);
   assert.equal(await page.getByTestId("cart-count").textContent(),"1");
   const cart=await button.evaluate(node=>({state:node.dataset.state,track:getComputedStyle(node.querySelector(".fy-walker-track")).transform,rect:node.getBoundingClientRect().toJSON()}));
   await page.locator(".fy-story__stage").scrollIntoViewIfNeeded();
   await page.getByRole("button",{name:/03 Made for your home/}).click();
   await page.waitForTimeout(2900);
   const story=await page.locator(".fy-story").evaluate(node=>{
    const truck=node.querySelector(".fy-story__truck"),stage=node.querySelector(".fy-story__stage");
    const t=truck.getBoundingClientRect(),s=stage.getBoundingClientRect();
    return {paused:node.hasAttribute("data-paused"),step:stage.dataset.step,truckVisible:t.right>s.left&&t.left<s.right&&t.bottom<=s.bottom&&t.top>=s.top,transform:getComputedStyle(truck).transform,static:node.hasAttribute("data-static"),width:document.documentElement.scrollWidth,viewport:innerWidth};
   });
   console.info(JSON.stringify({engine:engine.name(),profile,reducedMotion,duration,cart,story,errors}));
   if(!baseline){
    assert.equal(errors.length,0);assert.equal(story.paused,false);assert.equal(story.width<=story.viewport,true);
    assert.equal(story.static,reducedMotion==="reduce");
    if(reducedMotion==="no-preference"){assert.equal(story.truckVisible,true);assert.equal(cart.state,"adding");assert.notEqual(cart.track,"none");await page.waitForTimeout(1100);const exit=await page.locator(".fy-story__truck").evaluate(node=>getComputedStyle(node).transform);assert.notEqual(exit,story.transform);}
   }
   await context.close();
  }
 }finally{await browser.close();}
}
