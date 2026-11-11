import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,readdir} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url),React=require('react');
const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
const source=await read('features/customer/components/CustomerNavbar.tsx');
const css=await read('features/customer/styles/storefront.css');
function render(scrolled,onVideo,path='/') {
 const states=[false,false,scrolled,onVideo];let index=0;
 const Link=({to,children,...props})=>createElement('a',{...props,href:to},children);
 const overrides={
  react:{...React,useEffect(){},useCallback:fn=>fn,useRef:value=>({current:value}),useState:()=>[states[index++],()=>{}]},
  'react-router-dom':{Link,NavLink:({to,children,className,end: _end,...props})=>createElement('a',{...props,href:to,className:typeof className==='function'?className({isActive:false}):className},typeof children==='function'?children({isActive:false}):children),useLocation:()=>({pathname:path,search:'',hash:''}),useNavigate:()=>()=>{}},
  '../../../assets/fy-logo-icon.jpeg':{__esModule:true,default:'/src/assets/fy-logo-icon.jpeg'},
  '../../../store/authStore':{useAuthStore:select=>select({user:null,isAuthenticated:false,status:'unauthenticated'})},
  '../../../store/customerCommerceStore':{useCustomerCommerceStore:select=>select({cartItems:[{quantity:3}],wishlistTotal:0,cartOwnerId:null})},
  '../../../utils/toast':{},'../navigation':{BRAND_NAME:'FrameYaad',primaryNavLinks:[{name:'Home',path:'/'},{name:'Shop all',path:'/products'},{name:'Book appointment',path:'/book-appointment'},{name:'Contact us',path:'/contact-us'}]},
  './CustomerMenuDrawer':{__esModule:true,default:()=>null},'./CustomerWishlistDrawer':{__esModule:true,default:()=>null},'./CustomerNotificationBell':{__esModule:true,default:()=>null},
 };
 const module={exports:{}};
 new Function('require','module','exports',ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),module,module.exports);
 return renderToStaticMarkup(createElement(module.exports.default));
}
test('overlay and compact headers share wordmark, theme and readable count hooks without route changes',()=>{
 const overlay=render(false,true),compact=render(true,true),other=render(false,false,'/products');
 for(const html of [overlay,compact]){assert.match(html,/data-header-theme="on-video"/);assert.match(html,/fy-nav-wordmark/);assert.match(html,/data-header-badge/);assert.match(html,/Bag, 3 items/);}
 assert.match(other,/data-header-theme="default"/);assert.match(other,/href="\/profile"/);assert.match(other,/href="\/cart"/);
 assert.match(source,/data-hero-tone/);assert.match(source,/bounds.bottom > headerBottom/);assert.match(source,/requestAnimationFrame/);
});
test('black icons remain readable even against a black video frame and row heights are fixed',()=>{
 const linear=value=>{const x=value/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;};
 const contrast=(linear(255*.78)+.05)/(linear(17)+.05);
 assert(contrast>4.5);
 assert.match(css,/font-size: 36px/);assert.match(css,/height: 60px/);assert.match(css,/height: 76px/);
 assert.doesNotMatch(css,/data-hero-tone='dark'/);
 assert.match(css,/rgba\(255,255,255,\.78\)/);assert.match(css,/color 200ms/);
});
test('announcement changes only the typo, retaining the existing percentage',async()=>{
 const announcement=await read('features/customer/components/AnnouncementBar.tsx');
 assert.match(announcement,/Get 5% off on your first order — By Sign In/);assert.doesNotMatch(announcement,/Sigin/i);
});
test('writes header visual fixtures for expanded, compact, and other-page checks',async()=>{
 const assets=await readdir(new URL('../dist/assets/',import.meta.url)),base=assets.find(n=>/^index-.*\.css$/.test(n));
 await mkdir(new URL('../tmp/',import.meta.url),{recursive:true});
 for(const [name,scrolled,onVideo,path] of [['video',false,true,'/'],['compact',true,true,'/'],['other',true,false,'/products']]){
  await writeFile(new URL('../tmp/header-'+name+'.html',import.meta.url),'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/dist/assets/'+base+'"><style>'+css+'</style></head><body class="fy-store" style="margin:0;--font-display:Inter,Arial,sans-serif;--color-ink:#111111"><div style="height:30px;background:#111"></div>'+render(scrolled,onVideo,path)+'<main style="height:1400px;background:linear-gradient(#000,#777,#fff)"></main></body></html>');
 }
});
