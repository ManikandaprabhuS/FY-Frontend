import {useRef,useState} from "react";
import type {Order} from "../../types";
import Modal from "../ui/Modal";
import {useOrderFlow} from "../../store/orderFlowStore";
import {orderService} from "../../services/order.service";
import {showApiError,showLoading,showSuccess} from "../../utils/toast";
export default function CancelOrder({order,onChanged}:{order:Order;onChanged:(order:Order)=>void}){
 const {flow}=useOrderFlow(),[open,setOpen]=useState(false),[note,setNote]=useState(""),[busy,setBusy]=useState(false),lock=useRef(false);
 if(!flow)return null;
 if(!flow.cancellable.includes(order.orderStatus))return flow.cancellationMessageStatuses.includes(order.orderStatus)?<p className="my-4 text-sm text-black/60">{flow.cancellationMessage}</p>:null;
 const cancel=async()=>{if(lock.current)return;lock.current=true;setBusy(true);const id="cancel-order:"+order.id;showLoading("Please wait, your order is being cancelled...",id);
 try{const updated=await orderService.cancelOrder(order.id,note.trim()||undefined,order.orderStatus);onChanged(updated);setOpen(false);showSuccess("Order cancelled",{id});}
 catch(e){showApiError(e,"Your order could not be cancelled. Please try again.",{id});}
 finally{lock.current=false;setBusy(false);}
 };
 return <><button type="button" onClick={()=>setOpen(true)} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-bold text-red-700">Cancel order</button><Modal isOpen={open} onClose={()=>{if(!busy)setOpen(false);}} title="Cancel order" size="sm"><p className="text-sm">Are you sure you want to cancel this order?</p><label className="mt-4 block text-xs font-bold">Reason (optional)<textarea maxLength={500} value={note} onChange={e=>setNote(e.target.value)} disabled={busy} className="mt-2 min-h-24 w-full rounded-lg border p-3 text-sm"/></label><div className="mt-4 flex justify-end gap-3"><button disabled={busy} onClick={()=>setOpen(false)} className="min-h-11 rounded-lg border px-4 font-bold">Keep order</button><button disabled={busy||/[<>]/.test(note)} onClick={()=>void cancel()} className="min-h-11 rounded-lg bg-red-700 px-4 font-bold text-white disabled:opacity-50">{busy?"Cancelling…":"Confirm cancellation"}</button></div></Modal></>;
}
