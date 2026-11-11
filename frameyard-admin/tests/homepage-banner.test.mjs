import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
const require=createRequire(import.meta.url),React=require("react");
const read=path=>readFile(new URL("../src/"+path,import.meta.url),"utf8");
const compile=(source,overrides={})=>{const module={exports:{}};new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);return module.exports;};
const service=compile(await read("services/homepage-banner.service.ts"),{"./api":{__esModule:true,default:{}}});
const big={code:"BIG_ORDER",title:"Big Order Offer",percentage:12,minOrderAmount:3000};
test("public and admin preview share live-value copy, safe shop link and decorative corners",async()=>{
 const Component=compile(await read("features/customer/components/HomepageBannerVisual.tsx"),{"react-router-dom":{Link:({to,children,...props})=>createElement("a",{...props,href:to},children)},"../../../services/homepage-banner.service":service,"../styles/homepage-banner.css":{}}).default;
 const html=renderToStaticMarkup(createElement(Component,{offer:big}));
 assert.match(html,/Flat 12% Off/);assert.match(html,/On orders above Rs. 3,000/);assert.match(html,/LIMITED TIME OFFER/);assert.match(html,/href="\/products"/);assert.match(html,/aria-labelledby/);
 const first=renderToStaticMarkup(createElement(Component,{offer:{...big,code:"FIRST_ORDER",percentage:7,minOrderAmount:null},preview:true}));
 assert.match(first,/7% Off/);assert.match(first,/On your first order/);assert.doesNotMatch(first,/Flat /);
});
test("no public banner means no empty region, while initial loading reserves matching height",async()=>{
 const source=await read("features/customer/components/HomepageOfferBanner.tsx");
 const build=state=>compile(source,{react:{...React,useEffect(){},useState:()=>[state,()=>{}]},"../../../store/authStore":{useAuthStore:selector=>selector({status:"unauthenticated",user:null})},"../../../services/homepage-banner.service":{homepageBannerService:{}},"./HomepageBannerVisual":{__esModule:true,default:()=>null}}).default;
 assert.equal(renderToStaticMarkup(createElement(build({owner:"guest",banner:null}))),"");
 assert.match(renderToStaticMarkup(createElement(build(undefined))),/Loading homepage offer/);
 assert.match(source,/30000/);assert.match(source,/document.hidden/);
});
function tree(node){if(!node||typeof node!=="object")return[];return[node,...[node.props?.children].flat(Infinity).flatMap(tree)];}
async function harness(){
 const states=[],refs=[],calls=[],toasts=[];let index=0,refIndex=0,resolve,reject;
 const pending=new Promise((a,b)=>{resolve=a;reject=b;});
 const setting={id:"homepage_banner",enabled:true,featuredOfferCode:"BIG_ORDER",updatedAt:"2026-11-11T00:00:00Z",updatedBy:null};
 const Component=compile(await read("pages/offers/HomepageBannerCard.tsx"),{
  react:{useEffect(){},useRef:value=>refs[refIndex++]??(refs[refIndex-1]={current:value}),useState:initial=>{const i=index++;if(!(i in states))states[i]=i===0?setting:initial;return[states[i],value=>{states[i]=typeof value==="function"?value(states[i]):value;}];}},
  "../../services/homepage-banner.service":{homepageBannerService:{update:input=>{calls.push(input);return pending;}}},
  "../../utils/toast":Object.fromEntries(["showApiError","showLoading","showSuccess","showWarning"].map(name=>[name,(...args)=>toasts.push([name,...args])])),
  "../../features/customer/components/HomepageBannerVisual":{__esModule:true,default:()=>null}
 }).default;
 return {render:()=>{index=0;refIndex=0;return Component({offers:[{...big,enabled:true}]});},states,calls,toasts,resolve,reject,setting};
}
test("banner toggle flips immediately, prevents duplicate submissions and rolls back on failure",async()=>{
 const h=await harness();tree(h.render()).find(n=>n.props?.role==="switch").props.onChange();
 assert.equal(h.states[0].enabled,false);assert.deepEqual(h.calls,[{enabled:false}]);
 assert.equal(h.toasts[0][0],"showWarning");assert.equal(h.toasts[0][1],"Banner hidden");
 tree(h.render()).find(n=>n.props?.role==="switch").props.onChange();assert.equal(h.calls.length,1);
 h.reject(new Error("Offline"));await new Promise(setImmediate);assert.equal(h.states[0].enabled,true);assert.equal(h.toasts.at(-1)[0],"showApiError");assert.equal(h.states[2],false);
});
test("selector saves only its allowed field with a loading/success toast",async()=>{
 const h=await harness();tree(h.render()).find(n=>n.type==="select").props.onChange({target:{value:"FIRST_ORDER"}});
 const save=tree(h.render()).find(n=>n.type==="button"&&n.props.children==="Save banner");assert.equal(save.props.disabled,false);save.props.onClick();
 assert.deepEqual(h.calls,[{featuredOfferCode:"FIRST_ORDER"}]);assert.equal(h.toasts[0][0],"showLoading");
 h.resolve({...h.setting,featuredOfferCode:"FIRST_ORDER"});await new Promise(setImmediate);assert.equal(h.toasts.at(-1)[0],"showSuccess");assert.equal(h.states[2],false);
});
test("only plant overlays are added; existing collection geometry and filter links remain",async()=>{
 const source=await read("features/customer/components/FrameCollectionsSection.tsx");
 assert.match(source,/collectionShopPath\(collection.id\)/);assert.match(source,/collection.fallbackPhoto.src/);assert.match(source,/fy-col__plant/);assert.match(source,/loading="lazy"/);
 const config=await read("features/customer/data/collectionPlants.ts");assert.match(config,/classic/);assert.match(config,/wooden/);assert.match(config,/premium/);assert.doesNotMatch(config,/metal:/);
 const home=await read("features/customer/pages/CustomerHomePage.tsx");assert(home.indexOf("<HeroSection")<home.indexOf("<HomepageOfferBanner"));assert(home.indexOf("<HomepageOfferBanner")<home.indexOf("<FrameCollectionsSection"));
});
