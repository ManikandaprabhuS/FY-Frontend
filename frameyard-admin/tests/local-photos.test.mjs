import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
function compile(source,overrides={}){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);return module.exports;}
const source=await read('services/local-photos.ts');
function fakeIDB(){
 const records=new Map();
 return {records,open(){
  const request={};queueMicrotask(()=>{
   request.result={transaction(){
    const tx={};tx.objectStore=()=>({
     getAll(){const r={result:structuredClone([...records.values()])};queueMicrotask(()=>tx.oncomplete?.());return r;},
     put(row){records.set(row.id,structuredClone(row));const r={result:row.id};queueMicrotask(()=>tx.oncomplete?.());return r;},
     delete(id){records.delete(id);const r={result:undefined};queueMicrotask(()=>tx.oncomplete?.());return r;}
    });return tx;
   }};
   request.onsuccess?.();
  });return request;
 }};
}
const photo=(id='product:P')=>({id,productId:'P',file:new Blob(['original'],{type:'image/png'}),name:'family.png',source:'data:image/png;base64,b3JpZ2luYWw=',crops:{'5x5':'data:image/png;base64,Y3JvcA=='},createdAt:Date.now()});
test('IndexedDB survives module reload and guest/customer login needs no owner rewrite',async()=>{
 const db=fakeIDB();globalThis.indexedDB=db;
 const first=compile(source);assert.equal(await first.saveLocalPhoto(photo()),true);
 const reloaded=compile(source);assert.equal((await reloaded.findProductPhoto('P')).name,'family.png');
 await reloaded.linkProductPhoto('P','P:V:black');
 assert.equal((await compile(source).listLocalPhotos()).find(p=>p.cartKey==='P:V:black').name,'family.png');
});
test('expired photos are removed at the 24-hour boundary and never offered again',async()=>{
 const db=fakeIDB();globalThis.indexedDB=db;const local=compile(source);
 await local.saveLocalPhoto({...photo(),createdAt:Date.now()-24*60*60*1000});
 assert.deepEqual(await local.listLocalPhotos(),[]);assert.equal(db.records.size,0);
});
test('removing cart photos clears their product draft but preserves other products',async()=>{
 globalThis.indexedDB=fakeIDB();const local=compile(source);
 await local.saveLocalPhoto(photo());await local.linkProductPhoto('P','cart-key');
 await local.saveLocalPhoto({...photo('product:Q'),productId:'Q'});
 await local.removeCartPhotos(['cart-key']);
 assert.deepEqual((await local.listLocalPhotos()).map(p=>p.productId),['Q']);
});
test('fallback retains pixels in memory, reports fallback, and Clear removes them',async()=>{
 globalThis.indexedDB=undefined;const local=compile(source);
 assert.equal(await local.saveLocalPhoto(photo()),false);assert.equal(local.localPhotoStorageFallback(),true);
 assert.equal((await local.listLocalPhotos()).length,1);
 await local.removeLocalPhoto('product:P');assert.equal((await local.listLocalPhotos()).length,0);
});
test('the uploaded file is the selected crop, not the full original',async()=>{
 const local=compile(source),file=local.croppedPhotoFile(photo(),'5x5');
 assert.equal(await file.text(),'crop');assert.equal(file.name,'family.png');
});
test('product preview is guest-local and checkout uploads only inside prepare',async()=>{
 const product=await read('features/customer/pages/CustomerProductDetailsPage.tsx');
 assert.doesNotMatch(product,/Please log in to upload|localStorage|orderPhotoService|setCheckoutPhotoDraft/);
 assert.match(product,/validateOrderPhoto\(file/);assert.match(product,/linkProductPhoto/);
 const checkout=await read('features/customer/components/CheckoutPhotoUpload.tsx');
 const before=checkout.slice(0,checkout.indexOf('useImperativeHandle(ref'));
 assert.doesNotMatch(before,/orderPhotoService\.upload/);
 assert.match(checkout,/photos.length>1/);assert.match(checkout,/photoSizeError/);
 const order=await read('features/customer/components/CheckoutOffers.tsx');
 assert(order.indexOf('photoControl.current?.prepare')<order.indexOf('checkoutService.place(selections'));
 assert.match(order,/photoUploadFailed/);assert.match(order,/Please log in to place your order/);
});

test('checkout prepare uploads only on demand and forwards the returned photoId',async()=>{
 const React=require('react'),component=await read('features/customer/components/CheckoutPhotoUpload.tsx');
 const limits=compile(await read('utils/photo-limits.ts'));
 let handle,uploads=0;
 function setup({rows=[photo()],selected='product:P',failure=false}={}){
  const states=[rows,selected,true,null,'',null];let cursor=0;
  const hooks={...React,useEffect(){},useMemo:fn=>fn(),useRef:v=>({current:v}),useState:()=>[states[cursor++],()=>{}],useImperativeHandle:(_,factory)=>{handle=factory();}};
  const local=compile(source);
  const service={validateOrderPhoto:()=>null,orderPhotoService:{upload:async()=>{uploads++;if(failure)throw new Error('Network lost');return{imageId:'server-photo',fileName:'FY-Mani-family.png',sizeBytes:4};}}};
  const Component=compile(component,{react:hooks,'../../../utils/photo-limits':limits,
   '../../../store/customerCommerceStore':{useCustomerCommerceStore:select=>select({cartItems:[]})},
   '../../../services/order-photos.service':service,'../../../services/local-photos':local,
   '../../../utils/toast':{showLoading(){},showSuccess(){},showWarning(){},showError(){}}
  }).default;
  Component({onChange(){},onBusy(){},items:[]});return handle;
 }
 let current=setup();assert.equal(uploads,0);
 assert.equal((await current.prepare(2)).imageId,'server-photo');assert.equal(uploads,1);
 current=setup({failure:true});await assert.rejects(current.prepare(2),e=>e.photoUploadFailed===true);
 current=setup({rows:[photo(),{...photo('other')}],selected:''});
 await assert.rejects(current.prepare(2),/Choose one photo/);
 current=setup({rows:[],selected:''});assert.equal(await current.prepare(2),null);
 const large={...photo(),crops:{},file:new Blob([new Uint8Array(2*1048576+1)],{type:'image/png'})};
 current=setup({rows:[large]});await assert.rejects(current.prepare(2),/up to 2 MB/);
});
