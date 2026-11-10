import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir,mkdir,writeFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
const require=createRequire(import.meta.url),React=require("react");
const hooks={...React,useEffect(){},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value}),useState:initial=>[typeof initial==="function"?initial():initial,()=>{}]};
const Link=({to,children,...props})=>createElement("a",{...props,href:to},typeof children==="function"?children({isActive:false}):children);
function compile(text,overrides){const module={exports:{}};new Function("require","module","exports",ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);return module.exports.default;}
const read=path=>readFile(new URL("../src/"+path,import.meta.url),"utf8");
test("renders checkout products immediately for 1/5/20 items and generates mobile verification fixtures",async()=>{
 const assets=await readdir(new URL("../dist/assets/",import.meta.url)),css=assets.find(f=>/^index-.*\.css$/.test(f));assert(css);
 await mkdir(new URL("../tmp/",import.meta.url),{recursive:true});
 const html=(title,body)=>'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>'+title+'</title></head><body style="margin:0;background:#fafafa;color:#111">'+body+'</body></html>';
 const times=[];
 for(const count of [1,5,20]){
  const items=Array.from({length:count},(_,i)=>({key:"item-"+i,productIdentifier:"P-"+i,variantId:"v-"+i,name:"Frame "+(i+1),frameSize:"8 X 10",unitPrice:449,quantity:1}));
  const Component=compile(await read("features/customer/components/CheckoutOffers.tsx"),{react:hooks,"react-router-dom":{Link},"../../../store/customerCommerceStore":{useCustomerCommerceStore:selector=>selector({cartItems:items})},"../../../services/checkout.service":{checkoutService:{}},"../../../utils/toast":{},"./CheckoutAddressForm":{__esModule:true,default:()=>createElement("div",{className:"h-28 animate-pulse rounded-xl bg-black/5","aria-label":"Loading delivery address"})}});
  const start=performance.now(),body=renderToStaticMarkup(createElement(Component));const ms=performance.now()-start;
  assert.match(body,/Your products/);assert.match(body,new RegExp("Frame "+count));assert.match(body,/Checking available offers/);assert(ms<500);times.push({items:count,serverRenderMs:Math.round(ms)});
  if(count===1)await writeFile(new URL("../tmp/audit-checkout.html",import.meta.url),html("Checkout loading fixture",'<main class="mx-auto max-w-4xl p-4"><h1 class="text-3xl font-black">Checkout</h1>'+body+'</main>'));
 }
 const notices=[{id:"1",orderId:"fixture",title:"Order placed",message:"Your order FY-1234 has been placed.",type:"ORDER_PLACED",isRead:false,createdAt:new Date().toISOString()},{id:"2",orderId:"fixture",title:"Order status updated",message:"Your order FY-1234 is now Shipped.",type:"ORDER_STATUS",isRead:false,createdAt:new Date().toISOString()}];
 const states=[true,2,notices,1,false,false,false,false];let state=0;
 const oldDocument=globalThis.document;globalThis.document={body:{}};
 try{
  const Bell=compile(await read("features/customer/components/CustomerNotificationBell.tsx"),{react:{...hooks,useState:()=>[states[state++],()=>{}]},"react-dom":{createPortal:node=>node},"react-router-dom":{Link},"../../../services/customer-notifications.service":{customerNotifications:{}},"../../../utils/toast":{}});
  await writeFile(new URL("../tmp/audit-notifications.html",import.meta.url),html("Customer notification drawer fixture",renderToStaticMarkup(createElement(Bell))));
 }finally{globalThis.document=oldDocument;}
 const orders=Array.from({length:3},(_,i)=>({id:"order-"+i,orderNumber:"FY-"+(1234+i),createdAt:new Date().toISOString(),status:"PROCESSING",total:449,itemCount:1,items:[{id:"item-"+i,name:"Modern family frame",quantity:1,imageUrl:null,productId:"product"}]}));
 const Summaries=compile(await read("features/customer/components/CustomerOrderSummaries.tsx"),{react:hooks,"react-router-dom":{Link},"../../../components/ui/StatusBadge":{__esModule:true,default:({status})=>createElement("span",{className:"rounded-full border px-3 py-1 text-xs font-bold"},status)},"../../../services/customer-orders.service":{cachedCustomerOrders:()=>({orders,pagination:{page:1,totalPages:11,total:105}})},"../../../utils/toast":{}});
 await writeFile(new URL("../tmp/audit-order-list.html",import.meta.url),html("Customer orders fixture",'<main class="mx-auto max-w-4xl p-4"><h1 class="mb-4 text-2xl font-black">Orders History</h1>'+renderToStaticMarkup(createElement(Summaries,{userId:"fixture"}))+'</main>'));
 console.info(JSON.stringify({checkoutSsr:times,note:"SSR fixture timings, not browser/network end-to-end latency"}));
});
