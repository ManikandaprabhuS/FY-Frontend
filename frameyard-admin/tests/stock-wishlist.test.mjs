import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import * as stock from '../src/utils/stock.ts';
const require=createRequire(import.meta.url);
for(const [value,label] of [[0,'Out of stock'],[1,'Low stock (1)'],[3,'Low stock (3)'],[5,'Low stock (5)'],[6,'In stock'],[50,'In stock']]) test('stock '+value+' => '+label,()=>assert.equal(stock.getStockStatus(value).label,label));
test('stock handles malformed values and sums valid variant totals',()=>{
  for(const value of [null,undefined,-1,'bad',NaN,Infinity,{},true,''])assert.equal(stock.getStockStatus(value).key,'out');
  assert.equal(stock.totalVariantStock([{stockQuantity:3},{stockQuantity:'3'},{stockQuantity:-50},{stockQuantity:'bad'}]),6);
  assert.equal(stock.LOW_STOCK_THRESHOLD,5);
});
test('cart move toast is emitted before awaiting the API and failure replaces the same toast',()=>{
 const cart=readFileSync(new URL('../src/features/customer/pages/CartPage.tsx',import.meta.url),'utf8');
 const handler=cart.slice(cart.indexOf('const moveToWishlist ='),cart.indexOf('if (items.length === 0)'));
 assert.ok(handler.indexOf("showSuccess('Moved to wishlist'") < handler.indexOf('await request'));
 assert.ok(handler.indexOf('setRemovalChoiceKey(null)') < handler.indexOf('await request'));
 assert.match(handler,/Could not move to wishlist\. Please try again\.', \{ id: toastId \}/);
 assert.match(handler,/moveInFlight\.current\.has\(item.key\)/);
});
const preview={id:'product',productIdentifier:'FRAME',productName:'Frame',variants:[{id:'variant',frameSize:'5x5',price:450,stockQuantity:5,isActive:true}]};
const row={id:'saved',productIdentifier:'FRAME',product:preview};
const cartItem={productId:'product',productIdentifier:'FRAME',variantId:'variant',name:'Frame',material:'Wood',frameSize:'5x5',mountType:'NONE',glassType:'NONE',unitPrice:450,quantity:1,stockQuantity:5,color:'#000000'};
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};}
function setup(){
 const storage=new Map();globalThis.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
 const warnings=[];const calls={add:0,remove:0,move:0,lookup:0,list:0};
 let add=async()=>({wishlistItem:row,wishlistCount:1,alreadySaved:false}), remove=async()=>{},move=async()=>({wishlistItem:row,wishlistCount:1,alreadySaved:false}),list=async()=>({wishlist:[],pagination:{page:1,total:0,totalPages:0}}),lookup=async()=>[];
 const service={add:(...args)=>{calls.add++;return add(...args);},remove:(...args)=>{calls.remove++;return remove(...args);},moveFromCart:(...args)=>{calls.move++;return move(...args);},listPage:(...args)=>{calls.list++;return list(...args);},lookup:(...args)=>{calls.lookup++;return lookup(...args);}};
 const source=readFileSync(new URL('../src/store/customerCommerceStore.ts',import.meta.url),'utf8');
 const mod={exports:{}};const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',output)(name=>name==='../services/local-photos'?{removeCartPhotos:async()=>{}}:name.includes('customer-wishlist.service')?{customerWishlistService:service}:name==='../utils/stock'?stock:name==='../utils/toast'?{showWarning:(...args)=>warnings.push(args)}:require(name),mod,mod.exports);
 const store=mod.exports.useCustomerCommerceStore;store.getState().setCartOwner('customer');
 return{store,calls,warnings,add:fn=>{add=fn;},remove:fn=>{remove=fn;},move:fn=>{move=fn;},list:fn=>{list=fn;},lookup:fn=>{lookup=fn;}};
}
test('heart, count and drawer update before the network completes; repeated click is ignored',async()=>{
 const x=setup(),p=deferred();x.add(()=>p.promise);
 const action=x.store.getState().toggleWishlist('FRAME',preview);
 assert.ok(x.store.getState().wishlistByProductIdentifier.FRAME);assert.equal(x.store.getState().wishlistTotal,1);assert.equal(x.store.getState().wishlistItems[0].product.productName,'Frame');
 assert.equal(await x.store.getState().toggleWishlist('FRAME',preview),null);assert.equal(x.calls.add,1);assert.equal(x.calls.lookup,0);
 p.resolve({wishlistItem:row,wishlistCount:1,alreadySaved:false});assert.equal(await action,true);assert.equal(x.store.getState().wishlistByProductIdentifier.FRAME,'saved');assert.equal(x.calls.list,0);
});
test('failed add rolls the heart/count/drawer back',async()=>{
 const x=setup();x.add(async()=>{throw Error('offline');});
 await assert.rejects(x.store.getState().toggleWishlist('FRAME',preview));assert.equal(x.store.getState().wishlistTotal,0);assert.equal(x.store.getState().wishlistItems.length,0);assert.equal(x.store.getState().wishlistByProductIdentifier.FRAME,undefined);
});
test('an existing server duplicate reconciles without incrementing the count',async()=>{
 const x=setup();x.add(async()=>({wishlistItem:row,wishlistCount:1,alreadySaved:true}));
 assert.equal(await x.store.getState().toggleWishlist('FRAME',preview),'exists');assert.equal(x.store.getState().wishlistTotal,1);assert.equal(x.store.getState().wishlistItems.length,1);
});
test('filled hearts retain optimistic removal and restore on failure',async()=>{
 const x=setup();await x.store.getState().toggleWishlist('FRAME',preview);const p=deferred();x.remove(()=>p.promise);
 const action=x.store.getState().toggleWishlist('FRAME');assert.equal(x.store.getState().wishlistTotal,0);assert.equal(x.store.getState().wishlistItems.length,0);
 p.reject(Error('failed'));await assert.rejects(action);assert.equal(x.store.getState().wishlistTotal,1);assert.equal(x.store.getState().wishlistItems[0].id,'saved');
});
for(const duplicate of [false,true])test('cart move is immediate, one request and returns duplicate='+duplicate,async()=>{
 const x=setup();x.store.getState().addCartItem(cartItem);const key=x.store.getState().cartItems[0].key,p=deferred();x.move(()=>p.promise);
 const action=x.store.getState().moveCartItemToWishlist(key,'FRAME');
 assert.equal(x.store.getState().cartItems.length,0);assert.equal(x.store.getState().wishlistTotal,1);assert.equal(x.store.getState().wishlistItems[0].product.productName,'Frame');
 p.resolve({wishlistItem:row,wishlistCount:1,alreadySaved:duplicate});assert.equal(await action,duplicate?'exists':'moved');assert.equal(x.calls.move,1);assert.equal(x.calls.lookup,0);
});
test('failed cart move restores the item, price and totals without losing a different added item',async()=>{
 const x=setup();x.store.getState().addCartItem(cartItem);const key=x.store.getState().cartItems[0].key,p=deferred();x.move(()=>p.promise);
 const action=x.store.getState().moveCartItemToWishlist(key,'FRAME');x.store.getState().addCartItem({...cartItem,productId:'other',variantId:'other',productIdentifier:'OTHER'});
 p.reject(Error('failed'));await assert.rejects(action);assert.equal(x.store.getState().cartItems.length,2);assert.equal(x.store.getState().cartItems.reduce((sum,i)=>sum+i.unitPrice*i.quantity,0),900);assert.equal(x.store.getState().wishlistTotal,0);
});
test('failed move after logout restores the original customer cart, not another customer cart',async()=>{
 const x=setup();x.store.getState().addCartItem(cartItem);const key=x.store.getState().cartItems[0].key,p=deferred();x.move(()=>p.promise);
 const action=x.store.getState().moveCartItemToWishlist(key,'FRAME');await new Promise(setImmediate);x.store.getState().setCartOwner('other-customer');
 p.reject(Error('failed'));await assert.rejects(action);assert.equal(x.store.getState().cartItems.length,0);assert.equal(x.store.getState().wishlistTotal,0);
 x.store.getState().setCartOwner('customer');assert.equal(x.store.getState().cartItems.length,1);
});
test('guest store cannot add or move wishlist records',async()=>{
 const x=setup();x.store.getState().setCartOwner(null);x.store.getState().addCartItem(cartItem);const key=x.store.getState().cartItems[0].key;
 assert.equal(await x.store.getState().toggleWishlist('FRAME',preview),null);assert.equal(await x.store.getState().moveCartItemToWishlist(key,'FRAME'),null);assert.equal(x.store.getState().cartItems.length,1);assert.equal(x.calls.add+x.calls.move,0);
});
test('late initial wishlist response preserves an optimistic add and correct count',async()=>{
 const x=setup(),read=deferred(),write=deferred();x.list(()=>read.promise);x.add(()=>write.promise);
 const loading=x.store.getState().loadWishlist('customer');await new Promise(setImmediate);
 const action=x.store.getState().toggleWishlist('FRAME',preview);
 read.resolve({wishlist:[],pagination:{page:1,total:0,totalPages:0}});await loading;
 assert.equal(x.store.getState().wishlistItems.length,1);assert.equal(x.store.getState().wishlistTotal,1);
 write.resolve({wishlistItem:row,wishlistCount:1,alreadySaved:false});await action;
});
test('late lookup cannot erase a heart clicked while lookup is pending',async()=>{
 const x=setup(),read=deferred(),write=deferred();x.lookup(()=>read.promise);x.add(()=>write.promise);
 const loading=x.store.getState().hydrateWishlist('customer',['FRAME']);await new Promise(setImmediate);
 const action=x.store.getState().toggleWishlist('FRAME',preview);read.resolve([]);await loading;assert.ok(x.store.getState().wishlistByProductIdentifier.FRAME);
 write.resolve({wishlistItem:row,wishlistCount:1,alreadySaved:false});await action;
});
test('cart blocks excess stock across color lines and checkout catches malformed/insufficient stock',()=>{
 const x=setup();assert.equal(x.store.getState().addCartItem({...cartItem,quantity:5}),true);
 const key=x.store.getState().cartItems[0].key;x.store.getState().updateCartQuantity(key,6);assert.equal(x.store.getState().cartItems[0].quantity,5);
 assert.equal(x.store.getState().addCartItem({...cartItem,color:'#ffffff'}),false);assert.ok(x.warnings.length);
 assert.equal(stock.cartStockIssue([{...cartItem,quantity:6}]),'Requested quantity exceeds available stock (5)');assert.equal(stock.cartStockIssue([cartItem]),null);
});
test('UI routes use the shared status helper and correct duplicate/guest messages',()=>{
 const get=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
 const card=get('features/customer/components/ProductCatalogCard.tsx'),detail=get('features/customer/pages/CustomerProductDetailsPage.tsx'),cart=get('features/customer/pages/CartPage.tsx');
 assert.match(card,/getStockStatus\(totalStock\)/);assert.match(detail,/getStockStatus\(selectedVariant\?\.stockQuantity\)/);
 assert.match(cart,/Already in your wishlist\. Removed from cart\./);assert.match(cart,/Please login \/ create an account to add products to wishlist/);
 assert.doesNotMatch(get('pages/products/ProductsPage.tsx'),/stockQuantity.*<= 15/);
});

