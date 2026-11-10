import api from "./api";
import type {Pagination} from "./contracts";
export type CustomerNotice={id:string;type:string;title:string;message:string;orderId:string;isRead:boolean;createdAt:string};
export const customerNotifications={
 count:async()=>(await api.get<{data:{unreadCount:number}}>("/customer-notifications/unread-count",{timeout:15000})).data.data.unreadCount,
 list:async(page=1)=>(await api.get<{data:{notifications:CustomerNotice[];pagination:Pagination;unreadCount:number}}>("/customer-notifications",{params:{page,limit:20},timeout:15000})).data.data,
 read:async(id?:string)=>(await api.patch<{data:{unreadCount:number}}>(id?"/customer-notifications/"+encodeURIComponent(id)+"/read":"/customer-notifications/read-all",undefined,{timeout:15000})).data.data.unreadCount
};
