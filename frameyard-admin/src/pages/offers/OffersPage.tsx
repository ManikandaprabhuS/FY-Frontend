import {useEffect,useRef,useState} from "react";
import axios from "axios";
import {BadgePercent,History,Loader2} from "lucide-react";
import {offersService,type AdminOffer,type OfferChange} from "../../services/offers.service";
import {validateOfferInputs} from "../../utils/offer-validation";
import {showApiError,showError,showLoading,showSuccess,showWarning} from "../../utils/toast";
import {ConfirmDialog} from "../../components/ui/ConfirmDialog";
import Modal from "../../components/ui/Modal";
import HomepageBannerCard from "./HomepageBannerCard";
const money=(n:number)=>"₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2});
const when=(value:string)=>new Date(value).toLocaleString("en-IN");
export function OfferCard({initial,reload,history,onUpdated}:{initial:AdminOffer;reload:()=>Promise<void>;history:(offer:AdminOffer)=>void;onUpdated?:(offer:AdminOffer)=>void}){
 const [offer,setOffer]=useState(initial),[percentage,setPercentage]=useState(String(initial.percentage)),[minimum,setMinimum]=useState(String(initial.minOrderAmount??""));
 const [busy,setBusy]=useState(false),[confirm,setConfirm]=useState<"save"|"off"|"high-on"|null>(null);
 const lock=useRef(false),big=offer.code==="BIG_ORDER";
 const error=validateOfferInputs(percentage,big?minimum:undefined);
 const dirty=Number(percentage)!==offer.percentage||(big&&Number(minimum)!==offer.minOrderAmount);
 const toastId="offer-update:"+offer.code;
 const handleFailure=async(e:unknown)=>{
  if(axios.isAxiosError(e)&&e.response?.status===409){showWarning("This offer was updated by another staff member. Latest values have been loaded.",{id:toastId});await reload();}
  else showApiError(e,"Your offer could not be updated. Please try again.",{id:toastId});
 };
 const save=async()=>{
  if(lock.current||!dirty)return;
  if(error){showWarning(error,{id:toastId});return;}
  lock.current=true;setBusy(true);showLoading("Please wait, your offer is being updated...",toastId);
  try{const updated=await offersService.update(offer.code,{version:offer.version,percentage:Number(percentage),...(big?{minOrderAmount:Number(minimum)}:{})});
   setOffer(updated);onUpdated?.(updated);setPercentage(String(updated.percentage));setMinimum(String(updated.minOrderAmount??""));showSuccess("Offer updated successfully",{id:toastId});
  }catch(e){await handleFailure(e);}finally{lock.current=false;setBusy(false);}
 };
 const toggle=async()=>{
  if(lock.current)return;lock.current=true;setBusy(true);
  const before=offer,next=!offer.enabled;setOffer({...offer,enabled:next});
  if(next)showSuccess("Offer activated",{id:toastId});else showWarning("Offer deactivated",{id:toastId});
  try{const updated=await offersService.update(offer.code,{version:before.version,enabled:next});setOffer(updated);onUpdated?.(updated);}
  catch(e){setOffer(before);await handleFailure(e);}finally{lock.current=false;setBusy(false);}
 };
 const warn=()=>{if(error)showWarning(error,{id:toastId});};
 return <article className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm sm:p-6">
  <header className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><BadgePercent className="mt-1 h-6 w-6 shrink-0"/><div><h2 className="text-lg font-bold">{offer.title}</h2><p className="mt-1 text-xs text-secondary">{offer.code}</p></div></div><span className={"rounded-full px-3 py-1 text-xs font-bold "+(offer.enabled?"bg-green-100 text-green-800":"bg-gray-100 text-gray-700")}>{offer.enabled?"Active":"Inactive"}</span></header>
  <p className="mt-4 text-sm text-secondary">{offer.description}</p>
  <div className="mt-5 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold">Percentage<div className="mt-2 flex items-center rounded-lg border border-outline-variant bg-surface"><input aria-label={offer.title+" percentage"} type="number" min="0.01" max="100" step="0.01" value={percentage} disabled={busy} onChange={e=>setPercentage(e.target.value)} onBlur={warn} className="min-h-11 w-full min-w-0 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black/20" aria-invalid={Boolean(error)}/><span className="px-3">%</span></div></label>
   {big&&<label className="text-xs font-bold">Minimum order amount (INR)<input aria-label="Big Order minimum amount" type="number" min="1" step="1" value={minimum} disabled={busy} onChange={e=>setMinimum(e.target.value)} onBlur={warn} className="mt-2 min-h-11 w-full min-w-0 rounded-lg border border-outline-variant bg-surface px-3 text-sm outline-none focus:ring-2 focus:ring-black/20"/></label>}
  </div>
  <p aria-live="polite" className="mt-4 min-h-10 text-sm font-semibold">{!error?(big?"Customers get "+Number(percentage)+"% off on orders above Rs. "+Number(minimum).toLocaleString("en-IN"):"Customers get "+Number(percentage)+"% off on their first order"):"Enter valid settings to preview this offer."}</p>
  <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><button type="button" role="switch" aria-checked={offer.enabled} aria-label={offer.title+" active"} disabled={busy} onClick={()=>{if(offer.enabled)setConfirm("off");else if(offer.percentage>50)setConfirm("high-on");else void toggle();}} className="inline-flex min-h-11 items-center gap-3 rounded-lg px-1 focus-visible:ring-2 focus-visible:ring-black disabled:opacity-50"><span className={"flex h-6 w-11 rounded-full p-0.5 transition-colors "+(offer.enabled?"bg-black":"bg-gray-300")}><span className={"h-5 w-5 rounded-full bg-white shadow transition-transform "+(offer.enabled?"translate-x-5":"translate-x-0")}/></span><span className="text-sm font-bold">{offer.enabled?"Active":"Inactive"}</span></button>
   <button type="button" disabled={busy||!dirty||Boolean(error)} onClick={()=>{if(Number(percentage)>50)setConfirm("save");else void save();}} className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-black px-5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600">{busy&&<Loader2 className="h-4 w-4 animate-spin"/>}Save</button></div>
  <p className="mt-4 text-xs text-secondary">Last updated by {offer.updatedBy?.name??"System"} on {when(offer.updatedAt)}</p>
  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-surface-container-low p-3 text-xs"><div>Orders used<strong className="mt-1 block text-base">{offer.usage.orders.toLocaleString("en-IN")}</strong></div><div>Total discount given<strong className="mt-1 block text-base">{money(offer.usage.totalDiscount)}</strong></div></div>
  <button type="button" onClick={()=>history(offer)} className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-bold underline"><History className="h-4 w-4"/>History</button>
  <ConfirmDialog isOpen={confirm!==null} onClose={()=>setConfirm(null)} onConfirm={()=>{if(confirm==="save")void save();else void toggle();}} title={confirm==="off"?"Deactivate offer":"High discount"} message={confirm==="off"?"Customers will no longer see or use this offer.":"This is a high discount. Are you sure?"} confirmText={confirm==="off"?"Deactivate":"Confirm"} type="warning"/>
 </article>;
}
export default function OffersPage(){
 const [offers,setOffers]=useState<AdminOffer[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(false);
 const [selected,setSelected]=useState<AdminOffer>(),[history,setHistory]=useState<OfferChange[]>([]),[historyLoading,setHistoryLoading]=useState(false);
 const historyRequest=useRef(0);
 const load=async()=>{try{setOffers(await offersService.list());setError(false);}catch(e){setError(true);showApiError(e,"Offers could not be loaded. Please try again.",{id:"offers-load"});}finally{setLoading(false);}};
 useEffect(()=>{const timer=setTimeout(()=>void load(),0);return()=>clearTimeout(timer);},[]);
 const openHistory=async(offer:AdminOffer)=>{const id=++historyRequest.current;setSelected(offer);setHistory([]);setHistoryLoading(true);try{const data=await offersService.history(offer.code);if(id===historyRequest.current)setHistory(data);}catch{showError("Offer history could not be loaded.",{id:"offer-history"});}finally{if(id===historyRequest.current)setHistoryLoading(false);}};
 return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8"><header><h1 className="text-2xl font-bold sm:text-3xl">Offers</h1><p className="mt-1 text-sm text-secondary">Manage the two checkout offers. Previous orders keep their saved discounts.</p></header>
  {loading?<div role="status" className="h-72 animate-pulse rounded-xl bg-black/5"/>:error?<button onClick={()=>void load()} className="min-h-11 rounded-lg border px-4 font-bold">Retry loading offers</button>:<div className="grid gap-5 lg:grid-cols-2">{offers.map(offer=><OfferCard key={offer.code+":"+offer.version} initial={offer} reload={load} onUpdated={updated=>setOffers(previous=>previous.map(value=>value.code===updated.code?updated:value))} history={offer=>void openHistory(offer)}/>)}</div>}
  {!loading&&!error&&<HomepageBannerCard offers={offers}/>}
  <Modal isOpen={Boolean(selected)} onClose={()=>{historyRequest.current++;setSelected(undefined);}} title={(selected?.title??"Offer")+" history"}><div className="space-y-3">{historyLoading?<p role="status" className="font-semibold">Loading history…</p>:!history.length?<p className="text-sm text-secondary">No changes yet.</p>:history.map(change=><article key={change.id} className="rounded-lg border border-outline-variant p-3 text-sm"><p className="font-bold">{change.actorName}</p><p className="mt-1 break-words">{change.field}: {String(change.oldValue)} → {String(change.newValue)}</p><time className="mt-1 block text-xs text-secondary">{when(change.createdAt)}</time></article>)}</div></Modal>
 </div>;
}
