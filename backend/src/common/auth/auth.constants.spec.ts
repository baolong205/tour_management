import { ROLE_PERMISSIONS, PERMISSION_DEFINITIONS } from './auth.constants.js';
import { RoleName } from '../enums/index.js';

describe('Role separation', () => {
  it('staff handles bookings and support but cannot assign admin privileges', () => {
    const staff = ROLE_PERMISSIONS[RoleName.STAFF];
    expect(staff).toEqual(expect.arrayContaining(['booking:read', 'booking:confirm', 'booking:cancel', 'support:manage', 'notification:manage']));
    for (const code of ['role:manage', 'user:manage', 'system:setting', 'tour:delete', 'payment:refund']) expect(staff).not.toContain(code);
  });
  it('admin has every defined permission, customer no operation permissions', () => {
    expect(ROLE_PERMISSIONS[RoleName.ADMIN]).toEqual(PERMISSION_DEFINITIONS.map(value => value.code));
    expect(ROLE_PERMISSIONS[RoleName.CUSTOMER]).toEqual(['tour:read', 'booking:create']);
  });
});