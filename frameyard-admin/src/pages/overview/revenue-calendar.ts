export const REVENUE_TIME_ZONE="Asia/Calcutta";
export type RevenueRange="today"|"week"|"month"|"year"|"custom";
const calendar=new Intl.DateTimeFormat("en-CA",{timeZone:REVENUE_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",hourCycle:"h23"});
export const revenueDateParts=(date:Date)=>{
 const p=Object.fromEntries(calendar.formatToParts(date).map(part=>[part.type,part.value]));
 return {key:p.year+"-"+p.month+"-"+p.day,year:Number(p.year),month:Number(p.month),hour:Number(p.hour)};
};
const dayStart=(key:string)=>new Date(key+"T00:00:00+05:30");
const calendarDate=(key:string)=>new Date(key+"T00:00:00Z");
const isoKey=(date:Date)=>date.toISOString().slice(0,10);
export function revenueDateRange(range:RevenueRange,now:Date,fromDate="",toDate=""){
 const p=revenueDateParts(now);
 let from=dayStart(p.key),to=new Date(now),label="Today";
 if(range==="month"){from=dayStart(p.key.slice(0,7)+"-01");label="This Month";}
 if(range==="year"){from=dayStart(p.year+"-01-01");label="This Year ("+p.year+")";}
 if(range==="week"){
  const day=calendarDate(p.key),sinceMonday=(day.getUTCDay()+6)%7;
  day.setUTCDate(day.getUTCDate()-sinceMonday);from=dayStart(isoKey(day));label="This Week";
 }
 if(range==="custom"){
  const start=dayStart(fromDate),end=dayStart(toDate);
  from=Number.isFinite(start.getTime())?start:new Date(0);
  to=Number.isFinite(end.getTime())?new Date(Math.min(end.getTime()+86400000-1,now.getTime())):new Date(now);
  const format=(date:Date)=>date.toLocaleDateString("en-IN",{timeZone:REVENUE_TIME_ZONE});
  label=format(from)+" - "+format(to);
 }
 return {from,to,label};
}
type RevenueOrder={createdAt:string;totalAmount:number;orderStatus:string};
export const revenueOrdersInRange=<T extends RevenueOrder>(orders:T[],window:{from:Date;to:Date})=>orders.filter(order=>{
 const created=new Date(order.createdAt);
 return order.orderStatus!=="CANCELLED"&&created>=window.from&&created<=window.to;
});
export function revenueChartData(orders:RevenueOrder[],range:RevenueRange,window:{from:Date;to:Date}){
 if(window.from>window.to)return [];
 const totals=new Map<string,number>();
 for(const order of orders){
  const date=revenueDateParts(new Date(order.createdAt));
  const key=range==="year"?date.key.slice(0,7):range==="today"?date.key+"-"+date.hour:date.key;
  totals.set(key,(totals.get(key)??0)+Number(order.totalAmount||0));
 }
 const start=revenueDateParts(window.from),end=revenueDateParts(window.to);
 if(range==="year")return Array.from({length:end.month},(_,month)=>{
  const key=start.year+"-"+String(month+1).padStart(2,"0");
  return {day:new Date(Date.UTC(start.year,month,1)).toLocaleDateString("en-US",{month:"short",timeZone:"UTC"}),revenue:totals.get(key)??0};
 });
 if(range==="today")return Array.from({length:end.hour+1},(_,hour)=>({day:hour+":00",revenue:totals.get(start.key+"-"+hour)??0}));
 const first=calendarDate(start.key),last=calendarDate(end.key);
 const days=Math.floor((last.getTime()-first.getTime())/86400000)+1;
 return Array.from({length:Math.max(0,days)},(_,index)=>{
  const date=new Date(first.getTime()+index*86400000),key=isoKey(date);
  return {day:date.toLocaleDateString("en-US",{day:"2-digit",month:"short",timeZone:"UTC"}),revenue:totals.get(key)??0};
 });
}
