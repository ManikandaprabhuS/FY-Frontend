import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Mail, MapPin, Phone, Plus, Tag, Truck, Wallet } from "lucide-react";
import ColorSwatch from "./ColorSwatch";
import { Skeleton } from "../../../components/loaders/FrameLoader";
import { useTweened } from "../hooks/useTweened";
import "../styles/checkout.css";
import { checkoutService, type CheckoutQuote, type OfferCode } from "../../../services/checkout.service";
import { useCustomerCommerceStore } from "../../../store/customerCommerceStore";
import { showApiError, showError, showLoading, showSuccess, showWarning } from "../../../utils/toast";
import CheckoutAddressForm from "./CheckoutAddressForm";
import {getPhotoMaxBytes,PHOTO_MB_BYTES,photoSizeError} from "../../../utils/photo-limits";
import CheckoutPhotoUpload, {type CheckoutPhotoHandle} from "./CheckoutPhotoUpload";
import {useAuthStore} from "../../../store/authStore";
import {removeCartPhotos,removeLocalPhoto} from "../../../services/local-photos";
import OrderPhotoDownload from "../../../components/orders/OrderPhotoDownload";
import type {OrderPhotoInfo} from "../../../services/order-photos.service";
const money=(n:number)=>"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
export default function CheckoutOffers(){
 const navigate=useNavigate();
 const photoControl=useRef<CheckoutPhotoHandle>(null);
 const items=useCustomerCommerceStore(s=>s.cartItems);
 const signature=JSON.stringify(items.map(i=>({productIdentifier:i.productIdentifier??"",variantId:i.variantId,quantity:i.quantity,...(i.colorName?{colorName:i.colorName}:{}),...(i.colorHex?{colorHex:i.colorHex}:{})})));
 const selections=useMemo(()=>JSON.parse(signature) as Parameters<typeof checkoutService.offers>[0],[signature]);
 const [quote,setQuote]=useState<CheckoutQuote>(),[quoteSignature,setQuoteSignature]=useState(""),[code,setCode]=useState<OfferCode>(),[address,setAddress]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(false),[revision,setRevision]=useState(0);
 const [placed,setPlaced]=useState<Awaited<ReturnType<typeof checkoutService.place>>>();
 const selected=quote?.offers.find(o=>o.code===code);
 const visibleOffers=[...(quote?.offers??[]),...(quote?.unavailableOffers??[])];
 const saveLock=useRef(false);
 const [cod,setCod]=useState(false);
 // Presentation only: the new-address panel, the phone summary drawer, and a failure count that shakes the button.
 const [adding,setAdding]=useState(false),[summaryOpen,setSummaryOpen]=useState(false),[failed,setFailed]=useState(0);
 const user=useAuthStore(s=>s.user);
 const [photo,setPhoto]=useState<OrderPhotoInfo|null>(null),[photoBusy,setPhotoBusy]=useState(true);
 const codeRef=useRef(code),quoteRef=useRef(quote);
 useEffect(()=>{codeRef.current=code;quoteRef.current=quote;},[code,quote]);
 useEffect(()=>{const refresh=()=>setRevision(v=>v+1);window.addEventListener("focus",refresh);return()=>window.removeEventListener("focus",refresh);},[]);
 useEffect(()=>{
  if(!selections.length)return;
  let active=true;
  const timer=setTimeout(()=>{void checkoutService.offers(selections,revision>0).then(data=>{
   if(!active)return;
   const current=codeRef.current;
   if(current&&(!data.offers.some(o=>o.code===current)||data.offers.find(o=>o.code===current)?.version!==quoteRef.current?.offers.find(o=>o.code===current)?.version)){
    setCode(undefined);
    showWarning(data.offers.some(o=>o.code===current)?"This offer was updated. Please review your total.":current==="BIG_ORDER"?data.bigOrderRemovalMessage:"This offer is no longer available",{id:"checkout-offer"});
   }
   setQuote(data);setQuoteSignature(signature);setError(false);setAddress(previous=>data.addresses.some(a=>a.id===previous)?previous:data.addresses[0]?.id??"");
  }).catch(e=>{if(active){setError(true);showApiError(e,"Offers could not be loaded. Please try again.",{id:"checkout-offers",retry:()=>setRevision(v=>v+1)});}});},0);
  return()=>{active=false;clearTimeout(timer);};
 },[signature,selections,revision]);
 const loading=!error&&quoteSignature!==signature;
 const maxPhotoMB=quoteSignature===signature&&quote?.photoLimit?quote.photoLimit.maxAllowedMB:Number((getPhotoMaxBytes(items)/PHOTO_MB_BYTES).toFixed(1));
 const photoInvalid=Boolean(photo&&photo.sizeBytes>getPhotoMaxBytes([{maxPhotoSizeMB:maxPhotoMB}]));
 const place=async()=>{
  const auth=useAuthStore.getState();
  if(!auth.isAuthenticated||auth.user?.role!=='CUSTOMER'){
   showWarning('Please log in to place your order',{id:'checkout-login'});
   navigate('/profile',{state:{returnTo:'/checkout'}});return;
  }
  if(saveLock.current||busy||photoBusy||photoInvalid||loading||!address||!quote||!cod)return; saveLock.current=true;
  setBusy(true);showLoading("Please wait, your order is being placed...","checkout-save");
  try{
   const latest=await checkoutService.offers(selections,true);
   setQuote(latest);setQuoteSignature(signature);
   if(photo&&latest.photoLimit){const max=getPhotoMaxBytes([{maxPhotoSizeMB:latest.photoLimit.maxAllowedMB}]);if(photo.sizeBytes>max){showWarning(photoSizeError(photo.sizeBytes,max)+" Please clear or replace your photo.",{id:"checkout-save"});return;}}
   if(code&&(!latest.offers.some(o=>o.code===code)||latest.offers.find(o=>o.code===code)?.version!==selected?.version)){
    setCode(undefined);showWarning(latest.offers.some(o=>o.code===code)?"This offer was updated. Please review your total.":"This offer is no longer available",{id:"checkout-save"});return;
   }
   const uploaded=await photoControl.current?.prepare(latest.photoLimit?.maxAllowedMB??maxPhotoMB);
   const order=await checkoutService.place(selections,address,code,selected?.version,undefined,uploaded?.imageId);setPlaced(order);
   await removeCartPhotos(items.map(i=>i.key));await removeLocalPhoto('checkout');
   useCustomerCommerceStore.getState().clearCart();showSuccess("Order placed successfully",{id:"checkout-save"});
  }catch(e){
   setFailed(v=>v+1);
   if((e as {photoValidation?:boolean}).photoValidation){showWarning((e as Error).message,{id:'checkout-save'});return;}
   if((e as {photoUploadFailed?:boolean}).photoUploadFailed){showError('Your photo could not be uploaded. Please try again.',{id:'checkout-save',retry:()=>{void place();}});return;}
   const detail=(e as {response?:{data?:{error?:{code?:string;message?:string}}}}).response?.data?.error;showApiError(e,detail?.code==="PHOTO_LIMIT_CHANGED"?(detail.message??"Please clear or replace your photo."):"Order could not be placed. Please try again.",{id:"checkout-save"});setRevision(v=>v+1);}
  finally{saveLock.current=false;setBusy(false);}
 };

 if(placed)return <OrderConfirmed order={placed} name={user?.name}/>;
 if(!items.length)return <div className="fy-co-emptynote"><p>Your cart is empty.</p><Link to="/products">Explore frames</Link></div>;

 const savedAddresses=quote?.addresses??[];
 const chosen=savedAddresses.find(a=>a.id===address);
 const subtotal=quote?.subtotal??items.reduce((sum,i)=>sum+i.unitPrice*i.quantity,0);
 const total=selected?.total??subtotal;
 const frameCount=items.reduce((sum,i)=>sum+i.quantity,0);
 const showForm=!loading&&!error&&(!savedAddresses.length||adding);
 const steps=[
  {id:"co-contact",label:"Contact",done:Boolean(user?.email)},
  {id:"co-address",label:"Delivery",done:Boolean(chosen)&&!adding},
  {id:"co-payment",label:"Payment",done:cod},
  {id:"co-review",label:"Review",done:false},
 ];
 const current=steps.findIndex(s=>!s.done);
 const missing=loading?"Checking prices and offers…":error?"Checkout could not be loaded. Retry above.":!address?"Choose a delivery address to continue.":!cod?"Select a payment method to continue.":photoBusy?"Checking your photo…":photoInvalid?"Your photo is too large. Replace or clear it.":"";
 const canPlace=!(busy||photoBusy||photoInvalid||loading||error||!address||!cod);
 const go=(id:string)=>document.getElementById(id)?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"start"});
 const placeButton=(variant:"panel"|"bar")=><PlaceOrderButton variant={variant} busy={busy} disabled={!canPlace} failed={failed} onPlace={()=>void place()}/>;
 const offersShown=!loading&&!error&&visibleOffers.length>0;

 const summaryBody=<>
  <ul className="fy-co-items">{items.map(item=><li key={item.key}>
   <span className="fy-co-items__thumb">{item.imageUrl&&<img src={item.imageUrl} alt="" loading="lazy" decoding="async" width={56} height={70}/>}<span className="fy-co-items__qty"><span className="sr-only">Quantity </span>{item.quantity}</span></span>
   <span className="fy-co-items__info"><span className="fy-co-items__name">{item.name}</span><span className="fy-co-items__meta">{[item.frameSize,item.material].filter(Boolean).join(" · ")}</span>{item.color&&<span className="fy-co-items__meta fy-co-items__swatch"><ColorSwatch color={item.color} className="h-3 w-3"/>{item.colorName&&!item.colorName.startsWith("#")?item.colorName:"Color"}</span>}</span>
   <span className="fy-co-items__price">{money(item.unitPrice*item.quantity)}</span>
  </li>)}</ul>
  {loading?<div role="status" aria-label="Loading order totals"><Skeleton className="fy-co-skel"/></div>:<dl className="fy-co-totals">
   <div><dt>Subtotal</dt><dd><Money value={subtotal}/></dd></div>
   {selected&&<div className="fy-co-totals__offer" key={selected.code}><dt>{selected.title} ({selected.percent}%)</dt><dd>−<Money value={selected.discountAmount}/></dd></div>}
   <div><dt>Delivery</dt><dd>Free</dd></div>
   <div className="fy-co-totals__grand"><dt>Total</dt><dd><Money value={total}/></dd></div>
  </dl>}
 </>;

 return <div className="fy-co">
  <header className="fy-co__head">
   <h1 className="fy-co__title">Checkout</h1>
   <Link to="/cart" className="fy-co__back">Back to cart</Link>
  </header>

  <nav className="fy-co-steps" aria-label="Checkout progress">
   <ol>{steps.map((step,index)=><li key={step.id} data-state={step.done?"done":index===current?"current":"todo"}>
    <button type="button" onClick={()=>go(step.id)} aria-current={index===current?"step":undefined}>
     <span className="fy-co-steps__mark" aria-hidden="true">{index+1}</span>
     <span className="fy-co-steps__label">{step.label}<span className="sr-only">{step.done?" (complete)":""}</span></span>
    </button>
    {index<steps.length-1&&<span className="fy-co-steps__line" aria-hidden="true"><span/></span>}
   </li>)}</ol>
  </nav>

  {/* Phones and tablets: the summary folds away above the form. */}
  <div className="fy-co-mini" data-open={summaryOpen||undefined}>
   <button type="button" className="fy-co-mini__toggle" aria-expanded={summaryOpen} aria-controls="co-mini-body" onClick={()=>setSummaryOpen(v=>!v)}>
    <span>{summaryOpen?"Hide":"Show"} order summary <small>{frameCount} {frameCount===1?"frame":"frames"}</small></span>
    <ChevronDown aria-hidden="true" className="fy-co-mini__chev"/>
    <strong><Money value={total}/></strong>
   </button>
   <div className="fy-co-mini__body" id="co-mini-body"><div>{summaryBody}</div></div>
  </div>

  <div className="fy-co__grid">
   <div className="fy-co__main">
    <Section id="co-contact" n={1} title="Contact">
     <dl className="fy-co-contact">
      <div><dt><Mail aria-hidden="true"/>Email</dt><dd>{user?.email??"—"}</dd></div>
      <div><dt><Phone aria-hidden="true"/>Phone</dt><dd>{chosen?.contactNumber||user?.phoneNumber||"Added with your address"}</dd></div>
     </dl>
     <p className="fy-co-hint">This is the email on your account. The phone number comes from your delivery address.</p>
    </Section>

    <Section id="co-address" n={2} title="Delivery address" aside={savedAddresses.length>0&&!adding?<button type="button" className="fy-co-link" disabled={busy} onClick={()=>setAdding(true)}><Plus aria-hidden="true"/>Add new address</button>:undefined}>
     {loading&&!quote&&<div role="status" aria-label="Loading your addresses"><Skeleton className="fy-co-skel fy-co-skel--tall"/></div>}
     {error&&<button type="button" onClick={()=>{setError(false);setRevision(v=>v+1);}} className="fy-co-btn fy-co-btn--line">Retry loading checkout</button>}
     {savedAddresses.length>0&&!adding&&<div className="fy-co-choices" role="radiogroup" aria-label="Saved addresses">
      {savedAddresses.map(a=><label key={a.id} className="fy-co-choice" data-active={a.id===address||undefined}>
       <input type="radio" name="delivery-address" value={a.id} checked={a.id===address} disabled={busy} onChange={()=>setAddress(a.id)}/>
       <span className="fy-co-choice__dot" aria-hidden="true"/>
       <span className="fy-co-choice__body"><strong>{a.contactPerson}</strong><span>{a.addressLine}</span><span>{a.city}, {a.state} {a.postalCode}</span><span>{a.contactNumber}</span></span>
       <MapPin aria-hidden="true" className="fy-co-choice__icon"/>
      </label>)}
     </div>}
     {showForm&&<div className="fy-co-reveal"><CheckoutAddressForm onCancel={savedAddresses.length?()=>setAdding(false):undefined} onSaved={saved=>{setQuote(previous=>previous?{...previous,addresses:[saved,...previous.addresses.filter(a=>a.id!==saved.id)]}:previous);setAddress(saved.id);setAdding(false);}}/></div>}
    </Section>

    <Section id="co-delivery" n={3} title="Delivery">
     <div className="fy-co-choice fy-co-choice--static" data-active>
      <span className="fy-co-choice__dot" aria-hidden="true"/>
      <span className="fy-co-choice__body"><strong>Standard delivery</strong><span>Shipped across India to {chosen?chosen.city:"your address"}</span></span>
      <span className="fy-co-choice__price">Free</span>
      <Truck aria-hidden="true" className="fy-co-choice__icon"/>
     </div>
    </Section>

    <Section id="co-photo" n={4} title="Photo for your frame" note="Optional">
     <CheckoutPhotoUpload disabled={busy} ref={photoControl} onChange={setPhoto} onBusy={setPhotoBusy} items={selections} maxAllowedMB={maxPhotoMB} limitingItem={quote?.photoLimit?.limitingItem}/>
    </Section>

    {offersShown&&<Section id="co-offers" n={5} title="Offers">
     <div className="fy-co-choices">{visibleOffers.map(offer=>{
      const on=code===offer.code;
      return <div key={offer.code} className="fy-co-offer" data-active={on||undefined} data-locked={offer.unavailableReason?true:undefined}>
       <button type="button" className="fy-co-choice" data-active={on||undefined} disabled={busy||Boolean(offer.unavailableReason)} aria-pressed={on} onClick={()=>{if(offer.unavailableReason)return;if(on){setCode(undefined);showWarning("Offer removed",{id:"checkout-offer"});return;}setCode(offer.code);showSuccess(offer.title+" applied",{id:"checkout-offer"});}}>
        <span className="fy-co-choice__dot" aria-hidden="true"/>
        <span className="fy-co-choice__body"><strong><Tag aria-hidden="true"/>{offer.title}{offer.bestOffer&&<em>Best offer</em>}</strong><span>{offer.description}</span>{offer.unavailableReason?<span className="fy-co-offer__lock">{offer.unavailableReason}</span>:<span className="fy-co-offer__save">Save {money(offer.discountAmount)}</span>}</span>
        {!offer.unavailableReason&&<span className="fy-co-choice__price">{on?"Applied":"Apply"}</span>}
       </button>
      </div>;
     })}</div>
    </Section>}

    <Section id="co-payment" n={offersShown?6:5} title="Payment">
     <label className="fy-co-choice" data-active={cod||undefined}>
      <input type="radio" name="payment-method" checked={cod} disabled={busy} onChange={()=>setCod(true)}/>
      <span className="fy-co-choice__dot" aria-hidden="true"/>
      <span className="fy-co-choice__body"><strong>Cash on delivery</strong><span>Pay when your order arrives.</span></span>
      <Wallet aria-hidden="true" className="fy-co-choice__icon"/>
     </label>
    </Section>
   </div>

   <aside className="fy-co__aside" id="co-review" aria-label="Order summary">
    <div className="fy-co-summary">
     <h2 className="fy-co-summary__title">Order summary <small>{frameCount} {frameCount===1?"frame":"frames"}</small></h2>
     <div className="fy-co-summary__body">{summaryBody}</div>
     {placeButton("panel")}
     <p className="fy-co-missing" aria-live="polite">{missing}</p>
     <p className="fy-co-trust"><Wallet aria-hidden="true"/>Cash on delivery. Nothing to pay now.</p>
    </div>
   </aside>
  </div>

  <div className="fy-co-bar">
   <div><Money value={total} className="fy-co-bar__total"/><p className="fy-co-bar__meta">{missing||(frameCount+" "+(frameCount===1?"frame":"frames")+" · free delivery")}</p></div>
   {placeButton("bar")}
  </div>
 </div>;
}

