import {useEffect,useState} from "react";
import {useLocation,useNavigate,useParams} from "react-router-dom";
import {ChevronLeft} from "lucide-react";
import type {Order} from "../../../types";
import {orderService} from "../../../services/order.service";
import OrderDetailView from "../components/OrderDetailView";
import {FrameLoader} from "../../../components/loaders/FrameLoader";
import "../styles/orders.css";

/**
 * One order on its own page (Profile → View Details, Track your order after checkout). It shows
 * the same detail as My Orders; Back returns to wherever the customer came from.
 */
export default function CustomerOrderDetailsPage(){
 const {id}=useParams(),[order,setOrder]=useState<Order>(),[error,setError]=useState(""),[revision,setRevision]=useState(0);
 const navigate=useNavigate(),location=useLocation();
 const from=(location.state as {from?:string}|null)?.from;
 const backLabel=from==="profile"?"Back to profile":"All orders";
 // Go back in history when we arrived from inside the store; otherwise open My Orders.
 const back=()=>{const index=(window.history.state as {idx?:number}|null)?.idx??0;if(from&&index>0)navigate(-1);else navigate("/orders");};
 useEffect(()=>{
  if(!id)return;let active=true,inFlight=false;
  const load=async()=>{if(inFlight)return;inFlight=true;try{const data=await orderService.getOrderById(id);if(active){setOrder(data);setError("");}}catch{if(active)setError("Your order could not be refreshed. Please try again.");}finally{inFlight=false;}};
  void load();const refresh=()=>{if(document.visibilityState==="visible")void load();};
  const timer=setInterval(refresh,45000);document.addEventListener("visibilitychange",refresh);
  return()=>{active=false;clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
 },[id,revision]);
 return <section className="fy-oh fy-oh--page">
  <div className="fy-oh-page__bar">
   <button type="button" className="fy-oh-back" onClick={back}><ChevronLeft aria-hidden="true"/>{backLabel}</button>
   {order&&<span className="fy-oh-topbar__title">{order.orderNumber}</span>}
  </div>
  {error&&<p role="alert" className="fy-oh-page__error">{error} <button type="button" onClick={()=>setRevision(v=>v+1)} className="fy-oh-link">Retry</button></p>}
  <div className="fy-oh__detail-inner fy-oh-page__panel">
   {order?<OrderDetailView order={order} onChanged={setOrder}/>:!error&&<FrameLoader label="Loading your order"/>}
  </div>
 </section>;
}
