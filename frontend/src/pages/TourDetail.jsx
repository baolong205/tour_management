import React, { useState } from 'react';
import { TourReviews } from './Reviews.jsx';
import { useApi } from '../hooks.js';
import { api, assetUrl } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { date, money } from '../utils.js';
import { Icon, State } from '../components/UI.jsx';

export default function TourDetail({ id }) {
  const [revision, setRevision] = useState(0);
  const { data: tour, loading, error } = useApi(`/tours/${id}`, revision);
  const schedules = useApi(`/schedules/tour/${id}`, revision);
  const { user } = useAuth();
  const favorite = useApi(user ? `/tours/${id}/favorite` : null, revision);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function toggleFavorite() {
    if (!user) { window.location.hash = `/login?next=${encodeURIComponent(`/tours/${id}`)}`; return; }
    setBusy(true);
    try { await api(`/tours/${id}/favorite`, { method: favorite.data?.favorited ? 'DELETE' : 'POST' }); setRevision(r => r + 1); setNotice('Đã cập nhật danh sách yêu thích.'); } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }
  if (!tour) return <div className="container section"><State loading={loading} error={error} retry={() => setRevision(r => r + 1)} /></div>;
  const image = tour.images?.find(image => image.isCover)?.url || tour.images?.[0]?.url;
  return <section className="container section detail-page"><div className="breadcrumbs"><a href="#/">Trang chủ</a> / <a href="#/tours">Tour du lịch</a> / {tour.code}</div><div className="detail-heading"><div><span className="eyebrow">{tour.categories?.map(c => c.name).join(' · ') || 'HÀNH TRÌNH KHÁM PHÁ'}</span><h1>{tour.name}</h1><div className="detail-meta"><span><Icon name="pin" />{tour.departureCity || 'Theo lịch trình'}</span><span><Icon name="clock" />{tour.durationDays} ngày {tour.durationNights} đêm</span><span>★ {tour.avgRating || 'Mới'} ({tour.reviewCount} đánh giá)</span></div></div><button className="btn outline" disabled={busy || favorite.loading} onClick={toggleFavorite}><Icon name="heart" /> {favorite.data?.favorited ? 'Bỏ yêu thích' : 'Yêu thích'}</button></div>{notice && <p className="notice" role="status">{notice}</p>}<img className="detail-cover" src={assetUrl(image)} alt={tour.name} onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/landscape.svg'; }} /><div className="detail-layout"><div><section className="panel"><span className="eyebrow">VỀ HÀNH TRÌNH</span><h2>Những trải nghiệm đang chờ bạn</h2><p className="pre-line">{tour.description || tour.summary || 'Nội dung hành trình đang được cập nhật.'}</p>{tour.destinations?.length > 0 && <div className="category-chips">{tour.destinations.map(d => <span className="chip" key={d.destinationId}><Icon name="pin" size={15} />{d.name}</span>)}</div>}</section><section className="panel"><h2>Lịch trình chi tiết</h2>{tour.itinerary?.length ? [...tour.itinerary].sort((a, b) => a.dayNo - b.dayNo).map(day => <details className="itinerary-day" key={day.id} open><summary><span>Ngày {day.dayNo}</span> {day.title}</summary><p className="pre-line">{day.content || 'Chi tiết đang được cập nhật.'}</p>{day.meals && <small>Bữa ăn: {day.meals}</small>}</details>) : <p>Lịch trình đang được cập nhật.</p>}</section><TourReviews id={id} /><section className="panel"><h2>Chính sách hủy</h2><h3>{tour.cancelPolicy?.name || 'Chưa có thông tin'}</h3><p>{tour.cancelPolicy?.description}</p>{tour.cancelPolicy?.rules?.map(rule => <p key={rule.daysBefore}>Trước ngày khởi hành {rule.daysBefore} ngày: phí hủy {rule.feePercent}%.</p>)}</section></div><aside><div className="booking-panel"><span className="eyebrow">CHỌN NGÀY, BẮT ĐẦU HÀNH TRÌNH</span><small>Giá từ / khách</small><strong className="big-price">{money(tour.fromPrice)}</strong><h3><Icon name="calendar" /> Lịch khởi hành</h3><State loading={schedules.loading} error={schedules.error} empty={!schedules.loading && !schedules.error && !schedules.data?.length} retry={() => setRevision(r => r + 1)} />{schedules.data?.map(schedule => <div className="schedule-item" key={schedule.id}><div><strong>{date(schedule.startDate)}</strong><span>{schedule.availableSeats} chỗ trống · {money(schedule.priceAdult)}</span></div>{schedule.availableSeats > 0 ? <a className="btn small" href={`#/booking/${id}?scheduleId=${schedule.id}`}>Chọn <Icon name="arrow" size={16} /></a> : <span className="muted">Hết chỗ</span>}</div>)}<p className="booking-note"><Icon name="shield" size={17} /> Giá chính xác được tính theo ngày sinh hành khách.</p></div></aside></div></section>;
}
