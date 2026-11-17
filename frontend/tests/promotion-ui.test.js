import test from 'node:test';
import assert from 'node:assert/strict';
import { canRequestBestOffer, bestOfferCode, promotionAvailablePath, sortVouchers } from '../src/lib/utils.js';
import { parseCustomerIds, scopeSummary, scopeLabel, scopeTypes, promotionHeadline, promotionCondition } from '../src/promotion-ui.js';
import { isAccountPath } from '../src/features/booking/view.js';

test('best-for-cart is only requested with a complete cart context', () => {
  assert.equal(canRequestBestOffer(3_500_000, 'schedule-1'), true);
  // Tạm tính 0 vẫn hợp lệ (đơn toàn em bé).
  assert.equal(canRequestBestOffer(0, 'schedule-1'), true);
  for (const [subtotal, scheduleId] of [
    [undefined, 'schedule-1'], // chưa có báo giá
    [3_500_000, ''], // chưa chọn lịch
    [3_500_000, undefined],
    [Number.NaN, 'schedule-1'],
    [3_500_000.5, 'schedule-1'], // backend yêu cầu số nguyên
    [-1, 'schedule-1'],
  ]) assert.equal(canRequestBestOffer(subtotal, scheduleId), false);
});

test('best offer picks the code with the largest discount', () => {
  const offer = { subtotal: 3_500_000, totalDiscount: 900_000, total: 2_600_000, applied: [{ code: 'A', discount: 300_000 }, { code: 'B', discount: 600_000 }], rejected: [] };
  assert.deepEqual(bestOfferCode(offer), { code: 'B', discount: 600_000 });
  assert.equal(bestOfferCode({ ...offer, applied: [] }), null);
  assert.equal(bestOfferCode(null), null);
  assert.equal(bestOfferCode({}), null);
});

test('customer id list parser deduplicates and trims pasted input', () => {
  assert.deepEqual(parseCustomerIds('a\nb, c;  d  ,a'), ['a', 'b', 'c', 'd']);
  assert.deepEqual(parseCustomerIds('   '), []);
  assert.deepEqual(parseCustomerIds(null), []);
  assert.deepEqual(parseCustomerIds('one'), ['one']);
});

test('scope summary explains the empty list as system-wide', () => {
  assert.equal(scopeSummary([]), 'Áp dụng toàn hệ thống');
  assert.equal(scopeSummary(undefined), 'Áp dụng toàn hệ thống');
  assert.equal(scopeSummary([{ scopeType: 'TOUR', scopeId: 't1' }, { scopeType: 'CATEGORY', scopeId: 'c1' }]), '2 phạm vi áp dụng');
});

test('scope labels map backend enum values to Vietnamese names', () => {
  assert.equal(scopeLabel({ scopeType: 'TOUR', scopeId: 't-1' }), 'Tour · t-1');
  assert.equal(scopeLabel({ scopeType: 'CATEGORY', scopeId: 'c-1' }), 'Danh mục · c-1');
  assert.equal(scopeLabel({ scopeType: 'DESTINATION', scopeId: 'd-1' }), 'Điểm đến · d-1');
  assert.equal(scopeLabel({ scopeType: 'SCHEDULE', scopeId: 's-1' }), 'Lịch khởi hành · s-1');
  assert.equal(scopeLabel({ scopeType: 'UNKNOWN', scopeId: 'x' }), 'UNKNOWN · x');
  assert.equal(scopeLabel(null), 'Phạm vi · ');
  // Backend enum có đủ 4 loại phạm vi.
  assert.deepEqual(scopeTypes.map(type => type.value), ['TOUR', 'CATEGORY', 'DESTINATION', 'SCHEDULE']);
});

test('promotion cards describe percent and fixed discounts', () => {
  assert.equal(promotionHeadline({ type: 'PERCENT', value: 10 }), 'Giảm 10%');
  assert.match(promotionHeadline({ type: 'FIXED', value: 200000 }), /200/);
  assert.equal(promotionHeadline(null), '');
  assert.equal(promotionCondition({ minOrder: 0, maxDiscount: null }), '');
  assert.match(promotionCondition({ minOrder: 500000, maxDiscount: null }), /500/);
  assert.match(promotionCondition({ minOrder: 500000, maxDiscount: 100000 }), /giảm tối đa/);
});

test('voucher sorting keeps usable codes first for the my-vouchers page', () => {
  const sorted = sortVouchers([
    { code: 'BLOCKED', rejectedReason: 'Đơn chưa đủ điều kiện', estimatedDiscount: 0 },
    { code: 'SMALL', estimatedDiscount: 100000 },
    { code: 'BIG', estimatedDiscount: 500000 },
  ]);
  assert.deepEqual(sorted.map(voucher => voucher.code), ['BIG', 'SMALL', 'BLOCKED']);
});

test('vouchers page lives inside the account layout', () => {
  assert.equal(isAccountPath('/account/vouchers'), true);
  assert.equal(isAccountPath('/account'), true);
  assert.equal(isAccountPath('/tours'), false);
});

test('available path still carries cart context for the picker', () => {
  const query = new URLSearchParams(promotionAvailablePath(2_000_000, 'schedule-9').split('?')[1]);
  assert.equal(query.get('subtotal'), '2000000');
  assert.equal(query.get('scheduleId'), 'schedule-9');
});
