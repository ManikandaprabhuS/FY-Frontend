import React,{useState} from "react";
import {createRoot} from "react-dom/client";
import RevenueChart from "../../src/pages/overview/RevenueChart";
import {revenueDateRange,revenueOrdersInRange,revenueChartData,type RevenueRange} from "../../src/pages/overview/revenue-calendar";
import "../../src/index.css";
const now=new Date("2026-11-10T12:00:00+05:30");
const orders=[{createdAt:"2026-11-08T10:00:00+05:30",totalAmount:2325.6,orderStatus:"PLACED"},{createdAt:"2026-10-15T10:00:00+05:30",totalAmount:1000,orderStatus:"PLACED"}];
function Preview(){
 const [range,setRange]=useState<RevenueRange>("month");
 const window=revenueDateRange(range,now,"2026-10-01","2026-10-31"),selected=revenueOrdersInRange(orders,window),data=revenueChartData(selected,range,window);
 return <main style={{padding:16,maxWidth:1200,margin:"auto"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h1 style={{fontSize:16,fontWeight:700}}>REVENUE ({window.label})</h1><p style={{fontSize:12}}>INR {selected.reduce((sum,o)=>sum+o.totalAmount,0).toFixed(2)} from {selected.length} orders</p></div><select aria-label="Revenue range" value={range} onChange={e=>setRange(e.target.value as RevenueRange)}><option value="month">This Month</option><option value="week">This Week</option><option value="year">This Year</option><option value="today">Today</option><option value="custom">Past month</option></select></div><div style={{height:340,marginTop:20,minWidth:0}}><RevenueChart data={data}/></div><p style={{fontSize:12}}>Last point: {data.at(-1)?.day} · {data.length} points</p></main>;
}
createRoot(document.getElementById("root")!).render(<Preview/>);
