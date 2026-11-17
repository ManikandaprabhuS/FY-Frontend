import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const printer=ts.createPrinter({removeComments:true});
function definitions(source){const file=ts.createSourceFile('form.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),result={};const names=new Set(['MAX_IMAGES','handleImageSelection','handleRemoveImage','getColorImage','handleSave','openAddVariant','openEditVariant','handleSaveVariant','handleDeleteVariant','basicIssue','materialIssue','variantIssue','imageIssue','stepIssue','productIssue','variantFormIssue','wizardSteps','colorImageFields','variantImageFields','startAnotherProduct','goNext']);function visit(n){if(ts.isVariableDeclaration(n)&&names.has(n.name.getText(file)))result[n.name.getText(file)]=printer.printNode(ts.EmitHint.Unspecified,n.initializer,file);if(ts.isCallExpression(n)&&['useEffect','useState','useRef'].includes(n.expression.getText(file))){const key=n.expression.getText(file);(result[key]??=[]).push(printer.printNode(ts.EmitHint.Expression,n,file));}ts.forEachChild(n,visit);}visit(file);return result;}
test('product form state, validation, uploads, step logic and payload handlers are unchanged',()=>{assert.deepEqual(definitions(read('../src/pages/products/ProductDetailsPage.tsx')),definitions(read('./fixtures/product-form-before.tsx')));});
