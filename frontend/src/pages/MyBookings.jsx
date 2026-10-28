import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { date, money, statusLabels } from '../utils.js';
import { Icon, Pagination, State } from '../components/UI.jsx';

export default function MyBookings() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const list = useApi(`/bookings/me?page=${page}&limit=10`, revision);
  return <section className="my-bookings-page"><nav className="account-breadcrumbs" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>›</span><a href="#/account/overview">Tài khoản</a><span>›</span>Tour của tôi</nav><h1>Tour của tôi</h1><p>Theo dõi hành trình, thanh toán và thông tin đặt tour của bạn.</p><State loading={list.loading} error={list.error} empty={!list.loading && !list.error && !list.data?.items?.length} retry={() => setRevision(value => value + 1)} /><div className="booking-list">{list.data?.items?.map(booking => <article className="booking-row panel" key={booking.id}><div className="row-between"><span className="booking-code">{booking.code}</span><span className={`order-status status-${booking.status.toLowerCase()}`}>{statusLabels[booking.status] || booking.status}</span></div><h2>{booking.tourName}</h2><p><Icon name="calendar" size={17} /> {date(booking.startDate)} – {date(booking.endDate)}</p><p><Icon name="users" size={17} /> {booking.passengerCount} hành khách</p><div className="row-between"><strong className="price">{money(booking.total)}</strong><a className="btn outline small" href={`#/bookings/${booking.id}`}>Xem chi tiết <Icon name="arrow" size={16} /></a></div></article>)}</div><Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} /></section>;
}