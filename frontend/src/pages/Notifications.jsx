import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { Pagination, State } from '../components/UI.jsx';

export default function Notifications({ managementNotifications = false }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useApi(`/notifications?page=${page}&limit=10`, revision);
  async function read(id) {
    setBusy(true); setError('');
    try { await api(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'PATCH' }); setRevision(value => value + 1); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <section className="container section"><div className="section-heading"><h1>Thông báo của tôi</h1><button className="btn outline" disabled={busy} onClick={() => read()}>Đánh dấu tất cả đã đọc</button></div>
    {error && <p role="alert" className="notice error">{error}</p>}<State loading={list.loading} error={list.error} retry={() => setRevision(value => value + 1)} />
    {!list.loading && !list.error && !list.data?.items?.length && <div className="state">Bạn chưa có thông báo.</div>}
    {list.data?.items?.map(item => <article className="panel" key={item.id}><small>{new Date(item.createdAt).toLocaleString('vi-VN')} · {item.isRead ? 'Đã đọc' : 'Chưa đọc'}</small><h2>{item.title}</h2><p className="pre-line">{item.body}</p>{!item.isRead && <button className="text-button" disabled={busy} onClick={() => read(item.id)}>Đánh dấu đã đọc</button>}{item.payload?.bookingId && <a className="text-button" href={managementNotifications ? (user?.roles?.includes('ADMIN') ? '#/admin?tab=bookings' : '#/staff?tab=bookings') : '#/bookings'}>Xem đơn đặt tour</a>}</article>)}
    <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
  </section>;
}
