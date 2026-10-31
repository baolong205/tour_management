import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import ActionForm from '../components/ActionForm.jsx';
import ActionDialog from '../components/ActionDialog.jsx';
import { Pagination, State } from '../components/UI.jsx';

export function TourReviews({ id }) {
  const [page, setPage] = useState(1);
  const list = useApi(`/reviews/tour/${id}?page=${page}&limit=5`);
  return <section className="panel"><h2>Đánh giá từ khách đã đi</h2><State loading={list.loading} error={list.error} />{!list.loading && !list.error && !list.data?.items?.length && <p>Chưa có đánh giá được duyệt.</p>}{list.data?.items?.map(item => <blockquote key={item.id}><strong>{item.customerName || item.userName || 'Khách hàng'} · {item.rating}/5 ★</strong><p className="pre-line">{item.comment}</p></blockquote>)}<Pagination page={page} limit={5} total={list.data?.total || 0} onChange={setPage} /></section>;
}

export default function Reviews({ bookingId }) {
  const [revision, setRevision] = useState(0);
  const [page, setPage] = useState(1);
  const list = useApi(`/reviews/me?page=${page}&limit=10`, revision);
  const fields = [{ name: 'rating', label: 'Chấm sao', required: true, type: 'number', min: 1, max: 5, defaultValue: 5 }, { name: 'comment', label: 'Trải nghiệm của bạn', type: 'textarea', maxLength: 2000 }];
  return <section className="container section records-page reviews-page"><h1>Đánh giá của tôi</h1><p>Chỉ đánh giá được đơn đã hoàn thành; mỗi đơn có một đánh giá và cần được kiểm duyệt.</p>
    {bookingId && <section className="panel"><h2>Viết đánh giá sau chuyến đi</h2><ActionForm path="/reviews" initial={{ bookingId }} fields={[{ name: 'bookingId', label: 'Đơn đặt tour', type: 'hidden', required: true }, ...fields]} label="Gửi đánh giá" onSuccess={() => setRevision(value => value + 1)} /></section>}
    <State loading={list.loading} error={list.error} retry={() => setRevision(value => value + 1)} />{list.data?.items?.map(item => <article className="panel record-card" key={item.id}><h2>{item.tourName || 'Đánh giá chuyến đi'} · {item.rating}/5 ★</h2><p>{item.status === 'PENDING' ? 'Chờ duyệt' : item.status === 'VISIBLE' ? 'Đã công khai' : 'Đã ẩn'}</p><p className="pre-line">{item.comment}</p>{item.status === 'PENDING' && <ActionDialog title="Sửa đánh giá"><ActionForm path={`/reviews/${item.id}`} method="PATCH" fields={fields} initial={item} onSuccess={() => setRevision(value => value + 1)} /></ActionDialog>}</article>)}
    {!list.loading && !list.error && !list.data?.items?.length && <p>Bạn chưa có đánh giá nào. Vào đơn đã hoàn thành để viết đánh giá.</p>}
    <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
  </section>;
}
