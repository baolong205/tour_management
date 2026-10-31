import test from 'node:test';
import assert from 'node:assert/strict';
import { popularTours, revenueMonths } from '../src/admin-dashboard.js';

test('admin revenue chart uses received money for exact year and zero fills months', () => {
  const months = revenueMonths([{ period: '2026-01', received: '100' }, { period: '2025-01', received: 999 }, { period: '2026-12', received: 20 }], 2026);
  assert.equal(months.length, 12);
  assert.equal(months[0], 100);
  assert.equal(months[1], 0);
  assert.equal(months[11], 20);
  assert.deepEqual(revenueMonths(undefined, 2026), Array(12).fill(0));
});
test('popular tours group bookings, exclude closed failures, sum order values without implying payment', () => {
  assert.deepEqual(popularTours([{ tourId: 'a', tourName: 'A', status: 'CONFIRMED', total: '10' }, { tourId: 'a', tourName: 'A', status: 'PENDING_PAYMENT', total: 20 }, { tourId: 'b', tourName: 'B', status: 'CANCELLED', total: 999 }]), [{ id: 'a', name: 'A', count: 2, total: 30 }]);
  assert.deepEqual(popularTours([]), []);
});
