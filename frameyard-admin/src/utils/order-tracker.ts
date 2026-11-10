import type {Order} from "../types";
import type {OrderFlow} from "../store/orderFlowStore";
export function trackerSteps(order:Pick<Order,"orderStatus"|"createdAt"|"statusHistory">,flow:OrderFlow){
 const history=order.statusHistory??[],cancelled=order.orderStatus==="CANCELLED";
 const current=flow.legacyDisplay[order.orderStatus]??order.orderStatus;
 let index=flow.steps.findIndex(s=>s.status===current);
 if(cancelled)index=Math.max(0,...history.filter(e=>e.status!=="CANCELLED").map(e=>flow.steps.findIndex(s=>s.status===e.status)),...history.filter(e=>e.status==="CANCELLED").map(e=>flow.steps.findIndex(s=>s.status===e.previousStatus)));
 return flow.steps.filter((_,i)=>!cancelled||i<=index).map((step,i)=>({...step,done:i<=index,current:!cancelled&&i===index,
 timestamp:history.find(e=>e.status===step.status)?.changedAt??(step.status==="PLACED"?order.createdAt:undefined)}));
}
