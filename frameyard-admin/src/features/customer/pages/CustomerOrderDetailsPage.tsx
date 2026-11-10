import {useEffect,useState} from "react";
import {Link,useParams} from "react-router-dom";
import type {Order} from "../../../types";
import {orderService} from "../../../services/order.service";
import OrderStatusTracker from "../../../components/orders/OrderStatusTracker";
import CancelOrder from "../../../components/orders/CancelOrder";
import OrderItemOptions from "../../../components/orders/OrderItemOptions";
import OrderOfferDetails from "../../../components/ui/OrderOfferDetails";
export default function CustomerOrderDetailsPage(){
 const {id}=useParams(),[order,setOrder]=useState<Order>(),[error,setError]=useState(""),[revision,setRevision]=useState(0);
 useEffect(()=>{
  if(!id)return;let active=true,inFlight=false;
  const load=async()=>{if(inFlight)return;inFlight=true;try{const data=await orderService.getOrderById(id);if(active){setOrder(data);setError("");}}catch{if(active)setError("Your order could not be refreshed. Please try again.");}finally{inFlight=false;}};
  void load();const refresh=()=>{if(document.visibilityState==="visible")void load();};
  const timer=setInterval(refresh,45000);document.addEventListener("visibilitychange",refresh);
  return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
 },[id,revision]);
 return <section className="mx-auto my-6 max-w-6xl rounded-xl border border-black/10 bg-white p-4 sm:p-8"><div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-black">{order?"Order "+order.orderNumber:"Order details"}</h1><Link to="/orders" className="min-h-11 py-3 text-sm font-bold underline">All orders</Link></div>{error&&<p role="alert" className="my-4 text-sm text-red-700">{error} <button onClick={()=>setRevision(v=>v+1)} className="min-h-11 px-2 font-bold underline">Retry</button></p>}
 {!order?<p role="status" className="my-6">Loading your order…</p>:<><OrderStatusTracker order={order}/><CancelOrder order={order} onChanged={setOrder}/><div className="my-5 space-y-4">{order.orderItems.map(item=><article key={item.id} className="rounded-lg border border-black/10 p-4"><h2 className="font-bold">{item.productName}</h2><OrderItemOptions item={item}/><p className="mt-2 text-xs">Qty: {item.quantity} · ₹{Number(item.price).toLocaleString("en-IN",{minimumFractionDigits:2})}</p></article>)}</div><OrderOfferDetails order={order}/><p className="mt-4 text-right text-lg font-black">Total: ₹{Number(order.totalAmount).toLocaleString("en-IN",{minimumFractionDigits:2})}</p><Link to="/notifications" className="mt-5 inline-block min-h-11 py-3 text-sm font-bold underline">Order notifications</Link></>}
 </section>;
}
