import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import ts from 'typescript';
import { reviewValidation } from '../src/utils/review-validation.ts';
import * as status from '../src/components/ui/order-status.ts';
const require=createRequire(import.meta.url);
async function compile(path,overrides={}){
 const source=await readFile(new URL('../src/'+path,import.meta.url),'utf8'),mod={exports:{}};
 const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 new Function('require','module','exports',output)(name=>overrides[name]??require(name),mod,mod.exports);return mod.exports;
}
const valid={name:'Reviewer',email:'reviewer@example.com',rating:5,title:'A lovely frame',comment:'Beautifully made and carefully packed.',website:''};
test('review form validates all required fields and basic formats',()=>{
 assert.deepEqual(reviewValidation(valid),{});
 for(const patch of [{name:' '},{name:'A'},{email:'bad'},{rating:0},{rating:6},{comment:'x'},{comment:'<script>bad</script>'},{title:'x'.repeat(101)},{comment:'x'.repeat(1001)}])assert.ok(Object.keys(reviewValidation({...valid,...patch})).length);
 assert.deepEqual(reviewValidation({...valid,comment:'x'.repeat(1000)}),{});
});
const stars=await compile('components/reviews/ReviewStars.tsx');
test('displayed half-star rating has an accurate screen reader label',()=>{
 const html=renderToStaticMarkup(createElement(stars.default,{rating:4.5}));assert.match(html,/4.5 out of 5 stars/);assert.match(html,/lucide-star-half/);
});
test('review form is guest-accessible, keyboard-native and disabled until valid',async()=>{
 const form=await compile('components/reviews/ReviewForm.tsx',{
 '../../store/authStore':{useAuthStore:selector=>selector({user:null})},
 '../../services/review.service':{reviewService:{}},'../../utils/review-validation':{reviewValidation},'../../services/api':{getApiErrorMessage:()=>''},
 '../../utils/toast':{showApiError(){},showLoading(){},showSuccess(){},showWarning(){}},
 });
 const html=renderToStaticMarkup(createElement(form.default,{productId:'product',onSubmitted(){},onCancel(){}}));
 assert.equal((html.match(/type="radio"/g)||[]).length,5);assert.match(html,/Everyone is welcome/);assert.match(html,/type="submit" disabled/);assert.match(html,/0\/1000/);assert.match(html,/name="website"/);
 assert.doesNotMatch(html,/Please login|required purchase/i);
});
test('logged-in customer name/email are prefilled but remain editable',async()=>{
 const form=await compile('components/reviews/ReviewForm.tsx',{
 '../../store/authStore':{useAuthStore:selector=>selector({user:{role:'CUSTOMER',name:'Customer Name',email:'customer@example.com'}})},
 '../../services/review.service':{reviewService:{}},'../../utils/review-validation':{reviewValidation},'../../services/api':{getApiErrorMessage:()=>''},
 '../../utils/toast':{showApiError(){},showLoading(){},showSuccess(){},showWarning(){}},
 });
 const html=renderToStaticMarkup(createElement(form.default,{productId:'product',onSubmitted(){},onCancel(){}}));
 assert.match(html,/value="Customer Name"/);assert.match(html,/value="customer@example.com"/);assert.doesNotMatch(html,/readOnly/);
});
test('public review display escapes text and never renders an email/internal field',async()=>{
 const react=require('react');let index=0;const values=[
 [{id:'review',name:'<script>bad</script>',email:'private@example.com',rating:4,title:'<b>Title</b>',comment:'Safe text <img src=x onerror=bad()>',verifiedPurchase:true,createdAt:'2026-11-09T10:00:00Z'}],
 {average:4,count:1,breakdown:{4:1}},1,1,'newest',false,false,'',0,
 ];
 const section=await compile('components/reviews/ProductReviews.tsx',{
 react:{...react,useEffect(){},useState:initial=>[index<values.length?values[index++]:initial,()=>{}]},
 '../ui/Modal':{__esModule:true,default:()=>null},'./ReviewForm':{__esModule:true,default:()=>null},'./ReviewStars':stars,
 '../../services/review.service':{reviewService:{}},'../../store/reviewRatingStore':{useReviewRatingStore:{setState(){}}},
 });
 const html=renderToStaticMarkup(createElement(section.default,{productId:'product'}));
 assert.doesNotMatch(html,/<script>|<img src=x|private@example.com|requestIpHash/);assert.match(html,/&lt;script&gt;/);assert.match(html,/Verified purchase/);assert.match(html,/Write a review/);
});
test('zero approved ratings render nothing on product cards',async()=>{
 const view=await compile('components/reviews/ProductRating.tsx',{'../../store/reviewRatingStore':{useReviewRatingStore:selector=>selector({summaries:{product:{average:0,count:0}},revision:0}),requestReviewRating(){}},'./ReviewStars':stars});
 assert.equal(renderToStaticMarkup(createElement(view.default,{productId:'product'})),'');
});
test('review status colors share the status badge map without changing order statuses',()=>{
 assert.equal(status.getOrderStatusStyle('PENDING').color,'#92400e');assert.equal(status.getOrderStatusStyle('APPROVED').color,'#15803d');assert.equal(status.getOrderStatusStyle('REJECTED').color,'#b91c1c');assert.equal(status.getOrderStatusStyle('PLACED').backgroundColor,'#111827');
});
test('integration points cover cards, wishlist, both order histories and staff route',async()=>{
 const read=path=>readFile(new URL('../src/'+path,import.meta.url),'utf8');
 for(const path of ['features/customer/components/ProductCatalogCard.tsx','features/customer/components/CustomerWishlistDrawer.tsx','features/customer/components/CustomerAccountDashboard.tsx'])assert.match(await read(path),/ProductRating/);
 for(const path of ['features/customer/components/CustomerOrderSummaries.tsx','features/customer/pages/CustomerOrdersPage.tsx'])assert.match(await read(path),/writeReview=1#reviews/);
 assert.match(await read('routes/index.tsx'),/path: 'reviews'/);assert.match(await read('layouts/AdminLayout.tsx'),/Reviews & Ratings/);
 assert.doesNotMatch(await read('components/reviews/ProductReviews.tsx'),/dangerouslySetInnerHTML/);
});
const revenue=await compile('utils/revenue-report-pdf.ts',{'../components/ui/order-status':status});
const pdf=await compile('utils/reviews-pdf.ts',{'../components/ui/order-status':status,'./revenue-report-pdf':revenue});
for(const count of [0,3,501])test('review PDF handles '+count+' filtered records and repeated-page tables',async()=>{
 const reviews=Array.from({length:count},(_,i)=>({id:String(i),name:'Demo Reviewer '+i,email:'demo-'+i+'@example.invalid',productId:'product',product:{id:'product',productName:'A carefully made premium frame with a long product name'},rating:1+i%5,title:'Review title',comment:i%10===0?'A long review about the quality and finish of this frame. '.repeat(17).slice(0,1000):'A carefully made frame and a lovely finish.',verifiedPurchase:i%2===0,createdAt:'2026-11-09T10:00:00Z',status:['PENDING','APPROVED','REJECTED'][i%3],reviewedAt:null,reviewedBy:null,rejectionReason:null}));
 const doc=pdf.createReviewsPdf({reviews,generatedAt:'2026-11-09T10:00:00Z',filters:{status:'All',rating:'All',dateFilter:'30',search:'Demo'}});
 if(count===501)assert.ok(doc.getNumberOfPages()>1);
 await mkdir(new URL('../tmp/pdfs/',import.meta.url),{recursive:true});await writeFile(new URL('../tmp/pdfs/reviews-'+count+'.pdf',import.meta.url),Buffer.from(doc.output('arraybuffer')));
});
