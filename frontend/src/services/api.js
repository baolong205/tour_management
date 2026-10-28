const BASE = (import.meta.env?.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const KEY = 'vivu-session';
export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { return null; }
}
export function saveSession(session) {
  if (session) sessionStorage.setItem(KEY, JSON.stringify(session));
  else sessionStorage.removeItem(KEY);
  window.dispatchEvent(new Event('auth-change'));
}
let refreshing;
async function parse(response) {
  const text = await response.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { throw new Error('Phản hồi API không hợp lệ. Kiểm tra địa chỉ backend.'); }
  if (!response.ok) {
    const error = new Error(Array.isArray(body?.message) ? body.message.join('. ') : body?.message || `Yêu cầu thất bại (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return body?.success === true && 'data' in body ? body.data : body;
}
export async function api(path, { method = 'GET', body, signal, retry = true } = {}) {
  const session = getSession();
  let response;
  try {
    response = await fetch(`${BASE}${path}`, { method, signal, credentials: 'include', headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new Error('Không thể kết nối máy chủ. Hãy kiểm tra backend và cấu hình API.');
  }
  if (response.status === 401 && retry && session?.refreshToken && !['/auth/login', '/auth/register', '/auth/refresh'].includes(path)) {
    if (!refreshing) refreshing = api('/auth/refresh', { method: 'POST', body: { refreshToken: session.refreshToken }, retry: false }).then(tokens => saveSession({ ...session, ...tokens })).catch(error => { saveSession(null); throw error; }).finally(() => { refreshing = null; });
    await refreshing;
    return api(path, { method, body, signal, retry: false });
  }
  return parse(response);
}
export function assetUrl(url) {
  if (!url) return '/landscape.svg';
  if (url.startsWith('/uploads/')) return BASE.startsWith('http') ? `${new URL(BASE).origin}${url}` : url;
  return /^https?:\/\//i.test(url) || url.startsWith('/') ? url : '/landscape.svg';
}
