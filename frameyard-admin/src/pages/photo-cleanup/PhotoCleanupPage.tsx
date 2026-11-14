import {useEffect,useRef,useState} from "react";
import {Download,Trash2,Search} from "lucide-react";
import DataTable from "../../components/tables/DataTable";
import PaginationControls from "../../components/ui/PaginationControls";
import StatusBadge from "../../components/ui/StatusBadge";
import {ConfirmDialog} from "../../components/ui/ConfirmDialog";
import {photoCleanupService,type CleanupPage,type CleanupPhoto} from "../../services/photo-cleanup.service";
import {orderPhotoService} from "../../services/order-photos.service";
import {formatStorageBytes} from "../../utils/storage-size";
import {showError,showLoading,showSuccess} from "../../utils/toast";
import {getApiErrorMessage} from "../../services/api";
const date=(s:string|null)=>s?new Date(s).toLocaleString("en-IN"):"-";
export default function PhotoCleanupPage(){
 const [data,setData]=useState<CleanupPage>(),[page,setPage]=useState(1),[status,setStatus]=useState("all"),[search,setSearch]=useState(""),[term,setTerm]=useState(""),[from,setFrom]=useState(""),[to,setTo]=useState("");
 const [loading,setLoading]=useState(true),[error,setError]=useState(""),[revision,setRevision]=useState(0),[selected,setSelected]=useState<string[]>([]),[confirm,setConfirm]=useState<string[]>([]),[busy,setBusy]=useState(false),[failures,setFailures]=useState<string[]>([]);
 const lock=useRef(false),request=useRef(0);
 useEffect(()=>{const timer=setTimeout(()=>setTerm(search.trim()),350);return()=>clearTimeout(timer);},[search]);
 useEffect(()=>{
  const current=++request.current;const timer=setTimeout(()=>{
   setLoading(true);setError("");
   void photoCleanupService.list({page,limit:20,status,search:term,from,to}).then(next=>{if(current===request.current)setData(next);}).catch(e=>{if(current===request.current)setError(getApiErrorMessage(e,"Photos could not be loaded."));}).finally(()=>{if(current===request.current)setLoading(false);});
  },0);return()=>clearTimeout(timer);
 },[page,status,term,from,to,revision]);
 const toggle=(id:string)=>setSelected(ids=>ids.includes(id)?ids.filter(x=>x!==id):[...ids,id].slice(0,50));
 const download=async(row:CleanupPhoto)=>{const id="cleanup-download:"+row.id;showLoading("Please wait, preparing your download...",id);try{await orderPhotoService.download(row.orderId);showSuccess("Download ready",{id});}catch(e){showError(getApiErrorMessage(e,"The photo could not be downloaded."),{id});setRevision(v=>v+1);}};
 const remove=async(ids:string[])=>{
  if(lock.current||!data)return;lock.current=true;setBusy(true);request.current++;setConfirm([]);setFailures([]);
  const snapshot=data,rows=snapshot.photos.filter(p=>ids.includes(p.id)),bytes=rows.reduce((n,p)=>n+p.sizeBytes,0);
  setData({...snapshot,photos:snapshot.photos.filter(p=>!ids.includes(p.id)),totalBytes:Math.max(0,snapshot.totalBytes-bytes),pagination:{...snapshot.pagination,total:Math.max(0,snapshot.pagination.total-rows.length)}});
  const id="photo-cleanup";showLoading("Please wait, deleting photos...",id);
  try{
   const result=await photoCleanupService.remove(ids),failed=result.results.filter(r=>!r.ok);
   if(failed.length){
    const messages=failed.map(r=>{const row=snapshot.photos.find(p=>p.id===r.id);return (row?.orderNumber??r.id)+" — "+(r.error??"Deletion failed");});
    setFailures(messages);setData({...snapshot,photos:snapshot.photos.filter(p=>!result.results.some(r=>r.ok&&r.id===p.id))});
    showError("Could not delete "+failed.length+" photo(s): "+messages.slice(0,3).join("; ")+(failed.length>3?". See failed items below.":""),{id});
   }else showSuccess("Deleted "+result.deletedCount+" photo(s). Freed "+formatStorageBytes(result.bytesFreed),{id});
   if(failed.length&&result.deletedCount)showSuccess("Deleted "+result.deletedCount+" photo(s). Freed "+formatStorageBytes(result.bytesFreed),{id:id+":success"});
   setSelected(failed.map(r=>r.id));
   window.dispatchEvent(new Event("fy:photo-storage-changed"));try{localStorage.setItem("fy:photo-cleanup",String(Date.now()));}catch{/* Other tabs can refresh manually. */}
  }catch(e){setData(snapshot);showError(getApiErrorMessage(e,"Photos could not be deleted. Please retry."),{id});}
  finally{lock.current=false;setBusy(false);setLoading(false);setRevision(v=>v+1);}
 };
 const actions=(row:CleanupPhoto)=><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void download(row)} aria-label={"Download "+row.fileName} className="grid h-11 w-11 place-items-center rounded border disabled:opacity-40"><Download size={16}/></button><button disabled={busy} onClick={()=>setConfirm([row.id])} aria-label={"Delete "+row.fileName} className="grid h-11 w-11 place-items-center rounded border border-red-200 text-red-700 disabled:opacity-40"><Trash2 size={16}/></button></div>;
 const checkbox=(row:CleanupPhoto)=><input type="checkbox" checked={selected.includes(row.id)} disabled={busy} onChange={()=>toggle(row.id)} aria-label={"Select photo for "+row.orderNumber} className="h-5 w-5 accent-black"/>;
 return <div className="space-y-5"><header><h1 className="text-2xl font-bold">Photo Cleanup</h1><p className="mt-1 text-sm text-on-surface-variant">Download photos you need before permanently deleting them.</p><p className="mt-3 font-bold">{data?.pagination.total??0} photos · {formatStorageBytes(data?.totalBytes??null)} reclaimable</p></header>
 <div className="flex flex-wrap items-end gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4"><label className="w-full min-w-0 text-xs font-bold sm:w-auto sm:min-w-48 sm:flex-1"><span className="flex items-center gap-1"><Search size={14}/>Search</span><input disabled={busy} value={search} onChange={e=>{setSearch(e.target.value);setPage(1);setSelected([]);}} placeholder="Order ID or customer" className="mt-1 min-h-11 w-full rounded border bg-white px-3"/></label>
 <label className="text-xs font-bold">Order status<select disabled={busy} value={status} onChange={e=>{setStatus(e.target.value);setPage(1);setSelected([]);}} className="mt-1 block min-h-11 rounded border bg-white px-3"><option value="all">Delivered and Cancelled</option><option value="DELIVERED">Delivered</option><option value="CANCELLED">Cancelled</option></select></label>
 <label className="min-w-0 text-xs font-bold">Completed from<input type="date" disabled={busy} value={from} onChange={e=>{setFrom(e.target.value);setPage(1);setSelected([]);}} className="mt-1 block min-h-11 max-w-full rounded border bg-white px-2"/></label><label className="min-w-0 text-xs font-bold">Completed to<input type="date" disabled={busy} value={to} onChange={e=>{setTo(e.target.value);setPage(1);setSelected([]);}} className="mt-1 block min-h-11 max-w-full rounded border bg-white px-2"/></label>
 <button disabled={busy||loading||!selected.length} onClick={()=>setConfirm(selected)} className="min-h-11 rounded bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-40">Delete selected ({selected.length})</button></div>
 {error&&<p role="alert" className="text-sm font-bold text-red-700">{error} <button onClick={()=>setRevision(v=>v+1)} className="min-h-11 underline">Retry</button></p>}{failures.length>0&&<ul role="alert" className="rounded border border-red-200 p-3 text-sm font-bold text-red-700">{failures.map((f,i)=><li key={i} className="break-words">{f}</li>)}</ul>}
 <DataTable headers={[{key:"select",label:"Select"},{key:"order",label:"Order ID"},{key:"customer",label:"Customer"},{key:"status",label:"Order status"},{key:"file",label:"File name"},{key:"size",label:"Size"},{key:"date",label:"Delivered / Cancelled"},{key:"actions",label:"Actions"}]} items={data?.photos??[]} loading={loading&&!data} emptyTitle="No photos pending cleanup" emptyMessage="Only attached photos from Delivered or Cancelled orders appear here." renderRow={row=><tr key={row.id}><td className="p-4">{checkbox(row)}</td><td className="p-4 font-bold">{row.orderNumber}</td><td className="p-4">{row.customerName}</td><td className="p-4"><StatusBadge status={row.orderStatus}/></td><td className="max-w-64 break-words p-4 text-xs">{row.fileName}</td><td className="p-4 text-xs">{formatStorageBytes(row.sizeBytes)}</td><td className="p-4 text-xs">{date(row.completedAt)}</td><td className="p-4">{actions(row)}</td></tr>} renderCard={row=><article key={row.id} className="space-y-3 rounded-xl border p-4"><div className="flex items-center justify-between gap-3">{checkbox(row)}<strong className="min-w-0 break-all">{row.orderNumber}</strong><StatusBadge status={row.orderStatus}/></div><p className="break-words">{row.customerName}</p><p className="break-words text-xs">{row.fileName}</p><p className="text-xs">{formatStorageBytes(row.sizeBytes)} · {date(row.completedAt)}</p>{actions(row)}</article>}/>
 {data&&<PaginationControls pagination={data.pagination} busy={busy||loading} onPageChange={next=>{setPage(next);setSelected([]);}}/>}
 <ConfirmDialog isOpen={confirm.length>0} onClose={()=>setConfirm([])} onConfirm={()=>void remove(confirm)} title={"Permanently delete "+confirm.length+" photo(s)?"} message="This permanently deletes the photo(s). Download first if you still need them." confirmText="Delete permanently" type="danger"/>
 </div>;
}
