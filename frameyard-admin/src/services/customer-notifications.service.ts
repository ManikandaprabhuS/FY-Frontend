import api from "./api";
import type {Pagination} from "./contracts";
export type CustomerNotice={id:string;type:string;title:string;message:string;orderId:string|null;isRead:boolean;createdAt:string};
export type CustomerNoticeFilter='all'|'unread'|'read';
export type CustomerNoticeSummary={totalCount:number;unreadCount:number;readCount:number};
export type CustomerNoticePage={notifications:CustomerNotice[];pagination:Pagination;unreadCount:number;summary:CustomerNoticeSummary};
export const customerNotifications={
 count:async()=>(await api.get<{data:{unreadCount:number}}>("/customer-notifications/unread-count",{timeout:15000})).data.data.unreadCount,
 list:async(page=1,filter:CustomerNoticeFilter='all')=>(await api.get<{data:CustomerNoticePage}>("/customer-notifications",{params:{page,limit:20,read:filter==='all'?undefined:filter==='read'},timeout:15000})).data.data,
 read:async(id?:string)=>(await api.patch<{data:{unreadCount:number;summary:CustomerNoticeSummary}}>(id?"/customer-notifications/"+encodeURIComponent(id)+"/read":"/customer-notifications/read-all",undefined,{timeout:15000})).data.data
};
