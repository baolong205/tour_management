import test from 'node:test';
import assert from 'node:assert/strict';
import { passengerGroups, canRequestCancellation, bookingProgress, isAccountPath } from '../src/booking-view.js';

test('booking totals group passengers by both ticket type and recorded unit price', () => {
  const groups = passengerGroups([{ type: 'ADULT', unitPrice: 1000000 }, { type: 'ADULT', unitPrice: '1000000' }, { type: 'CHILD', unitPrice: 700000 }, { type: 'ADULT', unitPrice: 900000 }]);
  assert.equal(groups.length, 3);
  assert.deepEqual(groups[0], { type: 'ADULT', label: 'Người lớn', quantity: 2, unitPrice: 1000000, amount: 2000000 });
  assert.equal(groups.reduce((sum, group) => sum + group.amount, 0), 3600000);
  assert.deepEqual(passengerGroups(), []);
});
test('cancellation action only appears on server-supported active booking statuses', () => {
  for (const status of ['CONFIRMED', 'PENDING_PAYMENT', 'PENDING_CONFIRMATION']) assert.equal(canRequestCancellation({ status }), true);
  for (const status of ['COMPLETED', 'CANCEL_REQUESTED', 'CANCELLED', 'EXPIRED', 'REJECTED']) assert.equal(canRequestCancellation({ status }), false);
  assert.equal(canRequestCancellation(null), false);
});
test('progress never claims payment or departure based on a future departure date alone', () => {
  const booking = { status: 'CONFIRMED', createdAt: '2026-10-20', startDate: '2026-11-15', confirmedAt: '2026-10-21' };
  const steps = bookingProgress(booking, null);
  assert.equal(steps[1].done, false);
  assert.equal(steps[2].done, true);
  assert.equal(steps[3].done, false);
  const paid = bookingProgress(booking, { paidTotal: 2500000, outstanding: 0 });
  assert.equal(paid[1].done, true);
  assert.equal(paid[3].active, true);
  assert.ok(bookingProgress({ ...booking, status: 'CANCELLED' }, null).every(step => !step.active));
});
test('account layout applies to customer records without taking over public tour or admin pages', () => {
  for (const path of ['/bookings', '/bookings/id', '/payment/id', '/account/security', '/account/overview', '/support']) assert.equal(isAccountPath(path), true);
  for (const path of ['/', '/tours', '/tours/id', '/booking/id', '/admin', '/admin/account', '/login']) assert.equal(isAccountPath(path), false);
});