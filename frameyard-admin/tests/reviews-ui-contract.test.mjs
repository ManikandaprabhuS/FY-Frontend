import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const source=readFileSync(new URL('../src/pages/reviews/ReviewsPage.tsx',import.meta.url),'utf8').replace(/\r/g,'');
const hash=s=>createHash('sha256').update(s).digest('hex');
test('Reviews data hooks, filters, moderation, export and pagination state are unchanged',()=>{
 assert.equal(hash(source.slice(source.indexOf('export default function'),source.indexOf('  const actions='))),'51a37abacc7d39ec496b3669f58e20e4d37174f78a894c79abb6c5b389168c25');
});
test('all 23 existing Reviews event handlers retain their exact behavior',()=>{
 const ast=ts.createSourceFile('reviews.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),events=[];
 function walk(n){if(ts.isJsxAttribute(n)&&/^on[A-Z]/.test(n.name.getText(ast)))events.push(n.name.getText(ast)+'='+n.initializer.getText(ast).replace(/\s+/g,' '));ts.forEachChild(n,walk)}walk(ast);
 assert.equal(events.length,23);assert.equal(hash(events.sort().join('\n')),'7fbbfebbe44c70359f70378400682ef5279d72bf2d9b33db89243b8da8fbf766');
});
test('existing review details, rejection and deletion dialogs are unchanged',()=>{
 assert.equal(hash(source.slice(source.indexOf('    <Modal isOpen={Boolean(selected)}')).trimEnd()),'5e7d59806b45dded4d095a0ec3fa1b1c930d89e6cf6a3d93a1ed97827ae28492');
});
test('Reviews presentation uses only real summaries and existing shared components',()=>{
 for(const value of ['data.summary.total','data.summary.pending','data.summary.approved','data.summary.rejected','data.summary.average','<StatusBadge','<ReviewStars','<PaginationControls'])assert(source.includes(value));
 assert.doesNotMatch(source,/type="checkbox"|sparkline|Math.random|fetch\(/);
 const css=readFileSync(new URL('../src/pages/reviews/reviews.css',import.meta.url),'utf8');assert.doesNotMatch(css,/\.admin-| main|sidebar|breadcrumb/);assert.match(css,/repeat\(5/);assert.match(css,/repeat\(3/);assert.match(css,/repeat\(2/);
});
