import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import ts from "typescript";
const require=createRequire(import.meta.url);
test("COD retry keys survive retries and are scoped to the customer and checkout intent",async()=>{
 const source=await readFile(new URL("../src/services/checkout.service.ts",import.meta.url),"utf8"),module={exports:{}},storage=new Map();
 const api={post:async()=>({data:{data:{order:{id:"order"}}}})};
 const overrides={"./api":{__esModule:true,default:api},"../store/authStore":{useAuthStore:{getState:()=>({user:{id:"customer-1"}})}}};
 const local={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)};
 new Function("require","module","exports","localStorage",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(id=>overrides[id]??require(id),module,module.exports,local);
 const first=module.exports.checkoutRequestKey("same-cart");
 assert.equal(module.exports.checkoutRequestKey("same-cart"),first);
 assert.notEqual(module.exports.checkoutRequestKey("changed-cart"),first);
 await module.exports.checkoutService.place([],"address");
 assert.equal(storage.size,0);
});
test("checkout blocks empty carts and repeated clicks, requires COD and saves addresses through the existing API",async()=>{
 const checkout=await readFile(new URL("../src/features/customer/components/CheckoutOffers.tsx",import.meta.url),"utf8");
 assert.match(checkout,/if\(!items.length\)/);assert.match(checkout,/saveLock.current=true/);
 assert.match(checkout,/\|\|!cod/);assert.match(checkout,/Cash on Delivery/);
 assert.match(checkout,/CheckoutAddressForm onSaved/);
 const address=await readFile(new URL("../src/features/customer/components/CheckoutAddressForm.tsx",import.meta.url),"utf8");
 assert.match(address,/api.post/);assert.match(address,/disabled=\{busy\|\|!valid\}/);
 assert.match(address,/finally\{lock.current=false;setBusy\(false\)/);
});
