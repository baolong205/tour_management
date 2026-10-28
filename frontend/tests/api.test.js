import test from 'node:test';
import assert from 'node:assert/strict';
import { api, assetUrl, saveSession, getSession } from '../src/services/api.js';

const storage = new Map();
globalThis.sessionStorage = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) };
globalThis.window = { dispatchEvent() {} };

test('API integration contract', async t => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; storage.clear(); });
  await t.test('reads plain response and successful envelope', async () => {
    globalThis.fetch = async () => Response.json({ items: [], total: 0 });
    assert.deepEqual(await api('/tours'), { items: [], total: 0 });
    globalThis.fetch = async () => Response.json({ success: true, data: { items: [], total: 0 } });
    assert.deepEqual(await api('/tours'), { items: [], total: 0 });
  });
  await t.test('uses authorization and serializes DTO unchanged', async () => {
    saveSession({ accessToken: 'access' });
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/bookings/quote');
      assert.equal(options.headers.Authorization, 'Bearer access');
      assert.deepEqual(JSON.parse(options.body), { scheduleId: 'schedule', passengers: [{ fullName: 'Nguyễn An', dob: '1990-01-01' }] });
      return Response.json({ total: 100 });
    };
    assert.equal((await api('/bookings/quote', { method: 'POST', body: { scheduleId: 'schedule', passengers: [{ fullName: 'Nguyễn An', dob: '1990-01-01' }] } })).total, 100);
  });
  await t.test('rotates tokens and retries unauthorized business request', async () => {
    saveSession({ accessToken: 'old', refreshToken: 'refresh' });
    let calls = 0;
    globalThis.fetch = async (url, options) => {
      calls++;
      if (url === '/api/auth/refresh') return Response.json({ accessToken: 'new', refreshToken: 'rotated' });
      return options.headers.Authorization === 'Bearer new' ? Response.json({ ok: true }) : Response.json({ message: 'Expired' }, { status: 401 });
    };
    assert.deepEqual(await api('/bookings/me'), { ok: true });
    assert.equal(calls, 3);
    assert.equal(getSession().refreshToken, 'rotated');
  });
  await t.test('surfaces validation errors and empty responses', async () => {
    globalThis.fetch = async () => Response.json({ message: ['Sai ngày sinh', 'Thiếu tên'] }, { status: 400 });
    await assert.rejects(api('/bookings'), /Sai ngày sinh. Thiếu tên/);
    globalThis.fetch = async () => new Response(null, { status: 204 });
    assert.equal(await api('/tours/id', { method: 'DELETE' }), null);
  });
  await t.test('preserves cancellation validation details and request id', async () => {
    const details = [{ field: 'approve', message: 'approve must be a boolean value' }];
    globalThis.fetch = async () => Response.json({ message: 'Dữ liệu gửi lên không hợp lệ', details, requestId: 'cancel-validation' }, { status: 400 });
    await assert.rejects(api('/bookings/id/cancel-request/process', { method: 'PATCH', body: { approve: true } }), error => {
      assert.match(error.message, /approve: approve must be a boolean value/);
      assert.equal(error.status, 400);
      assert.deepEqual(error.details, details);
      assert.equal(error.requestId, 'cancel-validation');
      return true;
    });
  });
  await t.test('favorites uses personal authenticated list and delete endpoint', async () => {
    saveSession({ accessToken: 'favorite-user' });
    const tours = [{ id: 'saved-tour', name: 'Tour đã lưu' }];
    globalThis.fetch = async (url, options) => {
      assert.equal(options.headers.Authorization, 'Bearer favorite-user');
      if (options.method === 'GET') {
        assert.equal(url, '/api/tours/me/favorites');
        return Response.json({ success: true, data: tours });
      }
      assert.equal(options.method, 'DELETE');
      assert.equal(url, '/api/tours/saved-tour/favorite');
      return Response.json({ favorited: false });
    };
    assert.deepEqual(await api('/tours/me/favorites'), tours);
    assert.deepEqual(await api('/tours/saved-tour/favorite', { method: 'DELETE' }), { favorited: false });
    globalThis.fetch = async () => Response.json([]);
    assert.deepEqual(await api('/tours/me/favorites'), []);
  });
  await t.test('preserves abort errors and reports network failures', async () => {
    globalThis.fetch = async () => { throw new DOMException('Aborted', 'AbortError'); };
    await assert.rejects(api('/tours'), { name: 'AbortError' });
    globalThis.fetch = async () => { throw new TypeError('Network'); };
    await assert.rejects(api('/tours'), /Không thể kết nối/);
  });
  await t.test('uses local fallback and rejects unsafe image schemes', () => {
    assert.equal(assetUrl(null), '/landscape.svg');
    assert.equal(assetUrl('javascript:alert(1)'), '/landscape.svg');
    assert.equal(assetUrl('/uploads/tours/abc.jpg'), '/uploads/tours/abc.jpg');
  });
});