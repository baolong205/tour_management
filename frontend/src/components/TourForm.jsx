import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api } from '../services/api.js';

export default function TourForm({ tour, onSaved, onClose }) {
  const policies = useApi('/catalog/cancel-policies');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...values, durationDays: Number(values.durationDays), durationNights: Number(values.durationNights) };
    try { await api(tour ? `/tours/${tour.id}` : '/tours', { method: tour ? 'PATCH' : 'POST', body }); onSaved(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label={tour ? 'Sửa tour' : 'Thêm tour'}><button className="modal-close icon-button" onClick={onClose} aria-label="Đóng">×</button><h2>{tour ? 'Cập nhật tour' : 'Tạo hành trình mới'}</h2><p className="muted">Thông tin cơ bản của tour. Giá bán được cấu hình ở lịch khởi hành trong backend.</p><form onSubmit={submit}><label>Tên tour<input name="name" defaultValue={tour?.name} minLength={3} maxLength={200} required /></label><label>Đường dẫn (slug)<input name="slug" defaultValue={tour?.slug} minLength={3} maxLength={220} pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="da-nang-hoi-an-4n3d" required /></label><div className="form-grid"><label>Số ngày<input name="durationDays" type="number" min={1} max={365} defaultValue={tour?.durationDays || 1} required /></label><label>Số đêm<input name="durationNights" type="number" min={0} max={365} defaultValue={tour?.durationNights || 0} required /></label></div><label>Thành phố khởi hành<input name="departureCity" defaultValue={tour?.departureCity || ''} maxLength={100} /></label><label>Giới thiệu ngắn<textarea name="summary" defaultValue={tour?.summary || ''} maxLength={500} rows={3} /></label><label>Chính sách hủy<select name="cancelPolicyId" required defaultValue={tour?.cancelPolicy?.id || ''}><option value="" disabled>Chọn chính sách hủy</option>{policies.data?.map(policy => <option value={policy.id} key={policy.id}>{policy.name}</option>)}</select></label>{policies.error && <p className="notice error">{policies.error}</p>}{!policies.loading && !policies.error && !policies.data?.length && <p className="notice">Cần tạo chính sách hủy trong backend trước khi tạo tour.</p>}<label>Trạng thái<select name="status" defaultValue={tour?.status || 'DRAFT'}><option value="DRAFT">Bản nháp</option><option value="PUBLISHED">Công bố</option><option value="HIDDEN">Ẩn</option></select></label>{error && <p className="notice error" role="alert">{error}</p>}<button className="btn full" disabled={busy || policies.loading || !policies.data?.length}>{busy ? 'Đang lưu...' : 'Lưu tour'}</button></form></section></div>;
}
