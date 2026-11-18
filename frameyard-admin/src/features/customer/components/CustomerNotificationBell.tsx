import {useEffect,useRef,useState} from "react";
import {createPortal} from "react-dom";
import {Link} from "react-router-dom";
import {Bell,CheckCheck,Info,Package,Truck,X,XCircle} from "lucide-react";
import {useCustomerNotifications} from "../../../hooks/useCustomerNotifications";
import {Skeleton} from "../../../components/loaders/FrameLoader";
const relativeTime=(date:string)=>{
 const minutes=Math.max(0,Math.floor((Date.now()-new Date(date).getTime())/60000));
 if(minutes<1)return "Just now";if(minutes<60)return minutes+" minutes ago";
 const hours=Math.floor(minutes/60);if(hours<24)return hours+(hours===1?" hour ago":" hours ago");
 const days=Math.floor(hours/24);return days+(days===1?" day ago":" days ago");
};
export default function CustomerNotificationBell(){
 const [open,setOpen]=useState(false),[page,setPage]=useState(1);
 const {items,summary,pagination,loading,error,busy,load,mark}=useCustomerNotifications(page,'all',true);
 const count=summary.unreadCount,hasMore=page<(pagination?.totalPages??Math.ceil(summary.totalCount/20));
 const trigger=useRef<HTMLButtonElement>(null),close=useRef<HTMLButtonElement>(null);
 useEffect(()=>{
  if(!open)return;
  const previous=document.body.style.overflow;document.body.style.overflow="hidden";close.current?.focus();
  const key=(e:KeyboardEvent)=>{
   if(e.key==="Escape"){setOpen(false);trigger.current?.focus();}
   if(e.key==="Tab"){
    const panel=document.getElementById("customer-notifications-panel");
    const focusable=panel?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href]');
    if(!focusable?.length)return;const first=focusable[0],last=focusable[focusable.length-1];
    if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
   }
  };
  window.addEventListener("keydown",key);
  return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",key);};
 },[open,load]);
 const dismiss=()=>{setOpen(false);trigger.current?.focus();};
 return <div className="absolute left-14 top-2 sm:left-[68px] lg:static">
 <button ref={trigger} type="button" aria-label={"Notifications, "+count+" unread"} aria-expanded={open} onClick={()=>{setOpen(true);void load();}} className="relative grid h-11 w-11 place-items-center rounded-full hover:bg-black/5 focus-visible:outline focus-visible:outline-2"><Bell size={20}/>{count>0&&<span className="absolute right-0 top-0 rounded-full bg-black px-1.5 text-[10px] font-bold text-white">{count>99?"99+":count}</span>}</button>
 {open&&createPortal(<div className="fy-store-portal fixed inset-0 z-[250]" role="dialog" aria-modal="true" aria-labelledby="customer-notifications-title"><button type="button" aria-label="Close notifications" onClick={dismiss} className="absolute inset-0 bg-black/45"/><aside id="customer-notifications-panel" className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-xl"><header className="flex min-h-16 items-center justify-between border-b border-black/10 px-5"><h2 id="customer-notifications-title" className="font-black">Notifications</h2><button ref={close} type="button" onClick={dismiss} aria-label="Close notifications" className="grid h-11 w-11 place-items-center"><X size={20}/></button></header><button disabled={busy||count===0} onClick={()=>void mark()} className="flex min-h-12 items-center justify-center gap-2 border-b border-black/10 text-sm font-bold disabled:opacity-40"><CheckCheck size={18}/>Mark all as read</button><div className="min-h-0 flex-1 overflow-y-auto p-4">
 {items.map(item=>{const Icon=item.type==="ORDER_CANCELLED"?XCircle:item.type==="ORDER_PLACED"?Package:item.type==="ACCOUNT_CREATED"?Info:Truck;return <Link key={item.id} to={item.orderId?"/orders/"+encodeURIComponent(item.orderId):"/notifications"} onClick={()=>{void mark(item.id);setOpen(false);}} className={"mb-3 flex gap-3 rounded-xl border p-4 focus-visible:outline focus-visible:outline-2 "+(item.isRead?"border-black/10":"border-black/20 bg-black/[0.03]")}><Icon size={20} className="shrink-0"/><div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p><p className="mt-1 text-sm text-black/70">{item.message}</p><span className={"mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold "+(item.isRead?"bg-black/5 text-black/60":"bg-emerald-50 text-emerald-800")}>{item.isRead?"Read":"Unread"}</span><time dateTime={item.createdAt} className="mt-2 block text-xs text-black/60">{new Date(item.createdAt).toLocaleString("en-IN",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit",timeZoneName:"short"})}</time><span className="mt-1 block text-xs text-black/50">{relativeTime(item.createdAt)}</span></div>{!item.isRead&&<span aria-label="Unread" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-black"/>}</Link>;})}
 {loading&&<div role="status" aria-label="Loading notifications"><Skeleton className="h-24 rounded-xl"/></div>}
 {error&&<button type="button" className="min-h-11 font-bold underline" onClick={()=>{setPage(1);void load(1,true);}}>Retry loading notifications</button>}
 {!loading&&!error&&!items.length&&<p className="py-12 text-center font-bold">No notifications yet.</p>}
 {hasMore&&<button type="button" disabled={loading} onClick={()=>setPage(value=>value+1)} className="min-h-11 w-full rounded-lg border font-bold">Load more</button>}
 </div></aside></div>,document.body)}
 </div>;
}
