import React, { useEffect, useRef, useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { date, money, queryString, statusLabels } from '../utils.js';
import { bookingActions, bookingStatuses, cancellationBody, validateDateRange } from '../staff-operations.js';
import { Icon, Pagination, State } from '../components/UI.jsx';
import { OperationBadge, OperationEmpty, OperationFacts, OperationHeader } from '../components/StaffOperations.jsx';

function BookingDetail({ id, revision, refresh, onClose }) {
  const { can } = useAuth();
  const detail = useApi(`/bookings/${encodeURIComponent(id)}`, revision);
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const item = detail.data;
  const allowed = bookingActions(item?.status, can);
  async function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const reason = String(data.get('reason') || '').trim();
    let suffix = action;
    let body;
    try {
      if (action === 'approve' || action === 'deny') { suffix = 'cancel-request/process'; body = cancellationBody(action === 'approve', reason); }
      else if (action === 'confirm') body = {};
      else { if (reason.length < (action === 'reject' ? 3 : 5)) throw new Error('Vui lòng nhập đầy đủ lý do xử lý.'); body = { reason }; }
    } catch (failure) { setError(failure.message); return; }
    const label = { confirm: 'xác nhận đơn', reject: 'từ chối đơn', cancel: 'hủy đơn trực tiếp', approve: 'duyệt yêu cầu hủy', deny: 'từ chối yêu cầu hủy' }[action];
    if (!window.confirm(`Bạn chắc chắn muốn ${label} ${item.code}?`)) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(`/bookings/${encodeURIComponent(id)}/${suffix}`, { method: 'PATCH', body });
      setAction(''); setNotice(`Đã ${label} thành công.`); refresh();
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  function choose(next) { setAction(next); setError(''); setNotice(''); }
  return <section className="ops-detail panel workspace-form" aria-label="Chi tiết đơn đặt tour" aria-busy={busy}>
    <div className="ops-detail-heading"><div><span className="ops-eyebrow">CHI TIẾT ĐƠN ĐẶT TOUR</span><h2>{item?.code || 'Đang tải đơn...'}</h2></div><button className="ops-close" type="button" disabled={busy} onClick={onClose} aria-label="Đóng chi tiết đơn"><Icon name="close" /></button></div>
    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="notice error" role="alert">{error}</p>}
    <State loading={detail.loading} error={detail.error} retry={refresh} />
    {item && <><div className="ops-detail-summary"><div><h3>{item.tourName}</h3><p><Icon name="calendar" size={15} />{date(item.startDate)} – {date(item.endDate)}</p></div><OperationBadge status={item.status} /></div>
      <OperationFacts facts={[[ 'Khách liên hệ', item.contactName ], ['Số điện thoại', item.contactPhone], ['Email', item.contactEmail], ['Ngày đặt', date(String(item.createdAt || '').slice(0, 10))], ['Số hành khách', `${item.passengerCount ?? item.passengers?.length ?? 0} người`], ['Tổng tiền đơn', money(item.total)]]} />
      <div className="ops-price-line"><span>Tạm tính: <strong>{money(item.subtotal)}</strong></span><span>Giảm giá: <strong>{money(item.discount)}</strong></span><span>Thành tiền: <strong>{money(item.total)}</strong></span></div>
      {can('schedule:read') && item.scheduleId && <a className="ops-view ops-open-schedule" href={`#/staff?tab=schedules&schedule=${encodeURIComponent(item.scheduleId)}`}>Xem lịch khởi hành của đơn <Icon name="arrow" size={15} /></a>}<p className="ops-hint">Trạng thái đơn không thay thế kết quả thanh toán. Đối chiếu giao dịch trước khi xác nhận.</p>
      <h3 className="ops-subtitle">Danh sách hành khách</h3><div className="ops-table-scroll"><table className="ops-table"><thead><tr><th>Họ tên</th><th>Ngày sinh</th><th>Loại vé</th><th>Giá vé</th></tr></thead><tbody>{item.passengers?.map(person => <tr key={person.id}><td>{person.fullName}</td><td>{date(person.dob)}</td><td>{{ ADULT: 'Người lớn', CHILD: 'Trẻ em', INFANT: 'Em bé' }[person.type] || person.type}</td><td>{money(person.unitPrice)}</td></tr>)}</tbody></table></div>
      {item.note && <p className="ops-note"><strong>Ghi chú:</strong> {item.note}</p>}
      {!!item.cancelRequests?.length && <div className="ops-cancel-history"><h3 className="ops-subtitle">Yêu cầu hủy & chính sách đã ghi nhận</h3>{item.cancelRequests.map(request => <article key={request.id}><div className="row-between"><strong>{{ PENDING: 'Chờ duyệt', APPROVED: 'Đã duyệt hủy', REJECTED: 'Đã từ chối' }[request.status] || request.status}</strong><small>{date(String(request.createdAt || '').slice(0, 10))}</small></div><p>{request.reason}</p><div className="ops-price-line"><span>Phí hủy: <strong>{money(request.feeAmount)} ({request.feePercent}%)</strong></span><span>Hoàn theo chính sách: <strong>{money(request.refundAmount)}</strong></span></div>{request.rejectReason && <p>Lý do từ chối: {request.rejectReason}</p>}</article>)}<p className="ops-hint">Duyệt hủy không tự động hoàn tiền. Số tiền theo chính sách được backend lưu tại thời điểm gửi yêu cầu.</p></div>}
      {(allowed.confirm || allowed.process || allowed.cancel) ? <div className="ops-processing"><h3 className="ops-subtitle">Xử lý đơn</h3><div className="ops-action-buttons">
        {allowed.confirm && <><button className="btn" disabled={busy} onClick={() => choose('confirm')}>Xác nhận đơn</button><button className="btn outline" disabled={busy} onClick={() => choose('reject')}>Từ chối đơn</button></>}
        {allowed.process && <><button className="btn" disabled={busy} onClick={() => choose('approve')}>Duyệt yêu cầu hủy</button><button className="btn outline" disabled={busy} onClick={() => choose('deny')}>Từ chối yêu cầu hủy</button></>}
        {allowed.cancel && <button className="btn outline ops-danger" disabled={busy} onClick={() => choose('cancel')}>Hủy đơn trực tiếp</button>}
      </div>{action && <form className="ops-action-form" onSubmit={submit}><h4>{{ confirm: 'Xác nhận đặt tour', reject: 'Từ chối đơn đặt tour', approve: 'Duyệt hủy theo chính sách', deny: 'Từ chối yêu cầu hủy', cancel: 'Hủy đơn trực tiếp' }[action]}</h4>{['reject', 'deny', 'cancel'].includes(action) ? <label>Lý do xử lý<textarea name="reason" key={action} required minLength={action === 'cancel' ? 5 : action === 'reject' ? 3 : 1} maxLength={action === 'cancel' ? 1000 : 500} rows={3} disabled={busy} placeholder="Nhập lý do rõ ràng để khách hàng được thông báo..." /></label> : <p>{action === 'approve' ? 'Đơn sẽ chuyển sang đã hủy, chỗ được trả lại theo nghiệp vụ backend. Không thực hiện hoàn tiền tự động.' : 'Chỉ xác nhận sau khi đã kiểm tra thông tin khách, lịch đi và giao dịch liên quan.'}</p>}<div className="ops-action-buttons"><button className="btn" disabled={busy}>{busy ? 'Đang xử lý...' : 'Xác nhận xử lý'}</button><button type="button" className="btn outline" disabled={busy} onClick={() => choose('')}>Quay lại</button></div></form>}</div> : <p className="ops-readonly"><Icon name="shield" size={17} />Đơn này hiện không có thao tác khả dụng theo trạng thái và quyền của bạn.</p>}
    </>}
  </section>;
}

