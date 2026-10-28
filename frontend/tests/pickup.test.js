import test from 'node:test';
import assert from 'node:assert/strict';
import { pickupBody } from '../src/pickup.js';

test('pickup serializes only allowed fields and supports clearing', () => {
  assert.deepEqual(pickupBody('  Sân bay  ', [{ id: 'old', name: ' Cổng A ', dayNo: '2', meetTime: '08:30', sortOrder: 99 }]), { meetingPoint: 'Sân bay', checkpoints: [{ name: 'Cổng A', dayNo: 2, meetTime: '08:30', sortOrder: 0 }] });
  assert.deepEqual(pickupBody('', []), { meetingPoint: '', checkpoints: [] });
});
test('pickup validates name, time, day and API limits', () => {
  for (const row of [{ name: '', dayNo: 1, meetTime: '08:00' }, { name: 'A', dayNo: 0, meetTime: '08:00' }, { name: 'A', dayNo: 1.5, meetTime: '08:00' }, { name: 'A', dayNo: 1, meetTime: '25:00' }]) assert.throws(() => pickupBody('', [row]));
  assert.throws(() => pickupBody('x'.repeat(256), []));
  assert.throws(() => pickupBody('', Array(31).fill({})));
});