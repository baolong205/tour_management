import React, { useEffect, useRef, useState } from 'react';
import ScheduleBookings from '../components/ScheduleBookings.jsx';
import PickupEditor from '../components/PickupEditor.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks.js';
import { api } from '../services/api.js';
import { date, money, queryString } from '../utils.js';
import { scheduleLabels, validateDateRange } from '../staff-operations.js';
import { management } from '../management.js';
import ActionForm from '../components/ActionForm.jsx';
import { Icon, Pagination, State } from '../components/UI.jsx';
import { OperationBadge, OperationEmpty, OperationFacts, OperationHeader } from '../components/StaffOperations.jsx';

export default function StaffSchedules({ initialSelected = '' }) {
  const { can } = useAuth();
  const writable = can('schedule:write');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [filters, setFilters] = useState({ status: '', fromDate: '', toDate: '' });
  const [selected, setSelected] = useState(initialSelected);
  const detailRef = useRef(null);
  useEffect(() => {
    if (selected) { detailRef.current?.focus({ preventScroll: true }); detailRef.current?.scrollIntoView({ block: 'start' }); }
  }, [selected]);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const list = useApi(`/schedules?${queryString({ page, limit: 10, ...filters })}`, revision);
  const detail = useApi(selected ? `/schedules/${encodeURIComponent(selected)}` : null, revision);
  const rows = list.data?.items || [];
  const item = detail.data;
  const refresh = () => setRevision(value => value + 1);
  function filter(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try { validateDateRange(values.fromDate, values.toDate); setFilters(values); setPage(1); setError(''); }
    catch (failure) { setError(failure.message); }
  }
  async function remove() {
    if (!writable || !item || !window.confirm(`Xóa lịch ${item.tourName} ngày ${date(item.startDate)}? Backend chỉ cho xóa khi chưa bán hoặc giữ chỗ.`)) return;
    setBusy(true); setError(''); setNotice('');
    try { await api(`/schedules/${encodeURIComponent(selected)}`, { method: 'DELETE' }); setSelected(''); setEditing(null); setNotice('Đã xóa lịch khởi hành.'); refresh(); }
    catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  return <div className="ops-page ops-schedules">
    <OperationHeader icon="calendar" eyebrow="ĐIỀU PHỐI HÀNH TRÌNH" title="Lịch khởi hành" description="Tra cứu ngày đi, sức chứa thực tế và điểm tập trung của từng hành trình." onRefresh={refresh}>{writable && <button className="btn" onClick={() => { setEditing({}); setNotice(''); }}>+ Thêm lịch</button>}</OperationHeader>
    <div className="ops-overview"><div><span>Tổng lịch</span><strong>{list.loading ? '…' : list.data?.total ?? '—'}</strong><small>Theo bộ lọc đang áp dụng</small></div><div><span>Đang mở bán</span><strong>{rows.filter(row => row.status === 'OPEN').length}</strong><small>Trong trang hiện tại</small></div><div><span>Chỗ còn trống</span><strong>{rows.reduce((sum, row) => sum + (Number(row.availableSeats) || 0), 0)}</strong><small>Mọi trạng thái · trang hiện tại</small></div><div><span>Đang giữ chỗ</span><strong>{rows.reduce((sum, row) => sum + (Number(row.heldSeats) || 0), 0)}</strong><small>Trong trang hiện tại</small></div></div>
    {!writable && <p className="ops-readonly"><Icon name="shield" size={17} />Chế độ tra cứu. Liên hệ quản trị viên khi cần điều chỉnh lịch khởi hành.</p>}
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="notice error" role="alert">{error}</p>}
    <section className="ops-card"><form className="ops-filters admin-toolbar" onSubmit={filter}><label>Trạng thái<select name="status"><option value="">Tất cả trạng thái</option>{Object.entries(scheduleLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>Khởi hành từ<input type="date" name="fromDate" /></label><label>Đến ngày<input type="date" name="toDate" /></label><button className="btn">Lọc lịch</button><button className="btn outline" type="button" onClick={event => { event.currentTarget.form.reset(); setFilters({ status: '', fromDate: '', toDate: '' }); setPage(1); setError(''); }}>Đặt lại</button></form>
      <div className="ops-list-title"><h2>Danh sách lịch khởi hành</h2><span>{list.data?.total ?? 0} kết quả · Trang {page}</span></div><State loading={list.loading} error={list.error} retry={refresh} />
      {!list.loading && !list.error && (rows.length ? <div className="ops-table-scroll"><table className="ops-table"><thead><tr><th>Hành trình</th><th>Khởi hành / Kết thúc</th><th>Giá người lớn</th><th>Chỗ trống / Tổng</th><th>Đã bán / Giữ</th><th>Trạng thái</th><th>Chi tiết</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={selected === row.id ? 'selected' : ''}><td><strong>{row.tourName}</strong><small>{row.tourCode || 'Chưa có mã tour'}</small></td><td><strong>{date(row.startDate)}</strong><small>Đến {date(row.endDate)}</small></td><td className="ops-money">{money(row.priceAdult)}</td><td><strong>{row.availableSeats ?? '—'} / {row.maxSeats ?? '—'}</strong><div className="ops-seat-track"><span style={{ width: `${row.maxSeats > 0 ? Math.min(100, Math.max(0, (Number(row.soldSeats || 0) + Number(row.heldSeats || 0)) / row.maxSeats * 100)) : 0}%` }} /></div></td><td>{row.soldSeats ?? '—'} bán<small>{row.heldSeats ?? '—'} đang giữ</small></td><td><OperationBadge status={row.status} /></td><td><button className="ops-view" aria-label={`Xem lịch ${row.tourName}`} onClick={() => { setSelected(row.id); setEditing(null); setError(''); }}>Xem <Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table></div> : <OperationEmpty>Chưa có lịch phù hợp. Hãy thử thay đổi khoảng ngày hoặc trạng thái.</OperationEmpty>)}
      <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
    </section>
    {selected && <section ref={detailRef} tabIndex={-1} className="ops-detail panel workspace-form" aria-label="Chi tiết lịch khởi hành"><div className="ops-detail-heading"><div><span className="ops-eyebrow">THÔNG TIN HÀNH TRÌNH</span><h2>{item?.tourName || 'Chi tiết lịch khởi hành'}</h2></div><button className="ops-close" aria-label="Đóng chi tiết lịch" disabled={busy} onClick={() => { setSelected(''); setEditing(null); }}><Icon name="close" /></button></div><State loading={detail.loading} error={detail.error} retry={refresh} />{item && <><OperationBadge status={item.status} /><OperationFacts facts={[[ 'Mã tour', item.tourCode ], ['Ngày khởi hành', date(item.startDate)], ['Ngày kết thúc', date(item.endDate)], ['Điểm tập trung', item.meetingPoint || 'Chưa có điểm tập trung'], ['Tổng số chỗ', item.maxSeats], ['Chỗ trống thực tế', item.availableSeats], ['Đã bán', item.soldSeats], ['Đang giữ', item.heldSeats]]} /><div className="ops-price-line"><span>Người lớn <strong>{money(item.priceAdult)}</strong></span><span>Trẻ em <strong>{money(item.priceChild)}</strong></span><span>Em bé <strong>{money(item.priceInfant)}</strong></span></div><p className="ops-hint">Chỗ trống = tổng chỗ − chỗ đã bán − chỗ giữ còn hiệu lực. Có chỗ trống không đồng nghĩa lịch đang mở bán.</p><h3 className="ops-subtitle">Lịch đón & điểm hẹn</h3>{item.checkpoints?.length ? <ol className="ops-checkpoints">{[...item.checkpoints].sort((a, b) => a.dayNo - b.dayNo || a.sortOrder - b.sortOrder).map(checkpoint => <li key={checkpoint.id}><span><Icon name="pin" size={18} /></span><div><strong>{checkpoint.name}</strong><small>Ngày {checkpoint.dayNo} · {checkpoint.meetTime}</small></div></li>)}</ol> : <p className="ops-hint">Chưa có lịch đón chi tiết.</p>}<PickupEditor key={selected + ':pickup'} schedule={item} onSaved={() => { setNotice('Đã lưu lịch đón và điểm hẹn.'); refresh(); }} /><ScheduleBookings key={selected} scheduleId={selected} revision={revision} />{writable && <div className="ops-action-buttons"><button className="btn" disabled={busy} onClick={() => setEditing(item)}>Chỉnh sửa lịch</button><button className="btn outline ops-danger" disabled={busy} onClick={remove}>Xóa lịch</button></div>}</>}</section>}
    {writable && editing && <section className="ops-detail panel workspace-form"><div className="ops-detail-heading"><h2>{editing.id ? 'Chỉnh sửa lịch khởi hành' : 'Thêm lịch khởi hành'}</h2><button className="ops-close" aria-label="Đóng biểu mẫu lịch" onClick={() => setEditing(null)}><Icon name="close" /></button></div><ActionForm key={editing.id || 'new'} path={editing.id ? `/schedules/${editing.id}` : '/schedules'} method={editing.id ? 'PATCH' : 'POST'} fields={management.schedules.fields} initial={editing} label="Lưu lịch khởi hành" onSuccess={() => { setEditing(null); setNotice('Đã lưu lịch khởi hành.'); refresh(); }} /></section>}
  </div>;
}

