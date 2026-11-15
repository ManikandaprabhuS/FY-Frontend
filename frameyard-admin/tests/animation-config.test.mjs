import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL("../src/features/customer/animationConfig.ts",import.meta.url),"utf8");
const module={exports:{}};
new Function("module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(module,module.exports);
const {clampScrollPosition,MOTION_TIMING,prefersReducedMotion}=module.exports;
test("rubber-band positions clamp without exceeding either document edge",()=>{
 assert.equal(clampScrollPosition(-80,1000),0);assert.equal(clampScrollPosition(1200,1000),1000);
 assert.equal(clampScrollPosition(400,1000),400);assert.equal(clampScrollPosition(NaN,1000),0);
});
test("native iOS duration is centralized without changing existing desktop timing",()=>{
 assert.equal(MOTION_TIMING.dockIOS,400);assert.equal(MOTION_TIMING.dockSlideIOS,400);
 assert.equal(MOTION_TIMING.dockDefault,680);assert.equal(MOTION_TIMING.cartWalk,950);
});
test("motion preference is based on the media query, not device or low power heuristics",()=>{
 globalThis.window={matchMedia:()=>({matches:false})};assert.equal(prefersReducedMotion(),false);
 window.matchMedia=()=>({matches:true});assert.equal(prefersReducedMotion(),true);delete globalThis.window;
});
