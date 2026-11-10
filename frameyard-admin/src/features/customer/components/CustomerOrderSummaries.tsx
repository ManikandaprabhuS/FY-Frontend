import {memo,useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {ShoppingBag} from "lucide-react";
import StatusBadge from "../../../components/ui/StatusBadge";
import {cachedCustomerOrders,customerOrdersPage,type CustomerOrderSummary} from "../../../services/customer-orders.service";
import {showApiError} from "../../../utils/toast";
const Row=memo(function Row({order}:{order:CustomerOrderSummary}){
 const item=order.items[0];
 return <article className="grid gap-4 rounded-2xl border border-black/10 bg-white p-3 shadow-[0_8px_28px_rgba(0,0,0,0.03)] sm:grid-cols-[82px_1fr_auto] sm:items-center sm:p-4">
 {item?.imageUrl?<img src={item.imageUrl} alt="" loading="lazy" width={80} height={80} className="h-20 w-20 rounded-xl bg-[#f4f1ed] object-cover"/>:<div className="grid h-20 w-20 place-items-center rounded-xl bg-[#f4f1ed]"><ShoppingBag size={24}/></div>}
 <div className="min-w-0 text-xs"><strong className="block">#{order.orderNumber}</strong><time className="mt-1 block text-black/60">{new Date(order.createdAt).toLocaleDateString("en-IN")}</time><p className="mt-2 truncate font-bold">{order.items.map(i=>i.name).join(", ")}</p><p className="mt-1 text-black/60">{order.itemCount} {order.itemCount===1?"item":"items"}</p>{order.items.filter(i=>i.productId).map(i=><Link key={i.id} to={"/product/"+encodeURIComponent(i.productId!)+"?writeReview=1#reviews"} className="mr-3 inline-flex min-h-11 items-center text-xs font-bold underline">Review {i.name}</Link>)}<strong className="mt-2 block">{order.total.toLocaleString("en-IN",{style:"currency",currency:"INR"})}</strong></div>
 <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end"><StatusBadge status={order.status}/><Link to={"/orders/"+order.id} className="rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">View Details</Link></div></article>;
});
export default function CustomerOrderSummaries({userId}:{userId:string}){
 const cached=cachedCustomerOrders(userId);
 const [data,setData]=useState(cached),[page,setPage]=useState(1),[loading,setLoading]=useState(!cached),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 useEffect(()=>{
  let active=true;
  void customerOrdersPage(userId,page,revision>0).then(value=>{if(active){setData(value);setError(false);}}).catch(e=>{if(active){setError(true);showApiError(e,"Your orders could not be loaded.",{id:"customer-orders"});}}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[userId,page,revision]);
 const change=(next:number)=>{setLoading(true);setPage(next);};
 return <div aria-busy={loading} className="space-y-3">
 {data?.orders.map(order=><Row key={order.id} order={order}/>)}
 {loading&&Array.from({length:data?.orders.length?1:3},(_,i)=><div key={i} aria-label="Loading orders" className="h-28 animate-pulse rounded-2xl bg-black/5"/>)}
 {error&&<button type="button" onClick={()=>{setLoading(true);setRevision(v=>v+1);}} className="min-h-11 rounded-lg border px-4 font-bold">Retry loading orders</button>}
 {!loading&&!error&&data?.orders.length===0&&<div className="rounded-xl border border-black/10 bg-white p-8 text-center"><ShoppingBag className="mx-auto h-7 w-7 text-black/35"/><p className="mt-3 text-sm font-bold">No orders yet</p><Link to="/products" className="mt-3 inline-flex rounded-lg bg-black px-4 py-2 text-xs font-bold text-white">Shop frames</Link></div>}
 {data&&data.pagination.total>0&&<nav aria-label="Order pages" className="flex items-center justify-between gap-2 text-xs"><button disabled={loading||page<=1} onClick={()=>change(page-1)} className="min-h-11 rounded-lg border px-3 font-bold disabled:opacity-40">Previous</button><span>Page {data.pagination.page} of {data.pagination.totalPages} · {data.pagination.total} orders</span><button disabled={loading||page>=data.pagination.totalPages} onClick={()=>change(page+1)} className="min-h-11 rounded-lg border px-3 font-bold disabled:opacity-40">Next</button></nav>}
 </div>;
}
