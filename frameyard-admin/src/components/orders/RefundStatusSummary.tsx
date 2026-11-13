import type {Order} from "../../types";
import StatusBadge from "../ui/StatusBadge";
export default function RefundStatusSummary({order}:{order:Pick<Order,"refundStatus"|"refundInitiatedAt"|"refundCompletedAt">}){
 if(!order.refundStatus)return <span>-</span>;
 return <div className="space-y-1"><StatusBadge status={order.refundStatus}/>{order.refundInitiatedAt&&<p className="text-[10px] text-black/60">Initiated: <time dateTime={order.refundInitiatedAt}>{new Date(order.refundInitiatedAt).toLocaleString("en-IN")}</time></p>}{order.refundCompletedAt&&<p className="text-[10px] text-black/60">Completed: <time dateTime={order.refundCompletedAt}>{new Date(order.refundCompletedAt).toLocaleString("en-IN")}</time></p>}</div>;
}
