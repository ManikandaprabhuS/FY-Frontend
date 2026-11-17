import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r/g,'');
test('wishlist state, request effect and cleanup remain byte-identical',()=>{
 const before=read('./fixtures/wishlists-before.tsx'),after=read('../src/pages/wishlist/WishlistAnalyticsPage.tsx');
 const logic=s=>s.slice(s.indexOf('  const [products'),s.indexOf('\n  return (')).trim();
 assert.equal(logic(after),logic(before));
 assert(after.includes('onPageChange={next => { setLoading(true); setPage(next); }}'));
 assert(!after.includes('.sort('));
});
