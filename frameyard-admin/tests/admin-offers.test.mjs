import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir,writeFile,readdir} from "node:fs/promises";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
import {validateOfferInputs} from "../src/utils/offer-validation.ts";
const require=createRequire(import.meta.url);
const initial={code:"FIRST_ORDER",title:"First Order Offer",description:"5% off on your first order",percentage:5,minOrderAmount:null,enabled:true,version:1,updatedAt:"2026-11-10T06:00:00.000Z",updatedBy:null,usage:{orders:4,totalDiscount:350}};
async function compile(overrides={}){
 const code=await readFile(new URL("../src/pages/offers/OffersPage.tsx",import.meta.url),"utf8"),module={exports:{}};
 new Function("require","module","exports",ts.transpileModule(code,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>name==="./HomepageBannerCard"?{__esModule:true,default:()=>null}:overrides[name]??require(name),module,module.exports);
 return module.exports;
}
function tree(node){if(!node||typeof node!=="object")return[];return[node,...[node.props?.children].flat(Infinity).flatMap(tree)];}
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
async function harness(value=initial){
 const states=[],refs=[],notices=[],calls=[];let index=0,refIndex=0,reloads=0;
 const request=deferred();
 const modal=()=>null;
 const mod=await compile({
  react:{useState:start=>{const i=index++;if(!(i in states))states[i]=start;return[states[i],v=>{states[i]=typeof v==="function"?v(states[i]):v;}];},useRef:start=>{const i=refIndex++;return refs[i]??(refs[i]={current:start});}},
  axios:{isAxiosError:e=>Boolean(e?.isAxiosError)},
  "../../services/offers.service":{offersService:{update:(...args)=>{calls.push(args);return request.promise;}}},
  "../../utils/offer-validation":{validateOfferInputs},
  "../../utils/toast":Object.fromEntries(["showApiError","showError","showLoading","showSuccess","showWarning"].map(name=>[name,(...args)=>notices.push([name,...args])])),
  "../../components/ui/ConfirmDialog":{ConfirmDialog:modal},
  "../../components/ui/Modal":{default:modal,__esModule:true},
 });
 const render=()=>{index=0;refIndex=0;return mod.OfferCard({initial:value,reload:async()=>{reloads++;},history(){}});};
 return{render,request,notices,calls,reloads:()=>reloads,modal};
}
test("offer input validation rejects blank/wrong types, limits, and excess precision",()=>{
 for(const value of [""," ","0","-5","101","abc","1000%","NaN","8.001"])assert.ok(validateOfferInputs(value));
 for(const value of ["","0","-1","2.5","abc"])assert.ok(validateOfferInputs("8",value));
 for(const value of ["0.01","8","8.25","100"])assert.equal(validateOfferInputs(value,"3000"),null);
});
test("deactivation confirms, flips optimistically, then rolls back with one replacement toast on failure",async()=>{
 const h=await harness();let nodes=tree(h.render());
 nodes.find(n=>n.props?.role==="switch").props.onClick();
 nodes=tree(h.render());const dialog=nodes.find(n=>n.type===h.modal&&n.props?.message);
 assert.equal(dialog.props.message,"Customers will no longer see or use this offer.");
 dialog.props.onConfirm();
 assert.equal(tree(h.render()).find(n=>n.props?.role==="switch").props["aria-checked"],false);
 assert.equal(h.notices[0][0],"showWarning");assert.equal(h.notices[0][1],"Offer deactivated");
 h.request.reject(new Error("Offline"));await new Promise(setImmediate);
 assert.equal(tree(h.render()).find(n=>n.props?.role==="switch").props["aria-checked"],true);
 assert.equal(h.notices.at(-1)[0],"showApiError");
 assert.equal(h.notices[0][2].id,h.notices.at(-1)[3].id);
});
test("save enables only for valid changed values and sends the current version",async()=>{
 const h=await harness();let nodes=tree(h.render());
 assert.equal(nodes.find(n=>n.type==="button"&&n.props.className?.includes("bg-black px-5")).props.disabled,true);
 nodes.find(n=>n.type==="input"&&n.props["aria-label"]==="First Order Offer percentage").props.onChange({target:{value:"8"}});
 nodes=tree(h.render());const save=nodes.find(n=>n.type==="button"&&n.props.className?.includes("bg-black px-5"));
 assert.equal(save.props.disabled,false);save.props.onClick();
 assert.deepEqual(h.calls[0],["FIRST_ORDER",{version:1,percentage:8}]);assert.equal(h.notices[0][0],"showLoading");
 h.request.resolve({...initial,percentage:8,version:2});await new Promise(setImmediate);
 assert.equal(h.notices.at(-1)[0],"showSuccess");
 assert.equal(tree(h.render()).find(n=>n.type==="button"&&n.props.className?.includes("bg-black px-5")).props.disabled,true);
});
test("high discounts require confirmation before any save request",async()=>{
 const h=await harness();tree(h.render()).find(n=>n.type==="input").props.onChange({target:{value:"60"}});
 tree(h.render()).find(n=>n.type==="button"&&n.props.className?.includes("bg-black px-5")).props.onClick();
 assert.equal(h.calls.length,0);
 const dialog=tree(h.render()).find(n=>n.type===h.modal&&n.props?.message);
 assert.equal(dialog.props.message,"This is a high discount. Are you sure?");
 dialog.props.onConfirm();assert.equal(h.calls.length,1);
 h.request.resolve({...initial,percentage:60,version:2});await new Promise(setImmediate);
});
test("edit conflicts show warning and reload latest settings",async()=>{
 const h=await harness({...initial,enabled:false});
 tree(h.render()).find(n=>n.props?.role==="switch").props.onClick();
 assert.equal(h.notices[0][1],"Offer activated");
 h.request.reject({isAxiosError:true,response:{status:409}});await new Promise(setImmediate);
 assert.equal(h.reloads(),1);assert.equal(h.notices.at(-1)[0],"showWarning");
 assert.equal(tree(h.render()).find(n=>n.props?.role==="switch").props["aria-checked"],false);
});
test("admin offer cards render both fixed settings with usage/history and mobile wrapping",async()=>{
 const mod=await compile({
  "../../services/offers.service":{offersService:{}},
  "../../utils/offer-validation":{validateOfferInputs},
  "../../utils/toast":{},
  "../../components/ui/ConfirmDialog":{ConfirmDialog:()=>null},
  "../../components/ui/Modal":{default:()=>null,__esModule:true},
 });
 const big={...initial,code:"BIG_ORDER",title:"Big Order Offer",description:"10% off on orders above Rs. 5,000",percentage:10,minOrderAmount:5000};
 const html=renderToStaticMarkup(createElement("main",{className:"mx-auto max-w-6xl space-y-5 p-4 md:p-8"},createElement("h1",{className:"text-3xl font-bold"},"Offers"),createElement("div",{className:"grid gap-5 lg:grid-cols-2"},...[initial,big].map(o=>createElement(mod.OfferCard,{key:o.code,initial:o,reload:async()=>{},history(){}})))));
 assert.match(html,/First Order Offer/);assert.match(html,/Big Order Offer/);assert.match(html,/History/);assert.match(html,/Last updated by/);assert.match(html,/Total discount given/);
 assert.doesNotMatch(html,/Create offer|Delete offer/);
 await mkdir(new URL("../tmp/",import.meta.url),{recursive:true});
 const css=(await readdir(new URL("../dist/assets/",import.meta.url))).find(f=>/^index-.*\.css$/.test(f));assert(css);
 await writeFile(new URL("../tmp/admin-offers-preview.html",import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>Admin offers visual test</title></head><body>'+html+'</body></html>');
});
test("checkout preflight submits the applied version and staff route is not admin-only",async()=>{
 const source=await readFile(new URL("../src/features/customer/components/CheckoutOffers.tsx",import.meta.url),"utf8");
 assert.ok(source.indexOf("await checkoutService.offers(selections)",source.indexOf("const place="))<source.indexOf("await checkoutService.place"));
 assert.match(source,/selected\?\.version/);assert.match(source,/This offer was updated/);
 const routes=await readFile(new URL("../src/routes/index.tsx",import.meta.url),"utf8");assert.match(routes,/path: 'offers', element: <OffersPage/);
});
