import {useCallback,useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {Database,RefreshCw} from "lucide-react";
import {photoCleanupService,type StorageMetrics} from "../../services/photo-cleanup.service";
import {formatStorageBytes,storageProgress} from "../../utils/storage-size";
function Usage({name,value}:{name:string;value?:StorageMetrics["database"]}){
 const progress=storageProgress(value?.bytes??null,value?.limitBytes??null);
 return <div className="min-w-0"><p className="text-sm font-bold">{name}</p><p className="mt-2 text-sm">{value?formatStorageBytes(value.bytes):"Loading…"}{value?.limitBytes!==null&&value?.limitBytes!==undefined?" / "+formatStorageBytes(value.limitBytes):""}</p>{progress.percent!==null?<div role="progressbar" aria-label={name} aria-valuenow={Math.min(100,Math.round(progress.percent))} aria-valuemin={0} aria-valuemax={100} className="mt-2 h-2 overflow-hidden rounded-full bg-black/10"><div className={"h-full rounded-full "+progress.color} style={{width:progress.width+"%"}}/></div>:value&&value.bytes!==null?<p className="mt-2 text-xs text-black/60">Limit not configured</p>:null}</div>;
}
export default function StorageWidget(){
 const [data,setData]=useState<StorageMetrics>(),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false);
 const refresh=useCallback(async(force=false)=>{setBusy(true);try{setData(await photoCleanupService.usage(force));setUnavailable(false);}catch{setUnavailable(true);}finally{setBusy(false);}},[]);
 useEffect(()=>{
  const timer=setTimeout(()=>void refresh(),0);
  const changed=()=>{void refresh();},storage=(e:StorageEvent)=>{if(e.key==="fy:photo-cleanup")changed();};
  window.addEventListener("fy:photo-storage-changed",changed);window.addEventListener("storage",storage);
  return()=>{clearTimeout(timer);window.removeEventListener("fy:photo-storage-changed",changed);window.removeEventListener("storage",storage);};
 },[refresh]);
 return <section aria-labelledby="storage-title" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><h3 id="storage-title" className="flex items-center gap-2 font-bold"><Database size={18}/>Storage</h3><button disabled={busy} onClick={()=>void refresh(true)} aria-label="Refresh storage usage" className="grid h-11 w-11 place-items-center rounded-lg border disabled:opacity-40"><RefreshCw size={16} className={busy?"animate-spin":""}/></button></div>
 {unavailable?<p role="status" className="mt-3 text-sm">Unavailable. Please try refreshing.</p>:<><div className="mt-4 grid gap-5 sm:grid-cols-2"><Usage name="Database size" value={data?.database}/><Usage name="Photo storage size" value={data?.photos}/></div><Link to="/admin/photo-cleanup" className="mt-5 inline-block min-h-11 py-2 text-sm font-bold underline">Photos pending cleanup: {data?.pending.count??"Unavailable"} ({formatStorageBytes(data?.pending.bytes??null)})</Link><p className="text-[11px] text-black/50">Customer photo records only; banners and orphaned files are not included. Usage is cached for 5 minutes.</p></>}
 </section>;
}
