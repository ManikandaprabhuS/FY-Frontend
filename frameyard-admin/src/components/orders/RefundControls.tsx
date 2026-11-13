import {useRef,useState} from "react";
import type {Order} from "../../types";
import {orderService} from "../../services/order.service";
import StatusBadge from "../ui/StatusBadge";
import {ConfirmDialog} from "../ui/ConfirmDialog";
import {showApiError,showLoading,showSuccess} from "../../utils/toast";
export default function RefundControls({order,onChanged}:{order:Order;onChanged:(order:Order)=>void}){
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState(false);const lock=useRef(false);
 if(order.orderStatus!=="CANCELLED")return null;
 const update=async(status:"INITIATED"|"COMPLETED")=>{
  if(lock.current)return;lock.current=true;setBusy(true);
  const id="refund:"+order.id;showLoading("Please wait, the refund status is being updated...",id);
  try{onChanged(await orderService.updateRefund(order,status,status==="COMPLETED"));showSuccess("Refund status updated successfully",{id});}
  catch(error){showApiError(error,"Refund status could not be updated. Please refresh and try again.",{id});}
  finally{lock.current=false;setBusy(false);}
 };
 return <section className="my-4 rounded-xl border border-black/10 p-4"><h3 className="mb-2 text-sm font-bold">Refund</h3>
 {order.refundStatus?<StatusBadge status={order.refundStatus}/>:<span className="text-sm text-black/60">Not started</span>}
 <p className="mt-2 text-xs text-black/60">Initiated: {order.refundInitiatedAt?new Date(order.refundInitiatedAt).toLocaleString("en-IN"):"-"} · Completed: {order.refundCompletedAt?new Date(order.refundCompletedAt).toLocaleString("en-IN"):"-"}</p>
 <div className="mt-3 flex flex-wrap gap-3">{!order.refundStatus&&<button disabled={busy} onClick={()=>void update("INITIATED")} className="min-h-11 rounded border px-3 text-sm font-bold disabled:opacity-40">Refund initiated</button>}{order.refundStatus!=="COMPLETED"&&<button disabled={busy} onClick={()=>setConfirm(true)} className="min-h-11 rounded bg-black px-3 text-sm font-bold text-white disabled:opacity-40">Refund completed</button>}</div>
 {!!order.refundHistory?.length&&<details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">Refund history</summary><ul>{order.refundHistory.map((e,i)=><li key={i} className="mt-2">{e.status} · {new Date(e.changedAt).toLocaleString("en-IN")} · {e.changedBy.role} ({e.changedBy.id})</li>)}</ul></details>}
 <ConfirmDialog isOpen={confirm} onClose={()=>setConfirm(false)} onConfirm={()=>void update("COMPLETED")} title="Confirm refund completed" message={"Confirm Rs. "+Number(order.totalAmount).toFixed(2)+" has been sent to the customer."} confirmText="Confirm refund" type="warning"/>
 </section>;
}
