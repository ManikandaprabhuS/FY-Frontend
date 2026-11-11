import api from "./api";
import {useAuthStore} from "../store/authStore";
import type {DeliveryAddress} from "../features/customer/components/CheckoutAddressForm";
export function checkoutRequestKey(intent:string){
 const storageKey="fy-checkout:"+useAuthStore.getState().user?.id;
 try{
  const stored=JSON.parse(localStorage.getItem(storageKey)??"null") as {intent:string;key:string}|null;
  if(stored?.intent===intent)return stored.key;
  const key=crypto.randomUUID();localStorage.setItem(storageKey,JSON.stringify({intent,key}));return key;
 }catch{return crypto.randomUUID();}
}
export type OfferCode="FIRST_ORDER"|"BIG_ORDER";
export type CheckoutSelection={productIdentifier:string;variantId:string;quantity:number;colorName?:string;colorHex?:string};
export type CheckoutOffer={code:OfferCode;title:string;description:string;percent:number;discountAmount:number;total:number;bestOffer:boolean;version:number;unavailableReason?:string};
export type CheckoutQuote={offers:CheckoutOffer[];unavailableOffers?:CheckoutOffer[];subtotal:number;bigOrderRemovalMessage:string;addresses:DeliveryAddress[]};
const summaryCache=new Map<string,{expires:number;promise:Promise<CheckoutQuote>}>();
export const checkoutService={
 offers:(items:CheckoutSelection[],fresh=false):Promise<CheckoutQuote> => {
  const key=JSON.stringify([useAuthStore.getState().user?.id,items]);
  const cached=summaryCache.get(key);
  if(!fresh&&cached&&cached.expires>Date.now())return cached.promise;
  const promise=api.post<{data:CheckoutQuote}>("/checkout/summary",{items},{timeout:20000}).then(response=>response.data.data);
  const entry={expires:Date.now()+15000,promise};summaryCache.set(key,entry);
  if(summaryCache.size>20)summaryCache.delete(summaryCache.keys().next().value!);
  void promise.catch(()=>{if(summaryCache.get(key)===entry)summaryCache.delete(key);});
  return promise;
 },
 place:async(items:CheckoutSelection[],userAddressId:string,couponCode?:OfferCode,couponVersion?:number,checkoutKey?:string,photoId?:string) => {
  const key=checkoutKey??checkoutRequestKey(JSON.stringify({items,userAddressId,couponCode,couponVersion,photoId}));
  const response=await api.post<{data:{order:{id:string;photoFileName?:string|null;photoSizeBytes?:number|null;orderNumber:string;totalPrice:string;couponTitle?:string;discountPercent?:string;discountAmount?:string;subtotal?:string}}}>("/orders/checkout",{items,userAddressId,couponCode,couponVersion,photoId,paymentMethod:"COD",checkoutKey:key},{timeout:30000});
  try{localStorage.removeItem("fy-checkout:"+useAuthStore.getState().user?.id);}catch{/* Retry safety also exists on the backend. */}
  if(typeof window!=="undefined")window.dispatchEvent(new Event("fy:customer-orders-changed"));
  return response.data.data.order;
 },
};
