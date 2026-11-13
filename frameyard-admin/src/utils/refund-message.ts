import type {Order} from "../types";
export function customerRefundMessage(order:Pick<Order,"cancelledBy"|"refundStatus"|"statusHistory">){
 const by=order.cancelledBy??(order.statusHistory?.find(e=>e.status==="CANCELLED")?.changedBy.role==="CUSTOMER"?"customer":"admin");
 if(order.refundStatus==="COMPLETED")return "Your refund is completed. Please check your respective bank account.";
 if(order.refundStatus==="INITIATED")return by==="customer"?"Your cancellation is confirmed and your refund has been initiated. You will be getting your money back.":"Your order was cancelled by FrameYaad and your refund has been initiated. You will be getting your money back.";
 return by==="admin"?"Your order was cancelled by FrameYaad.":"Your cancellation is confirmed.";
}
