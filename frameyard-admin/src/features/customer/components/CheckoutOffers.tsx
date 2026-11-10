import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Tag, Check } from "lucide-react";
import { checkoutService, type CheckoutQuote, type OfferCode } from "../../../services/checkout.service";
import { useCustomerCommerceStore } from "../../../store/customerCommerceStore";
import { showApiError, showLoading, showSuccess, showWarning } from "../../../utils/toast";
const money=(n:number)=>"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
export default function CheckoutOffers(){
 const items=useCustomerCommerceStore(s=>s.cartItems);
 const signature=JSON.stringify(items.map(i=>({productIdentifier:i.productIdentifier??"",variantId:i.variantId,quantity:i.quantity,...(i.colorName?{colorName:i.colorName}:{}),...(i.colorHex?{colorHex:i.colorHex}:{})})));
 const selections=useMemo(()=>JSON.parse(signature) as Parameters<typeof checkoutService.offers>[0],[signature]);
 const [quote,setQuote]=useState<CheckoutQuote>(),[quoteSignature,setQuoteSignature]=useState(""),[code,setCode]=useState<OfferCode>(),[address,setAddress]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const [placed,setPlaced]=useState<Awaited<ReturnType<typeof checkoutService.place>>>();
 const selected=quote?.offers.find(o=>o.code===code);
 const saveLock=useRef(false);
 const codeRef=useRef(code),quoteRef=useRef(quote);
 useEffect(()=>{codeRef.current=code;quoteRef.current=quote;},[code,quote]);
 useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[]);
 useEffect(()=>{
  if(!selections.length)return;
  let active=true;
  const timer=setTimeout(()=>{void checkoutService.offers(selections).then(data=>{
   if(!active)return;
   const current=codeRef.current;
   if(current&&(!data.offers.some(o=>o.code===current)||data.offers.find(o=>o.code===current)?.version!==quoteRef.current?.offers.find(o=>o.code===current)?.version)){
    setCode(undefined);
    showWarning(data.offers.some(o=>o.code===current)?"This offer was updated. Please review your total.":current==="BIG_ORDER"?data.bigOrderRemovalMessage:"This offer is no longer available",{id:"checkout-offer"});
   }
   setQuote(data);setQuoteSignature(signature);setError(false);setAddress(previous=>data.addresses.some(a=>a.id===previous)?previous:data.addresses[0]?.id??"");
  }).catch(e=>{if(active){setError(true);showApiError(e,"Offers could not be loaded. Please try again.",{id:"checkout-offers",retry:()=>setRevision(v=>v+1)});}});},350);
  return()=>{active=false;clearTimeout(timer);};
 },[signature,selections,revision]);
 const loading=!error&&quoteSignature!==signature;
 const place=async()=>{
  if(saveLock.current||busy||loading||!address||!quote)return; saveLock.current=true;
  setBusy(true);showLoading("Please wait, your order is being placed...","checkout-save");
  try{
   const latest=await checkoutService.offers(selections);
   setQuote(latest);setQuoteSignature(signature);
   if(code&&(!latest.offers.some(o=>o.code===code)||latest.offers.find(o=>o.code===code)?.version!==selected?.version)){
    setCode(undefined);showWarning(latest.offers.some(o=>o.code===code)?"This offer was updated. Please review your total.":"This offer is no longer available",{id:"checkout-save"});return;
   }
   const order=await checkoutService.place(selections,address,code,selected?.version);setPlaced(order);
   useCustomerCommerceStore.getState().clearCart();showSuccess("Order placed successfully",{id:"checkout-save"});
  }catch(e){showApiError(e,"Order could not be placed. Please try again.",{id:"checkout-save"});setCode(undefined);setRevision(v=>v+1);}
  finally{saveLock.current=false;setBusy(false);}
 };
 if(placed)return <section className="mt-6 rounded-xl border border-black/10 bg-white p-5"><h2 className="text-xl font-black">Order confirmed: {placed.orderNumber}</h2><p className="mt-3 font-bold">Total: {money(Number(placed.totalPrice))}</p><p>Subtotal: {money(Number(placed.subtotal??placed.totalPrice))}</p><p>Coupon: {placed.couponTitle??"-"}{placed.couponTitle?" ("+Number(placed.discountPercent??0)+"%)":""}</p><p>Coupon discount: {placed.couponTitle?"−"+money(Number(placed.discountAmount??0)):"-"}</p><Link to="/orders" className="mt-4 inline-block font-bold underline">View your orders</Link></section>;
 if(!items.length)return <div className="mt-5"><p>Your cart is empty.</p><Link to="/products" className="font-bold underline">Explore frames</Link></div>;
 return <div className="mt-6 grid gap-5">
  {loading&&<div role="status" aria-label="Checking available offers" className="h-28 animate-pulse rounded-xl bg-black/5"/>}
  {error&&<button onClick={()=>{setError(false);setRevision(v=>v+1);}} className="min-h-11 rounded-lg border border-black/20 font-bold">Retry loading offers</button>}
  {!loading&&!error&&Boolean(quote?.offers.length)&&<section aria-label="Offers for you"><h2 className="mb-3 text-lg font-black">Offers for you</h2><div className="grid gap-3 sm:grid-cols-2">{quote!.offers.map(offer=><div key={offer.code} className={"rounded-xl border p-4 "+(code===offer.code?"border-black bg-black/5":"border-black/15 bg-white")}>
   <button type="button" disabled={busy} aria-pressed={code===offer.code} onClick={()=>{setCode(offer.code);showSuccess(offer.title+" applied",{id:"checkout-offer"});}} className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4"><span className="flex items-center gap-2 font-black"><Tag size={18}/>{offer.title}{code===offer.code&&<Check size={16}/>}</span>{offer.bestOffer&&<span className="mt-2 inline-block rounded bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">Best offer</span>}<span className="mt-2 block text-sm text-black/60">{offer.description}</span><span className="mt-2 block font-bold">Save {money(offer.discountAmount)}</span></button>
   {code===offer.code&&<div className="mt-3 flex items-center justify-between text-sm font-bold"><span>Applied</span><button disabled={busy} onClick={()=>{setCode(undefined);showWarning("Offer removed",{id:"checkout-offer"});}} className="min-h-11 px-2 underline">Remove</button></div>}
  </div>)}</div></section>}
  <section className="rounded-xl border border-black/10 p-5"><h2 className="text-lg font-black">Order summary</h2>{!loading&&quote&&<dl className="mt-4 space-y-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd className="font-bold">{money(quote.subtotal)}</dd></div>{selected&&<div className="flex justify-between gap-3 text-emerald-800"><dt>Coupon discount · {selected.title} ({selected.percent}%)</dt><dd className="shrink-0 font-bold">−{money(selected.discountAmount)}</dd></div>}<div className="flex justify-between border-t border-black/10 pt-3 text-lg font-black"><dt>Total</dt><dd>{money(selected?.total??quote.subtotal)}</dd></div></dl>}</section>
  {quote?.addresses.length?<label className="text-sm font-bold">Delivery address<select disabled={busy} value={address} onChange={e=>setAddress(e.target.value)} className="mt-2 min-h-12 w-full rounded-lg border border-black/20 bg-white px-3">{quote.addresses.map(a=><option key={a.id} value={a.id}>{a.contactPerson} · {a.addressLine}, {a.city} {a.postalCode}</option>)}</select></label>:<p className="text-sm">A saved delivery address is required. <Link to="/profile#addresses" className="font-bold underline">Manage your address</Link></p>}
  <button type="button" disabled={busy||loading||error||!address} onClick={()=>void place()} className="min-h-12 rounded-lg bg-black px-5 font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">{busy?"Placing order…":"Place order"}</button>
 </div>;
}
