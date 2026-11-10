import {Check,XCircle} from "lucide-react";
import StatusBadge from "../ui/StatusBadge";
import type {Order} from "../../types";
import {useOrderFlow} from "../../store/orderFlowStore";
import {trackerSteps} from "../../utils/order-tracker";
const date=(value?:string)=>value&&Number.isFinite(Date.parse(value))?new Date(value).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}):"-";

export default function OrderStatusTracker({order,compact=false}:{order:Order;compact?:boolean}){
 const {flow,error,retry}=useOrderFlow();
 if(!flow)return <div role="status" className="my-4 text-xs text-black/60">{error?<button onClick={()=>void retry()} className="min-h-11 font-bold underline">Retry loading order tracker</button>:"Loading order tracker…"}</div>;
 const steps=trackerSteps(order,flow),cancel=[...(order.statusHistory??[])].reverse().find(e=>e.status==="CANCELLED");
 return <section aria-label="Order status tracker" className="my-4 rounded-xl border border-black/10 bg-white p-4">{!compact&&<div className="mb-5"><StatusBadge status={order.orderStatus}/></div>}
 <ol className={"grid gap-4 "+(!compact?"md:grid-cols-5":"sm:grid-cols-5")}>{steps.map(step=><li key={step.status} aria-current={step.current?"step":undefined} className="flex min-w-0 items-start gap-3 sm:block"><span className={"mb-2 inline-grid h-8 w-8 shrink-0 place-items-center rounded-full border "+(step.current?"border-black bg-black text-white ring-4 ring-black/10":step.done?"border-emerald-700 bg-emerald-700 text-white":"border-gray-200 bg-gray-100 text-gray-500")}>{step.done?<Check size={16} aria-hidden/>:<span aria-hidden>○</span>}</span><div><p className={"text-xs font-bold "+(step.done?"text-black":"text-gray-500")}>{step.label}<span className="sr-only">{step.current?", current step":step.done?", completed":", upcoming"}</span></p>{!compact&&<p className="mt-1 text-xs leading-5 text-black/60">{step.description}</p>}{step.done&&<time dateTime={step.timestamp} className="mt-1 block text-[11px] text-black/60">{date(step.timestamp)}</time>}</div></li>)}
 {order.orderStatus==="CANCELLED"&&<li aria-current="step" className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700"><p className="flex items-center gap-2 text-sm font-bold"><XCircle size={18} aria-hidden/>Cancelled</p><time className="mt-1 block text-xs" dateTime={cancel?.changedAt}>{date(cancel?.changedAt)}</time><p className="mt-2 text-xs font-bold">{cancel?.changedBy.role==="CUSTOMER"?"Cancelled by you":cancel?.changedBy.role?"Cancelled by store":"Cancelled by -"}</p>{cancel?.note&&<p className="mt-1 whitespace-pre-wrap break-words text-xs">{cancel.note}</p>}</li>}
 </ol></section>;
}
