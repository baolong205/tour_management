import test from 'node:test';
import assert from 'node:assert/strict';
import { money, date, queryString, safeNext, statusLabels, promotionAvailablePath, sortVouchers } from '../src/lib/utils.js';

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

test('promotion picker sends cart context so the backend can estimate the discount', () => {
  const query = new URLSearchParams(promotionAvailablePath(3_500_000, 'schedule-1').split('?')[1]);
  assert.equal(query.get('subtotal'), '3500000');
  assert.equal(query.get('scheduleId'), 'schedule-1');
  // Không có ngữ cảnh ⇒ gọi endpoint trần, backend trả danh sách không kèm ước tính.
  assert.equal(promotionAvailablePath(undefined, undefined), '/promotions/available');
  assert.equal(promotionAvailablePath(Number.NaN, ''), '/promotions/available');
  // Tạm tính 0 là hợp lệ (đơn toàn em bé) nên vẫn phải gửi.
  assert.equal(promotionAvailablePath(0, undefined), '/promotions/available?subtotal=0');
});

test('vouchers put usable codes first, then the biggest saving, without mutating input', () => {
  const input = [
    { code: 'BLOCKED', estimatedDiscount: 0, rejectedReason: 'Mã đã hết hạn' },
    { code: 'SMALL', estimatedDiscount: 50_000, rejectedReason: null },
    { code: 'BIG', estimatedDiscount: 300_000, rejectedReason: null },
  ];
  const sorted = sortVouchers(input);
  assert.deepEqual(sorted.map(voucher => voucher.code), ['BIG', 'SMALL', 'BLOCKED']);
  assert.deepEqual(input.map(voucher => voucher.code), ['BLOCKED', 'SMALL', 'BIG']);
  assert.deepEqual(sortVouchers(null), []);
});