export default function StaffBookings({ initialSearch = '', initialSelected = '' }) {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: initialSearch, status: '', fromDate: '', toDate: '' });
  const [selected, setSelected] = useState(initialSelected);
  const [openSequence, setOpenSequence] = useState(0);
  const detailRef = useRef(null);
  const triggerRef = useRef(null);
  useEffect(() => {
    if (!selected) return;
    const frame = requestAnimationFrame(() => {
      detailRef.current?.focus({ preventScroll: true });
      detailRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected, openSequence]);
  function openBooking(id, event) {
    triggerRef.current = event.currentTarget;
    setSelected(id);
    setOpenSequence(value => value + 1);
  }
  function closeBooking() {
    setSelected('');
    if (triggerRef.current?.isConnected) triggerRef.current.focus();
  }
  const [revision, setRevision] = useState(0);
  const [filterError, setFilterError] = useState('');
  const list = useApi(`/bookings?${queryString({ page, limit: 10, ...filters })}`, revision);
  const rows = list.data?.items || [];
  const refresh = () => setRevision(value => value + 1);
  function filter(event) {
    event.preventDefault(); const data = Object.fromEntries(new FormData(event.currentTarget));
    try { validateDateRange(data.fromDate, data.toDate); setFilters(data); setPage(1); setFilterError(''); }
    catch (failure) { setFilterError(failure.message); }
  }
  return <div className="ops-page ops-bookings">
    <OperationHeader icon="bag" eyebrow="NGHIỆP VỤ NHÂN VIÊN" title="Xử lý đơn đặt tour" description="Theo dõi đặt chỗ, kiểm tra hành khách và xử lý yêu cầu của khách hàng." onRefresh={refresh} />
    <div className="ops-overview"><div><span>Tổng kết quả</span><strong>{list.loading ? '…' : list.data?.total ?? '—'}</strong><small>Theo bộ lọc đang áp dụng</small></div><div><span>Chờ xác nhận</span><strong>{rows.filter(item => item.status === 'PENDING_CONFIRMATION').length}</strong><small>Trong trang hiện tại</small></div><div><span>Yêu cầu hủy</span><strong>{rows.filter(item => item.status === 'CANCEL_REQUESTED').length}</strong><small>Trong trang hiện tại</small></div><div><span>Đã xác nhận</span><strong>{rows.filter(item => item.status === 'CONFIRMED').length}</strong><small>Trong trang hiện tại</small></div></div>
    <section className="ops-card"><form className="ops-filters admin-toolbar" onSubmit={filter}><label className="ops-search-field">Tìm kiếm<div><Icon name="search" size={17} /><input name="search" defaultValue={initialSearch} maxLength={120} placeholder="Mã đơn, tên khách, số điện thoại" /></div></label><label>Trạng thái<select name="status" defaultValue=""><option value="">Tất cả trạng thái</option>{bookingStatuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label><label>Ngày đi từ<input type="date" name="fromDate" /></label><label>Đến ngày<input type="date" name="toDate" /></label><button className="btn" type="submit">Lọc đơn</button><button className="btn outline" type="button" onClick={event => { event.currentTarget.form.reset(); event.currentTarget.form.elements.search.value = ''; setFilters({ search: '', status: '', fromDate: '', toDate: '' }); setPage(1); setFilterError(''); }}>Đặt lại</button></form>
      {filterError && <p className="notice error" role="alert">{filterError}</p>}
      <div className="ops-list-title"><h2>Danh sách đơn đặt tour</h2><span>{list.data?.total ?? 0} kết quả · Trang {page}</span></div><State loading={list.loading} error={list.error} retry={refresh} />
      {!list.loading && !list.error && (rows.length ? <div className="ops-table-scroll"><table className="ops-table"><thead><tr><th>Mã booking / Ngày đặt</th><th>Khách hàng</th><th>Tour / Khởi hành</th><th>Số khách</th><th>Giá trị đơn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{rows.map(item => <tr key={item.id} className={selected === item.id ? 'selected' : ''}><td><button className="text-button" onClick={event => openBooking(item.id, event)}>{item.code}</button><small>{date(String(item.createdAt || '').slice(0, 10))}</small></td><td><strong>{item.contactName}</strong><small>{item.contactPhone}</small></td><td><strong>{item.tourName}</strong><small><Icon name="calendar" size={13} />{date(item.startDate)}</small></td><td>{item.passengerCount} người</td><td className="ops-money">{money(item.total)}</td><td><OperationBadge status={item.status} /></td><td><button className="ops-view" onClick={event => openBooking(item.id, event)} aria-label={`Xử lý đơn ${item.code}`}>Xử lý <Icon name="arrow" size={14} /></button></td></tr>)}</tbody></table></div> : <OperationEmpty>Thử thay đổi từ khóa, ngày đi hoặc trạng thái để tìm đơn.</OperationEmpty>)}
      <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
    </section>
    {selected && <div ref={detailRef} className="ops-booking-detail-target" tabIndex={-1} role="region" aria-label="Khu vực xử lý đơn được chọn"><BookingDetail key={selected} id={selected} revision={revision} refresh={refresh} onClose={closeBooking} /></div>}
  </div>;
}


