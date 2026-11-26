import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('../src/services/notification-realtime.ts', import.meta.url), 'utf8');
const flush = async () => { for (let i=0;i<12;i++) await Promise.resolve(); };
function setup() {
  const document = new EventTarget(), window = new EventTarget(); document.hidden=false;
  const channels=[],timers=new Map(),intervals=new Map(); let serial=0,requests=0,removed=0,disconnected=0;
  const client={realtime:{setAuth:async()=>{},disconnect:()=>disconnected++},removeChannel:async()=>{},removeAllChannels:async()=>removed++,channel:name=>{
    const channel={name,handlers:[],on(event,filter,fn){this.handlers.push({event,filter,fn});return this;},subscribe(fn){this.status=fn;return this;}};channels.push(channel);return channel;
  }};
  const api={get:async()=>{requests++;return {data:{data:{userId:'one',role:'CUSTOMER',url:'https://test.supabase.co',anonKey:'public-anon',accessToken:'header.'+Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.signature'}}};}};
  const mod={exports:{}};
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  new Function('require','module','exports','document','window','setTimeout','clearTimeout','setInterval','clearInterval',output)(id=>id==='./api'?{__esModule:true,default:api}:id==='@supabase/supabase-js'?{createClient:()=>client}:(()=>{throw Error(id)})(),mod,mod.exports,document,window,(fn,ms)=>{timers.set(++serial,{fn,ms});return serial;},id=>timers.delete(id),(fn,ms)=>{intervals.set(++serial,{fn,ms});return serial;},id=>intervals.delete(id));
  const tick=ms=>{for(const [id,t] of [...timers])if(t.ms===ms){timers.delete(id);t.fn();}};
  return {...mod.exports,channels,intervals,timers,tick,document,window,requests:()=>requests,removed:()=>removed,disconnected:()=>disconnected};
}
test('one authenticated channel serves duplicate listeners; healthy sessions do not poll; cleanup waits for final subscriber',async()=>{
  const s=setup();let updates=0;const fn=()=>updates++;
  const a=s.subscribeNotificationEvents('one','CUSTOMER',fn),b=s.subscribeNotificationEvents('one','CUSTOMER',fn);await flush();
  assert.equal(s.requests(),1);assert.equal(s.channels.length,1);assert.equal(s.channels[0].handlers.length,5);
  s.channels[0].status('SUBSCRIBED');s.channels[0].handlers.find(h=>h.event==='system').fn({extension:'postgres_changes',status:'ok'});s.tick(120);assert.equal(updates,2);
  const fallback=[...s.intervals.values()][0];assert.equal(fallback.ms,60000);fallback.fn();s.tick(120);assert.equal(updates,2);
  a();assert.equal(s.removed(),0);s.channels[0].handlers[0].fn();s.tick(120);assert.equal(updates,3);
  b();assert.equal(s.removed(),1);assert.equal(s.disconnected(),1);assert.equal(s.intervals.size,0);assert.equal(s.timers.size,0);
});
test('reconnect reconciles missed events, hidden tabs avoid REST refresh, disconnected fallback is bounded',async()=>{
  const s=setup();let updates=0;const stop=s.subscribeNotificationEvents('one','CUSTOMER',()=>updates++);await flush();
  s.channels[0].status('SUBSCRIBED');s.channels[0].handlers.find(h=>h.event==='system').fn({extension:'postgres_changes',status:'ok'});s.tick(120);assert.equal(updates,1);
  s.document.hidden=true;s.channels[0].handlers[0].fn();s.tick(120);assert.equal(updates,1);
  s.channels[0].status('CHANNEL_ERROR');[...s.intervals.values()][0].fn();s.tick(120);assert.equal(updates,1);
  s.document.hidden=false;s.tick(5000);await flush();assert.equal(s.channels.length,2);
  s.channels[1].status('SUBSCRIBED');s.channels[1].handlers.find(h=>h.event==='system').fn({extension:'postgres_changes',status:'ok'});s.tick(120);assert.equal(updates,2);stop();
});
test('browser security policy permits Supabase websocket transport',()=>{
  const headers=readFileSync(new URL('../public/_headers',import.meta.url),'utf8');assert.match(headers,/wss:\/\/\*\.supabase\.co/);
});
