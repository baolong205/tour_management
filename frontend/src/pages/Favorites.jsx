import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api } from '../services/api.js';
import TourCard from '../components/TourCard.jsx';
import { Icon, State } from '../components/UI.jsx';

export default function Favorites() {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useApi('/tours/me/favorites', revision);
  const [busy, setBusy] = useState(null);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  async function removeFavorite(tour) {
    setBusy(tour.id);
    setNotice('');
    setActionError('');
    try {
      await api(`/tours/${tour.id}/favorite`, { method: 'DELETE' });
      setNotice(`Đã bỏ “${tour.name}” khỏi danh sách yêu thích.`);
      setRevision(value => value + 1);
    } catch (error) {
      setActionError(error.message);
    } finally {
      setBusy(null);
    }
  }

  return <>
    <div className="page-banner"><div className="container">
      <span className="eyebrow">HÀNH TRÌNH BẠN ĐÃ LƯU</span>
      <h1>Tour yêu thích của tôi</h1>
      <p>Những tour bạn đã bấm yêu thích, sẵn sàng cho chuyến đi tiếp theo.</p>
    </div></div>
    <section className="container section" aria-label="Danh sách tour yêu thích">
      {notice && <p className="notice" role="status">{notice}</p>}
      {actionError && <p className="notice error" role="alert">{actionError}</p>}
      <State loading={loading} error={error} retry={() => setRevision(value => value + 1)} />
      {!loading && !error && (data?.length ? <>
        <div className="results-heading"><p><strong>{data.length}</strong> tour đã lưu</p><a className="btn outline" href="#/tours">Khám phá thêm tour</a></div>
        <div className="tour-grid">{data.map(tour => <div key={tour.id}>
          <TourCard tour={tour} />
          <button className="text-button" disabled={busy !== null} onClick={() => removeFavorite(tour)} aria-label={`Bỏ yêu thích ${tour.name}`}>
            <Icon name="heart" size={16} /> {busy === tour.id ? 'Đang bỏ yêu thích...' : 'Bỏ yêu thích'}
          </button>
        </div>)}</div>
      </> : <div className="state"><Icon name="heart" size={34} /><h2>Bạn chưa lưu tour yêu thích nào</h2><p>Mở chi tiết một tour và bấm “Yêu thích” để lưu vào đây.</p><a className="btn" href="#/tours">Khám phá tour</a></div>)}
    </section>
  </>;
}