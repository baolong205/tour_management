import React from 'react';
import { assetUrl } from '../services/api.js';
import { money } from '../utils.js';
import { Icon } from './UI.jsx';

export default function TourCard({ tour }) {
  return <article className="tour-card">
    <a className="tour-image" href={`#/tours/${tour.id}`}><img src={assetUrl(tour.coverImageUrl)} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} alt={tour.name} loading="lazy" /><span className="tour-badge">{tour.categories?.[0]?.name || 'Khám phá'}</span><span className="tour-duration"><Icon name="clock" size={14} /> {tour.durationDays}N{tour.durationNights}Đ</span></a>
    <div className="tour-body"><div className="tour-location"><span><Icon name="pin" size={14} /> {tour.departureCity || 'Theo lịch trình'}</span><span className="rating">★ {Number(tour.avgRating) > 0 ? Number(tour.avgRating).toFixed(1) : 'Mới'}</span></div>
      <h3><a href={`#/tours/${tour.id}`}>{tour.name}</a></h3><p className="tour-summary">{tour.summary || 'Khám phá những điểm đến và trải nghiệm đáng nhớ trong hành trình của bạn.'}</p>
      <div className="tour-meta"><Icon name="calendar" size={15} /> {tour.durationDays} ngày {tour.durationNights} đêm <span>{tour.reviewCount || 0} đánh giá</span></div>
      <div className="tour-bottom"><div><small>Giá từ / khách</small><strong>{money(tour.fromPrice)}</strong></div><a className="card-link" href={`#/tours/${tour.id}`} aria-label={`Xem chi tiết ${tour.name}`}>Chi tiết <Icon name="arrow" size={16} /></a></div>
    </div>
  </article>;
}