const Money=({value,className}:{value:number;className?:string})=>{
 const shown=useTweened(value);
 return <span className={className}><span aria-hidden="true">{money(shown)}</span><span className="sr-only">{money(value)}</span></span>;
};

const Section=({id,n,title,note,aside,children}:{id:string;n:number;title:string;note?:string;aside?:ReactNode;children:ReactNode})=>
 <section id={id} className="fy-co-section" aria-labelledby={id+"-title"} style={{"--i":n} as CSSProperties}>
  <div className="fy-co-section__head">
   <span className="fy-co-section__n" aria-hidden="true">{n}</span>
   <h2 id={id+"-title"}>{title}{note&&<small>{note}</small>}</h2>
   {aside}
  </div>
  {children}
 </section>;

/**
 * Place order. While the order is being placed a frame traces itself around the button on a
 * loop; a failed attempt gives one short shake. Success is never shown here: the page only
 * changes once the server has returned the placed order.
 */
const PlaceOrderButton=({variant,busy,disabled,failed,onPlace}:{variant:"panel"|"bar";busy:boolean;disabled:boolean;failed:number;onPlace:()=>void})=>
 <button type="button" className={"fy-co-place fy-co-place--"+variant} data-busy={busy||undefined} disabled={disabled} aria-busy={busy||undefined} onClick={onPlace}>
  <span className="fy-co-place__shake" key={failed} data-failed={failed>0||undefined}>
   <span className="fy-co-place__label">{busy?"Placing your order…":"Place order"}</span>
  </span>
  {busy&&<svg className="fy-co-place__trace" aria-hidden="true" preserveAspectRatio="none" viewBox="0 0 100 100"><rect x="0" y="0" width="100" height="100" pathLength="100" vectorEffect="non-scaling-stroke"/></svg>}
 </button>;

