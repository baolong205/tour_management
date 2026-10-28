import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { pickupBody } from '../pickup.js';
import { Icon } from './UI.jsx';

export default function PickupEditor({ schedule, onSaved }) {
  const { can } = useAuth();
  const [open, setOpen] = useState(false);
  const [meetingPoint, setMeetingPoint] = useState('');
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!can('schedule:write')) return <p className="ops-hint">Liên hệ người có quyền chỉnh sửa lịch để bổ sung lịch đón và điểm hẹn.</p>;
  if (['ONGOING', 'COMPLETED', 'CANCELLED'].includes(schedule.status)) return <p className="ops-hint">Lịch đã chốt, không thể chỉnh sửa lịch đón và điểm hẹn.</p>;
  function start() {
    setMeetingPoint(schedule.meetingPoint || '');
    setRows([...(schedule.checkpoints || [])].sort((a, b) => a.dayNo - b.dayNo || a.sortOrder - b.sortOrder).map(row => ({ name: row.name, dayNo: row.dayNo, meetTime: row.meetTime })));
    setError(''); setOpen(true);
  }
  function change(index, name, value) { setRows(current => current.map((row, i) => i === index ? { ...row, [name]: value } : row)); }
  async function save(event) {
    event.preventDefault(); setError('');
    let body;
    try { body = pickupBody(meetingPoint, rows); } catch (failure) { setError(failure.message); return; }
    if (!window.confirm('Lưu điểm tập trung và thay thế danh sách điểm đón của lịch này?')) return;
    setBusy(true);
    try { await api(`/schedules/${encodeURIComponent(schedule.id)}`, { method: 'PATCH', body }); setOpen(false); onSaved(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="ops-pickup-editor">{!open ? <button className="btn outline" type="button" onClick={start}><Icon name="pin" size={16} />Thêm / sửa lịch đón & điểm hẹn</button> : <form className="ops-action-form" onSubmit={save}><h4>Lịch đón & điểm hẹn</h4><p>Ngày 1 là ngày khởi hành. Danh sách bên dưới sẽ thay thế toàn bộ điểm đón hiện có khi lưu.</p><fieldset disabled={busy}><label>Điểm tập trung chung<input name="meetingPoint" value={meetingPoint} onChange={event => setMeetingPoint(event.target.value)} maxLength={255} placeholder="Ví dụ: Sân bay Nội Bài – Cột 12" /></label>{rows.map((row, index) => <div className="ops-pickup-row" key={index}><label>Ngày thứ<input type="number" min={1} max={365} required value={row.dayNo} onChange={event => change(index, 'dayNo', event.target.value)} /></label><label>Giờ đón<input type="time" step={1} required value={row.meetTime} onChange={event => change(index, 'meetTime', event.target.value)} /></label><label>Tên điểm hẹn<input required maxLength={200} value={row.name} onChange={event => change(index, 'name', event.target.value)} placeholder="Địa chỉ / vị trí đón khách" /></label><button className="ops-close" type="button" aria-label={`Xóa điểm đón ${index + 1}`} onClick={() => setRows(current => current.filter((_, i) => i !== index))}><Icon name="close" size={17} /></button></div>)}<button className="btn outline" type="button" disabled={rows.length >= 30} onClick={() => setRows(current => [...current, { name: '', dayNo: 1, meetTime: '07:00' }])}>+ Thêm điểm đón</button><small className="ops-hint">{rows.length}/30 điểm đón. Xóa hết rồi lưu để bỏ toàn bộ điểm đón; để trống điểm tập trung để xóa giá trị cũ.</small></fieldset>{error && <p className="notice error" role="alert">{error}</p>}<div className="ops-action-buttons"><button className="btn" disabled={busy}>{busy ? 'Đang lưu...' : 'Lưu lịch đón & điểm hẹn'}</button><button className="btn outline" type="button" disabled={busy} onClick={() => setOpen(false)}>Hủy chỉnh sửa</button></div></form>}</div>;
}