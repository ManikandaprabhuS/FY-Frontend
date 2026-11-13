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
const calls=[];
const photos=compile(await read('services/order-photos.service.ts'),{'../utils/photo-limits':limits,'./api':{__esModule:true,default:{post:async(...args)=>{calls.push(args);return{data:{data:{imageId:'photo',fileName:'FY-Customer-photo.jpg',sizeBytes:100}}};}}}});
test('variant 2 MB allows 1.9 MB and exactly 2 MB but rejects one extra byte',()=>{
 for(const size of [Math.floor(1.9*1048576),2*1048576])assert.equal(photos.validateOrderPhoto({size,type:'image/jpeg'},[{maxPhotoSizeMB:2}]),null);
 assert.match(photos.validateOrderPhoto({size:2*1048576+1,type:'image/jpeg'},[{maxPhotoSizeMB:2}]),/up to 2 MB/);
 assert.equal(limits.getPhotoMaxBytes([{maxPhotoSizeMB:null}]),4194304);
 assert.equal(limits.getPhotoMaxBytes([{maxPhotoSizeMB:5},{maxPhotoSizeMB:2}]),2097152);
});
test('optional admin validation handles the full range without making empty input required',()=>{
 for(const value of [null,undefined,'',1,10,2.5])assert.equal(limits.photoLimitValidation(value),null);
 for(const value of [0,-1,11,'abc',NaN,2.55])assert(limits.photoLimitValidation(value));
});
test('upload sends selected IDs but never a client-side limit',async()=>{
 const items=[{productIdentifier:'P',variantId:'variant',quantity:1}];
 await photos.orderPhotoService.upload(new File(['test'],'photo.jpg',{type:'image/jpeg'}),()=>{},items);
 assert.deepEqual(JSON.parse(calls[0][1].get('items')),items);
 assert.equal(calls[0][1].get('maxPhotoSizeMB'),null);
});
test('admin input is optional, uses range/step constants, and warns for bad values',async()=>{
 const notices=[];
 const Component=compile(await read('components/ui/VariantPhotoLimitInput.tsx'),{'../../utils/photo-limits':limits,'../../utils/toast':{showWarning:message=>notices.push(message)}}).default;
 const element=Component({value:'11',onChange(){}});
 const children=Array.isArray(element.props.children)?element.props.children:[element.props.children];
 const input=children.find(child=>child?.type==='input');assert.equal(input.props.min,1);assert.equal(input.props.max,10);assert.equal(input.props.step,'0.1');assert.equal(input.props.required,undefined);input.props.onBlur();assert.equal(notices.length,1);
 const html=renderToStaticMarkup(createElement(Component,{value:'',onChange(){}}));assert.match(html,/default \(4 MB\)/);
});
test('customer source updates the limit and blocks oversized preview actions without dropping the preview',async()=>{
 const product=await read('features/customer/pages/CustomerProductDetailsPage.tsx'),checkout=await read('features/customer/components/CheckoutPhotoUpload.tsx'),order=await read('features/customer/components/CheckoutOffers.tsx');
 assert.match(product,/Max file size: \{photoMaxMB\}/);assert.match(product,/photoTooLarge/);assert.match(product,/This size allows photos up to/);
 assert.match(product,/available=\{available && !photoTooLarge\}/);
 assert.match(checkout,/Limit set by/);assert.match(checkout,/up to \{maxAllowedMB\} MB/);assert.match(order,/photoInvalid/);
});
test('writes a shared mobile/admin/checkout photo-limit verification fixture',async()=>{
 const hooks={...React,useEffect(){},useImperativeHandle(){},useMemo:fn=>fn(),useCallback:fn=>fn,useRef:value=>({current:value}),useState:initial=>[initial,()=>{}]};
 const Input=compile(await read('components/ui/VariantPhotoLimitInput.tsx'),{'../../utils/photo-limits':limits,'../../utils/toast':{}}).default;
 const Upload=compile(await read('features/customer/components/CheckoutPhotoUpload.tsx'),{
  react:hooks,'../../../store/customerCommerceStore':{useCustomerCommerceStore:select=>select({cartItems:[]})},'../../../services/local-photos':{},'../../../utils/photo-limits':limits,'../../../store/authStore':{useAuthStore:selector=>selector({user:{id:'test',role:'CUSTOMER'}})},'../../../services/order-photos.service':photos,'../../../utils/toast':{},
 }).default;
 const body=renderToStaticMarkup(createElement('div',null,createElement(Input,{value:'2.5',onChange(){}}),createElement(Upload,{onChange(){},onBusy(){},maxAllowedMB:2,limitingItem:{name:'Classic Frame',variant:'5x5'}})));
 const assets=await readdir(new URL('../dist/assets/',import.meta.url)),css=assets.find(n=>/^index-.*\.css$/.test(n));await mkdir(new URL('../tmp/',import.meta.url),{recursive:true});
 await writeFile(new URL('../tmp/variant-photo-limit.html',import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"></head><body><main class="mx-auto max-w-4xl p-4">'+body+'</main></body></html>');
});
