import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL("../src/store/homepageBannerStore.ts",import.meta.url),"utf8");
const banner={code:"FIRST_ORDER",title:"First Order Offer",percentage:5,minOrderAmount:null};
const tick=()=>new Promise(setImmediate);
function harness({cached,publicRequest=async()=>({ok:true,json:async()=>({data:{banner}})}),personal=async()=>banner}={}){
 const saved=new Map(cached?[["fy_home_banner_v1",JSON.stringify({at:Date.now(),banner:cached})]]:[]);
 globalThis.sessionStorage={getItem:key=>saved.get(key)??null,setItem:(key,value)=>saved.set(key,value)};
 globalThis.document={querySelectorAll:()=>[],createElement:()=>({dataset:{}}),head:{append(){}}};
 globalThis.fetch=publicRequest;
 let auth={status:"checking",user:null},listener,state;
 const store=init=>{const use=selector=>selector(state);use.getState=()=>state;use.setState=value=>{state={...state,...value};};state=init();return use;};
 const authStore={getState:()=>auth,subscribe:fn=>{listener=fn;}};
 const module={exports:{}};
 const dependencies={zustand:{create:store},"./authStore":{useAuthStore:authStore},"../services/homepage-banner.service":{homepageBannerService:{public:personal}},"../services/api":{__esModule:true,default:{getUri:()=>"/api/v1/home/banner/public"}}};
 new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(id=>dependencies[id],module,module.exports);
 return {start:module.exports.startHomepageBanner,state:()=>state,auth:value=>{auth=value;listener();}};
}
test("cached banner appears immediately and early public fetch does not wait for auth",async()=>{
 let calls=0;const h=harness({cached:banner,publicRequest:async()=>{calls++;return new Promise(()=>{});}});
 assert.equal(h.state().banner.title,banner.title);h.start();h.start();assert.equal(calls,1);
});

for(const code of ["NEW_YEAR","CHRISTMAS","PONGAL"])test(code+" is accepted from both public response and the unchanged session cache",async()=>{
 const seasonal={...banner,code,title:code+' Offer',percentage:12,minOrderAmount:2000};
 const h=harness({cached:seasonal,publicRequest:async()=>({ok:true,json:async()=>({data:{banner:seasonal}})})});
 assert.equal(h.state().banner.code,code);h.start();await tick();assert.deepEqual(h.state().banner,seasonal);
});
test("login keeps the public banner and never requests personalized eligibility",async()=>{
 let calls=0;
 const h=harness({cached:banner,publicRequest:async()=>{calls++;return {ok:true,json:async()=>({data:{banner}})};},personal:()=>{throw new Error("Personalized banner must not be requested");}});
 h.start();await tick();h.auth({status:"authenticated",user:{id:"returning"}});
 assert.deepEqual(h.state().banner,banner);await tick();assert.deepEqual(h.state().banner,banner);assert.equal(calls,2);
});
test("checking and logged-out auth resolution do not hide content or repeat the public request",async()=>{
 let calls=0;const h=harness({cached:banner,publicRequest:async()=>{calls++;return {ok:true,json:async()=>({data:{banner}})};}});
 h.start();await tick();h.auth({status:"checking",user:null});assert.equal(calls,1);assert.deepEqual(h.state().banner,banner);
 h.auth({status:"unauthenticated",user:null});await tick();assert.equal(calls,1);assert.deepEqual(h.state().banner,banner);
});
test("login and logout both retain the banner from the same public endpoint",async()=>{
 let calls=0;const h=harness({cached:banner,publicRequest:async()=>{calls++;return {ok:true,json:async()=>({data:{banner}})};}});
 h.start();await tick();h.auth({status:"authenticated",user:{id:"returning"}});await tick();
 h.auth({status:"unauthenticated",user:null});await tick();
 assert.deepEqual(h.state().banner,banner);assert.equal(calls,3);
});
test("network failures retain the cached banner and silently retry once",async()=>{
 let calls=0;const h=harness({cached:banner,publicRequest:async()=>{calls++;throw new Error("offline");}});
 h.start();await new Promise(resolve=>setTimeout(resolve,1100));
 assert.equal(calls,2);assert.deepEqual(h.state().banner,banner);
});
