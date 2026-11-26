import {create} from 'zustand';
import {customerNotifications,type CustomerNotice,type CustomerNoticeFilter,type CustomerNoticePage,type CustomerNoticeSummary} from '../services/customer-notifications.service';
import {showError,showSuccess} from '../utils/toast';

const emptySummary=():CustomerNoticeSummary=>({totalCount:0,unreadCount:0,readCount:0});
const key=(page:number,filter:CustomerNoticeFilter)=>filter+':'+page;
type State={owner:string|null;pages:Record<string,CustomerNoticePage>;summary:CustomerNoticeSummary;loading:Record<string,boolean>;errors:Record<string,boolean>;busy:boolean;version:number;
 setOwner:(id:string|null)=>void;load:(page?:number,filter?:CustomerNoticeFilter,fresh?:boolean)=>Promise<void>;mark:(id?:string)=>Promise<void>};
const inFlight=new Map<string,Promise<void>>();
export const useCustomerNotificationStore=create<State>((set,get)=>({
 owner:null,pages:{},summary:emptySummary(),loading:{},errors:{},busy:false,version:0,
 setOwner:id=>{if(get().owner!==id)set(state=>({owner:id,pages:{},summary:emptySummary(),loading:{},errors:{},busy:false,version:state.version+1}));},
 load:async(page=1,filter='all',fresh=false)=>{
  const state=get(),owner=state.owner,k=key(page,filter);if(!owner||state.busy||!fresh&&state.pages[k])return;
  const version=state.version,requestKey=owner+':'+version+':'+k,existing=inFlight.get(requestKey);if(existing)return existing;
  set(s=>({loading:{...s.loading,[k]:true}}));
  const request=(async()=>{try{const data=await customerNotifications.list(page,filter);if(get().owner!==owner||get().busy||get().version!==version)return;set(s=>({pages:{...s.pages,[k]:data},summary:data.summary??{totalCount:data.pagination.total,unreadCount:data.unreadCount,readCount:Math.max(0,data.pagination.total-data.unreadCount)},errors:{...s.errors,[k]:false}}));}catch{if(get().owner===owner&&get().version===version)set(s=>({errors:{...s.errors,[k]:true}}));}finally{if(get().owner===owner&&get().version===version)set(s=>({loading:{...s.loading,[k]:false}}));inFlight.delete(requestKey);}})();
  inFlight.set(requestKey,request);await request;
 },
 mark:async id=>{
  const before=get(),owner=before.owner;if(!owner||before.busy)return;
  const known=Object.values(before.pages).flatMap(page=>page.notifications).find(item=>item.id===id);
  if(id&&(!known||known.isRead))return;
  if(!id&&!before.summary.unreadCount)return;
  const unread=id?Math.max(0,before.summary.unreadCount-1):0;
  const summary={...before.summary,unreadCount:unread,readCount:before.summary.totalCount-unread};
  const pages=Object.fromEntries(Object.entries(before.pages).map(([k,page])=>[k,{...page,summary,unreadCount:unread,notifications:page.notifications.map(item=>!id||item.id===id?{...item,isRead:true}:item)}]));
  const mutationVersion=before.version+1;
  set({pages,summary,busy:true,loading:{},version:mutationVersion});showSuccess('Marked as read',{id:'customer-notification-read'});
  let succeeded=false;
  try{const result=await customerNotifications.read(id);if(get().owner!==owner||get().version!==mutationVersion)return;set({summary:result.summary??{...summary,unreadCount:result.unreadCount,readCount:Math.max(0,summary.totalCount-result.unreadCount)}});succeeded=true;}
  catch{if(get().owner===owner&&get().version===mutationVersion){set({pages:before.pages,summary:before.summary});showError('Could not mark notifications as read. Please try again.',{id:'customer-notification-read',retry:()=>void get().mark(id)});}}
  finally{if(get().owner===owner&&get().version===mutationVersion){set({busy:false});if(succeeded)for(const k of Object.keys(get().pages)){const [filter,page]=k.split(':');if(filter!=='all'||get().summary.totalCount!==before.summary.totalCount)void get().load(Number(page),filter as CustomerNoticeFilter,true);}}}
 },
}));

let eventRefreshRunning=false,eventRefreshPending=false;
export const refreshCustomerNotifications=()=>{
 if(typeof document==='undefined'||document.hidden||!useCustomerNotificationStore.getState().owner)return;
 eventRefreshPending=true;if(eventRefreshRunning)return;eventRefreshRunning=true;
 const owner=useCustomerNotificationStore.getState().owner;
 void (async()=>{try{while(eventRefreshPending&&!document.hidden&&useCustomerNotificationStore.getState().owner===owner){
  const store=useCustomerNotificationStore.getState();
  if(store.busy){await new Promise(resolve=>setTimeout(resolve,200));continue;}
  eventRefreshPending=false;
  await Promise.all([...new Set(['all:1',...Object.keys(store.pages)])].map(k=>{const [filter,page]=k.split(':');return store.load(Number(page),filter as CustomerNoticeFilter,true);}));
 }}finally{eventRefreshRunning=false;if(eventRefreshPending&&!document.hidden&&useCustomerNotificationStore.getState().owner)refreshCustomerNotifications();}})();
};
export function customerNoticeItems(pages:State['pages'],page:number,filter:CustomerNoticeFilter='all',append=false):CustomerNotice[]{
 const rows=append?Array.from({length:page},(_,i)=>pages[key(i+1,filter)]?.notifications??[]).flat():pages[key(page,filter)]?.notifications??[];
 return [...new Map(rows.map(item=>[item.id,item])).values()].filter(item=>filter==='all'||item.isRead===(filter==='read')).sort((a,b)=>b.createdAt.localeCompare(a.createdAt)||b.id.localeCompare(a.id));
}
