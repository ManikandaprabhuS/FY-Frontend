import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync} from 'node:fs';
import ts from 'typescript';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
function compile(path,api){const module={exports:{}};new Function('require','module','exports',ts.transpileModule(read(path),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(()=>api,module,module.exports);return module.exports;}

test('only the exact current admin video receives responsive copies; replacements retain their URL',()=>{
 const {heroVideoMedia,HERO_VIDEO_ORIGINAL,HERO_VIDEO_REUPLOAD}=compile('src/features/customer/data/heroVideoMedia.ts');
 assert.match(heroVideoMedia(HERO_VIDEO_ORIGINAL,true).src,/mobile-/);
 assert.match(heroVideoMedia(HERO_VIDEO_ORIGINAL,false).src,/desktop-/);
 assert.equal(heroVideoMedia('https://example.com/new.mp4',true).src,'https://example.com/new.mp4');
 assert.match(heroVideoMedia('https://example.com/new.mp4',true).poster,/poster-/);
 assert.equal(heroVideoMedia(HERO_VIDEO_REUPLOAD,true).src,heroVideoMedia(HERO_VIDEO_ORIGINAL,true).src);
});
test('new MP4s are faststart and within the size targets; poster is under 50 KB',()=>{
 for(const [name,max] of [['mobile-4c170a80ef5f.mp4',2500000],['desktop-acbd8e83f55a.mp4',6000000]]){
  const b=readFileSync(new URL('../public/hero/'+name,import.meta.url));assert(b.length<max);
  const boxes=[];for(let p=0;p+8<=b.length;){const size=b.readUInt32BE(p);boxes.push(b.toString('ascii',p+4,p+8));assert(size>=8);p+=size;}
  assert(boxes.indexOf('moov')>=0&&boxes.indexOf('moov')<boxes.indexOf('mdat'));
  const avc=b.indexOf('avcC');assert(avc>0);assert.equal(b[avc+5],77,'H264 Main profile');assert(b[avc+7]<=41,'level at most 4.1');
 }
 assert(statSync(new URL('../public/hero/poster-7bc3f139be3a.webp',import.meta.url)).size<50000);
 assert.match(read('public/_headers'),/\/hero\/\*\s+Cache-Control: public, max-age=31536000, immutable/);
});

test('hero has an MP4 source, default poster, no visible loading controls and opt-in diagnostics',()=>{
 const hero=read('src/features/customer/components/HeroSection.tsx'),css=read('src/features/customer/styles/hero.css');
 assert.match(hero,/<source /);assert.match(hero,/playing \? 'auto' : 'none'/);assert.match(hero,/get\('debugVideo'\) === '1'/);
 assert.doesNotMatch(hero,/FrameSpinner|ProgressRing|fy-hero__dots|fy-hero__video-loading/);
 assert.doesNotMatch(css,/fy-hero__dots|fy-hero__video-loading|background: #111111;\s*}\s*\.fy-hero__video/);
});
test('public settings requests coalesce and upload/remove invalidate only that cache',async()=>{
 let reads=0;const api={get:async()=>{reads++;return {data:{data:{video:{url:'old.mp4',updatedAt:null}}}}},put:async()=>({data:{data:{video:{url:'new.mp4'}}}}),delete:async()=>{}};
 const {siteMediaService}=compile('src/services/site-media.service.ts',api);
 await Promise.all([siteMediaService.getHeroVideo(),siteMediaService.getHeroVideo()]);assert.equal(reads,1);
 await siteMediaService.getHeroVideo();assert.equal(reads,1);
 await siteMediaService.uploadHeroVideo(new File(['x'],'test.mp4'));await siteMediaService.getHeroVideo();assert.equal(reads,2);
 await siteMediaService.removeHeroVideo();await siteMediaService.getHeroVideo();assert.equal(reads,3);
});
test('failed settings requests can retry and are not permanently cached',async()=>{
 let reads=0;const {siteMediaService}=compile('src/services/site-media.service.ts',{get:async()=>{if(++reads===1)throw Error('network');return {data:{data:{video:null}}}}});
 await assert.rejects(siteMediaService.getHeroVideo());assert.equal(await siteMediaService.getHeroVideo(),null);assert.equal(reads,2);
});
test('hero retains its DOM/buffer while the playback controller resets each visible visit',()=>{
 const hero=read('src/features/customer/components/HeroSection.tsx'),layout=read('src/layouts/CustomerLayout.tsx');
 const playback=read('src/features/customer/utils/heroVideoPlayback.ts');
 assert.doesNotMatch(hero,/\bstart\(element\)|\[playing, start\]/,'obsolete playback observer must not coexist with the controller');
 assert.match(playback,/currentTime = 0/);assert.doesNotMatch(hero,/#t=0\.001/);
 for(const attribute of ['muted','playsInline','disablePictureInPicture','disableRemotePlayback'])assert(hero.includes(attribute));
 assert(playback.includes('canplaythrough'));assert(playback.includes('pointerdown'));assert.doesNotMatch(hero,/^\s+loop\s*$/m);
 assert.match(layout,/visitedHome && <div hidden=\{!home\}><HeroSection active=\{home\}/);
 assert.match(hero,/playing=\{active && current === 1 && videoInView && pageVisible && !reducedMotion\}/);
 assert.doesNotMatch(read('src/features/customer/pages/CustomerHomePage.tsx'),/<HeroSection/);
});

test('slow connections use the existing smaller video without changing normal desktop quality',()=>{
 const {heroNeedsSmallVideo}=compile('src/features/customer/data/heroVideoMedia.ts');
 assert.equal(heroNeedsSmallVideo({downlink:10,effectiveType:'4g'}),false);
 for(const connection of [{saveData:true},{effectiveType:'3g'},{downlink:1.6,effectiveType:'4g'}])assert.equal(heroNeedsSmallVideo(connection),true);
});
