import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api } from '../services/api.js';
import { date, money, statusLabels } from '../utils.js';
import { Icon, Pagination, State } from '../components/UI.jsx';

export default function MyBookings() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useApi(`/bookings/me?page=${page}&limit=10`, revision);
  const detail = useApi(selected ? `/bookings/${selected}` : null, revision);
  async function cancel(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await api(`/bookings/${selected}/cancel-request`, { method: 'POST', body: { reason } }); setRevision(r => r + 1); setReason(''); } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <section className="container section"><span className="eyebrow">NHỮNG CHUYẾN ĐI CỦA BẠN</span><h1>Đơn đặt tour</h1><p className="muted">Theo dõi thông tin và trạng thái hành trình tại đây.</p><State loading={list.loading} error={list.error} empty={!list.loading && !list.error && !list.data?.items?.length} retry={() => setRevision(r => r + 1)} /><div className="booking-list">{list.data?.items?.map(booking => <article className="booking-row panel" key={booking.id}><span className={`status ${booking.status.toLowerCase()}`}>{statusLabels[booking.status] || booking.status}</span><h3>{booking.tourName}</h3><p>{booking.code} · {date(booking.startDate)} · {booking.passengerCount} hành khách</p><div className="row-between"><strong className="price">{money(booking.total)}</strong><button className="btn outline small" onClick={() => { setSelected(booking.id); setError(''); }}>Xem chi tiết <Icon name="arrow" size={16} /></button></div></article>)}</div><Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />{selected && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label="Chi tiết đơn đặt tour"><button className="modal-close icon-button" onClick={() => setSelected('')} aria-label="Đóng chi tiết"><Icon name="close" /></button><State loading={detail.loading} error={detail.error} />{detail.data && <><span className="eyebrow">{detail.data.code}</span><h2>{detail.data.tourName}</h2><p>{date(detail.data.startDate)} – {date(detail.data.endDate)}</p><p>Trạng thái: <strong>{statusLabels[detail.data.status] || detail.data.status}</strong></p><p>Tổng tiền: <strong>{money(detail.data.total)}</strong></p><h3>Hành khách</h3>{detail.data.passengers.map(p => <p key={p.id}>{p.fullName} · {date(p.dob)} · {money(p.unitPrice)}</p>)}{detail.data.expiresAt && <p>Hạn xử lý: {new Date(detail.data.expiresAt).toLocaleString('vi-VN')}</p>}{['PENDING_CONFIRMATION', 'PENDING_PAYMENT', 'CONFIRMED'].includes(detail.data.status) && <form onSubmit={cancel}><h3>Gửi yêu cầu hủy</h3><p className="muted">Phí hủy được áp dụng theo chính sách đã lưu của đơn đặt.</p><label>Lý do<textarea value={reason} onChange={e => setReason(e.target.value)} minLength={5} maxLength={1000} required rows={3} /></label>{error && <p role="alert" className="notice error">{error}</p>}<button className="btn outline" disabled={busy}>Gửi yêu cầu hủy</button></form>}</>}</section></div>}</section>;
}