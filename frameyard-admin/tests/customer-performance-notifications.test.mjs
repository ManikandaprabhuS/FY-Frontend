import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRequire} from "node:module";
import ts from "typescript";
const require=createRequire(import.meta.url);
const source=path=>readFile(new URL("../src/"+path,import.meta.url),"utf8");
function compile(text,overrides){
 const module={exports:{}};
 new Function("require","module","exports",ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);
 return module.exports;
}
test("customer order pages deduplicate requests, cache returning pages, and keep owners separate",async()=>{
 let calls=0,resolve;
 const api={get:()=>{calls++;return new Promise(done=>resolve=done);}};
 const service=compile(await source("services/customer-orders.service.ts"),{"./api":{__esModule:true,default:api}});
 const first=service.customerOrdersPage("A"),second=service.customerOrdersPage("A");
 assert.equal(calls,1);assert.equal(first,second);
 const page={orders:[],pagination:{page:1,limit:10,total:0,totalPages:0}};
 resolve({data:{data:page}});await first;
 assert.equal(await service.customerOrdersPage("A"),page);assert.equal(calls,1);
 service.customerOrdersPage("B");assert.equal(calls,2);resolve({data:{data:page}});
});
test("checkout summary prefetch shares one request while final placement still sends the server validation payload",async()=>{
 let calls=0,resolve;
 const api={post:()=>{calls++;return new Promise(done=>resolve=done);}};
 const service=compile(await source("services/checkout.service.ts"),{"./api":{__esModule:true,default:api},"../store/authStore":{useAuthStore:{getState:()=>({user:{id:"owner"}})}}});
 const items=[{productIdentifier:"P",variantId:"v",quantity:1}];
 const first=service.checkoutService.offers(items),second=service.checkoutService.offers(items);
 assert.equal(first,second);assert.equal(calls,1);resolve({data:{data:{offers:[]}}});await first;
 await service.checkoutService.offers(items);assert.equal(calls,1);
 service.checkoutService.offers(items,true);assert.equal(calls,2);resolve({data:{data:{offers:[]}}});
});
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function find(node,predicate){
 if(!node||typeof node!=="object")return;
 if(predicate(node))return node;
 const children=node.props?.children;
 for(const child of Array.isArray(children)?children:[children]){
  if(Array.isArray(child)){for(const nested of child){const result=find(nested,predicate);if(result)return result;}}
  else{const result=find(child,predicate);if(result)return result;}
 }
}
test("customer mark-all is optimistic, uses one call, and rolls back after failure",async()=>{
 const fixture={id:"n",type:"ORDER_PLACED",title:"Order placed",message:"Placed",orderId:"o",isRead:false,createdAt:new Date().toISOString()};
 let reject,calls=0;const toasts=[];
 const {useCustomerNotificationStore}=compile(await source("store/customerNotificationStore.ts"),{
  "../services/customer-notifications.service":{customerNotifications:{list:async()=>({notifications:[fixture],pagination:{page:1,limit:20,total:2,totalPages:1},summary:{totalCount:2,unreadCount:2,readCount:0},unreadCount:2}),read:()=>{calls++;return new Promise((_,fail)=>reject=fail);}}},
  "../utils/toast":{showSuccess:(...args)=>toasts.push(["success",...args]),showError:(...args)=>toasts.push(["error",...args])}
 });
 const store=useCustomerNotificationStore;store.getState().setOwner("owner");await store.getState().load();
 const pending=store.getState().mark();assert.equal(store.getState().summary.unreadCount,0);assert.equal(store.getState().pages["all:1"].notifications[0].isRead,true);assert.equal(calls,1);assert.equal(toasts[0][0],"success");
 await store.getState().mark();assert.equal(calls,1);reject(new Error("Offline"));await pending;
 assert.equal(store.getState().summary.unreadCount,2);assert.equal(store.getState().pages["all:1"].notifications[0].isRead,false);assert.equal(toasts.at(-1)[0],"error");
});
test("checkout items render from memory; orders are lazy paginated; customer polling is visibility-aware",async()=>{
 const checkout=await source("features/customer/components/CheckoutOffers.tsx");
 assert.match(checkout,/aria-label="Your products"/);assert.match(checkout,/items.map/);assert.doesNotMatch(checkout,/,350\)/);
 const orders=await source("features/customer/components/CustomerOrderSummaries.tsx");
 assert.match(orders,/memo\(/);assert.match(orders,/loading="lazy"/);assert.match(orders,/Previous/);assert.match(orders,/Next/);
 const bell=await source("features/customer/components/CustomerNotificationBell.tsx");
 const shared=await source("store/customerNotificationStore.ts");assert.match(shared,/document.hidden/);assert.match(shared,/45000/);assert.match(bell,/Load more/);assert.match(bell,/No notifications yet/);assert.doesNotMatch(bell,/dangerouslySetInnerHTML/);
});
