import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {renderToStaticMarkup} from 'react-dom/server';
import ts from 'typescript';
const require=createRequire(import.meta.url);
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');
function compile(p,overrides={}){const m={exports:{}};new Function('require','module','exports',ts.transpileModule(read(p),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText)(id=>overrides[id]??require(id),m,m.exports);return m.exports;}
const first={code:'FIRST_ORDER',title:'First Order Offer',percentage:5,minOrderAmount:null,enabled:true};
const big={code:'BIG_ORDER',title:'Big Order Offer',percentage:12,minOrderAmount:2000,enabled:false};
test('banner retains controls and uses four-second rotation with a smooth opacity transition',()=>{
 assert.match(read('features/customer/components/HomepageOfferBanner.tsx'),/BANNER_ROTATE_MS=4000/);
 assert.match(read('features/customer/components/HomepageOfferBanner.tsx'),/Banner controls/);
 assert.match(read('features/customer/styles/banner-slider.css'),/transition:opacity 500ms cubic-bezier/);
});
function card(offers,code='BIG_ORDER'){
 let i=0;const states=[{featuredOfferCode:code,enabled:true,updatedAt:'2026-11-21T00:00:00Z'},code,false,false,0,false];
 const Component=compile('pages/offers/HomepageBannerCard.tsx',{react:{useState:()=>[states[i++],()=>{}],useEffect(){},useRef:v=>({current:v})},'../../services/homepage-banner.service':{},'../../utils/toast':{},'./BannerImageUpload':{__esModule:true,default:()=>null}}).default;
 return renderToStaticMarkup(Component({offers}));
}
test('selector offers only enabled options, with live values and a disabled current inactive snapshot',()=>{
 const html=card([first,big]);assert.match(html,/First Order Offer: 5% off on your first order/);assert.match(html,/<option[^>]*disabled[^>]*>Big Order Offer \(inactive\)/);assert.match(html,/This offer is off/);
 const enabled=card([first,{...big,enabled:true}]);assert.match(enabled,/Big Order Offer: 12% off above Rs. 2,000/);assert.doesNotMatch(enabled,/This offer is off/);
});
test('no active offers disables the selector and save with a clear placeholder',()=>{const html=card([{...first,enabled:false},big]);assert.match(html,/No active offers. Turn one on first/);assert.match(html,/<select[^>]*disabled/);assert.match(html,/Big Order Offer \(inactive\)/);});
test('both uploaders share recommendation text while existing size and dimension boundaries remain',()=>{
 const v=compile('pages/offers/banner-image-validation.ts');assert.match(v.bannerImageRecommendation(),/1800 x 600 px \(3:1\).*max 2 MB.*cropped to fit/);assert.equal(v.validateBannerFile({size:v.BANNER_IMAGE_MAX,type:'image/jpeg'}),null);assert(v.validateBannerFile({size:v.BANNER_IMAGE_MAX+1,type:'image/jpeg'}));
 assert.match(read('pages/settings/ContactMediaSettings.tsx'),/bannerImageRecommendation\(CONTACT_IMAGE_MAX\)/);
});
test('public Contact media coalesces concurrent Home/Contact requests and invalidates after upload',async()=>{
 let gets=0;const api={get:async()=>{gets++;return {data:{data:{bannerImageUrl:'test.jpg'}}}},put:async()=>({data:{data:{}}})};
 const {contactMediaService:s}=compile('services/contact-media.service.ts',{'./api':{__esModule:true,default:api}});
 await Promise.all([s.public(),s.public()]);await s.public();assert.equal(gets,1);await s.upload('banner',new File(['a'],'a.jpg'),()=>{});await s.public();assert.equal(gets,2);
});
test('failed public media reads can retry and never poison the cache',async()=>{let calls=0;const {contactMediaService:s}=compile('services/contact-media.service.ts',{'./api':{__esModule:true,default:{get:async()=>{if(++calls===1)throw Error('offline');return {data:{data:{bannerImageUrl:null}}}}}}});await assert.rejects(s.public());await s.public();assert.equal(calls,2);});
