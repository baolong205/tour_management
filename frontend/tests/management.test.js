import test from 'node:test';
import assert from 'node:assert/strict';
import { canEnterWorkspace, csvCell, reportCsv, management } from '../src/management.js';
import { buildFormBody } from '../src/forms.js';

test('customer cannot enter staff workspace merely with tour:read', () => {
  assert.equal(canEnterWorkspace({ roles: ['CUSTOMER'], permissions: ['tour:read'] }), false);
  assert.ok(canEnterWorkspace({ roles: ['STAFF'] }));
  assert.ok(canEnterWorkspace({ roles: ['ADMIN'] }));
  assert.ok(!canEnterWorkspace(null));
});
test('CSV is Excel compatible and neutralizes spreadsheet formulas', () => {
  assert.equal(csvCell('=1+1'), '"\'=1+1"');
  assert.equal(csvCell('a"b'), '"a""b"');
  const csv = reportCsv([{ period: '2026-10', received: 100, refunded: 30, net: 70, transactions: 1 }]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.match(csv, /"2026-10","100","30","70","1"/);
});
test('every management section has explicit API and permission', () => {
  for (const config of Object.values(management)) {
    assert.ok(config.path.startsWith('/'));
    assert.ok(config.permission.includes(':'));
    assert.ok(config.fields.length > 0);
  }
  assert.equal(management.settings.method, 'PUT');
  assert.equal(management.schedules.write, 'schedule:write');
});

test('form bodies preserve numeric zero, boolean false and JSON; omit blank optional numbers', () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ value: '0', approve: 'false', roles: '["STAFF"]', usageLimit: '', phone: '', injected: 'ADMIN' })) data.set(key, value);
  assert.deepEqual(buildFormBody(data, [{ name: 'value', type: 'number' }, { name: 'approve', type: 'boolean' }, { name: 'roles', type: 'json' }, { name: 'usageLimit', type: 'number' }, { name: 'phone' }]), { value: 0, approve: false, roles: ['STAFF'], phone: '' });
  data.set('roles', 'invalid-json');
  assert.throws(() => buildFormBody(data, [{ name: 'roles', type: 'json' }]), SyntaxError);
});