import React from 'react';

export function Icon({ name = 'arrow', size = 20, ...props }) {
  const paths = { arrow: 'M4 12h16m-6-6 6 6-6 6', search: 'm21 21-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0', pin: 'M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0', clock: 'M12 7v5l3 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0', check: 'm5 12 4 4L19 6', menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M6 18 18 6', sun: 'M12 2v2m0 16v2M2 12h2m16 0h2M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0', shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6', users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m3-4a4 4 0 0 1 0 8', heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8', calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2', globe: 'M2 12h20M12 2c6 6 6 14 0 20-6-6-6-14 0-20ZM22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0' };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || paths.arrow} /></svg>;
}
export function State({ loading, error, empty, retry }) {
  if (loading) return <div className="loading-grid" aria-label="Đang tải" role="status">{[1, 2, 3].map(n => <div className="skeleton" key={n} />)}</div>;
  if (error) return <div className="state error" role="alert"><Icon name="globe" size={32} /><h3>Chưa thể tải dữ liệu</h3><p>{error}</p>{retry && <button className="btn outline" onClick={retry}>Thử lại</button>}</div>;
  if (empty) return <div className="state"><Icon name="search" size={34} /><h3>Chưa có kết quả</h3><p>Hãy thử thay đổi bộ lọc hoặc quay lại sau.</p></div>;
  return null;
}
export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  if (pages < 2) return null;
  return <nav className="pagination" aria-label="Phân trang"><button disabled={page <= 1} onClick={() => onChange(page - 1)}>← Trước</button><span>Trang {page} / {pages}</span><button disabled={page >= pages} onClick={() => onChange(page + 1)}>Sau →</button></nav>;
}