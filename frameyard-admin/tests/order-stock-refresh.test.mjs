import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url);
function setup(){
 const window=new EventTarget(),document=new EventTarget();let quantity=20;const queries=[];let details=0;
 window.location={pathname:'/admin/overview'};window.setInterval=()=>1;window.clearInterval=()=>{};document.hidden=false;
 const product=()=>({id:'p',name:'Frame',images:[{imageUrl:'unchanged'}],variants:[{id:'v',price:1000,stockQuantity:quantity}]});
 const service={getProducts:async params=>(queries.push(params),{products:[product()],pagination:{page:2,limit:25,total:30,totalPages:2}}),getProductById:async()=>{details++;return product();}};
 const source=readFileSync(new URL('../src/store/productStore.ts',import.meta.url),'utf8').replaceAll('import.meta.hot','undefined');
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,mod={exports:{}};
 new Function('require','module','exports','window','document',output)(id=>id.includes('product.service')?{productService:service}:id.includes('/toast')?{}:id==='axios'?{default:{isAxiosError:()=>false}}:require(id),mod,mod.exports,window,document);
 return {...mod.exports,window,document,queries,quantity:value=>quantity=value,details:()=>details};
}
test('order inventory refresh preserves list query/page and does not show loading placeholders',async()=>{
 const s=setup(),params={page:2,limit:25,search:'frame',isActive:true};await s.useProductStore.getState().fetchProducts(params);s.quantity(3);
 await s.refreshLoadedProductStock();assert.equal(s.useProductStore.getState().products[0].variants[0].stockQuantity,3);assert.deepEqual(s.queries.at(-1),params);assert.equal(s.useProductStore.getState().pagination.page,2);assert.equal(s.useProductStore.getState().loading,false);
});
test('hidden tabs and Add/Edit forms are not refreshed',async()=>{
 const s=setup();await s.useProductStore.getState().fetchProducts({});const before=s.queries.length;s.document.hidden=true;await s.refreshLoadedProductStock();s.document.hidden=false;s.window.location.pathname='/admin/products/p';await s.refreshLoadedProductStock();assert.equal(s.queries.length,before);assert.equal(s.details(),0);
});
test('customer product refresh changes only variant stock, preserving product/preview inputs',async()=>{
 const s=setup();s.window.location.pathname='/product/p';await s.useProductStore.getState().fetchProductById('p',true);const before=s.useProductStore.getState().currentProduct;s.quantity(0);await s.refreshLoadedProductStock();const after=s.useProductStore.getState().currentProduct;assert.equal(after.variants[0].stockQuantity,0);assert.equal(after.images,before.images);assert.equal(after.name,before.name);assert.equal(after.variants[0].price,1000);
});
