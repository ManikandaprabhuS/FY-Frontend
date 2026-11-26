import {useCallback,useEffect} from 'react';
import {useAuthStore} from '../store/authStore';
import {useCustomerNotificationStore,refreshCustomerNotifications,customerNoticeItems} from '../store/customerNotificationStore';
import {subscribeNotificationEvents} from '../services/notification-realtime';
import type {CustomerNoticeFilter} from '../services/customer-notifications.service';

export function useCustomerNotifications(page=1,filter:CustomerNoticeFilter='all',append=false){
 const owner=useAuthStore(state=>state.user?.role==='CUSTOMER'?state.user.id:null);
 const state=useCustomerNotificationStore();
 const {setOwner,load:loadPage}=state;
 useEffect(()=>useAuthStore.subscribe(next=>setOwner(next.user?.role==='CUSTOMER'?next.user.id:null)),[setOwner]);
 useEffect(()=>{setOwner(owner);if(!owner)return;void loadPage(1,'all');return subscribeNotificationEvents(owner,'CUSTOMER',refreshCustomerNotifications);},[owner,setOwner,loadPage]);
 const load=useCallback((next=1,fresh=false)=>{useCustomerNotificationStore.getState().setOwner(owner);return useCustomerNotificationStore.getState().load(next,filter,fresh);},[owner,filter]);
 useEffect(()=>{if(owner)void load(page);},[owner,page,filter,load]);
 const k=filter+':'+page,visible=state.owner===owner&&owner!==null;
 return {items:visible?customerNoticeItems(state.pages,page,filter,append):[],summary:visible?state.summary:{totalCount:0,unreadCount:0,readCount:0},pagination:visible?state.pages[k]?.pagination:undefined,loading:visible?Boolean(state.loading[k]):true,error:visible?Boolean(state.errors[k]):false,busy:visible?state.busy:false,load,mark:state.mark};
}
