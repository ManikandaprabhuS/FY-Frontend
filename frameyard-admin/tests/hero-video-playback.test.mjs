import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const module={exports:{}};
new Function('module','exports',ts.transpileModule(readFileSync(new URL('../src/features/customer/utils/heroVideoPlayback.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module,module.exports);
const {createHeroVideoPlayback,HERO_VIDEO_TIMEOUTS,heroIntersectsViewport}=module.exports;
class Video extends EventTarget {
 duration=9.16;readyState=4;currentTime=4;paused=true;ended=false;calls=[];mode='ok';bufferEnd=9.16;
 get buffered(){return {length:this.bufferEnd?1:0,end:()=>this.bufferEnd};}
 setAttribute(){}
 play(){this.calls.push(this.currentTime);if(this.mode==='blocked'){this.paused=true;return Promise.reject(Object.assign(Error('blocked'),{name:'NotAllowedError'}));}this.paused=false;return Promise.resolve();}
 pause(){const was=!this.paused;this.paused=true;if(was)this.emit('pause');}
 emit(name){this.dispatchEvent(new Event(name));}
}
function clock(){let now=0,id=0;const tasks=new Map();return {setTimeout:(fn,ms)=>{tasks.set(++id,{at:now+ms,fn});return id},clearTimeout:id=>tasks.delete(id),tick(ms){const end=now+ms;for(;;){const next=[...tasks].sort((a,b)=>a[1].at-b[1].at)[0];if(!next||next[1].at>end)break;now=next[1].at;tasks.delete(next[0]);next[1].fn();}now=end;},get size(){return tasks.size}};}
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(video=new Video(),extra={}){const time=clock(),states=[],finishes=[],touch=new EventTarget();const destroy=createHeroVideoPlayback(video,{active:true,startupMs:4000,clock:time,touchTarget:touch,onState:s=>states.push(s),onComplete:r=>finishes.push(r),...extra});return {video,time,states,finishes,touch,destroy};}

test('video resets to zero, never advances at 5s, and advances exactly once on ended',async()=>{const s=setup();assert.deepEqual(s.video.calls,[0]);s.video.emit('playing');await flush();for(let i=0;i<6;i++){s.video.currentTime+=1;s.video.emit('timeupdate');s.time.tick(1000)}assert.deepEqual(s.finishes,[]);s.video.currentTime=9.16;s.video.ended=true;s.video.emit('ended');s.video.emit('ended');s.time.tick(30000);assert.deepEqual(s.finishes,['ended']);s.destroy();assert.equal(s.video.currentTime,0);assert.equal(s.time.size,0);});
test('every visible visit starts from zero and inactive/offscreen visits only pause/reset',()=>{const v=new Video(),s=setup(v);s.destroy();v.currentTime=6;const next=setup(v);assert.equal(v.calls.at(-1),0);next.destroy();v.currentTime=7;const inactive=setup(v,{active:false});assert.equal(v.currentTime,0);const calls=v.calls.length;v.emit('canplaythrough');inactive.touch.dispatchEvent(new Event('pointerdown'));inactive.time.tick(20000);assert.equal(v.calls.length,calls);assert.deepEqual(inactive.finishes,[]);inactive.destroy();});
test('short clips prefer canplaythrough but only wait 750ms for that preference',()=>{const v=new Video();v.readyState=2;v.bufferEnd=1;const s=setup(v);assert.equal(v.calls.length,0);s.time.tick(749);assert.equal(v.calls.length,0);s.time.tick(1);assert.deepEqual(v.calls,[0]);s.destroy();const v2=new Video();v2.readyState=2;v2.bufferEnd=1;const s2=setup(v2);v2.emit('canplaythrough');assert.deepEqual(v2.calls,[0]);s2.destroy();});
test('initial loading times out at 4s, later loading at 2s; no endless spinner',()=>{for(const startupMs of [4000,2000]){const v=new Video();v.readyState=0;v.bufferEnd=0;const s=setup(v,{startupMs});assert.equal(s.states.at(-1).loading,true);s.time.tick(startupMs-1);assert.equal(s.finishes.length,0);s.time.tick(1);assert.deepEqual(s.finishes,['start-timeout']);assert.equal(s.states.at(-1).loading,false);s.destroy();}assert.equal(HERO_VIDEO_TIMEOUTS.laterStart,2000);});
test('waiting/stalled show poster/spinner and repeated events do not extend the 3s deadline',()=>{const s=setup();s.video.emit('playing');s.video.currentTime=2;s.video.emit('waiting');assert.equal(s.states.at(-1).loading,true);assert.equal(s.states.at(-1).visible,false);s.time.tick(2500);s.video.emit('stalled');s.time.tick(499);assert.equal(s.finishes.length,0);s.time.tick(1);assert.deepEqual(s.finishes,['stall-timeout']);s.destroy();});
test('playing clears a stall, resumes the video indicator and awaits the real end',()=>{const s=setup();s.video.emit('playing');s.video.emit('waiting');s.time.tick(2000);s.video.currentTime=4;s.video.emit('progress');assert.equal(s.states.at(-1).bufferedEnd,9.16);s.video.emit('playing');assert.equal(s.states.at(-1).loading,false);assert.equal(s.states.at(-1).visible,true);assert(s.states.at(-1).progress>0.4);for(let i=0;i<5;i++){s.video.currentTime+=0.5;s.video.emit('timeupdate');s.time.tick(1000)}assert.deepEqual(s.finishes,[]);s.destroy();});
test('blocked autoplay hides spinner, permits one touch retry, and retains bounded skip',async()=>{const v=new Video();v.mode='blocked';const s=setup(v);await flush();assert.equal(s.states.at(-1).loading,false);assert.equal(s.states.at(-1).visible,false);v.mode='ok';s.touch.dispatchEvent(new Event('pointerdown'));await flush();v.emit('playing');assert.equal(s.states.at(-1).visible,true);for(let i=0;i<6;i++){v.currentTime+=1;v.emit('timeupdate');s.time.tick(1000)}assert.deepEqual(s.finishes,[]);s.destroy();const v2=new Video();v2.mode='blocked';const s2=setup(v2);await flush();s2.time.tick(4000);assert.deepEqual(s2.finishes,['blocked']);s2.destroy();});
test('readiness events cannot issue duplicate pending play calls; cleanup removes listeners/timers',async()=>{const v=new Video();let reject;v.play=function(){this.calls.push(this.currentTime);return new Promise((_,r)=>{reject=r})};const s=setup(v);v.emit('canplay');v.emit('canplaythrough');s.touch.dispatchEvent(new Event('pointerdown'));assert.equal(v.calls.length,1);const states=s.states.length;s.destroy();reject(Object.assign(Error('old'),{name:'NotAllowedError'}));await flush();v.emit('playing');v.emit('ended');s.touch.dispatchEvent(new Event('pointerdown'));s.time.tick(30000);assert.deepEqual(s.finishes,[]);assert.equal(s.states.length,states);assert.equal(s.time.size,0);});
test('unexpected pause and media error are bounded and never double-advance',()=>{const s=setup();s.video.emit('playing');s.video.pause();s.time.tick(3000);assert.deepEqual(s.finishes,['stall-timeout']);s.video.emit('error');assert.equal(s.finishes.length,1);s.destroy();const error=setup();error.video.emit('error');error.video.emit('ended');assert.deepEqual(error.finishes,['error']);error.destroy();});

test('a stale queued pause event cannot start a stall while media is actually playing',()=>{const s=setup();s.video.emit('playing');s.video.emit('pause');for(let i=0;i<6;i++){s.video.currentTime+=1;s.video.emit('timeupdate');s.time.tick(1000)}assert.deepEqual(s.finishes,[]);assert.equal(s.states.at(-1).loading,false);s.destroy();});
test('synchronous autoplay rejection also keeps the poster without an endless spinner',()=>{const v=new Video();v.play=()=>{throw Object.assign(Error('blocked'),{name:'NotAllowedError'})};const s=setup(v);assert.equal(s.states.at(-1).loading,false);s.time.tick(4000);assert.deepEqual(s.finishes,['blocked']);s.destroy();});

test('silent media freezes also skip within 3s without waiting/stalled events',()=>{const s=setup();s.video.emit('playing');s.time.tick(2999);assert.deepEqual(s.finishes,[]);s.time.tick(1);assert.deepEqual(s.finishes,['stall-timeout']);s.destroy();});
test('buffered picture progress cancels a download-stalled indication',()=>{const s=setup();s.video.emit('playing');s.video.emit('stalled');s.time.tick(2000);s.video.currentTime=2;s.video.emit('timeupdate');assert.equal(s.states.at(-1).loading,false);s.time.tick(2000);assert.deepEqual(s.finishes,[]);s.destroy();});

test('only the ended event completes playback, never elapsed time or a progress event',()=>{const s=setup();s.video.emit('playing');s.video.currentTime=9.16;s.video.emit('timeupdate');assert.deepEqual(s.finishes,[]);s.video.ended=true;s.video.emit('timeupdate');assert.deepEqual(s.finishes,[]);s.video.emit('ended');assert.deepEqual(s.finishes,['ended']);s.destroy();});

test('small visible slices count as visible; only fully offscreen or zero-area heroes stop',()=>{
 const rect={top:-590,bottom:10,left:0,right:390,width:390,height:600};
 assert.equal(heroIntersectsViewport(rect,390,844),true);
 assert.equal(heroIntersectsViewport({...rect,bottom:0},390,844),false);
 assert.equal(heroIntersectsViewport({...rect,top:844,bottom:1444},390,844),false);
 assert.equal(heroIntersectsViewport({...rect,width:0},390,844),false);
});

test('stale ended events cannot terminate a new pass and progress is zero before playing',()=>{const s=setup();s.video.currentTime=0.01;s.video.emit('progress');assert.equal(s.states.at(-1).progress,0);s.video.emit('ended');assert.deepEqual(s.finishes,[]);s.video.emit('playing');s.video.currentTime=9.16;s.video.ended=true;s.video.emit('ended');assert.deepEqual(s.finishes,['ended']);s.destroy();});

test('ignored preload can initiate loading with one bounded play request before metadata',()=>{const v=new Video();v.duration=NaN;v.readyState=0;v.bufferEnd=0;const s=setup(v);s.time.tick(749);assert.equal(v.calls.length,0);s.time.tick(1);assert.deepEqual(v.calls,[0]);assert.equal(s.states.at(-1).progress,0);s.time.tick(3250);assert.deepEqual(s.finishes,['start-timeout']);s.destroy();});
