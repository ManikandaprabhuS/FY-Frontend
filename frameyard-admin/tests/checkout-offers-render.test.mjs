import test from "node:test";
import assert from "node:assert/strict";
import {readFile,mkdir,writeFile,readdir} from "node:fs/promises";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
const require=createRequire(import.meta.url);
test("checkout offer cards render the applied backend quote without client price arithmetic",async()=>{
 const items=[{productIdentifier:"P",variantId:"11111111-1111-4111-8111-111111111111",quantity:12}];
 const signature=JSON.stringify(items);
 const quote={subtotal:6000,offers:[{code:"FIRST_ORDER",title:"First Order Offer",description:"5% off on your first order",percent:5,discountAmount:300,total:5700,bestOffer:false},{code:"BIG_ORDER",title:"Big Order Offer",description:"10% off on orders above Rs. 5,000",percent:10,discountAmount:600,total:5400,bestOffer:true}],addresses:[{id:"address",contactPerson:"Example customer",addressLine:"12 Example Road",city:"Chennai",postalCode:"600040"}]};
 const states=[quote,signature,"BIG_ORDER","address",false,false,0,undefined];let state=0;
 const overrides={
  "../../../utils/photo-limits":{getPhotoMaxBytes:()=>4194304,PHOTO_MB_BYTES:1048576},
  "./CheckoutPhotoUpload":{__esModule:true,default:()=>null},
  "../../../components/orders/OrderPhotoDownload":{__esModule:true,default:()=>null},
  react:{useEffect(){},useMemo:fn=>fn(),useRef:value=>({current:value}),useState:()=>[states[state++],()=>{}]},
  "react-router-dom":{useNavigate:()=>()=>{},Link:({to,children,...props})=>createElement("a",{...props,href:to},children)},
  "../../../store/customerCommerceStore":{useCustomerCommerceStore:selector=>selector({cartItems:items})},
  "../../../services/checkout.service":{checkoutService:{}},
  "./CheckoutAddressForm":{default:()=>null},
  "../../../store/authStore":{},"../../../services/local-photos":{},"../../../utils/toast":{},
 };
 const source=await readFile(new URL("../src/features/customer/components/CheckoutOffers.tsx",import.meta.url),"utf8"),module={exports:{}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);
 const html=renderToStaticMarkup(createElement(module.exports.default));
 assert.match(html,/Best offer/);assert.match(html,/Applied/);assert.match(html,/5,400.00/);assert.match(html,/600.00/);assert.match(html,/sm:grid-cols-2/);
 const assets=await readdir(new URL("../dist/assets/",import.meta.url));
 const css=assets.find(name=>/^index-.*\.css$/.test(name));assert(css);
 await mkdir(new URL("../tmp/",import.meta.url),{recursive:true});
 await writeFile(new URL("../tmp/offers-preview.html",import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>Checkout offers visual test</title></head><body style="margin:0;background:#fafafa"><main class="mx-auto max-w-4xl p-4"><h1 class="text-3xl font-black">Checkout</h1>'+html+'</main></body></html>');
});
