import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingActions, cancellationBody, scheduleLabels, validateDateRange } from '../src/staff-operations.js';

test('booking actions require both permission and actionable status', () => {
  const all = () => true;
  assert.deepEqual(bookingActions('PENDING_CONFIRMATION', all), { confirm: true, process: false, cancel: true });
  assert.deepEqual(bookingActions('CANCEL_REQUESTED', all), { confirm: false, process: true, cancel: false });
  for (const status of ['CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED']) assert.deepEqual(bookingActions(status, all), { confirm: false, process: false, cancel: false });
  assert.deepEqual(bookingActions('CANCEL_REQUESTED', () => false), { confirm: false, process: false, cancel: false });
});
test('cancellation decisions serialize strict booleans and require rejection reason', () => {
  assert.deepEqual(cancellationBody(true, 'ignored'), { approve: true });
  assert.deepEqual(cancellationBody(false, '  Không đủ điều kiện  '), { approve: false, rejectReason: 'Không đủ điều kiện' });
  assert.throws(() => cancellationBody('false'), /chọn kết quả/);
  assert.throws(() => cancellationBody(false, '  '), /nhập lý do/);
  assert.throws(() => cancellationBody(false, 'x'.repeat(501)), /500/);
});
test('date filters reject inverted ranges and schedule states have clear labels', () => {
  assert.throws(() => validateDateRange('2026-11-10', '2026-11-01'), /Ngày kết thúc/);
  assert.doesNotThrow(() => validateDateRange('', '2026-11-01'));
  assert.doesNotThrow(() => validateDateRange('2026-11-01', '2026-11-01'));
  for (const status of ['DRAFT', 'OPEN', 'FULL', 'CLOSED', 'ONGOING', 'COMPLETED', 'CANCELLED']) assert.ok(scheduleLabels[status]);
});