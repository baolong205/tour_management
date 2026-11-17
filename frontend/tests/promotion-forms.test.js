import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFormBody, localDateTimeInput } from '../src/features/management/forms.js';

test('promotion dates preserve their instant after editing local datetime inputs', () => {
  const instant = '2026-11-08T08:30:00.000Z';
  const data = new FormData();
  data.set('validFrom', localDateTimeInput(instant));
  assert.equal(buildFormBody(data, [{ name: 'validFrom', type: 'datetime-local' }]).validFrom, instant);
});

test('clearing nullable promotion limits sends null instead of zero or silently retaining the old limit', () => {
  const data = new FormData(); data.set('usageLimit', ''); data.set('maxDiscount', '');
  assert.deepEqual(buildFormBody(data, [{ name: 'usageLimit', type: 'number', nullable: true }, { name: 'maxDiscount', type: 'number', nullable: true }]), { usageLimit: null, maxDiscount: null });
});
