import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingChart, bookingLink, vietnamToday } from '../src/staff-dashboard.js';

test('staff charts count recorded booking statuses, not assumed payments', () => {
  const chart = bookingChart([{ createdAt: '2026-01-02T00:00:00Z', status: 'CONFIRMED' }, { createdAt: '2026-01-03', status: 'CANCEL_REQUESTED' }, { createdAt: '2025-02-03', status: 'CONFIRMED' }, { status: 'EXPIRED' }], 2026);
  assert.deepEqual(chart.months, [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(chart.statuses, { CONFIRMED: 2, CANCEL_REQUESTED: 1, EXPIRED: 1 });
  assert.deepEqual(bookingChart([], 2026).months, Array(12).fill(0));
});
test('staff uses Vietnam date and encoded internal booking links', () => {
  assert.equal(vietnamToday(new Date('2026-10-27T18:00:00Z')), '2026-10-28');
  assert.equal(bookingLink('id&tab=settings'), '#/staff?tab=bookings&booking=id%26tab%3Dsettings');
});