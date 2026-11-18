import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const source=readFileSync(new URL('../src/layouts/AdminLayout.tsx',import.meta.url),'utf8');
const file=ts.createSourceFile('AdminLayout.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let attributes;
function visit(node){if(ts.isJsxOpeningElement(node)&&node.attributes.properties.some(p=>p.name?.getText(file)==='aria-label'&&p.initializer?.getText(file).includes('View notification: ')))attributes=node.attributes.properties;ts.forEachChild(node,visit);}visit(file);
function setup(){assert(attributes);const calls=[];const handler=name=>{const expression=attributes.find(p=>p.name?.getText(file)===name).initializer.expression;const js=ts.transpileModule('const handler='+expression.getText(file),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;return new Function('navigate','setNotifDropdownOpen','toggleNotificationRead',js+';return handler;')(path=>calls.push(['navigate',path]),open=>calls.push(['open',open]),()=>calls.push(['read']));};return {calls,click:handler('onClick'),key:handler('onKeyDown')};}
test('bell notification body navigates/closes without invoking mark-as-read',()=>{const s=setup();s.click();assert.deepEqual(s.calls,[['open',false],['navigate','/admin/notifications']]);});
test('Enter and Space on the row navigate without marking read',()=>{for(const key of ['Enter',' ']){const s=setup(),row={};let prevented=false;s.key({target:row,currentTarget:row,key,preventDefault:()=>prevented=true});assert(prevented);assert.deepEqual(s.calls,[['open',false],['navigate','/admin/notifications']]);}});
test('keyboard activation of the nested order link does not run the row action',()=>{const s=setup();s.key({target:{},currentTarget:{},key:'Enter',preventDefault:()=>assert.fail('nested link prevented')});assert.deepEqual(s.calls,[]);});
test('order links still receive the original optimistic read callback and popup close callback',()=>{const lines=source.split('\n').filter(line=>line.includes('<NotificationOrderText'));assert.equal(lines.length,2);for(const line of lines){assert.match(line,/onRead=\{\(\) => toggleNotificationRead\(notif.id\)\}/);assert.match(line,/onNavigate=\{\(\) => setNotifDropdownOpen\(false\)\}/);}});
