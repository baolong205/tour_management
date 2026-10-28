import React from 'react';
import { useApi } from '../hooks.js';
import { assetUrl } from '../services/api.js';

export function safeBannerLink(value) {
  return typeof value === 'string' && (/^#\//.test(value) || /^https?:\/\//i.test(value)) ? value : '#/tours';
}
export default function Banners() {
  const { data } = useApi('/banners/visible');
  if (!data?.length) return null;
  return <section className="container section"><h2>Ưu đãi & thông tin mới</h2><div className="tour-grid">{data.map(banner => <a className="panel" key={banner.id} href={safeBannerLink(banner.linkUrl)}><img className="promo-image" src={assetUrl(banner.imageUrl)} alt={banner.title} loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} /><h3>{banner.title}</h3></a>)}</div></section>;
}