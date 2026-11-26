import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL(path, import.meta.url), 'utf8');
const page = read('../src/pages/appointments/AppointmentDetailsPage.tsx');
const view = read('../src/pages/appointments/AppointmentDetailsView.tsx');
test('details retains existing fetch, mutations, validation and action availability', () => {
  assert.equal((page.match(/appointmentService\.getById\(/g) || []).length, 1);
  assert.equal((page.match(/appointmentService\.updateStatus\(/g) || []).length, 1);
  for (const text of ['new Date(bookingDate).getTime() <= Date.now()', 'Select a different future booking date.', 'cancellationReason: reason.trim()', 'rescheduleReason: reason.trim()', "appointment.status === 'PENDING'", "appointment.status === 'CONFIRMED'", "appointment.status === 'RESCHEDULED'"]) assert(page.includes(text), text);
  assert.doesNotMatch(view, /appointmentService\.|\bfetch\(|axios/);
});
test('presentation keeps real values, existing modal, calendar minimum and reason limit', () => {
  for (const text of ['a.id', 'a.emailStatus', 'a.originalBookingDate', 'a.bookingDate', 'a.createdAt', 'a.updatedAt', 'a.rescheduleReason', 'a.cancellationReason', 'a.otherFrameType', '<StatusBadge', '<Modal accessibleFocus', 'min={appointmentMinimum()}', 'maxLength={500}', 'reason.length', 'onClick={save}']) assert(view.includes(text), text);
  assert.doesNotMatch(view, /APT-2026|resendEmail|emailSentAt/);
});
