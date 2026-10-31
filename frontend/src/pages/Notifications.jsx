import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { Icon, Pagination, State } from '../components/UI.jsx';

export default function Notifications({ managementNotifications = false }) {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useApi(`/notifications?page=${page}&limit=10`, revision);
  const [filter, setFilter] = useState('all');
  const items = (list.data?.items || []).filter(item => filter === 'all' || !item.isRead);
  async function read(id) {
    setBusy(true); setError('');
    try { await api(id ? `/notifications/${id}/read` : '/notifications/read-all', { method: 'PATCH' }); setRevision(value => value + 1); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <section className="container section records-page notifications-page"><header className="records-heading"><div><span className="records-eyebrow">TRUNG TÂM THÔNG BÁO</span><h1>Thông báo của tôi</h1><p>Cập nhật hoạt động và các thông tin quan trọng ở cùng một nơi.</p></div><button className="record-action" disabled={busy || !list.data?.items?.length} onClick={() => read()}><Icon name="check" size={16} />Đánh dấu tất cả đã đọc</button></header><div className="records-tabs" role="group" aria-label="Lọc thông báo trong trang"><button aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Tất cả</button><button aria-pressed={filter === 'unread'} onClick={() => setFilter('unread')}>Chưa đọc trong trang ({(list.data?.items || []).filter(item => !item.isRead).length})</button></div>
    {error && <p role="alert" className="notice error">{error}</p>}<State loading={list.loading} error={list.error} retry={() => setRevision(value => value + 1)} />
    {!list.loading && !list.error && !list.data?.items?.length && <div className="state">Bạn chưa có thông báo.</div>}
    <div className="notification-feed">{items.map(item => <article className={`notification-row ${item.isRead ? 'read' : 'unread'}`} key={item.id}><span className="notification-symbol"><Icon name="bell" size={21} /></span><div className="notification-copy"><div className="notification-meta"><span className={`record-badge ${item.isRead ? '' : 'info'}`}>{item.isRead ? 'Đã đọc' : 'Mới'}</span><time>{new Date(item.createdAt).toLocaleString('vi-VN')}</time></div><h2>{item.title}</h2><p className="pre-line">{item.body}</p><div className="record-inline-actions">{!item.isRead && <button className="record-action" disabled={busy} onClick={() => read(item.id)}>Đánh dấu đã đọc</button>}{item.payload?.bookingId && <a className="record-action" href={managementNotifications ? `${user?.roles?.includes('ADMIN') ? '#/admin' : '#/staff'}?tab=bookings&booking=${encodeURIComponent(item.payload.bookingId)}` : `#/bookings/${encodeURIComponent(item.payload.bookingId)}`}>Xem đơn đặt tour <Icon size={14} /></a>}</div></div></article>)}</div>
    {!list.loading && !list.error && !!list.data?.items?.length && !items.length && <p className="records-hint">Không có thông báo chưa đọc trong trang này.</p>}
    <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
  </section>;
}