/**
 * Shown only after the server returns the placed order. A frame closes in side by side, and
 * the mat inside opens to reveal the order number; the details follow below it.
 */
const OrderConfirmed=({order,name}:{order:Awaited<ReturnType<typeof checkoutService.place>>;name?:string})=>{
 const first=name?.trim().split(/\s+/)[0];
 return <section className="fy-done" aria-labelledby="order-done-title">
  <div className="fy-done__art">
   <span className="fy-done__frame" aria-hidden="true"><i/><i/><i/><i/></span>
   <div className="fy-done__mat">
    <p className="fy-done__kicker">Order placed</p>
    <h1 id="order-done-title" className="fy-done__title">{first?`Thank you, ${first}.`:"Thank you."}</h1>
    <p className="fy-done__number">Order {order.orderNumber}</p>
   </div>
  </div>
  <div className="fy-done__details">
   <dl>
    <div><dt>Subtotal</dt><dd>{money(Number(order.subtotal??order.totalPrice))}</dd></div>
    {order.couponTitle&&<div><dt>{order.couponTitle} ({Number(order.discountPercent??0)}%)</dt><dd>−{money(Number(order.discountAmount??0))}</dd></div>}
    <div><dt>Delivery</dt><dd>Free</dd></div>
    <div className="fy-done__total"><dt>Total</dt><dd>{money(Number(order.totalPrice))}</dd></div>
    <div><dt>Payment</dt><dd>Cash on delivery</dd></div>
   </dl>
   <OrderPhotoDownload order={order}/>
   <p className="fy-done__note">Follow every step of this order from your account.</p>
   <div className="fy-done__actions">
    <Link to={"/orders/"+order.id} className="fy-co-btn fy-co-btn--solid">Track your order</Link>
    <Link to="/products" className="fy-co-btn fy-co-btn--quiet">Continue shopping</Link>
   </div>
  </div>
 </section>;
};
