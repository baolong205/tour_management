import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { queryString } from '../utils.js';
import { Icon, Pagination, State } from '../components/UI.jsx';
import TourCard from '../components/TourCard.jsx';

export default function Tours({ params }) {
  const [revision, setRevision] = useState(0);
  const page = Math.max(1, Number(params.get('page')) || 1);
  const search = params.get('search') || '';
  const categoryId = params.get('categoryId') || '';
  const departureCity = params.get('departureCity') || '';
  const sortBy = ['name', 'avgRating', 'createdAt'].includes(params.get('sortBy')) ? params.get('sortBy') : 'createdAt';
  const { data: categories } = useApi('/catalog/categories');
  const { data, loading, error } = useApi(`/tours?${queryString({ page, limit: 9, search, categoryId, departureCity, sortBy, sortOrder: sortBy === 'name' ? 'ASC' : 'DESC' })}`, revision);
  function update(values) { window.location.hash = `/tours?${queryString({ search, categoryId, departureCity, sortBy, page: 1, ...values })}`; }
  return <><div className="page-banner"><div className="container"><span className="eyebrow">ĐI ĐỂ THẤY, ĐẾN ĐỂ YÊU</span><h1>Khám phá hành trình của bạn</h1><p>Mỗi điểm đến là một câu chuyện mới đang chờ được kể.</p></div></div><section className="container section listing-layout"><aside className="filter-panel"><h3><Icon name="search" /> Tìm hành trình</h3><form key={`${search}-${departureCity}`} onSubmit={event => { event.preventDefault(); const values = new FormData(event.currentTarget); update({ search: values.get('search'), departureCity: values.get('departureCity') }); }}><label>Từ khóa<input name="search" maxLength={120} defaultValue={search} placeholder="Tên tour, điểm đến..." /></label><label>Khởi hành từ<input name="departureCity" maxLength={100} defaultValue={departureCity} placeholder="Thành phố khởi hành" /></label><button className="btn full">Áp dụng bộ lọc</button></form><div className="filter-divider" /><h4>Loại hành trình</h4><button className={`filter-option ${!categoryId ? 'selected' : ''}`} onClick={() => update({ categoryId: '' })}>Tất cả tour</button>{categories?.map(category => <button className={`filter-option ${categoryId === category.id ? 'selected' : ''}`} key={category.id} onClick={() => update({ categoryId: category.id })}>{category.name}</button>)}<a className="reset-filter" href="#/tours">Xóa bộ lọc</a><div className="filter-note"><Icon name="sun" size={28} /><h4>Một chút cảm hứng?</h4><p>Thử một điểm đến bạn chưa từng ghé. Biết đâu đó là nơi bạn sẽ yêu.</p></div></aside><div><div className="results-heading"><p>{loading ? 'Đang tìm hành trình...' : <><strong>{data?.total || 0}</strong> hành trình dành cho bạn</>}</p><label>Sắp xếp <select value={sortBy} onChange={event => update({ sortBy: event.target.value })}><option value="createdAt">Mới nhất</option><option value="avgRating">Đánh giá cao</option><option value="name">Tên A–Z</option></select></label></div><State loading={loading} error={error} empty={!loading && !error && !data?.items?.length} retry={() => setRevision(r => r + 1)} /><div className="tour-grid listing-grid">{data?.items?.map(tour => <TourCard key={tour.id} tour={tour} />)}</div><Pagination page={page} total={data?.total || 0} limit={9} onChange={page => update({ page })} /></div></section></>;
}
