export function formatStorageBytes(bytes:number|null){
 if(bytes===null||!Number.isFinite(bytes))return "Unavailable";
 if(bytes>=1024**3)return (bytes/1024**3).toFixed(2)+" GB";
 return (Math.max(0,bytes)/1024**2).toFixed(2)+" MB";
}
export function storageProgress(bytes:number|null,limit:number|null){
 const percent=bytes!==null&&limit!==null&&limit>0?Math.max(0,bytes/limit*100):null;
 return {percent,width:percent===null?0:Math.min(100,percent),color:percent!==null&&percent>95?"bg-red-600":percent!==null&&percent>80?"bg-amber-500":"bg-emerald-600"};
}
