import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {validateOfferInputs} from '../src/utils/offer-validation.ts';
const module={exports:{}};
new Function('require','module','exports',ts.transpileModule(readFileSync(new URL('../src/services/homepage-banner.service.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(()=>({}),module,module.exports);
for(const [code,title] of [['NEW_YEAR','New Year Offer'],['CHRISTMAS','Christmas Offer'],['PONGAL','Pongal Offer']])test(code+' banner copy uses live values and shared threshold validation',()=>{
 assert.deepEqual(module.exports.bannerCopy({code,title,percentage:12,minOrderAmount:2000}),{label:title.toUpperCase(),headline:'Flat 12% Off',subtext:'On orders above Rs. 2,000'});
 for(const value of ['0','-5','101','','abc'])assert(validateOfferInputs(value,'2000'));
 for(const value of ['0','-5','','abc'])assert(validateOfferInputs('12',value));
 assert.equal(validateOfferInputs('12','2000'),null);
});
test('checkout handles an order-time invalidated offer as an amber refresh without discarding local photos',()=>{
 const source=readFileSync(new URL('../src/features/customer/components/CheckoutOffers.tsx',import.meta.url),'utf8');
 assert.match(source,/if\(detail\?\.code==="OFFER_UNAVAILABLE"\)/);assert.match(source,/showWarning\(detail.message/);assert.match(source,/const refreshed=await checkoutService.offers\(selections,true\)/);
 const branch=source.slice(source.indexOf('if(detail?.code==="OFFER_UNAVAILABLE")'),source.indexOf('showApiError(e,detail?.code'));
 assert.doesNotMatch(branch,/removeCartPhotos|removeLocalPhoto|clearCart/);
});
