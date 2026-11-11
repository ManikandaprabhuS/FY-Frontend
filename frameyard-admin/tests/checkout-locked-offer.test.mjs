import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
const require=createRequire(import.meta.url);
test("checkout shows the Big Order rule but disables applying it below the minimum",async()=>{
 const items=[{productIdentifier:"P",variantId:"v",quantity:1}],signature=JSON.stringify(items);
 const quote={subtotal:2448,offers:[{code:"FIRST_ORDER",title:"First Order Offer",description:"5% off on your first order",percent:5,discountAmount:122.4,total:2325.6,version:1}],unavailableOffers:[{code:"BIG_ORDER",title:"Big Order Offer",description:"10% off on orders above Rs. 5,000",percent:10,discountAmount:0,total:2448,version:1,unavailableReason:"Available on orders above Rs. 5,000."}],addresses:[]};
 const states=[quote,signature,undefined,"",false,false,0,undefined,false];let state=0;
 const overrides={
  "./CheckoutPhotoUpload":{__esModule:true,default:()=>null},
  "../../../components/orders/OrderPhotoDownload":{__esModule:true,default:()=>null},
  react:{useEffect(){},useMemo:fn=>fn(),useRef:value=>({current:value}),useState:()=>[states[state++],()=>{}]},
  "react-router-dom":{Link:({to,children,...props})=>createElement("a",{...props,href:to},children)},
  "../../../store/customerCommerceStore":{useCustomerCommerceStore:selector=>selector({cartItems:items})},
  "../../../services/checkout.service":{checkoutService:{}},
  "../../../utils/toast":{},"./CheckoutAddressForm":{__esModule:true,default:()=>null}
 };
 const source=await readFile(new URL("../src/features/customer/components/CheckoutOffers.tsx",import.meta.url),"utf8"),module={exports:{}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);
 const html=renderToStaticMarkup(createElement(module.exports.default));
 assert.match(html,/First Order Offer/);assert.match(html,/Big Order Offer/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>[\s\S]*?Big Order Offer/);
 assert.match(html,/Available on orders above Rs. 5,000/);
 assert.doesNotMatch(html,/Save ₹0/);
});
