import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const browser=await chromium.launch();
try{
 for(const width of [320,375,414,768,1280]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on("pageerror",error=>errors.push(error.message));
  await page.route("**/api/v1/orders/customer-summary**",route=>route.fulfill({json:{success:true,data:{orders:[],pagination:{page:1,limit:10,total:0,totalPages:1}}}}));
  await page.goto("http://127.0.0.1:5174/tests/fixtures/profile-mobile.html");
  await page.locator(".fy-acct__hello").waitFor();
  assert.equal(await page.locator(".fy-acct__stats").isVisible(),width>=1024);
  assert.equal(await page.getByRole("link",{name:"Edit profile"}).isVisible(),true);
  const geometry=await page.locator(".fy-acct__hello").evaluate(node=>{
   const next=node.nextElementSibling,style=getComputedStyle(node);
   return {gap:next.getBoundingClientRect().top-node.getBoundingClientRect().bottom,padding:style.padding,borderRadius:style.borderRadius,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  assert.equal(geometry.padding,"16px");assert.equal(geometry.borderRadius,"16px");assert.equal(geometry.overflow,false);
  if(width<1024){
   assert(geometry.gap>=0&&geometry.gap<=28);
   await page.locator(".fy-acct__quick").getByRole("link",{name:/My orders/}).click();
   await page.getByRole("heading",{name:"Your orders",exact:true}).waitFor();
   await page.locator(".fy-acct__back").click();
   await page.locator(".fy-acct__quick").getByRole("link",{name:/Wishlist/}).click();
   await page.getByRole("heading",{name:"Wishlist",exact:true}).waitFor();
  }
  assert.deepEqual(errors,[]);
  console.info(JSON.stringify({width,statsVisible:width>=1024,...geometry,links:"passed"}));await page.close();
 }
}finally{await browser.close();}
