import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const source=readFileSync(new URL('../src/pages/orders/OrdersPage.tsx',import.meta.url),'utf8').replace(/\r/g,'');
const hash=s=>createHash('sha256').update(s).digest('hex');
test('Orders hooks, requests, deep links, calculations and handlers are byte-identical to the pre-restyle baseline',()=>{
 const body=source.slice(source.indexOf('export const OrdersPage'),source.indexOf('\n  return (\n    <div'));
 assert.equal(hash(body),'afb2e340ca8cfd29e526d6d774a232d0b6cf9e679ea395900caffd2263a9dedf');
});
test('all 23 event handlers, their payloads and confirmation behavior are unchanged',()=>{
 const ast=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),events=[];
 function walk(node){if(ts.isJsxAttribute(node)&&/^on[A-Z]/.test(node.name.getText(ast)))events.push(node.name.getText(ast)+'='+node.initializer.getText(ast).replace(/\s+/g,' '));ts.forEachChild(node,walk)}walk(ast);
 assert.equal(events.length,23);assert.equal(hash(events.sort().join('\n')),'e0b40558c48b124314012306d443adfe1dc0ce80d2de5e631c2efa742abd60fa');
});
test('restyled details retain shared refund, photo, item and coupon components and existing actions',()=>{
 for(const component of ['<RefundControls order={selectedOrder} onChanged={updated=>{setSelectedOrder(updated);void fetchOrders(useOrderStore.getState().lastQuery,{silent:true});}}/>','<OrderPhotoDownload order={selectedOrder} admin />','<OrderOfferDetails order={selectedOrder}','<OrderItemOptions item={item} />','title="Cancel order"','title="Update order status"'])assert(source.includes(component));
 assert.match(source,/className="fy-order-details-modal"/);
});
test('list uses real summary/refund/status values without invented selections, charts or actions',()=>{
 for(const value of ['summary.totalCount','summary.pendingCount','summary.processingCount','summary.deliveredCount','summary.cancelledCount','Excluded from revenue','RefundStatusSummary','OrderStatusFilter'])assert(source.includes(value));
 assert.doesNotMatch(source,/type="checkbox"|Math.random|sparkline|MoreHorizontal/);
 assert.match(source,/aria-label=\{`View order/);assert.match(source,/customerTone\(customerId\|\|email\)/);
 const css=readFileSync(new URL('../src/pages/orders/orders.css',import.meta.url),'utf8');assert.match(css,/repeat\(5,minmax/);assert.match(css,/repeat\(3,minmax/);assert.match(css,/repeat\(2,minmax/);assert.doesNotMatch(css,/role=.dialog|\.fy-orders button/);
});
