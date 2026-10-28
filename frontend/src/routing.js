import { canEnterWorkspace } from './management.js';
import { safeNext } from './utils.js';

const WORKSPACE_PATHS = new Set(['/admin', '/admin/account', '/admin/notifications']);
const STAFF_PATHS = new Set(['/staff', '/staff/account', '/staff/notifications']);

export function workspaceHome(user) {
  if (user?.roles?.includes('ADMIN')) return '/admin';
  return user?.roles?.includes('STAFF') ? '/staff' : null;
}

export function isWorkspacePath(path) {
  return WORKSPACE_PATHS.has(path) || STAFF_PATHS.has(path);
}

export function routeForUser(user, route) {
  if (!canEnterWorkspace(user)) return null;
  const home = workspaceHome(user);
  const paths = home === '/admin' ? WORKSPACE_PATHS : STAFF_PATHS;
  return paths.has(route.split('?')[0]) ? null : home;
}

export function loginDestination(user, next) {
  const destination = safeNext(next);
  if (canEnterWorkspace(user)) {
    const home = workspaceHome(user);
    return (home === '/admin' ? WORKSPACE_PATHS : STAFF_PATHS).has(destination.split('?')[0]) ? destination : home;
  }
  if (/^\/(admin|staff)(\/|$|\?)/.test(destination) || ['/login', '/forgot-password', '/reset-password'].includes(destination.split('?')[0])) return '/';
  return destination;
}