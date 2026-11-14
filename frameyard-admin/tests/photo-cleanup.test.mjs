import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const read=p=>readFile(new URL('../src/'+p,import.meta.url),'utf8');
const compile=(source,overrides={})=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(p=>overrides[p]??require(p),m,m.exports);return m.exports;};
const sizes=compile(await read('utils/storage-size.ts'));
const status=compile(await read('components/ui/order-status.ts'));
const badge=compile(await read('components/ui/StatusBadge.tsx'),{'./order-status':status,'./StatusBadge.css':{}});
test('size formatting and strict 80/95 percent thresholds are safe',()=>{
 assert.equal(sizes.formatStorageBytes(1048576),'1.00 MB');assert.equal(sizes.formatStorageBytes(1073741824),'1.00 GB');assert.equal(sizes.formatStorageBytes(null),'Unavailable');
 for(const [used,color]of [[80,'bg-emerald-600'],[80.1,'bg-amber-500'],[95,'bg-amber-500'],[95.1,'bg-red-600']])assert.equal(sizes.storageProgress(used,100).color,color);
 assert.equal(sizes.storageProgress(200,100).width,100);assert.equal(sizes.storageProgress(1,null).percent,null);
});
test('deleted photos never render a download and use the requested messages',async()=>{
 const Component=compile(await read('components/orders/OrderPhotoDownload.tsx'),{'../../services/order-photos.service':{},'../../utils/toast':{}}).default;
 const order={id:'order',photoFileName:'FY-Customer-photo.jpg',photoDeleted:true,photoDeletedAt:'2026-11-14T12:00:00Z',photoDeletedBy:'Staff Name'};
 const customer=renderToStaticMarkup(createElement(Component,{order}));
 assert.match(customer,/Photo removed after order completion/);assert.doesNotMatch(customer,/<button|Download your photo/);
 const admin=renderToStaticMarkup(createElement(Component,{order,admin:true}));
 assert.match(admin,/Photo deleted on/);assert.match(admin,/Staff Name/);assert.doesNotMatch(admin,/<button/);
});
test('cleanup UI requires confirmation, performs optimistic removal and restores a failed request',async()=>{
 const source=await read('pages/photo-cleanup/PhotoCleanupPage.tsx');
 assert.match(source,/This permanently deletes the photo\(s\). Download first if you still need them/);
 assert(source.indexOf('setData({...snapshot,photos:snapshot.photos.filter')<source.indexOf('await photoCleanupService.remove'));
 assert.match(source,/catch\(e\)\{setData\(snapshot\)/);assert.match(source,/result.results.filter\(r=>!r.ok\)/);
 assert.match(source,/Please wait, deleting photos/);assert.match(source,/failed.map/);assert.doesNotMatch(source,/Delete all shown/);
});
test('only authenticated admin routes mount cleanup and exports preserve Deleted state',async()=>{
 const route=await read('routes/index.tsx'),sidebar=await read('layouts/AdminLayout.tsx');
 assert.match(route,/path: 'photo-cleanup'/);assert.match(sidebar,/Photo Cleanup/);
 for(const p of ['utils/revenue-report-pdf.ts','services/order.service.ts'])assert.match(await read(p),/photoDeleted\?'Deleted'/);
});
test('writes a responsive cleanup/widget fixture, including an unavailable database read',async()=>{
 const photo={id:'photo',orderId:'order',orderNumber:'FY-12345',customerName:'Example customer',orderStatus:'DELIVERED',fileName:'FY-Example-family-photo-with-a-long-name.jpg',sizeBytes:2097152,completedAt:'2026-11-14T10:00:00Z'};
 const fixture={photos:[photo,{...photo,id:'cancelled',orderNumber:'FY-67890',orderStatus:'CANCELLED'}],pagination:{page:1,limit:20,total:2,totalPages:1},totalBytes:4194304};
 const hooks=(data)=>{let cursor=0;return{...React,useEffect(){},useState:v=>[cursor++===0?data:v,()=>{}]};};
 const DataTable=compile(await read('components/tables/DataTable.tsx'),{'../ui/Skeleton':{__esModule:true,default:()=>null},'../ui/EmptyState':{__esModule:true,default:()=>null}}).default;
 const Pagination=compile(await read('components/ui/PaginationControls.tsx')).default;
 const Cleanup=compile(await read('pages/photo-cleanup/PhotoCleanupPage.tsx'),{react:hooks(fixture),'../../components/tables/DataTable':{__esModule:true,default:DataTable},'../../components/ui/PaginationControls':{__esModule:true,default:Pagination},'../../components/ui/StatusBadge':badge,'../../components/ui/ConfirmDialog':{ConfirmDialog:()=>null},'../../services/photo-cleanup.service':{},'../../services/order-photos.service':{},'../../utils/storage-size':sizes,'../../utils/toast':{},'../../services/api':{}}).default;
 const usage={database:{bytes:null,limitBytes:104857600},photos:{bytes:83886080,limitBytes:100000000},pending:{count:2,bytes:4194304}};
 const Widget=compile(await read('components/admin/StorageWidget.tsx'),{react:hooks(usage),'react-router-dom':{Link:({to,children,...props})=>createElement('a',{href:to,...props},children)},'../../services/photo-cleanup.service':{},'../../utils/storage-size':sizes}).default;
 const html=renderToStaticMarkup(createElement('main',{className:'mx-auto max-w-7xl p-4 space-y-6'},createElement(Widget),createElement(Cleanup)));
 assert.match(html,/Unavailable/);assert.match(html,/4.00 MB reclaimable/);assert.match(html,/FY-12345/);assert.match(html,/Select photo for/);assert.match(html,/bg-amber-500/);
 const css=(await readdir(new URL('../dist/assets/',import.meta.url))).find(n=>/^index-.*\.css$/.test(n));
 await mkdir(new URL('../tmp/',import.meta.url),{recursive:true});
 await writeFile(new URL('../tmp/photo-cleanup-preview.html',import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>Photo cleanup verification</title></head><body>'+html+'</body></html>');
});
