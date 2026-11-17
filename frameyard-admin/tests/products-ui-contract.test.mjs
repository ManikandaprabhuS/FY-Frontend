import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8').replace(/\r/g,'');
test('Products hooks, calculations, API parameters and mutation/export handlers are unchanged',()=>{
 const before=read('./fixtures/products-list-before.tsx').replaceAll('../../src/','../../'),after=read('../src/pages/products/ProductsPage.tsx');
 const logic=s=>s.slice(s.indexOf('  const navigate ='),s.indexOf('  const headers =')).trim();
 assert.equal(logic(after),logic(before));
 assert(after.includes('onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}'));
 assert(after.includes('onConfirm={handleConfirmDelete}'));
});
