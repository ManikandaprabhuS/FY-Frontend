import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
function compile(source,overrides={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),m,m.exports);return m.exports;}
const messages=compile(await read('utils/refund-message.ts'));
for(const [cancelledBy,refundStatus,expected] of [
 ['admin',null,'Your order was cancelled by FrameYaad.'],
 ['admin','INITIATED','Your order was cancelled by FrameYaad and your refund has been initiated. You will be getting your money back.'],
 ['customer','INITIATED','Your cancellation is confirmed and your refund has been initiated. You will be getting your money back.'],
 ['admin','COMPLETED','Your refund is completed. Please check your respective bank account.'],
 ['customer','COMPLETED','Your refund is completed. Please check your respective bank account.']
])test('customer cancellation copy '+cancelledBy+'/'+refundStatus,()=>assert.equal(messages.customerRefundMessage({cancelledBy,refundStatus}),expected));
test('legacy customer cancellation is resolved without changing old data',()=>{
 const old={statusHistory:[{status:'CANCELLED',changedBy:{role:'CUSTOMER'}}],refundStatus:'INITIATED'};
 assert.match(messages.customerRefundMessage(old),/^Your cancellation is confirmed/);assert.equal(old.cancelledBy,undefined);
});
test('refund controls expose only forward actions and require completion confirmation',async()=>{
 const React=require('react');
 const hooks={...React,useState:value=>[value,()=>{}],useRef:value=>({current:value})};
 const controls=compile(await read('components/orders/RefundControls.tsx'),{
  react:hooks,'../../services/order.service':{},'../../utils/toast':{},
  '../ui/StatusBadge':{__esModule:true,default:({status})=>createElement('span',null,status)},
  '../ui/ConfirmDialog':{ConfirmDialog:()=>null}
 }).default;
 const base={id:'order',totalAmount:1300,orderStatus:'CANCELLED'};
 const html=status=>renderToStaticMarkup(createElement(controls,{order:{...base,refundStatus:status},onChanged(){}}));
 assert.match(html(null),/Refund initiated/);assert.match(html(null),/Refund completed/);
 assert.doesNotMatch(html('INITIATED'),/>Refund initiated</);assert.match(html('INITIATED'),/Refund completed/);
 assert.doesNotMatch(html('COMPLETED'),/<button/);
 assert.equal(renderToStaticMarkup(createElement(controls,{order:{...base,orderStatus:'PLACED'},onChanged(){}})),'');
 assert.match(await read('components/orders/RefundControls.tsx'),/has been sent to the customer/);
});
test('orders list/export retain cancelled amount and show refund fields, while revenue is fetched fresh',async()=>{
 const page=await read('pages/orders/OrdersPage.tsx'),pdf=await read('utils/revenue-report-pdf.ts');
 assert.match(page,/Excluded from revenue/);assert.match(page,/refundStatus:refundFilter/);
 assert.match(page,/will be deducted from revenue/);assert.match(page,/Reason \(optional\)/);
 assert.match(pdf,/Refund status/);assert.match(pdf,/Initiated/);assert.match(pdf,/Completed/);assert.match(pdf,/excluded from revenue/);
 const overview=await read('pages/overview/OverviewPage.tsx');
 assert.match(overview,/orderService.revenue/);assert.match(overview,/15000/);assert.match(overview,/fy:orders-changed/);
 assert.doesNotMatch(overview,/const calculatedRevenue = orders.reduce/);
});
test('staff cancellation notifications are red bold and link to orders without changing instant reads',async()=>{
 for(const path of ['layouts/AdminLayout.tsx','pages/notifications/NotificationsPage.tsx']){
  const source=await read(path);assert.match(source,/ORDER_CANCELLED/);assert.match(source,/text-red-700/);assert.match(source,/font-bold/);assert.match(source,/XCircle/);
 }
 assert.match(await read('layouts/AdminLayout.tsx'),/startsWith\("\/admin\/"\)/);
});

test('renders mobile refund controls/status dates and writes the verification fixture',async()=>{
 const {mkdir,writeFile,readdir}=await import('node:fs/promises');
 const statuses=compile(await read('components/ui/order-status.ts'));
 const badge=compile(await read('components/ui/StatusBadge.tsx'),{'./order-status':statuses,'./StatusBadge.css':{}});
 const Summary=compile(await read('components/orders/RefundStatusSummary.tsx'),{'../ui/StatusBadge':badge}).default;
 const Controls=compile(await read('components/orders/RefundControls.tsx'),{
  '../../services/order.service':{},'../../utils/toast':{},'../ui/StatusBadge':badge,'../ui/ConfirmDialog':{ConfirmDialog:()=>null}
 }).default;
 const body=[null,'INITIATED','COMPLETED'].map(refundStatus=>{
  const order={id:'fixture',orderStatus:'CANCELLED',totalAmount:1300,cancelledBy:'admin',refundStatus,
   refundInitiatedAt:refundStatus?'2026-11-13T09:00:00Z':null,refundCompletedAt:refundStatus==='COMPLETED'?'2026-11-13T10:00:00Z':null};
  const html=renderToStaticMarkup(createElement('section',{className:'mb-5 rounded-xl border p-4'},createElement('h2',{className:'font-bold'},'Order FY-TEST — '+(refundStatus??'Not started')),createElement('p',{className:'my-3 text-sm text-red-700 font-bold'},messages.customerRefundMessage(order)),createElement(Summary,{order}),createElement(Controls,{order,onChanged(){}})));
  if(refundStatus==='COMPLETED'){assert.match(html,/Initiated:/);assert.match(html,/Completed:/);}
  return html;
 }).join('');
 const css=(await readdir(new URL('../dist/assets/',import.meta.url))).find(n=>/^index-.*\.css$/.test(n));
 await mkdir(new URL('../tmp/',import.meta.url),{recursive:true});
 await writeFile(new URL('../tmp/refund-preview.html',import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>Refund UI verification</title></head><body><main class="mx-auto max-w-3xl p-4">'+body+'</main></body></html>');
});
