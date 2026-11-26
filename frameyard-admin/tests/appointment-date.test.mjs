import test from 'node:test';
import assert from 'node:assert/strict';
import {appointmentMinimum} from '../src/utils/appointment-date.ts';
test('appointment picker minimum permits only a future local minute, including later today',()=>{
 const now=new Date(2026,10,26,10,20,30);assert.equal(appointmentMinimum(now),'2026-11-26T10:21');assert(new Date(appointmentMinimum(now))>now);
 assert.equal(appointmentMinimum(new Date(2026,10,26,23,59,30)),'2026-11-27T00:00');
});
