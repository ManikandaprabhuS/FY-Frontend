import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ImagePlus, Mail, Plus, Tag, Truck, Wallet } from "lucide-react";
import ColorSwatch from "./ColorSwatch";
import { FrameSpinner, Skeleton } from "../../../components/loaders/FrameLoader";
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
 // Presentation only: the new-address panel, the phone summary drawer, a failure count that shakes the button, and the two optional panels.
 const [adding,setAdding]=useState(false),[summaryOpen,setSummaryOpen]=useState(false),[failed,setFailed]=useState(0);
 const [photoOpen,setPhotoOpen]=useState(false),[offersOpen,setOffersOpen]=useState(false);
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
   if(quoteRef.current?.photoLimit?.policyVersion&&data.photoLimit?.policyVersion!==quoteRef.current.photoLimit.policyVersion)showWarning('Photo upload settings changed. Please review your photo options.',{id:'checkout-photo-policy'});
   if(current&&(!data.offers.some(o=>o.code===current)||data.offers.find(o=>o.code===current)?.version!==quoteRef.current?.offers.find(o=>o.code===current)?.version)){
    setCode(undefined);
    showWarning(data.offers.some(o=>o.code===current)?"This offer was updated. Please review your total.":current==="BIG_ORDER"?data.bigOrderRemovalMessage:data.unavailableOffers?.find(offer=>offer.code===current)?.unavailableReason??"This offer is no longer available",{id:"checkout-offer"});
   }
   setQuote(data);setQuoteSignature(signature);setError(false);setAddress(previous=>data.addresses.some(a=>a.id===previous)?previous:data.addresses[0]?.id??"");
  }).catch(e=>{if(active){setError(true);showApiError(e,"Offers could not be loaded. Please try again.",{id:"checkout-offers",retry:()=>setRevision(v=>v+1)});}});},0);
  return()=>{active=false;clearTimeout(timer);};
 },[signature,selections,revision]);
 const loading=!error&&quoteSignature!==signature;
 const uploadsAllowed=quoteSignature===signature&&quote?.photoLimit?quote.photoLimit.allowCustomerPhoto!==false:items.some(item=>item.allowCustomerPhoto!==false);
 const maxPhotoMB=quoteSignature===signature&&quote?.photoLimit?quote.photoLimit.maxAllowedMB:Number((getPhotoMaxBytes(items)/PHOTO_MB_BYTES).toFixed(1));
 const photoInvalid=uploadsAllowed&&Boolean(photo&&photo.sizeBytes>getPhotoMaxBytes([{maxPhotoSizeMB:maxPhotoMB}]));
 const place=async()=>{
  const auth=useAuthStore.getState();
  if(!auth.isAuthenticated||auth.user?.role!=='CUSTOMER'){
   showWarning('Please log in to place your order',{id:'checkout-login'});
   navigate('/profile',{state:{returnTo:'/checkout'}});return;
  }
  if(saveLock.current||busy||(uploadsAllowed&&photoBusy)||photoInvalid||loading||!address||!quote||!cod)return; saveLock.current=true;
  setBusy(true);showLoading("Please wait, your order is being placed...","checkout-save");
  try{
   const latest=await checkoutService.offers(selections,true);
   setQuote(latest);setQuoteSignature(signature);
   if(quote.photoLimit?.policyVersion&&latest.photoLimit?.policyVersion!==quote.photoLimit.policyVersion){showWarning('Photo upload settings changed. Please review your photo options.',{id:'checkout-save'});return;}
   const latestAllowsPhoto=latest.photoLimit?.allowCustomerPhoto!==false;
   if(latestAllowsPhoto&&photo&&latest.photoLimit){const max=getPhotoMaxBytes([{maxPhotoSizeMB:latest.photoLimit.maxAllowedMB}]);if(photo.sizeBytes>max){showWarning(photoSizeError(photo.sizeBytes,max)+" Please clear or replace your photo.",{id:"checkout-save"});return;}}
   if(code&&(!latest.offers.some(o=>o.code===code)||latest.offers.find(o=>o.code===code)?.version!==selected?.version)){
    setCode(undefined);showWarning(latest.offers.some(o=>o.code===code)?"This offer was updated. Please review your total.":"This offer is no longer available",{id:"checkout-save"});return;
   }
   const uploaded=latestAllowsPhoto?await photoControl.current?.prepare(latest.photoLimit?.maxAllowedMB??maxPhotoMB):null;
   const order=await checkoutService.place(selections,address,code,selected?.version,undefined,uploaded?.imageId);setPlaced(order);
   await removeCartPhotos(items.map(i=>i.key));await removeLocalPhoto('checkout');
   useCustomerCommerceStore.getState().clearCart();showSuccess("Order placed successfully",{id:"checkout-save"});
  }catch(e){
   setFailed(v=>v+1);
   if((e as {photoValidation?:boolean}).photoValidation){showWarning((e as Error).message,{id:'checkout-save'});return;}
   if((e as {photoUploadFailed?:boolean}).photoUploadFailed){showError('Your photo could not be uploaded. Please try again.',{id:'checkout-save',retry:()=>{void place();}});return;}
   const detail=(e as {response?:{data?:{error?:{code?:string;message?:string}}}}).response?.data?.error;
   if(detail?.code==='PHOTO_NOT_ALLOWED'||detail?.code==='PHOTO_LIMIT_CHANGED'){showWarning(detail.message??'Photo upload settings changed. Please review checkout.',{id:'checkout-save'});setRevision(v=>v+1);return;}
   if(detail?.code==="OFFER_UNAVAILABLE"){
    setCode(undefined);showWarning(detail.message??"This offer is no longer available. Please review your total.",{id:"checkout-save"});
    try{const refreshed=await checkoutService.offers(selections,true);setQuote(refreshed);setQuoteSignature(signature);}catch{setRevision(v=>v+1);}
    return;
   }
   showApiError(e,detail?.code==="PHOTO_LIMIT_CHANGED"?(detail.message??"Please clear or replace your photo."):"Order could not be placed. Please try again.",{id:"checkout-save"});setRevision(v=>v+1);}
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
 const missing=loading?"Checking prices and offers…":error?"Checkout could not be loaded. Retry above.":!address?"Choose a delivery address to continue.":!cod?"Select a payment method to continue.":uploadsAllowed&&photoBusy?"Checking your photo…":photoInvalid?"Your photo is too large. Replace or clear it.":"";
 const canPlace=!(busy||(uploadsAllowed&&photoBusy)||photoInvalid||loading||error||!address||!cod);
 const placeButton=(variant:"panel"|"bar")=><PlaceOrderButton variant={variant} busy={busy} disabled={!canPlace} failed={failed} onPlace={()=>void place()}/>;
 const offersShown=!loading&&!error&&visibleOffers.length>0;
 const frames=frameCount+" "+(frameCount===1?"frame":"frames");
 const best=quote?.offers.find(o=>o.bestOffer)??quote?.offers[0];
 const offerStatus=selected?`${selected.title} applied, −${money(selected.discountAmount)}`:best?`Save ${money(best.discountAmount)} with ${best.title}`:`${visibleOffers.length} ${visibleOffers.length===1?"offer":"offers"}, not available yet`;
 const photoStatus=photoInvalid?"Too large. Replace or clear it.":photo?photo.fileName:"Add it now or share it later";
 // An invalid photo blocks the order, so its panel opens on its own.
 const photoShown=photoOpen||photoInvalid;

 const summaryBody=<>
  <ul className="fy-co-items">{items.map(item=><li key={item.key}>
   <span className="fy-co-items__thumb">{item.imageUrl&&<img src={item.imageUrl} alt="" loading="lazy" decoding="async" width={44} height={55}/>}</span>
   <span className="fy-co-items__info">
    <span className="fy-co-items__name">{item.name}</span>
    <span className="fy-co-items__meta">{[item.frameSize,item.material].filter(Boolean).join(", ")}{item.quantity>1?` × ${item.quantity}`:""}</span>
    {item.color&&<span className="fy-co-items__meta fy-co-items__swatch"><ColorSwatch color={item.color} className="h-3 w-3"/>{item.colorName&&!item.colorName.startsWith("#")?item.colorName:"Color"}</span>}
   </span>
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

  <div className="fy-co__grid">
   <div className="fy-co-sheet">
    <section className="fy-co-group" id="co-address" aria-labelledby="co-address-title">
     <div className="fy-co-group__label"><h2 id="co-address-title">Delivery</h2><p>Where your frames go</p></div>
     <div className="fy-co-group__body">
      <p className="fy-co-contact"><Mail aria-hidden="true"/><span>Order updates go to <strong>{user?.email??"your account email"}</strong></span></p>
      {loading&&!quote&&<div role="status" aria-label="Loading your addresses"><Skeleton className="fy-co-skel"/></div>}
      {error&&<button type="button" onClick={()=>{setError(false);setRevision(v=>v+1);}} className="fy-co-btn fy-co-btn--line">Retry loading checkout</button>}
      {savedAddresses.length>0&&!adding&&<div className="fy-co-options" role="radiogroup" aria-label="Delivery address">
       {savedAddresses.map(a=><label key={a.id} className="fy-co-option" data-active={a.id===address||undefined}>
        <input type="radio" className="fy-co-radio" name="delivery-address" value={a.id} checked={a.id===address} disabled={busy} onChange={()=>setAddress(a.id)}/>
        <span className="fy-co-option__body">
         <strong>{a.contactPerson}</strong>
         <span>{a.addressLine}, {a.city}, {a.state} {a.postalCode}</span>
         <span className="fy-co-option__muted">{a.contactNumber}</span>
        </span>
       </label>)}
       <button type="button" className="fy-co-option fy-co-option--add" disabled={busy} onClick={()=>setAdding(true)}><Plus aria-hidden="true"/>Update address</button>
      </div>}
      {showForm&&<div className="fy-co-reveal"><CheckoutAddressForm onCancel={savedAddresses.length?()=>setAdding(false):undefined} onSaved={saved=>{setQuote(previous=>previous?{...previous,addresses:[saved,...previous.addresses.filter(a=>a.id!==saved.id)]}:previous);setAddress(saved.id);setAdding(false);}}/></div>}
      <p className="fy-co-method"><Truck aria-hidden="true"/><span>Standard delivery{chosen?` to ${chosen.city}`:" across India"}</span><strong>Free</strong></p>
     </div>
    </section>

    <section className="fy-co-group" id="co-payment" aria-labelledby="co-payment-title">
     <div className="fy-co-group__label"><h2 id="co-payment-title">Payment</h2><p>Nothing to pay now</p></div>
     <div className="fy-co-group__body">
      <div className="fy-co-options" role="radiogroup" aria-label="Payment method">
       <label className="fy-co-option" data-active={cod||undefined}>
        <input type="radio" className="fy-co-radio" name="payment-method" checked={cod} disabled={busy} onChange={()=>setCod(true)}/>
        <span className="fy-co-option__body"><strong>Cash on delivery</strong><span className="fy-co-option__muted">Pay when your frames arrive</span></span>
        <Wallet aria-hidden="true" className="fy-co-option__icon"/>
       </label>
      </div>
     </div>
    </section>

    <section className="fy-co-group" aria-labelledby="co-extras-title">
     <div className="fy-co-group__label"><h2 id="co-extras-title">Extras</h2><p>Optional</p></div>
     <div className="fy-co-group__body fy-co-group__body--flush">
      {uploadsAllowed&&<Disclosure id="co-photo" icon={<ImagePlus aria-hidden="true"/>} title="Photo for your frame" status={photoStatus} tone={photoInvalid?"error":photo?"set":undefined} open={photoShown} onToggle={()=>setPhotoOpen(v=>!v)}>
       <CheckoutPhotoUpload disabled={busy} ref={photoControl} onChange={setPhoto} onBusy={setPhotoBusy} items={selections} maxAllowedMB={maxPhotoMB} limitingItem={quote?.photoLimit?.limitingItem}/>
      </Disclosure>}
      {offersShown&&<Disclosure id="co-offers" icon={<Tag aria-hidden="true"/>} title="Offers" status={offerStatus} tone={selected?"set":undefined} open={offersOpen} onToggle={()=>setOffersOpen(v=>!v)}>
       <ul className="fy-co-offers">{visibleOffers.map(offer=>{
        const on=code===offer.code;
        const locked=Boolean(offer.unavailableReason);
        return <li key={offer.code} data-active={on||undefined} data-locked={locked||undefined}>
         <span className="fy-co-offers__text">
          <strong>{offer.title}{offer.bestOffer&&<em>Best offer</em>}</strong>
          <span>{offer.description}</span>
          {locked?<span className="fy-co-offers__lock">{offer.unavailableReason}</span>:<span className="fy-co-offers__save">Save {money(offer.discountAmount)}</span>}
         </span>
         {locked?<span className="fy-co-offers__off">{offer.percent}% off</span>:
          <button type="button" className="fy-co-pill" data-on={on||undefined} disabled={busy} aria-pressed={on} aria-label={(on?"Remove ":"Apply ")+offer.title} onClick={()=>{if(on){setCode(undefined);showWarning("Offer removed",{id:"checkout-offer"});return;}setCode(offer.code);showSuccess(offer.title+" applied",{id:"checkout-offer"});}}>{on?"Remove":"Apply"}</button>}
        </li>;
       })}</ul>
      </Disclosure>}
     </div>
    </section>
   </div>

   {/* The cart's black slip, carried into checkout. Phones: it folds into a bar above the form. */}
   <aside className="fy-co-slip" id="co-review" aria-label="Order summary" data-open={summaryOpen||undefined}>
    <button type="button" className="fy-co-slip__toggle" aria-expanded={summaryOpen} aria-controls="co-slip-body" onClick={()=>setSummaryOpen(v=>!v)}>
     <span className="fy-co-slip__toggle-label">{summaryOpen?"Hide":"Show"} order summary<small>{frames}</small></span>
     <strong><Money value={total}/></strong>
     <ChevronDown aria-hidden="true" className="fy-co-slip__chev"/>
    </button>
    <div className="fy-co-slip__head"><h2>Your order</h2><span>{frames}</span></div>
    <div className="fy-co-slip__body" id="co-slip-body"><div>{summaryBody}</div></div>
    <div className="fy-co-slip__cta">
     {placeButton("panel")}
     <p className="fy-co-missing" aria-live="polite">{missing}</p>
    </div>
   </aside>
  </div>

  <div className="fy-co-bar">
   <div><Money value={total} className="fy-co-bar__total"/><p className="fy-co-bar__meta">{missing||frames+", free delivery"}</p></div>
   {placeButton("bar")}
  </div>
 </div>;
}

const Money=({value,className}:{value:number;className?:string})=>{
 const shown=useTweened(value);
 return <span className={className}><span aria-hidden="true">{money(shown)}</span><span className="sr-only">{money(value)}</span></span>;
};

/**
 * An optional extra that opens in place. The closed row still says what matters (the photo's
 * name, the saving on offer). The panel stays mounted while closed, so the photo upload keeps
 * its state; while closed it is hidden from tab order and screen readers by CSS visibility.
 */
const Disclosure=({id,icon,title,status,tone,open,onToggle,children}:{id:string;icon:ReactNode;title:string;status:string;tone?:"set"|"error";open:boolean;onToggle:()=>void;children:ReactNode})=>
 <div className="fy-co-more" id={id} data-open={open||undefined} data-tone={tone}>
  <button type="button" className="fy-co-more__toggle" aria-expanded={open} aria-controls={id+"-panel"} onClick={onToggle}>
   <span className="fy-co-more__icon">{icon}</span>
   <span className="fy-co-more__text"><span className="fy-co-more__title">{title}</span><span className="fy-co-more__status">{status}</span></span>
   <ChevronDown aria-hidden="true" className="fy-co-more__chev"/>
  </button>
  <div className="fy-co-more__panel" id={id+"-panel"} role="region" aria-label={title}><div><div className="fy-co-more__inner">{children}</div></div></div>
 </div>;

/**
 * Place order. While the order is being placed the site's frame spinner runs beside the label;
 * a failed attempt gives one short shake. Success is never shown here: the page only changes
 * once the server has returned the placed order.
 */
const PlaceOrderButton=({variant,busy,disabled,failed,onPlace}:{variant:"panel"|"bar";busy:boolean;disabled:boolean;failed:number;onPlace:()=>void})=>
 <button type="button" className={"fy-co-place fy-co-place--"+variant} data-busy={busy||undefined} disabled={disabled} aria-busy={busy||undefined} onClick={onPlace}>
  <span className="fy-co-place__shake" key={failed} data-failed={failed>0||undefined}>
   {busy?<><FrameSpinner/>Placing order…</>:"Place order"}
  </span>
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
