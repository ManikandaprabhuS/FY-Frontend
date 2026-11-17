import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
const printer=ts.createPrinter({removeComments:true});
function calls(source){
 const file=ts.createSourceFile('page.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),result=[];
 const keep=/^(useState|useEffect|useMemo|useCustomers|fetchCustomers|setCurrentPage|setSearchTerm|setDebouncedSearch|setExpandedId|setExpandedOrder|setOrderPage|setCustomer|setLoading|navigate|downloadAdminCsv|customerService\.getCustomerById)$/;
 function visit(node){if(ts.isCallExpression(node)&&keep.test(node.expression.getText(file)))result.push(printer.printNode(ts.EmitHint.Expression,node,file));ts.forEachChild(node,visit);}
 visit(file);return result;
}
test('customer list retains hooks, requests, export and pagination/expansion handlers',()=>{
 assert.deepEqual(calls(read('../src/pages/customers/CustomersPage.tsx')),calls(read('./fixtures/customers-before.tsx')));
});
test('customer details retains hooks, requests, calculations and navigation/expansion handlers',()=>{
 assert.deepEqual(calls(read('../src/pages/customers/CustomerDetailsPage.tsx')),calls(read('./fixtures/customer-details-before.tsx')));
});
