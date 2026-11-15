import {createRequire} from "node:module";
import assert from "node:assert/strict";
const require=createRequire(import.meta.url);
const {webkit,chromium,devices}=require(process.env.PLAYWRIGHT_MODULE||"playwright");
const base="http://127.0.0.1:5174/tests/fixtures/navigation-drawer.html";
const warning="Please login / create an account to continue";
const longName="Manikandasprabhu Very Long Customer Family Name For Ellipsis";
for(const engine of [webkit,chromium]){
 const browser=await engine.launch();
 try{
  for(const width of [320,375,414])for(const auth of ["unauthenticated","authenticated"]){
   const context=await browser.newContext({...devices[engine===webkit?"iPhone 14":"Pixel 7"],viewport:{width,height:844}});
   const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));
   await page.goto(base+"?"+new URLSearchParams({auth,count:"3",name:longName}));
   const open=async()=>{await page.getByRole("button",{name:"Open menu",exact:true}).click();await page.getByRole("dialog",{name:"Mobile navigation"}).waitFor();await page.waitForTimeout(420);};
   await open();
   const geometry=await page.locator(".fy-mobile-menu__panel").evaluate(node=>{
    const box=node.getBoundingClientRect(),footer=node.querySelector("footer").getBoundingClientRect(),style=getComputedStyle(node);
    return {width:box.width,top:box.top,height:box.height,footer:footer.bottom,duration:style.transitionDuration,overflow:document.documentElement.scrollWidth>innerWidth,locked:document.body.style.position};
   });
   assert(Math.abs(geometry.width-width*.9)<1);assert.equal(geometry.overflow,false);assert.equal(geometry.locked,"fixed");assert.equal(geometry.duration,"0.38s");assert(geometry.footer<=844);
   if(auth==="authenticated"){
    await page.locator(".fy-mobile-menu__identity strong").waitFor();
    assert.equal(await page.locator(".fy-mobile-menu__identity strong").getAttribute("title"),longName);
    assert.equal(await page.getByText("3 saved",{exact:true}).isVisible(),true);
    assert.equal(await page.getByRole("link",{name:/Your account/}).isVisible(),true);
   }else{
    assert.equal(await page.getByText("Sign in to save frames, track orders and more.",{exact:true}).isVisible(),true);
    assert.equal(await page.locator(".fy-mobile-menu__saved").count(),0);
   }
   assert.equal(await page.locator(".fy-mobile-menu__primary").getByRole("link",{name:"Home",exact:true}).getAttribute("aria-current"),"page");
   await page.getByRole("button",{name:"Close menu",exact:true}).focus();
   await page.keyboard.press("Shift+Tab");await page.keyboard.press("Shift+Tab");
   assert.equal(await page.locator(".fy-mobile-menu__cta").evaluate(node=>node===document.activeElement),true);
   await page.keyboard.press("Tab");assert.equal(await page.locator(".fy-mobile-menu__brand").evaluate(node=>node===document.activeElement),true);
   await page.keyboard.press("Escape");
   assert.equal(await page.locator(".fy-mobile-menu").getAttribute("data-open"),"false");
   assert.equal(await page.evaluate(()=>document.body.style.position),"");
   await open();await page.getByRole("button",{name:"Close menu",exact:true}).click();
   await open();await page.locator(".fy-mobile-menu__backdrop").click({position:{x:width-3,y:150}});
   await open();await page.locator(".fy-mobile-menu__primary").getByRole("link",{name:"Home",exact:true}).click();
   assert.equal(await page.locator(".fy-mobile-menu").getAttribute("data-open"),"false");
   if(auth==="unauthenticated"){
    for(const [label,destination] of [["Wishlist","/profile#wishlist"],["Your orders","/profile#orders"]]){
     await page.goto(base+"?auth=unauthenticated");await open();
     await page.getByRole(label==="Wishlist"?"button":"link",{name:label,exact:true}).click();
     await page.getByText(warning,{exact:true}).waitFor();
     await page.getByRole("button",{name:"Complete test sign in"}).click();
     await page.waitForFunction(path=>document.querySelector('[data-testid="destination"]').textContent===path,destination);
    }
   }else{
    await open();await page.getByRole("button",{name:"Wishlist",exact:false}).click();await page.getByRole("dialog",{name:"Wishlist popup"}).waitFor();
   }
   assert.deepEqual(errors,[]);console.info(JSON.stringify({engine:engine.name(),width,auth,layout:"passed",focus:"passed",close:"passed",links:"passed"}));
   await context.close();
  }
  const page=await browser.newPage({viewport:{width:375,height:844}});
  for(const count of [0,123]){
   await page.goto(base+"?auth=authenticated&count="+count);await page.getByRole("button",{name:"Open menu",exact:true}).click();
   if(count)await page.getByText("123 saved",{exact:true}).waitFor();else assert.equal(await page.locator(".fy-mobile-menu__saved").count(),0);
  }
  await page.goto(base+"?auth=checking");await page.getByRole("button",{name:"Open menu",exact:true}).click();await page.getByRole("status",{name:"Checking account"}).waitFor();
  assert.equal(await page.locator(".fy-mobile-menu__guest").count(),0);
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("drawer-fixture-auth",{detail:"authenticated"})));
  await page.locator(".fy-mobile-menu__account").waitFor();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("drawer-fixture-auth",{detail:"checking"})));await page.getByRole("status",{name:"Checking account"}).waitFor();
  await page.evaluate(()=>window.dispatchEvent(new CustomEvent("drawer-fixture-auth",{detail:"unauthenticated"})));await page.locator(".fy-mobile-menu__guest").waitFor();
  for(const route of ["/products","/studio","/book-appointment","/contact-us","/profile#orders"]){
   await page.goto(base+"?"+new URLSearchParams({auth:"authenticated",route}));await page.getByRole("button",{name:"Open menu",exact:true}).click();
   await page.locator(".fy-mobile-menu__link.is-active").waitFor();
   assert.equal(await page.locator(".fy-mobile-menu__link.is-active").getAttribute("href"),route);
  }
  await page.emulateMedia({reducedMotion:"reduce"});assert.equal(await page.locator(".fy-mobile-menu__panel").evaluate(node=>getComputedStyle(node).transitionDuration),"0s");
  await page.setViewportSize({width:1280,height:900});await page.waitForTimeout(80);
  assert.equal(await page.locator(".fy-mobile-menu").isVisible(),false);
  console.info(JSON.stringify({engine:engine.name(),counts:[0,3,123],authSwitch:"passed",activeRoutes:"passed",reducedMotion:"passed",desktopHidden:true}));
  await page.close();
 }finally{await browser.close();}
}
