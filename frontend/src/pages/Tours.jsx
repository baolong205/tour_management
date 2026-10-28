import React, { useEffect, useState } from 'react';
import { useApi } from '../hooks.js';
import { queryString, money } from '../utils.js';
import { Icon, Pagination, State } from '../components/UI.jsx';
import TourCard from '../components/TourCard.jsx';

const filterNames = { search: 'Từ khóa', departureCity: 'Khởi hành', destination: 'Điểm đến', minPrice: 'Giá từ', maxPrice: 'Giá đến', minDays: 'Từ ngày', maxDays: 'Đến ngày' };
const places = ['Hạ Long', 'Ninh Bình', 'Hội An', 'Phú Quốc', 'Sa Pa', 'Đà Lạt'];

export default function Tours({ params }) {
  const [revision, setRevision] = useState(0);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [filterError, setFilterError] = useState('');
  const routeKey = params.toString();
  useEffect(() => { setFilterError(''); }, [routeKey]);
  const page = Math.max(1, Math.floor(Number(params.get('page')) || 1));
  const values = Object.fromEntries(Object.keys(filterNames).map(key => [key, params.get(key) || '']));
  const categoryId = params.get('categoryId') || '';
  const sortBy = ['name', 'avgRating', 'createdAt', 'price', 'durationDays'].includes(params.get('sortBy')) ? params.get('sortBy') : 'createdAt';
  const sortOrder = params.get('sortOrder') === 'ASC' || (!params.has('sortOrder') && ['name', 'price', 'durationDays'].includes(sortBy)) ? 'ASC' : 'DESC';
  const { data: categories } = useApi('/catalog/categories');
  const { data, loading, error } = useApi(`/tours?${queryString({ page, limit: 9, ...values, categoryId, sortBy, sortOrder })}`, revision);
  function update(changes) {
    window.location.hash = `/tours?${queryString({ ...values, categoryId, sortBy, sortOrder, page: 1, ...changes })}`;
  }
  function apply(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    for (const [min, max, title] of [['minPrice', 'maxPrice', 'Giá'], ['minDays', 'maxDays', 'Số ngày']]) {
      if (fields[min] !== '' && fields[max] !== '' && Number(fields[min]) > Number(fields[max])) {
        setFilterError(`${title} tối thiểu không được lớn hơn tối đa.`);
        return;
      }
    }
    setFilterError('');
    setFiltersOpen(false);
    update(fields);
  }
  const active = Object.entries(values).filter(([, value]) => value !== '');
  const count = active.length + Number(!!categoryId);
  return <div className="tour-explorer">
    <section className="explore-banner"><div className="container"><nav className="explore-breadcrumb" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span aria-hidden="true">/</span><span>Khám phá tour</span></nav><span className="explore-eyebrow">MỘT ĐIỂM ĐẾN MỚI · MỘT CÂU CHUYỆN MỚI</span><h1>Khám phá hành trình của bạn</h1><p>Tìm chuyến đi phù hợp. Mang về những trải nghiệm đáng nhớ.</p><div className="explore-places"><span><Icon name="pin" size={15} />Gợi ý điểm đến</span>{places.map(place => <button type="button" key={place} className={values.destination === place ? 'selected' : ''} onClick={() => update({ destination: place })}>{place}</button>)}</div></div></section>
    <section className="container explore-content"><button className="btn explore-filter-toggle" type="button" aria-expanded={filtersOpen} aria-controls="explore-filters" onClick={() => setFiltersOpen(open => !open)}><Icon name="search" size={18} />{filtersOpen ? 'Ẩn bộ lọc' : 'Hiện bộ lọc'}{count > 0 && ` (${count})`}</button>
      <div className="listing-layout explore-layout">
        <aside id="explore-filters" className={`filter-panel explore-filters ${filtersOpen ? 'is-open' : ''}`} aria-label="Bộ lọc tour"><div className="explore-filter-title"><h2><Icon name="search" size={19} />Bộ lọc tìm kiếm</h2><a href="#/tours">Đặt lại</a></div>
          <form key={routeKey} onSubmit={apply}><fieldset><legend>Hành trình của bạn</legend><label>Từ khóa<input name="search" maxLength={120} defaultValue={values.search} placeholder="Tên tour, mã tour..." /></label><label>Điểm đến<input name="destination" defaultValue={values.destination} maxLength={150} placeholder="Bạn muốn khám phá đâu?" /></label><label>Khởi hành từ<input name="departureCity" maxLength={100} defaultValue={values.departureCity} placeholder="Thành phố khởi hành" /></label></fieldset>
            <fieldset><legend>Ngân sách / khách</legend><div className="explore-range">{[['minPrice', 'Từ'], ['maxPrice', 'Đến']].map(([name, title]) => <label key={name}>{title} (VNĐ)<input type="number" min={0} step={1} name={name} defaultValue={values[name]} placeholder={name === 'minPrice' ? '0' : 'Không giới hạn'} /></label>)}</div></fieldset>
            <fieldset><legend>Thời gian hành trình</legend><div className="explore-range">{[['minDays', 'Tối thiểu'], ['maxDays', 'Tối đa']].map(([name, title]) => <label key={name}>{title} (ngày)<input type="number" min={1} max={365} step={1} name={name} defaultValue={values[name]} placeholder={name === 'minDays' ? '1' : '365'} /></label>)}</div></fieldset>
            <fieldset className="explore-categories"><legend>Loại hành trình</legend><label><input type="radio" name="categoryId" value="" defaultChecked={!categoryId} />Tất cả tour</label>{categories?.map(category => <label key={category.id}><input type="radio" name="categoryId" value={category.id} defaultChecked={categoryId === category.id} />{category.name}</label>)}</fieldset>
            {filterError && <p className="notice error" role="alert">{filterError}</p>}<button className="btn full" type="submit"><Icon name="check" size={17} />Áp dụng bộ lọc</button>
          </form><div className="explore-help"><Icon name="headset" size={26} /><strong>Cần gợi ý hành trình?</strong><p>Gửi yêu cầu tư vấn để được hỗ trợ lựa chọn chuyến đi.</p><a href="#/support">Liên hệ tư vấn <Icon name="arrow" size={14} /></a></div>
        </aside>
        <div className="explore-results"><div className="results-heading"><div><h2>Những chuyến đi dành cho bạn</h2><p aria-live="polite">{loading ? 'Đang tìm hành trình...' : error ? 'Chưa thể tải danh sách tour' : <><strong>{data?.total || 0}</strong> tour phù hợp với lựa chọn của bạn</>}</p></div><label>Sắp xếp theo<select aria-label="Sắp xếp tour" value={`${sortBy}:${sortOrder}`} onChange={event => { const [sortBy, sortOrder] = event.target.value.split(':'); update({ sortBy, sortOrder }); }}><option value="createdAt:DESC">Mới nhất</option><option value="avgRating:DESC">Đánh giá cao</option><option value="name:ASC">Tên A–Z</option><option value="price:ASC">Giá thấp đến cao</option><option value="price:DESC">Giá cao đến thấp</option><option value="durationDays:ASC">Ngắn ngày trước</option><option value="durationDays:DESC">Dài ngày trước</option></select></label></div>
          {count > 0 && <div className="explore-active" aria-label="Bộ lọc đang áp dụng">{active.map(([key, value]) => <button type="button" key={key} onClick={() => update({ [key]: '' })} aria-label={`Bỏ lọc ${filterNames[key]}: ${value}`}>{filterNames[key]}: {key.includes('Price') ? money(value) : value}<Icon name="close" size={12} /></button>)}{categoryId && <button type="button" onClick={() => update({ categoryId: '' })}>{categories?.find(category => category.id === categoryId)?.name || 'Loại tour đã chọn'}<Icon name="close" size={12} /></button>}<a href="#/tours">Xóa tất cả</a></div>}
          <State loading={loading} error={error} empty={!loading && !error && !data?.items?.length} retry={() => setRevision(r => r + 1)} />
          {!loading && !error && <><div className="tour-grid listing-grid">{data?.items?.map(tour => <TourCard key={tour.id} tour={tour} />)}</div>{!data?.items?.length && count > 0 && <a className="btn outline explore-empty-reset" href="#/tours">Xóa bộ lọc và xem tất cả tour</a>}<Pagination page={page} total={data?.total || 0} limit={9} onChange={page => update({ page })} /></>}
        </div>
      </div>
    </section>
  </div>;
}
