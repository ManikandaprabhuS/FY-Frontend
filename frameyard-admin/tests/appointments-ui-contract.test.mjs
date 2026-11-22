import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';
const source=readFileSync(new URL('../src/pages/appointments/AppointmentsPage.tsx',import.meta.url),'utf8').replace(/\r/g,'');
const hash=s=>createHash('sha256').update(s).digest('hex');
test('Appointments queries, state, search debounce, filtering and pagination logic are unchanged',()=>{
 assert.equal(hash(source.slice(source.indexOf('const AppointmentsPage'),source.indexOf('  return ('))),'4d83db059614f73fcd69e8b4e3229f00014fa4507c35f40d5d8d957088ddba31');
});
test('all seven Appointments event handlers retain the original behavior',()=>{
 const ast=ts.createSourceFile('appointments.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),events=[];
 function walk(n){if(ts.isJsxAttribute(n)&&/^on[A-Z]/.test(n.name.getText(ast)))events.push(n.name.getText(ast)+'='+n.initializer.getText(ast).replace(/\s+/g,' '));ts.forEachChild(n,walk)}walk(ast);
 assert.equal(events.length,7);assert.equal(hash(events.sort().join('\n')),'56b5b67ae76337b80703e658d95565264d12df5d76ba632561f97e3009f449df');
});
test('Appointments uses existing fields, shared badges and routes without fabricated counts or actions',()=>{
 for(const value of ['appointment.firstName','appointment.email','appointment.phoneNumber','appointment.bookingDate','appointment.createdAt','appointmentLocationLabels[appointment.location]','/admin/appointments/${appointment.id}','<StatusBadge','role="tablist"','aria-selected'])assert(source.includes(value));
 assert.doesNotMatch(source,/New Appointment|sparkline|summary\.|fetch\(/);
 const css=readFileSync(new URL('../src/pages/appointments/appointments.css',import.meta.url),'utf8');assert.doesNotMatch(css,/\.admin-|sidebar|breadcrumb| main/);assert.match(css,/max-width:767px/);
});
