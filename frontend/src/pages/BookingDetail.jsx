import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api, assetUrl } from '../services/api.js';
import { date, money, statusLabels } from '../utils.js';
import { bookingProgress, canRequestCancellation, passengerGroups, passengerLabels, paymentMethodLabels } from '../booking-view.js';
import { Icon, State } from '../components/UI.jsx';

const tabs = [['overview', 'Tổng quan'], ['passengers', 'Thông tin hành khách'], ['itinerary', 'Lịch trình'], ['payments', 'Thanh toán'], ['policy', 'Chính sách'], ['support', 'Hỗ trợ']];
const dateTime = value => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có thông tin';
const paymentStatuses = { PENDING: 'Chờ thanh toán', SUCCESS: 'Thành công', PROOF_SUBMITTED: 'Đã gửi chứng từ', FAILED: 'Thất bại', EXPIRED: 'Hết hạn', REFUNDED: 'Đã hoàn tiền', PARTIALLY_REFUNDED: 'Đã hoàn một phần' };
function InfoRows({ rows }) {
  return <dl className="booking-info-rows">{rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value ?? 'Chưa có thông tin'}</dd></div>)}</dl>;
}

export default function BookingDetail({ id }) {
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState('overview');
  const [imageIndex, setImageIndex] = useState(0);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const booking = useApi(`/bookings/${id}`, revision);
  const tour = useApi(booking.data?.tourId ? `/tours/${booking.data.tourId}` : null);
  const payment = useApi(booking.data ? `/payments/booking/${id}` : null, revision);
  const refresh = () => setRevision(value => value + 1);
  async function requestCancel(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await api(`/bookings/${id}/cancel-request`, { method: 'POST', body: { reason: new FormData(event.currentTarget).get('reason') } });
      setCancelOpen(false); refresh();
    } catch (failure) { setError(failure.message); } finally { setBusy(false); }
  }
  function downloadInvoice() {
    // Export only the invoice actually issued by the backend, not a fabricated receipt.
    const invoice = booking.data.invoice;
    if (!invoice) return;
    const blob = new Blob([JSON.stringify(invoice, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `hoa-don-${invoice.number.replace(/[^a-z0-9_-]/gi, '_')}.json`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (!booking.data) return <><a className="text-button" href="#/bookings">← Về tour của tôi</a><State loading={booking.loading} error={booking.error} retry={refresh} /></>;
  const item = booking.data;
  const product = tour.data;
  const images = [...(product?.images || [])].sort((a, b) => Number(b.isCover) - Number(a.isCover));
  const activeImage = images[Math.min(imageIndex, Math.max(0, images.length - 1))]?.url;
  const groups = passengerGroups(item.passengers);
  const passengerText = groups.map(group => `${group.quantity} ${group.label.toLowerCase()}`).join(', ') || `${item.passengerCount} hành khách`;
  const steps = bookingProgress(item, payment.data);
  const destinations = product?.destinations?.map(place => place.name).filter(Boolean).join(' – ');
  const latestPayment = payment.data?.payments?.[0];
  const status = <span className={`order-status status-${item.status.toLowerCase()}`}><Icon name={['CONFIRMED', 'COMPLETED'].includes(item.status) ? 'check' : 'clock'} size={14} />{statusLabels[item.status] || item.status}</span>;
  const tourRows = [['Điểm đến', destinations || 'Xem trong lịch trình'], ['Thời gian', product ? `${product.durationDays} ngày ${product.durationNights} đêm` : `${date(item.startDate)} – ${date(item.endDate)}`], ['Khởi hành', product?.departureCity || 'Chưa cập nhật'], ['Ngày đi', date(item.startDate)], ['Ngày về', date(item.endDate)], ['Số lượng khách', passengerText]];
  let content;
  if (tab === 'overview') content = <div className="booking-overview-grid"><section className="panel"><h2>Thông tin đơn đặt tour</h2><InfoRows rows={[
    ['Mã đặt tour', item.code], ['Ngày đặt', dateTime(item.createdAt)], ['Trạng thái', status], ['Phương thức thanh toán', payment.error ? 'Không tải được dữ liệu' : payment.loading ? 'Đang tải...' : paymentMethodLabels[latestPayment?.method] || latestPayment?.method || 'Chưa có giao dịch'], ['Ghi chú', item.note || 'Không có'],
  ]} /></section><section className="panel"><h2>Thông tin tour</h2><InfoRows rows={tourRows} /></section><section className="panel booking-contact"><h2>Thông tin liên hệ đặt tour</h2><InfoRows rows={[
    ['Họ và tên', item.contactName], ['Email', item.contactEmail], ['Số điện thoại', item.contactPhone], ...(item.expiresAt ? [['Hạn xử lý đơn', dateTime(item.expiresAt)]] : []),
  ]} /></section></div>;
  else if (tab === 'passengers') content = <section className="panel"><h2>Thông tin hành khách</h2><div className="table-wrap"><table><thead><tr><th>Họ tên</th><th>Ngày sinh</th><th>Loại vé</th><th>Giá vé</th></tr></thead><tbody>{item.passengers.map(passenger => <tr key={passenger.id}><td>{passenger.fullName}</td><td>{date(passenger.dob)}</td><td>{passengerLabels[passenger.type] || passenger.type}</td><td>{money(passenger.unitPrice)}</td></tr>)}</tbody></table></div></section>;
  else if (tab === 'itinerary') content = <section className="panel"><h2>Lịch trình hành trình</h2><State loading={tour.loading} error={tour.error} />{product?.itinerary?.length ? [...product.itinerary].sort((a, b) => a.dayNo - b.dayNo).map(day => <details className="itinerary-day" key={day.id || day.dayNo} open><summary>Ngày {day.dayNo}: {day.title}</summary><p className="pre-line">{day.content || 'Chưa cập nhật nội dung.'}</p>{day.meals && <small>Bữa ăn: {day.meals}</small>}</details>) : !tour.loading && !tour.error && <p>Lịch trình chưa được cập nhật.</p>}<p className="booking-data-note">Thông tin tour hiện tại; liên hệ CSKH để xác nhận các thay đổi liên quan đến đơn đã đặt.</p></section>;
  else if (tab === 'payments') content = <section className="panel"><h2>Lịch sử thanh toán của đơn</h2><State loading={payment.loading} error={payment.error} retry={refresh} />{payment.data && <><InfoRows rows={[
    ['Tổng tiền', money(item.total)], ['Đã nhận', money(payment.data.paidTotal)], ['Đã hoàn', money(payment.data.refundedTotal)], ['Còn phải thanh toán', money(payment.data.outstanding)],
  ]} />{payment.data.payments?.length ? payment.data.payments.map(transaction => <div className="booking-transaction" key={transaction.id}><strong>{paymentMethodLabels[transaction.method] || transaction.method}</strong><span>{paymentStatuses[transaction.status] || transaction.status}</span><strong>{money(transaction.amount)}</strong></div>) : <p>Chưa có giao dịch thanh toán.</p>}<a className="btn" href={`#/payment/${id}`}>Xem thanh toán & chứng từ <Icon name="arrow" size={16} /></a></>}</section>;
  else if (tab === 'policy') content = <section className="panel"><h2>Chính sách & yêu cầu hủy</h2><p>Phí hủy thực tế được backend tính và lưu tại thời điểm gửi yêu cầu. Gửi yêu cầu không đồng nghĩa đã được hủy hoặc hoàn tiền.</p>{product?.cancelPolicy ? <><h3>{product.cancelPolicy.name}</h3><p>{product.cancelPolicy.description}</p>{product.cancelPolicy.rules?.map(rule => <p key={rule.daysBefore}>Trước ngày đi {rule.daysBefore} ngày: phí {rule.feePercent}%.</p>)}<p className="booking-data-note">Chính sách tour hiện tại để tham khảo; kết quả xử lý theo dữ liệu yêu cầu đã lưu bên dưới.</p></> : <p>Liên hệ CSKH để xác nhận chính sách áp dụng.</p>}{item.cancelRequests?.map(request => <article className="booking-cancel-record" key={request.id}><strong>Yêu cầu ngày {dateTime(request.createdAt)}</strong><p>{request.reason}</p><p>Trạng thái: {({ PENDING: 'Chờ xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Đã từ chối' })[request.status] || request.status}</p><p>Phí hủy: {money(request.feeAmount)} · Dự kiến hoàn theo yêu cầu: {money(request.refundAmount)}</p>{request.rejectReason && <p>Lý do từ chối: {request.rejectReason}</p>}</article>)}</section>;
  else content = <section className="panel"><h2>Hỗ trợ cho đơn {item.code}</h2><p>Gửi yêu cầu kèm mã đặt tour để nhân viên tra cứu và phản hồi. Đây là hỗ trợ qua yêu cầu, chưa phải chat trực tiếp.</p><a className="btn" href="#/support"><Icon name="headset" />Gửi yêu cầu hỗ trợ</a></section>;

  return <article className="booking-detail-page">
    <nav className="account-breadcrumbs" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>›</span><a href="#/account/overview">Tài khoản</a><span>›</span><a href="#/bookings">Tour của tôi</a><span>›</span><span>Chi tiết đơn đặt tour</span></nav>
    <div className="order-page-heading"><a className="order-back" href="#/bookings" aria-label="Về tour của tôi"><Icon name="back" size={26} /></a><div><h1>Chi tiết đơn đặt tour</h1><div className="order-subheading"><span>Mã đặt tour: <strong>{item.code}</strong></span>{status}</div></div><small>Đặt ngày {dateTime(item.createdAt)}</small></div>
    <div className="order-detail-grid"><div className="order-primary">
      <section className="panel order-tour-card"><div className="order-tour-summary"><div className="order-gallery"><img className="order-cover" src={assetUrl(activeImage)} alt={item.tourName} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} />{images.length > 1 && <div className="order-thumbnails">{images.map((image, index) => <button key={image.id || `${image.url}-${index}`} className={imageIndex === index ? 'active' : ''} onClick={() => setImageIndex(index)} aria-label={`Xem ảnh ${index + 1}`} aria-pressed={imageIndex === index}><img src={assetUrl(image.url)} alt="" loading="lazy" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} /></button>)}</div>}</div>
        <div className="order-tour-copy"><h2><a href={`#/tours/${item.tourId}`}>{item.tourName}</a></h2>{product && <div className="order-rating"><span>★</span><strong>{Number(product.avgRating) > 0 ? Number(product.avgRating).toFixed(1) : 'Mới'}</strong><small>({product.reviewCount || 0} đánh giá)</small></div>}<ul><li><Icon name="pin" /><span>{destinations || 'Điểm đến theo lịch trình tour'}</span></li><li><Icon name="calendar" /><span>{date(item.startDate)} – {date(item.endDate)}{product && ` (${product.durationDays} ngày ${product.durationNights} đêm)`}</span></li><li><Icon name="plane" /><span>Khởi hành: {product?.departureCity || 'Chưa cập nhật'}</span></li><li><Icon name="users" /><span>Số lượng: {passengerText}</span></li></ul>{tour.error && <p className="booking-data-note">Không tải được thông tin tour bổ sung. Thông tin đơn vẫn được giữ nguyên.</p>}</div></div>
        <ol className="order-progress" aria-label="Tiến trình đơn đặt tour">{steps.map(step => <li key={step.label} className={`${step.done ? 'done' : ''} ${step.active ? 'current' : ''}`}><span className="order-step-icon"><Icon name={step.done ? 'check' : step.icon} size={20} /></span><strong>{step.label}</strong><small>{step.date ? date(step.date.slice(0, 10)) : step.done ? 'Đã ghi nhận' : 'Chưa ghi nhận'}</small></li>)}</ol>
        {['CANCELLED', 'CANCEL_REQUESTED', 'REJECTED', 'EXPIRED'].includes(item.status) && <p className="order-status-note">Đơn hiện ở trạng thái: {statusLabels[item.status]}. Tiến trình trên không xác nhận các bước chưa được ghi nhận.</p>}
      </section>
      <div className="order-tabs" role="tablist" aria-label="Thông tin đơn">{tabs.map(([key, label]) => <button key={key} id={`order-tab-${key}`} role="tab" aria-selected={tab === key} aria-controls="order-tab-content" className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
      <div id="order-tab-content" role="tabpanel" aria-labelledby={`order-tab-${tab}`}>{content}</div>
      {cancelOpen && canRequestCancellation(item) && <section className="panel order-cancel-form"><h2>Yêu cầu hủy tour</h2><p>Phí hủy được tính theo chính sách áp dụng. CSKH sẽ xử lý yêu cầu; đơn chưa bị hủy ngay khi gửi.</p><form onSubmit={requestCancel}><label>Lý do hủy<textarea name="reason" required minLength={5} maxLength={1000} rows={3} ref={node => { if (node) { node.focus({ preventScroll: true }); node.closest('section').scrollIntoView({ block: 'center' }); } }} /></label>{error && <p className="notice error" role="alert">{error}</p>}<div className="workspace-actions"><button className="btn" disabled={busy}>{busy ? 'Đang gửi...' : 'Gửi yêu cầu hủy'}</button><button className="btn outline" type="button" disabled={busy} onClick={() => setCancelOpen(false)}>Đóng</button></div></form></section>}
    </div><aside className="order-aside">
      <section className="panel order-total"><h2>Tổng thanh toán</h2>{groups.map(group => <div className="order-price-line" key={`${group.type}-${group.unitPrice}`}><span>Giá tour {group.label.toLowerCase()} ({group.quantity} × {money(group.unitPrice)})</span><strong>{money(group.amount)}</strong></div>)}<div className="order-price-line"><span>Tạm tính</span><strong>{money(item.subtotal)}</strong></div>{Number(item.discount) > 0 && <div className="order-price-line"><span>Giảm giá {item.promotionCode || ''}</span><strong className="discount">−{money(item.discount)}</strong></div>}<div className="order-total-line"><h2>Tổng cộng</h2><strong>{money(item.total)}</strong></div></section>
      <section className="panel order-actions"><a className="btn" href="#/support"><Icon name="headset" />Liên hệ hỗ trợ</a>{item.status === 'PENDING_PAYMENT' && <a className="btn" href={`#/payment/${id}`}><Icon name="wallet" />Thanh toán đơn</a>}<button className="btn outline" disabled={!item.invoice} onClick={downloadInvoice} title={item.invoice ? 'Tải dữ liệu hóa đơn đã phát hành dạng JSON' : 'Hóa đơn chưa được phát hành'}><Icon name="download" />{item.invoice ? 'Tải hóa đơn (JSON)' : 'Chưa có hóa đơn'}</button>{canRequestCancellation(item) && <button className="btn outline" onClick={() => { setCancelOpen(true); setError(''); }}><Icon name="calendar" />Yêu cầu hủy tour</button>}{item.status === 'COMPLETED' && <a className="btn outline" href={`#/reviews?bookingId=${id}`}><Icon name="star" />Đánh giá chuyến đi</a>}<a className="text-button" href={`#/payment/${id}`}>Xem thanh toán & chứng từ</a></section>
      <section className="panel order-help"><span className="order-help-icon"><Icon name="headset" size={25} /></span><div><h2>Cần hỗ trợ?</h2><p>Liên hệ nhân viên để được tư vấn về đơn đặt tour này.</p></div><a href="#/support"><Icon name="headset" size={19} />Gửi yêu cầu hỗ trợ</a></section>
    </aside></div>
  </article>;
}