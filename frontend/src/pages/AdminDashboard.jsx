import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { money, queryString, statusLabels } from '../utils.js';
import { Pagination, State } from '../components/UI.jsx';
import TourForm from '../components/TourForm.jsx';

export default function AdminDashboard() {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useApi(`/tours/admin?${queryString({ page, limit: 10, search, status })}`, revision);
  async function edit(tour) { setBusy(true); try { setForm(await api(`/tours/${tour.id}/admin`)); } catch (error) { setNotice(error.message); } finally { setBusy(false); } }
  async function remove(tour) {
    if (!window.confirm(`Xóa tour “${tour.name}”?`)) return;
    setBusy(true); try { await api(`/tours/${tour.id}`, { method: 'DELETE' }); setRevision(r => r + 1); setNotice('Đã xóa tour.'); } catch (error) { setNotice(error.message); } finally { setBusy(false); }
  }
  return <section className="container section"><div className="section-heading"><div><span className="eyebrow">KHÔNG GIAN ĐIỀU HÀNH</span><h1>Quản lý hành trình</h1><p>Tìm kiếm, tạo mới và cập nhật thông tin tour.</p></div>{can('tour:write') && <button className="btn" onClick={() => setForm({})}>+ Tạo tour mới</button>}</div><div className="admin-toolbar"><form onSubmit={e => { e.preventDefault(); setSearch(new FormData(e.currentTarget).get('search')); setPage(1); }}><input name="search" maxLength={120} placeholder="Tìm tên hoặc mã tour..." /><button className="btn small">Tìm kiếm</button></form><select aria-label="Lọc trạng thái tour" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">Tất cả trạng thái</option><option value="PUBLISHED">Đang mở bán</option><option value="DRAFT">Bản nháp</option><option value="HIDDEN">Đã ẩn</option></select></div>{notice && <p role="status" className="notice">{notice}</p>}<State loading={list.loading} error={list.error} empty={!list.loading && !list.error && !list.data?.items?.length} retry={() => setRevision(r => r + 1)} />{!!list.data?.items?.length && <div className="table-wrap"><table><thead><tr><th>Hành trình</th><th>Thời gian</th><th>Giá từ</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{list.data.items.map(tour => <tr key={tour.id}><td><small className="muted">{tour.code}</small><strong>{tour.name}</strong><small>ID: {tour.id}</small><small>{tour.departureCity || 'Chưa có điểm khởi hành'}</small></td><td>{tour.durationDays}N{tour.durationNights}Đ</td><td>{money(tour.fromPrice)}</td><td><span className={`status ${tour.status.toLowerCase()}`}>{statusLabels[tour.status]}</span></td><td><div className="table-actions">{can('tour:write') && <button className="text-button" disabled={busy} onClick={() => edit(tour)}>Sửa</button>}{can('tour:delete') && <button className="text-button danger" disabled={busy} onClick={() => remove(tour)}>Xóa</button>}</div></td></tr>)}</tbody></table></div>}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />{form && <TourForm tour={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); setRevision(r => r + 1); setNotice('Đã lưu thông tin tour.'); }} />}</section>;
}
