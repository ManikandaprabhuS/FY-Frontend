import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
const require=createRequire(import.meta.url);
test("order offer details display immutable saved amounts and tolerate old orders",async()=>{
 const source=await readFile(new URL("../src/components/ui/OrderOfferDetails.tsx",import.meta.url),"utf8"),module={exports:{}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(require,module,module.exports);
 const html=renderToStaticMarkup(createElement(module.exports.default,{order:{couponTitle:"First Order Offer",discountPercent:5,discountAmount:100,subtotal:2000}}));
 assert.match(html,/First Order Offer/);assert.match(html,/5%/);assert.match(html,/100.00/);assert.match(html,/2,000.00/);
 const old=renderToStaticMarkup(createElement(module.exports.default,{order:{couponId:"OLD",discountAmount:50}}));
 assert.match(old,/OLD/);assert.match(old,/50.00/);
 const none=renderToStaticMarkup(createElement(module.exports.default,{order:{}}));assert.match(none,/>-</);
});
test("offers use backend amounts, replacement selection, loading/error and double-submit protection",async()=>{
 const source=await readFile(new URL("../src/features/customer/components/CheckoutOffers.tsx",import.meta.url),"utf8");
 assert.match(source,/Save \{money\(offer.discountAmount\)\}/);assert.match(source,/selected\?\.total\?\?quote.subtotal/);
 assert.match(source,/setCode\(offer.code\)/);assert.match(source,/setCode\(undefined\)/);
 assert.match(source,/data.bigOrderRemovalMessage/);assert.match(source,/saveLock.current/);
 assert.match(source,/},0\);/);assert.match(source,/Checking available offers/);assert.match(source,/Retry loading offers/);
 assert.doesNotMatch(source,/5000|5001|\.05|\.10|discountAmount\s*:/);
});
test("cart has no code input, old management routes are absent, checkout stays customer-only",async()=>{
 const cart=await readFile(new URL("../src/features/customer/pages/CartPage.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(cart,/cart-promo-code|applyPromoCode|couponService/);assert.match(cart,/Log in/);
 const routes=await readFile(new URL("../src/routes/index.tsx",import.meta.url),"utf8");
 assert.doesNotMatch(routes,/marketing\/coupons|marketing\/product-discounts/);
 const checkout=await readFile(new URL("../src/features/customer/pages/CheckoutPage.tsx",import.meta.url),"utf8");
 assert.match(checkout,/role !== 'CUSTOMER'/);assert.match(checkout,/<CheckoutOffers/);
});
