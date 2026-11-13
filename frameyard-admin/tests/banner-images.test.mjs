import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
const compile=(source,overrides={})=>{const m={exports:{}};new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),m,m.exports);return m.exports;};
const validators=compile(await read('pages/offers/banner-image-validation.ts'));
const service=compile(await read('services/homepage-banner.service.ts'),{'./api':{__esModule:true,default:{}}});
test('a failed custom image restores the existing SVG fallback',async()=>{
 let failed;const Component=compile(await read('features/customer/components/HomepageBannerVisual.tsx'),{
  react:{useId:()=> 'fallback-test',useState:()=>[failed,value=>{failed=value;}]},
  '../../../services/homepage-banner.service':service,'../styles/homepage-banner.css':{},
  'react-router-dom':{Link:()=>null},
 }).default;
 let element=Component({offer:{...offer,bannerImageUrl:'https://public.test/missing.png'}});
 tree(element).find(node=>node.type==='img').props.onError();
 element=Component({offer:{...offer,bannerImageUrl:'https://public.test/missing.png'}});
 assert(!tree(element).some(node=>node.type==='img'));assert(tree(element).some(node=>node.type==='svg'));
});
const tree=node=>!node||typeof node!=='object'?[]:[node,...(Array.isArray(node.props?.children)?node.props.children:[node.props?.children]).flatMap(child=>Array.isArray(child)?child.flatMap(tree):tree(child))];
async function uploadHarness(imageUrl=null){
 const states=[],refs=[],calls=[],toasts=[],flags=[],updated=[];let index=0,refIndex=0,resolve,reject;
 const pending=new Promise((a,b)=>{resolve=a;reject=b;});
 const Component=compile(await read('pages/offers/BannerImageUpload.tsx'),{
  react:{useEffect(){},useRef:value=>refs[refIndex++]??(refs[refIndex-1]={current:value}),useState:initial=>{const i=index++;if(!(i in states))states[i]=initial;return[states[i],value=>{states[i]=typeof value==='function'?value(states[i]):value;}];}},
  './banner-image-validation':validators,
  '../../services/homepage-banner.service':{homepageBannerService:{uploadImage:()=>{calls.push('upload');return pending;},removeImage:async()=>{calls.push('remove');return{imageUrl:null};}}},
  '../../utils/toast':Object.fromEntries(['showLoading','showSuccess','showError','showWarning'].map(name=>[name,(...args)=>toasts.push([name,...args])])),
  '../../features/customer/components/HomepageBannerVisual':{__esModule:true,default:()=>null},
 }).default;
 return{render:()=>{index=0;refIndex=0;return Component({imageUrl,offer,disabled:false,onBusy:value=>flags.push(value),onUpdated:value=>updated.push(value)});},calls,toasts,flags,updated,resolve,reject};
}
test('upload updates progress/busy state and preview without allowing repeated submissions',async()=>{
 const before=globalThis.Image;globalThis.Image=class{naturalWidth=1200;naturalHeight=400;set src(value){queueMicrotask(()=>this.onload());}};
 try{
  const h=await uploadHarness(),input=tree(h.render()).find(n=>n.props?.type==='file');
  const file=new File(['test'],'banner.png',{type:'image/png'});
  input.props.onChange({target:{files:[file],value:''}});await new Promise(setImmediate);
  assert.deepEqual(h.flags,[true]);assert.deepEqual(h.calls,['upload']);
  input.props.onChange({target:{files:[file],value:''}});await new Promise(setImmediate);assert.equal(h.calls.length,1);
  assert.equal(tree(h.render()).find(n=>n.props?.type==='file').props.disabled,true);
  h.resolve({imageUrl:'https://public.test/banner.png'});await new Promise(setImmediate);
  assert.deepEqual(h.flags,[true,false]);assert.equal(h.toasts.at(-1)[0],'showSuccess');assert.deepEqual(h.updated,['https://public.test/banner.png']);
 }finally{globalThis.Image=before;}
});
test('failed uploads clear loading state and offer Retry',async()=>{
 const before=globalThis.Image;globalThis.Image=class{naturalWidth=100;naturalHeight=100;set src(value){queueMicrotask(()=>this.onload());}};
 try{
  const h=await uploadHarness();tree(h.render()).find(n=>n.props?.type==='file').props.onChange({target:{files:[new File(['test'],'x.png',{type:'image/png'})],value:''}});
  await new Promise(setImmediate);h.reject(new Error('Offline'));await new Promise(setImmediate);
  assert.deepEqual(h.flags,[true,false]);assert.equal(h.toasts.at(-1)[0],'showError');assert.equal(typeof h.toasts.at(-1)[2].retry,'function');assert(h.toasts.some(t=>t[0]==='showWarning'));
 }finally{globalThis.Image=before;}
});
test('Remove confirms and returns the preview to the default image',async()=>{
 const before=globalThis.window;globalThis.window={confirm:()=>true};
 try{const h=await uploadHarness('https://public.test/old.png');tree(h.render()).find(n=>n.type==='button'&&n.props.children==='Remove').props.onClick();await new Promise(setImmediate);assert.deepEqual(h.calls,['remove']);assert.deepEqual(h.updated,[null]);assert.deepEqual(h.flags,[true,false]);}
 finally{globalThis.window=before;}
});
const offer={code:'BIG_ORDER',title:'Big Order Offer',percentage:10,minOrderAmount:5000};
const Visual=compile(await read('features/customer/components/HomepageBannerVisual.tsx'),{'../../../services/homepage-banner.service':service,'../styles/homepage-banner.css':{},'react-router-dom':{Link:({to,children,...p})=>createElement('a',{...p,href:to},children)}}).default;
test('accepts exactly 2 MB and rejects zero, oversize and unsafe file types',()=>{
 for(const type of ['image/jpeg','image/png','image/webp'])assert.equal(validators.validateBannerFile({type,size:2097152}),null);
 assert.match(validators.validateBannerFile({type:'image/jpeg',size:2097153}),/2 MB/);
 assert.match(validators.validateBannerFile({type:'image/png',size:0}),/non-empty/);
 for(const type of ['image/gif','image/svg+xml','application/pdf'])assert.match(validators.validateBannerFile({type,size:100}),/JPG, PNG or WebP/);
});
test('warns without blocking very wide, tall, and small images',()=>{
 assert.equal(validators.bannerDimensionWarning(1200,400),null);
 for(const [w,h] of [[4000,400],[400,4000],[100,100]])assert.match(validators.bannerDimensionWarning(w,h),/still upload/);
});
test('uploaded art is lazy/async, reserved in the existing region, with static fallback',async()=>{
 const html=renderToStaticMarkup(createElement(Visual,{offer:{...offer,bannerImageUrl:'https://public.test/banner.png'}}));
 assert.match(html,/fy-offer-banner__image/);assert.match(html,/loading="lazy"/);assert.match(html,/decoding="async"/);assert.match(html,/width="1200"/);assert.match(html,/Big Order Offer banner/);
 const fallback=renderToStaticMarkup(createElement(Visual,{offer}));assert.match(fallback,/<svg/);assert.doesNotMatch(fallback,/<img/);
 const css=await read('features/customer/styles/homepage-banner.css');assert.match(css,/object-fit:cover/);assert.match(css,/overflow:hidden/);assert.match(css,/aspect-ratio:3\/1/);
});
test('admin uses the same preview and blocks settings during uploads',async()=>{
 const card=await read('pages/offers/HomepageBannerCard.tsx'),upload=await read('pages/offers/BannerImageUpload.tsx');
 assert.match(card,/busy\|\|imageBusy/);assert.match(card,/onBusy=\{setImageBusy\}/);assert.match(upload,/HomepageBannerVisual preview/);
 assert.match(upload,/window.confirm/);assert.match(upload,/finally\{lock.current=false;setBusy\(false\);onBusy\(false\)/);
});
test('generates extreme-ratio shared-preview fixtures for responsive inspection',async()=>{
 const assets=await readdir(new URL('../dist/assets/',import.meta.url)),base=assets.find(n=>/^index-.*\.css$/.test(n));
 const css=await read('features/customer/styles/homepage-banner.css');await mkdir(new URL('../tmp/',import.meta.url),{recursive:true});
 const sections=[];
 for(const [w,h] of [[4000,400],[400,4000],[100,100]]){
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+w+'" height="'+h+'"><rect width="100%" height="100%" fill="#477161"/><circle cx="'+w/2+'" cy="'+h/2+'" r="'+Math.min(w,h)/3+'" fill="#f5d5a0"/></svg>';
  sections.push('<p>'+w+' x '+h+'</p>'+renderToStaticMarkup(createElement(Visual,{offer:{...offer,bannerImageUrl:'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64')}})));
 }
 await writeFile(new URL('../tmp/banner-images.html',import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+base+'"><style>'+css+'</style></head><body><main class="fy-offer-wrap">'+sections.join('')+'</main></body></html>');
});
