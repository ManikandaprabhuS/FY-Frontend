import test from "node:test";
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {readFile,mkdir,writeFile,readdir} from "node:fs/promises";
import {createElement} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import ts from "typescript";
import {trackerSteps} from "../src/utils/order-tracker.ts";
import * as status from "../src/components/ui/order-status.ts";
import {resourceResponseKey} from "../src/utils/resource-not-found.ts";
const require=createRequire(import.meta.url);
const flow={steps:[["PLACED","Placed","We have received your order."],["PROCESSING","Processing","We are preparing your order."],["READY_TO_SHIP","Ready to ship","Your order is packed and waiting for pickup."],["SHIPPED","Shipped","Your order is on the way."],["DELIVERED","Delivered","Your order has been delivered."]].map(([status,label,description])=>({status,label,description})),transitions:{PLACED:["PROCESSING","CANCELLED"],PROCESSING:["READY_TO_SHIP","CANCELLED"],READY_TO_SHIP:["SHIPPED"],SHIPPED:["DELIVERED"],DELIVERED:[],CANCELLED:[],CONFIRMED:["PROCESSING"]},cancellable:["PLACED","PROCESSING"],legacyDisplay:{CONFIRMED:"PLACED"},cancellationMessageStatuses:["READY_TO_SHIP","SHIPPED"],cancellationMessage:"Sorry, your order is ready to ship or already shipped, so it can't be cancelled."};
const order={id:"order",orderStatus:"SHIPPED",createdAt:"2026-11-01T05:00:00Z",statusHistory:flow.steps.slice(0,4).map((s,i)=>({status:s.status,changedAt:"2026-11-0"+(i+1)+"T05:00:00Z",changedBy:{id:"staff",role:"ADMIN"}}))};
async function compile(path,overrides={}){
 const source=await readFile(new URL("../src/"+path,import.meta.url),"utf8"),module={exports:{}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(name=>overrides[name]??require(name),module,module.exports);return module.exports;
}
const badge=await compile("components/ui/StatusBadge.tsx",{"./order-status":status,"./StatusBadge.css":{}});
const refund=await compile("utils/refund-message.ts");
const tracker=await compile("components/orders/OrderStatusTracker.tsx",{"../../utils/refund-message":refund,"../ui/StatusBadge":badge,"../../store/orderFlowStore":{useOrderFlow:()=>({flow,error:false,retry(){}})},"../../utils/order-tracker":{trackerSteps}});
test("each step is current exactly once, with dates only for reached steps",()=>{
 for(let i=0;i<5;i++){const current={...order,orderStatus:flow.steps[i].status};const steps=trackerSteps(current,flow);assert.equal(steps.filter(s=>s.current).length,1);assert.equal(steps.filter(s=>s.done).length,i+1);}
 const html=renderToStaticMarkup(createElement(tracker.default,{order}));
 assert.equal((html.match(/aria-current="step"/g)??[]).length,1);assert.equal((html.match(/<time/g)??[]).length,4);assert.match(html,/Your order is on the way/);
});
test("old orders infer progress but never invent missing timestamps",()=>{
 const old={...order,statusHistory:undefined};const steps=trackerSteps(old,flow);
 assert.equal(steps[0].timestamp,old.createdAt);assert.equal(steps[1].timestamp,undefined);assert.equal(steps[3].current,true);
 const html=renderToStaticMarkup(createElement(tracker.default,{order:old}));assert.ok((html.match(/>-<\/time>/g)??[]).length>=3);
});
test("cancelled tracker stops future steps and shows actor, reason and cancellation time safely",()=>{
 const cancelled={...order,orderStatus:"CANCELLED",statusHistory:[{status:"CANCELLED",previousStatus:"PROCESSING",changedAt:"2026-11-03T05:00:00Z",changedBy:{id:"owner",role:"CUSTOMER"},note:"<script>not executable</script>"}]};
 assert.deepEqual(trackerSteps(cancelled,flow).map(s=>s.status),["PLACED","PROCESSING"]);
 const html=renderToStaticMarkup(createElement(tracker.default,{order:cancelled}));
 assert.match(html,/Cancelled by you/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.doesNotMatch(html,/Your order is on the way/);
 const store=renderToStaticMarkup(createElement(tracker.default,{order:{...cancelled,statusHistory:[{...cancelled.statusHistory[0],changedBy:{id:"staff",role:"EMPLOYEE"}}]}}));assert.match(store,/Cancelled by store/);
 const old=renderToStaticMarkup(createElement(tracker.default,{order:{...cancelled,statusHistory:undefined}}));assert.match(old,/Cancelled by -/);
});
test("admin dropdown displays only supplied current/next/cancel options",()=>{
 for(const [current,next]of Object.entries(flow.transitions)){
  const html=renderToStaticMarkup(createElement(badge.default,{status:current,onStatusChange(){},options:[current,...next]}));
  const options=[...html.matchAll(/<option[^>]*value="([^"]+)"/g)].map(m=>m[1]);assert.deepEqual(options,[current,...next]);
 }
});
test("customer cancellation button uses server rules and forbidden-step message",async()=>{
 const cancel=await compile("components/orders/CancelOrder.tsx",{"../ui/Modal":{default:()=>null,__esModule:true},"../../store/orderFlowStore":{useOrderFlow:()=>({flow})},"../../services/order.service":{orderService:{}},"../../utils/toast":{}});
 for(const state of flow.cancellable)assert.match(renderToStaticMarkup(createElement(cancel.default,{order:{...order,orderStatus:state},onChanged(){}})),/Cancel order/);
 for(const state of ["READY_TO_SHIP","SHIPPED"])assert.match(renderToStaticMarkup(createElement(cancel.default,{order:{...order,orderStatus:state},onChanged(){}})),/can&#x27;t be cancelled/);
 for(const state of ["DELIVERED","CANCELLED"])assert.equal(renderToStaticMarkup(createElement(cancel.default,{order:{...order,orderStatus:state},onChanged(){}})),"");
});
test("metadata is not mistaken for a missing order; polling stops in hidden tabs and routes stay protected",async()=>{
 assert.equal(resourceResponseKey("/orders/status-flow"),undefined);
 for(const path of ["features/customer/pages/CustomerOrderDetailsPage.tsx","features/customer/pages/CustomerOrdersPage.tsx"]){
  const source=await readFile(new URL("../src/"+path,import.meta.url),"utf8");assert.match(source,/visibilityState==="visible"/);assert.match(source,/45000/);assert.match(source,/clearInterval/);
 }
 const routes=await readFile(new URL("../src/routes/index.tsx",import.meta.url),"utf8");assert.match(routes,/path: '\/orders\/:id', element: <CustomerProtectedRoute>/);
 const admin=await readFile(new URL("../src/pages/orders/OrdersPage.tsx",import.meta.url),"utf8");assert.match(admin,/flow\?\.transitions/);assert.match(admin,/newStatus==="SHIPPED"\|\|newStatus==="DELIVERED"/);assert.match(admin,/Please wait, the order status is being updated/);
});
test("tracker component produces a responsive visual fixture",async()=>{
 const html=renderToStaticMarkup(createElement("main",{className:"mx-auto max-w-6xl p-4"},createElement("h1",{className:"text-2xl font-black"},"Order FY-1234"),createElement(tracker.default,{order}),createElement(tracker.default,{order:{...order,orderStatus:"CANCELLED",statusHistory:[...order.statusHistory.slice(0,2),{status:"CANCELLED",changedAt:"2026-11-03T05:00:00Z",changedBy:{id:"owner",role:"CUSTOMER"},note:"Changed my mind"}]}})));
 const css=(await readdir(new URL("../dist/assets/",import.meta.url))).find(f=>/^index-.*\.css$/.test(f));assert(css);
 await mkdir(new URL("../tmp/",import.meta.url),{recursive:true});
 await writeFile(new URL("../tmp/order-tracker-preview.html",import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+css+'"><title>Order tracker visual check</title></head><body>'+html+'</body></html>');
});
