import test from 'node:test';
import assert from 'node:assert/strict';
import { money, date, queryString, safeNext, statusLabels } from '../src/utils.js';

test('money distinguishes unavailable prices and free tickets', () => {
  assert.equal(money(null), 'Liên hệ');
  assert.match(money(0), /0/);
  assert.match(money(1200000), /1\.200\.000/);
});
test('query includes valid values, omits empty filters, encodes Vietnamese', () => {
  const query = new URLSearchParams(queryString({ search: 'Đà Nẵng', categoryId: '', page: 2, unused: null, price: 0 }));
  assert.equal(query.get('search'), 'Đà Nẵng');
  assert.equal(query.get('page'), '2');
  assert.equal(query.get('price'), '0');
  assert.equal(query.has('categoryId'), false);
  assert.equal(query.has('unused'), false);
});
test('date-only values stay on the calendar date', () => {
  assert.equal(date('2026-12-25'), '25/12/2026');
  assert.equal(date(null), 'Chưa xác định');
});
test('login continuation accepts only internal routes', () => {
  assert.equal(safeNext('/booking/123?scheduleId=456'), '/booking/123?scheduleId=456');
  for (const input of ['https://example.com', '//example.com', null, 'javascript:alert(1)']) assert.equal(safeNext(input), '/');
});
test('all backend booking statuses have Vietnamese labels', () => {
  for (const status of ['PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'CONFIRMED', 'CANCEL_REQUESTED', 'CANCELLED', 'REJECTED', 'EXPIRED', 'COMPLETED']) assert.ok(statusLabels[status]);
});