test('failed cart move restores the original quantity even if the same selection was re-added',async()=>{
 const x=setup();x.store.getState().addCartItem({...cartItem,quantity:2});const key=x.store.getState().cartItems[0].key,p=deferred();x.move(()=>p.promise);
 const action=x.store.getState().moveCartItemToWishlist(key,'FRAME');await new Promise(setImmediate);x.store.getState().addCartItem(cartItem);
 p.reject(Error('failed'));await assert.rejects(action);assert.equal(x.store.getState().cartItems[0].quantity,3);
});
test('different optimistic hearts are immediate while network writes stay ordered per customer',async()=>{
 const x=setup(),first=deferred();let calls=0;
 x.add(async identifier=>{calls++;if(calls===1)return first.promise;return{wishlistItem:{...row,id:'second',productIdentifier:identifier},wishlistCount:2,alreadySaved:false};});
 const a=x.store.getState().toggleWishlist('FRAME',preview),b=x.store.getState().toggleWishlist('OTHER',{...preview,productIdentifier:'OTHER'});
 assert.equal(x.store.getState().wishlistTotal,2);assert.equal(x.store.getState().wishlistItems.length,2);
 await new Promise(setImmediate);assert.equal(calls,1);
 first.resolve({wishlistItem:row,wishlistCount:1,alreadySaved:false});await Promise.all([a,b]);assert.equal(calls,2);assert.equal(x.store.getState().wishlistTotal,2);
});
