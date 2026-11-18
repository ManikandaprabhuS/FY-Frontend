import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=file=>readFileSync(new URL(file,import.meta.url),'utf8');
const after=read('../src/pages/products/ProductReadOnlyModal.tsx'),before=read('./fixtures/product-readonly-before.tsx');
const printer=ts.createPrinter({removeComments:true});
function fetchEffect(source){const file=ts.createSourceFile('view.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let found;function visit(node){if(ts.isCallExpression(node)&&node.expression.getText(file)==='useEffect'&&node.getText(file).includes('getProductById'))found=printer.printNode(ts.EmitHint.Expression,node,file);ts.forEachChild(node,visit);}visit(file);return found;}
test('read-only details retains the exact existing product fetch, cancellation guard and retry dependencies',()=>{assert.equal(fetchEffect(after),fetchEffect(before));assert.equal((after.match(/productService\.getProductById/g)||[]).length,1);assert.doesNotMatch(after,/productService\.(?:getProducts|create|update|delete)|useFrameColors\(/);});
test('existing shared modal, close/focus handling and Edit route are retained',()=>{assert.match(after,/<Modal isOpen onClose=\{onClose\}/);assert.match(after,/to=\{'\/admin\/products\/' \+ initial.id\}/);assert.match(after,/event.key === 'Escape'/);assert.match(after,/previous\?\.focus\(\)/);assert.match(after,/setError\(false\); setAttempt\(n => n \+ 1\)/);});
test('photo default is the shared constant and display values retain stock/option/price helpers',()=>{assert.match(after,/DEFAULT_PHOTO_MAX_MB/);assert.match(after,/getStockStatus\(variant.stockQuantity\)/);assert.match(after,/money\(variant.price\)/);assert.match(after,/option\(variant.mountType\)/);assert.match(after,/option\(variant.glassType\)/);assert.doesNotMatch(after,/dangerouslySetInnerHTML/);});
test('all cards and empty states are present without adding a lightbox or writes',()=>{for(const text of ['Basic Information','Material &amp; Colours','Variants (','Images (','No colours','No variants','No images'])assert(after.includes(text));assert.doesNotMatch(after,/lightbox|\.post\(|\.patch\(|\.delete\(/i);});
