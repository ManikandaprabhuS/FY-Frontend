import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
const compile=(source,overrides={})=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),m,m.exports);return m.exports;};
const limits=compile(await read('utils/photo-limits.ts'));
const service=compile(await read('services/order-photos.service.ts'),{'../utils/photo-limits':limits,'./api':{__esModule:true,default:{}}});
test('client validation accepts exactly 4 MB JPG/PNG/WebP and rejects zero, oversize and unsafe types',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(service.validateOrderPhoto({type,size:4194304}),null);
 assert.match(service.validateOrderPhoto({type:'image/png',size:4194305}),/4 MB/);
 assert.match(service.validateOrderPhoto({type:'image/png',size:0}),/non-empty/);
 for(const type of ['image/gif','image/svg+xml','application/pdf','application/octet-stream'])assert.match(service.validateOrderPhoto({type,size:100}),/JPG, PNG or WebP/);
});
test('browser-only drafts are scoped to their owning customer and can be cleared',()=>{
 service.setCheckoutPhotoDraft('A',{name:'local.jpg'});assert.equal(service.checkoutPhotoDraft('B'),undefined);
 assert.equal(service.checkoutPhotoDraft('A').name,'local.jpg');service.clearCheckoutPhotoDraft('B');assert(service.checkoutPhotoDraft('A'));
 service.clearCheckoutPhotoDraft('A');assert.equal(service.checkoutPhotoDraft('A'),undefined);
});
test('staff and customer details are download-only, and absent photos are optional',async()=>{
 const Component=compile(await read('components/orders/OrderPhotoDownload.tsx'),{'../../services/order-photos.service':{},'../../utils/toast':{}}).default;
 const html=renderToStaticMarkup(createElement(Component,{order:{id:'order',photoFileName:'FY-Mani-photo.jpg',photoSizeBytes:1048576},admin:true}));
 assert.match(html,/FY-Mani-photo.jpg/);assert.match(html,/1.00 MB/);assert.match(html,/Download/);assert.doesNotMatch(html,/<img/);
 const empty=renderToStaticMarkup(createElement(Component,{order:{id:'order'},admin:true}));assert.match(empty,/No photo uploaded/);assert.match(empty,/Contact the customer directly/);
});
test('checkout upload is optional, accessible and can produce mobile/desktop verification fixtures',async()=>{
 const hooks={...React,useEffect(){},useImperativeHandle(){},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value}),useState:initial=>[typeof initial==='function'?initial():initial,()=>{}]};
 const Component=compile(await read('features/customer/components/CheckoutPhotoUpload.tsx'),{
  react:hooks,'../../../store/customerCommerceStore':{useCustomerCommerceStore:select=>select({cartItems:[]})},'../../../services/local-photos':{},'../../../store/authStore':{useAuthStore:selector=>selector({user:{id:'fixture',role:'CUSTOMER'}})},
  '../../../services/order-photos.service':service,'../../../utils/photo-limits':limits,'../../../utils/toast':{},
 }).default;
 const html=renderToStaticMarkup(createElement(Component,{onChange(){},onBusy(){}}));
 assert.match(html,/Upload your photo \(optional\)/);assert.match(html,/You can skip this/);assert.match(html,/One photo per order/);assert.match(html,/aria-label="Choose your order photo"/);assert.doesNotMatch(html,/\brequired=/);
 const assets=await readdir(new URL('../dist/assets/',import.meta.url)),css=assets.find(n=>/^index-.*\.css$/.test(n));
 await mkdir(new URL('../tmp/',import.meta.url),{recursive:true});
 await writeFile(new URL('../tmp/order-photo-preview.html',import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>Order photo visual verification</title></head><body><main class="mx-auto max-w-4xl p-4">'+html+'</main></body></html>');
});
test('checkout passes photoId into its retry intent without changing COD/offer fields',async()=>{
 const checkout=await read('services/checkout.service.ts'),view=await read('features/customer/components/CheckoutOffers.tsx'),product=await read('features/customer/pages/CustomerProductDetailsPage.tsx');
 assert.match(checkout,/couponVersion,photoId/);assert.match(checkout,/paymentMethod:"COD"/);
 assert.match(view,/busy\|\|photoBusy/);assert.match(view,/uploaded\?\.imageId/);
 assert.match(product,/linkProductPhoto/);assert.doesNotMatch(product,/Please log in to upload your photo/);
});
