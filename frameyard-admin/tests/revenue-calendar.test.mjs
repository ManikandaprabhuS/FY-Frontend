import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const text=await readFile(new URL("../src/pages/overview/revenue-calendar.ts",import.meta.url),"utf8"),module={exports:{}};
new Function("module","exports",ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module,module.exports);
const {revenueDateParts,revenueDateRange,revenueChartData,revenueOrdersInRange}=module.exports;
const now=new Date("2026-11-10T10:00:00Z");
test("This Month stops at November 10 and fills missing past days",()=>{
 const range=revenueDateRange("month",now),orders=[{createdAt:"2026-11-10T08:00:00Z",totalAmount:2325.6,orderStatus:"PLACED"},{createdAt:"2026-11-11T08:00:00Z",totalAmount:999,orderStatus:"PLACED"}];
 const selected=revenueOrdersInRange(orders,range),data=revenueChartData(selected,"month",range);
 assert.equal(data.length,10);assert.equal(data.at(-1).day,"Nov 10");
 assert.equal(data.at(-1).revenue,2325.6);assert.equal(selected.length,1);
 assert.equal(data.reduce((sum,p)=>sum+p.revenue,0),selected.reduce((sum,o)=>sum+o.totalAmount,0));
 assert(data.slice(0,-1).every(p=>p.revenue===0));
});
test("first and last days of the month have exactly one and thirty points",()=>{
 for(const [instant,count,last] of [["2026-11-01T06:00:00Z",1,"Nov 01"],["2026-11-30T18:29:59.999Z",30,"Nov 30"]]){
  const range=revenueDateRange("month",new Date(instant)),data=revenueChartData([],"month",range);
  assert.equal(data.length,count);assert.equal(data.at(-1).day,last);
 }
});
test("India midnight changes the final date, independently of UTC/browser timezone",()=>{
 const before=new Date("2026-11-09T18:29:59.999Z"),after=new Date("2026-11-09T18:30:00Z");
 assert.equal(revenueDateParts(before).key,"2026-11-09");assert.equal(revenueDateParts(after).key,"2026-11-10");
 assert.equal(revenueChartData([],"month",revenueDateRange("month",before)).length,9);
 assert.equal(revenueChartData([],"month",revenueDateRange("month",after)).length,10);
});
test("week/year stop at today/current month and today omits future hours",()=>{
 assert.equal(revenueChartData([],"week",revenueDateRange("week",now)).length,2);
 const year=revenueChartData([],"year",revenueDateRange("year",now));assert.equal(year.length,11);assert.equal(year.at(-1).day,"Nov");
 const today=revenueChartData([],"today",revenueDateRange("today",now));assert.equal(today.length,16);assert.equal(today.at(-1).day,"15:00");
});
test("past custom periods remain complete and custom future bounds are capped",()=>{
 const past=revenueDateRange("custom",now,"2026-10-01","2026-10-31"),data=revenueChartData([],"custom",past);
 assert.equal(data.length,31);assert.equal(data.at(-1).day,"Oct 31");
 const future=revenueDateRange("custom",now,"2026-11-01","2026-12-31");
 assert.equal(revenueChartData([],"custom",future).length,10);
 assert.equal(revenueChartData([],"custom",revenueDateRange("custom",now,"2026-12-01","2026-12-31")).length,0);
});
test("custom past ranges longer than 31 days are not truncated",()=>{
 const range=revenueDateRange("custom",now,"2026-08-01","2026-10-31");
 assert.equal(revenueChartData([],"custom",range).length,92);
});
test("India-day bucketing and summary retain existing cancellation and amount rules",()=>{
 const orders=[{createdAt:"2026-11-09T18:30:00Z",totalAmount:500.25,orderStatus:"PROCESSING"},{createdAt:"2026-11-10T02:00:00Z",totalAmount:100,orderStatus:"CANCELLED"},{createdAt:"2026-11-10T11:00:00Z",totalAmount:999,orderStatus:"PLACED"}];
 const range=revenueDateRange("month",now),selected=revenueOrdersInRange(orders,range),data=revenueChartData(selected,"month",range);
 assert.equal(selected.length,1);assert.equal(data.at(-1).revenue,500.25);
});
test("chart uses monotone interpolation, zero baseline and readable axis space",async()=>{
 const chart=await readFile(new URL("../src/pages/overview/RevenueChart.tsx",import.meta.url),"utf8");
 assert.match(chart,/type="monotone"/);assert.match(chart,/baseValue=\{0\}/);assert.match(chart,/domain=\{\[0,"auto"\]\}/);
 assert.match(chart,/width=\{88\}/);assert.doesNotMatch(chart,/left: -|type="natural"/);
 const overview=await readFile(new URL("../src/pages/overview/OverviewPage.tsx",import.meta.url),"utf8");
 assert.match(overview,/30000/);assert.match(overview,/visibilitychange/);assert.match(overview,/\[fetchOrders,today.key\]/);
});
