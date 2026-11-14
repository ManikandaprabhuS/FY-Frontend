import api from "./api";
import type {Pagination} from "./contracts";
export interface CleanupPhoto {id:string;orderId:string;orderNumber:string;customerName:string;orderStatus:"DELIVERED"|"CANCELLED";fileName:string;sizeBytes:number;completedAt:string|null}
export interface CleanupPage {photos:CleanupPhoto[];pagination:Pagination;totalBytes:number}
export interface CleanupFilters {page?:number;limit?:number;status?:string;search?:string;from?:string;to?:string}
export interface CleanupResult {results:Array<{id:string;ok:boolean;alreadyDeleted?:boolean;bytesFreed:number;error?:string}>;deletedCount:number;bytesFreed:number}
export interface StorageMetrics {database:{bytes:number|null;limitBytes:number|null};photos:{bytes:number|null;limitBytes:number|null};pending:{count:number|null;bytes:number|null};generatedAt:string;includesBanners:boolean}
export const photoCleanupService={
 list:async(filters:CleanupFilters)=>(await api.get<{data:CleanupPage}>("/admin/photo-cleanup",{params:{...filters,status:filters.status==="all"?undefined:filters.status,search:filters.search?.trim()||undefined,from:filters.from||undefined,to:filters.to||undefined},timeout:20000})).data.data,
 remove:async(ids:string[])=>(await api.post<{data:CleanupResult}>("/admin/photo-cleanup/delete",{ids,confirm:true},{timeout:120000})).data.data,
 usage:async(refresh=false)=>(await api.get<{data:StorageMetrics}>("/admin/storage-usage",{params:refresh?{refresh:"true"}:undefined,timeout:20000})).data.data
};
