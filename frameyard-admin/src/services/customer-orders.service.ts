import api from "./api";
import type {Pagination} from "./contracts";
export type CustomerOrderSummary={id:string;orderNumber:string;createdAt:string;status:string;total:number;itemCount:number;items:Array<{id:string;productId?:string|null;name:string;quantity:number;imageUrl:string|null}>};
type OrderPage={orders:CustomerOrderSummary[];pagination:Pagination};
const cache=new Map<string,{until:number;value?:OrderPage;request?:Promise<OrderPage>}>();
if(typeof window!=="undefined")window.addEventListener("fy:customer-orders-changed",()=>cache.clear());
export const cachedCustomerOrders=(owner:string,page=1)=>cache.get(owner+":"+page)?.value;
export const customerOrdersPage=(owner:string,page=1,fresh=false):Promise<OrderPage>=>{
 const key=owner+":"+page,entry=cache.get(key);
 if(!fresh&&entry?.request)return entry.request;
 if(!fresh&&entry?.value&&entry.until>Date.now())return Promise.resolve(entry.value);
 const next={until:Date.now()+30000,value:entry?.value,request:undefined as Promise<OrderPage>|undefined};
 next.request=api.get<{data:OrderPage}>("/orders/customer-summary",{params:{page,limit:10},timeout:20000}).then(response=>{
  next.value=response.data.data;next.request=undefined;next.until=Date.now()+30000;return next.value;
 }).catch(error=>{next.request=undefined;next.until=0;throw error;});
 cache.set(key,next);if(cache.size>30)cache.delete(cache.keys().next().value!);return next.request;
};
