import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
function compile(source,overrides={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),m,m.exports);return m.exports;}
const limits=compile(await read('utils/photo-limits.ts'));
test('mixed cart ignores disabled products and preserves variant overrides',()=>{
 assert.equal(limits.getPhotoMaxBytes([{allowCustomerPhoto:false,maxPhotoSizeMB:1},{allowCustomerPhoto:true,maxPhotoSizeMB:8,maxPhotoMb:4}]),8*1048576);
 assert.equal(limits.getPhotoMaxBytes([{allowCustomerPhoto:true,maxPhotoSizeMB:null,maxPhotoMb:3}]),3*1048576);
});
test('product settings show the required limit only when uploads are allowed',async()=>{
 const Component=compile(await read('components/ui/ProductPhotoSettings.tsx'),{'../../utils/photo-limits':limits}).default;
 const props={allow:true,setAllow(){},max:'4',setMax(){},art:false,setArt(){}};
 const on=renderToStaticMarkup(React.createElement(Component,props)),off=renderToStaticMarkup(React.createElement(Component,{...props,allow:false}));
 assert.match(on,/type="number"/);assert.match(on,/min="1" max="10"/);assert.match(on,/Show in FrameYaad Arts/);assert.doesNotMatch(off,/type="number"/);
});
test('regular home recommendations exclude Arts products',async()=>{
 const {shoppableProducts}=compile(await read('features/customer/utils/bestSellers.ts'));
 const product={id:'frame',isActive:true,images:[{imageUrl:'image'}],variants:[{isActive:true}]};
 assert.deepEqual(shoppableProducts([product,{...product,id:'art',isFrameyaadArt:true}]).map(p=>p.id),['frame']);
});
test('order photo card distinguishes not required from not uploaded',async()=>{
 const Component=compile(await read('components/orders/OrderPhotoDownload.tsx'),{'../../services/order-photos.service':{},'../../utils/toast':{}}).default;
 const off=renderToStaticMarkup(React.createElement(Component,{order:{id:'test',customerPhotoAllowed:false},admin:true}));
 const on=renderToStaticMarkup(React.createElement(Component,{order:{id:'test',customerPhotoAllowed:true},admin:true}));
 assert.match(off,/Not required \(no upload for this order\)/);assert.doesNotMatch(on,/Not required/);
});
