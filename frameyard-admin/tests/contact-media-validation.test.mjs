import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import ts from "typescript";
const source=await readFile(new URL("../src/services/contact-media.service.ts",import.meta.url),"utf8");
const module={exports:{}};
new Function("require","module","exports",ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(()=>({default:{}}),module,module.exports);
const {contactFileWarning,contactDetailsWarning,CONTACT_VIDEO_MAX,CONTACT_IMAGE_MAX}=module.exports;
test("video and image boundary sizes are accepted exactly, not plus one",()=>{
 for(const [kind,type,max] of [["video","video/mp4",CONTACT_VIDEO_MAX],["video","video/webm",CONTACT_VIDEO_MAX],["banner","image/jpeg",CONTACT_IMAGE_MAX],["poster","image/png",CONTACT_IMAGE_MAX],["banner","image/webp",CONTACT_IMAGE_MAX]]){
  assert.equal(contactFileWarning(kind,{type,size:max}),null);
  assert.match(contactFileWarning(kind,{type,size:max+1}),/smaller/);
  assert.match(contactFileWarning(kind,{type,size:0}),/non-empty/);
 }
});
test("unsupported formats produce actionable validation warnings",()=>{
 for(const type of ["image/svg+xml","image/gif","application/pdf","application/octet-stream"])assert.match(contactFileWarning("banner",{type,size:100}),/JPG, PNG or WebP/);
 assert.match(contactFileWarning("video",{type:"video/quicktime",size:100}),/MP4 or WebM/);
});
test("contact details allow clearing and reject invalid email, phone and HTML",()=>{
 const empty={phone:"",email:"",studioName:"",address:""};
 assert.equal(contactDetailsWarning(empty),null);
 assert.match(contactDetailsWarning({...empty,email:"bad"}),/email/);
 assert.match(contactDetailsWarning({...empty,phone:"abc"}),/phone/);
 assert.match(contactDetailsWarning({...empty,studioName:"<script>"}),/plain text/);
});
