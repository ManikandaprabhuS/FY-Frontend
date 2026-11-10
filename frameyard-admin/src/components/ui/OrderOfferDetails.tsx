import type { Order } from "../../types";
const money=(n:number)=>"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
export default function OrderOfferDetails({order}:{order:Order}){
 const title=order.couponTitle??order.coupon?.couponCode??order.couponId;
 return <dl className="mt-3 space-y-1 text-xs" aria-label="Order offer details"><div className="flex flex-wrap justify-between gap-2"><dt>Coupon</dt><dd className="font-bold">{title??"-"}{order.discountPercent? " ("+order.discountPercent+"%)":""}</dd></div><div className="flex justify-between gap-2"><dt>Coupon discount</dt><dd className="font-bold">{title? "−"+money(order.discountAmount??0):"-"}</dd></div>{order.subtotal!=null&&<div className="flex justify-between gap-2"><dt>Subtotal</dt><dd>{money(order.subtotal)}</dd></div>}</dl>;
}
