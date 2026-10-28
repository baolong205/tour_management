import test from 'node:test';
import assert from 'node:assert/strict';
import { loginDestination, routeForUser, isWorkspacePath } from '../src/routing.js';
import { permittedSections, activeWorkspaceSection, workspaceSections } from '../src/workspace-navigation.js';
import { permittedStaffSections, staffSections } from '../src/staff-navigation.js';

const admin = { roles: ['ADMIN'], permissions: workspaceSections.map(section => section.permission) };
const staff = { roles: ['STAFF'], permissions: ['booking:read', 'support:manage', 'payment:read', 'user:read', 'schedule:read'] };
const customer = { roles: ['CUSTOMER'], permissions: ['tour:read', 'booking:create'] };

test('admin and staff always land in workspace instead of customer screens', () => {
  for (const user of [admin, { ...admin, roles: ['CUSTOMER', 'ADMIN'] }]) {
    for (const route of ['/', '/login', '/admin/login', '/favorites', '/tours', '/bookings', '/account', '/payment/id', '/support', '/admin/unknown']) {
      assert.equal(routeForUser(user, route), '/admin', route);
      assert.equal(loginDestination(user, route), '/admin', route);
    }
    for (const route of ['/admin', '/admin?tab=bookings', '/admin/account', '/admin/notifications']) {
      assert.equal(routeForUser(user, route), null);
      assert.equal(loginDestination(user, route), route);
    }
  }
});
test('customer login continuation stays in customer area and rejects unsafe return targets', () => {
  assert.equal(loginDestination(customer, '/booking/id?schedule=s'), '/booking/id?schedule=s');
  for (const next of ['/admin', '/admin?tab=staff', '/admin/login', '/staff', '/staff/account', '/staff/login', '/staff?tab=payments', '/login', '//evil.test', 'https://evil.test', null]) assert.equal(loginDestination(customer, next), '/');
  assert.equal(routeForUser(customer, '/admin'), null);
  assert.equal(routeForUser(null, '/'), null);
  assert.equal(isWorkspacePath('/administrator'), false);
});
test('workspace menu never includes customer pages and restricts staff actions', () => {
  assert.deepEqual(permittedSections(customer), []);
  assert.equal(permittedSections(admin).length, workspaceSections.length);
  const staffKeys = permittedSections(staff).map(section => section.key);
  assert.deepEqual(staffKeys, []);
  for (const key of ['overview', 'staff', 'settings', 'tours', 'refunds', 'favorites']) assert.equal(staffKeys.includes(key), false);
  assert.equal(activeWorkspaceSection(admin, new URLSearchParams()), 'overview');
  assert.equal(activeWorkspaceSection(staff, new URLSearchParams()), undefined);
  assert.equal(activeWorkspaceSection(staff, new URLSearchParams('tab=settings')), 'settings');
});
test('staff uses a separate route space and cannot land in admin', () => {
  for (const route of ['/', '/admin', '/admin?tab=bookings', '/admin/account', '/admin/login', '/staff/login', '/staff/unknown', '/bookings']) {
    assert.equal(routeForUser(staff, route), '/staff');
    assert.equal(loginDestination(staff, route), '/staff');
  }
  for (const route of ['/staff', '/staff?tab=bookings', '/staff/account', '/staff/notifications']) {
    assert.equal(routeForUser(staff, route), null);
    assert.equal(loginDestination(staff, route), route);
  }
  assert.equal(routeForUser(admin, '/staff'), '/admin');
  assert.equal(loginDestination({ ...admin, roles: ['ADMIN', 'STAFF'] }, '/staff'), '/admin');
  assert.equal(isWorkspacePath('/staff'), true);
  assert.equal(isWorkspacePath('/staffing'), false);
});
test('staff allowlist is permission based and excludes admin even with extra permissions', () => {
  assert.deepEqual(permittedStaffSections(customer), []);
  assert.deepEqual(permittedStaffSections(admin), []);
  assert.deepEqual(permittedStaffSections({ roles: ['STAFF'], permissions: [] }), []);
  assert.ok(permittedStaffSections(staff).some(section => section.key === 'bookings'));
  const overprivileged = { roles: ['STAFF'], permissions: [...workspaceSections.map(section => section.permission)] };
  assert.deepEqual(permittedStaffSections(overprivileged).map(section => section.key), staffSections.map(section => section.key));
  for (const key of ['settings', 'staff', 'overview', 'tours', 'banners', 'refunds']) assert.equal(permittedStaffSections(overprivileged).some(section => section.key === key), false);
});