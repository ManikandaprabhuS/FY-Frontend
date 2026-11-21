import {useEffect,useState,type RefObject} from 'react';
import {createPortal} from 'react-dom';

/** Mounted only when explicitly requested; never logs tokens or private data. */
export default function HeroVideoDebug({videoRef}:{videoRef:RefObject<HTMLVideoElement|null>}){
 const [snapshot,setSnapshot]=useState('Waiting for video'),[events,setEvents]=useState<string[]>([]);
 useEffect(()=>{
  const video=videoRef.current;if(!video)return;
  const read=()=>{
   const parent=video.parentElement,rect=video.getBoundingClientRect(),style=getComputedStyle(video);
   setSnapshot(JSON.stringify({currentSrc:video.currentSrc||video.querySelector('source')?.src,sourceType:video.querySelector('source')?.type,mp4:video.canPlayType('video/mp4'),h264:video.canPlayType('video/mp4; codecs="avc1.4D4028"'),readyState:video.readyState,networkState:video.networkState,error:video.error?{code:video.error.code,message:video.error.message}:null,bufferedEnd:video.buffered.length?video.buffered.end(video.buffered.length-1):0,duration:Number.isFinite(video.duration)?video.duration:null,currentTime:video.currentTime,paused:video.paused,muted:video.muted,attributes:{muted:video.hasAttribute('muted'),playsinline:video.hasAttribute('playsinline'),autoplay:video.hasAttribute('autoplay'),loop:video.hasAttribute('loop'),preload:video.preload,poster:video.poster},display:style.display,visibility:style.visibility,opacity:style.opacity,slideVisibility:parent?getComputedStyle(parent).visibility:null,rect:{left:Math.round(rect.left),top:Math.round(rect.top),width:Math.round(rect.width),height:Math.round(rect.height)},videos:document.querySelectorAll('.fy-hero video').length},null,1));
  };
  const log=(event:Event)=>{read();const note=event instanceof CustomEvent?String(event.detail??''):'';setEvents(previous=>[...previous,`${new Date().toISOString().slice(11,23)} ${event.type} t=${video.currentTime.toFixed(2)} ${note}`].slice(-18));};
  const names=['loadstart','loadedmetadata','loadeddata','canplay','canplaythrough','playing','waiting','stalled','suspend','abort','error','pause','ended','fyhero:play-rejected','fyhero:finish'];
  names.forEach(name=>video.addEventListener(name,log));read();const timer=setInterval(read,500);
  return()=>{clearInterval(timer);names.forEach(name=>video.removeEventListener(name,log));};
 },[videoRef]);
 return createPortal(<aside className="fy-hero-debug" aria-label="Hero video diagnostics"><strong>Hero video diagnostics — ?debugVideo=1</strong><pre>{snapshot}</pre><pre>{events.join('\n')}</pre></aside>,document.body);
}
