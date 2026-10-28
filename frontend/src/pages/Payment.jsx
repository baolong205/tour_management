import React, { useRef, useState } from 'react';
import { useApi } from '../hooks.js';
import { api, assetUrl } from '../services/api.js';
import { date, money, statusLabels } from '../utils.js';
import { paymentMethodLabels } from '../booking-view.js';
import { Icon, State } from '../components/UI.jsx';

const labels = { PENDING: 'Chờ thanh toán', PROOF_SUBMITTED: 'Chờ đối chiếu chứng từ', SUCCESS: 'Đã thanh toán', FAILED: 'Thất bại', EXPIRED: 'Hết hạn', PARTIALLY_REFUNDED: 'Đã hoàn một phần', REFUNDED: 'Đã hoàn tiền' };
const methods = [
  { value: 'BANK_TRANSFER', name: 'Chuyển khoản ngân hàng', text: 'Chuyển khoản và gửi chứng từ để nhân viên đối chiếu.', icon: 'wallet' },
  { value: 'VNPAY', name: 'VNPay', text: 'Giao dịch giả lập phục vụ đồ án, không thu tiền thật.', icon: 'document', mock: true },
  { value: 'MOMO', name: 'MoMo', text: 'Ví điện tử giả lập, không kết nối tài khoản thật.', icon: 'bag', mock: true },
];

export default function Payment({ id }) {
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [method, setMethod] = useState('BANK_TRANSFER');
  const lock = useRef(false);
  const summary = useApi(`/payments/booking/${id}`, revision);
  const booking = useApi(`/bookings/${id}`);
  const info = useApi('/system/settings/public-info');
  const tour = useApi(booking.data?.tourId ? `/tours/${booking.data.tourId}` : null);
  const refresh = () => setRevision(value => value + 1);
  async function act(path, options, message) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const result = await api(path, options);
      setNotice(result?.message || message); refresh();
    } catch (failure) { setError(failure.message); }
    finally { lock.current = false; setBusy(false); }
  }
  function create(event) {
    event.preventDefault();
    if (!canPay) return;
    act('/payments', { method: 'POST', body: { bookingId: id, method } }, 'Đã tạo giao dịch. Vui lòng làm theo hướng dẫn bên dưới.');
  }
  function proof(event, paymentId) {
    event.preventDefault();
    if (!canPay || busy) return;
    const data = new FormData(event.currentTarget);
    act(`/payments/${paymentId}/proof`, { method: 'POST', body: { proofUrl: data.get('proofUrl').trim(), proofNote: data.get('proofNote').trim() } }, 'Đã gửi chứng từ. Vui lòng chờ nhân viên đối chiếu; khoản tiền chưa được ghi nhận là đã thanh toán.');
  }
  function simulate(payment) {
    if (busy || !canPay || !payment.gatewayTxnRef) return;
    if (!window.confirm('Đây là giao dịch GIẢ LẬP, không thu tiền thật. Tiếp tục?')) return;
    act(`/payments/mock-gateway/pay/${encodeURIComponent(payment.gatewayTxnRef)}`, {}, 'Đã xử lý giao dịch giả lập.');
  }
  const item = summary.data;
  const canPay = !summary.loading && !summary.error && item?.bookingStatus === 'PENDING_PAYMENT' && Number(item.outstanding) > 0;
  const bank = info.data?.bank;
  const hasBank = !!(bank?.bankName && bank?.accountName && bank?.accountNumber);
  const paid = item && Number(item.outstanding) === 0 && Number(item.paidTotal) >= Number(item.total) && Number(item.refundedTotal) === 0;
  const product = tour.data;
  const cover = product?.coverImageUrl || product?.images?.find(image => image.isCover)?.url || product?.images?.[0]?.url;
  const transactions = item?.payments || [];
  return <div className="checkout-page payment-page"><div className="container checkout-container">
    <nav className="checkout-breadcrumb" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>/</span><a href={`#/bookings/${id}`}>Đơn đặt tour</a><span>/</span><span>Thanh toán</span></nav>
    <header className="checkout-heading"><div><span className="checkout-eyebrow">TOURGO · HOÀN TẤT HÀNH TRÌNH ĐẶT TOUR</span><h1>Thanh toán đơn đặt tour</h1><p>Kiểm tra đơn và lựa chọn phương thức phù hợp với bạn.</p></div><a href={`#/bookings/${id}`}><Icon name="back" size={16} />Chi tiết đơn đặt tour</a></header>
    <ol className="checkout-steps" aria-label="Tiến trình đặt tour"><li className="active"><span><Icon name="check" size={16} /></span><div>Thông tin đặt tour<small>Đã tạo đơn</small></div></li><li className="active"><span><Icon name="check" size={16} /></span><div>Kiểm tra báo giá<small>Chi phí theo đơn</small></div></li><li className="active" aria-current="step"><span>3</span><div>Thanh toán<small>Theo dõi giao dịch</small></div></li></ol>
    <div className="payment-demo-note"><Icon name="shield" size={21} /><div><strong>Thông tin về thanh toán</strong><p>VNPay / MoMo hiện là giả lập, không thu tiền thật. Chuyển khoản cần nhân viên đối chiếu chứng từ. Chưa tích hợp VietQR.</p></div></div>
    {notice && <p className="notice payment-notice" role="status">{notice}</p>}{error && <p className="notice error" role="alert">{error}</p>}
    <State loading={summary.loading} error={summary.error} retry={refresh} />
    {item && !summary.loading && !summary.error && <div className="checkout-layout payment-layout"><div className="payment-main">
      {paid ? <section className="checkout-card payment-outcome"><span><Icon name="check" size={26} /></span><div><h2>Đã ghi nhận đủ thanh toán</h2><p>Trạng thái đơn: {statusLabels[item.bookingStatus] || item.bookingStatus || 'Chưa cập nhật'}. Xem chi tiết đơn để theo dõi chuyến đi.</p><a href={`#/bookings/${id}`}>Xem đơn đặt tour <Icon name="arrow" size={15} /></a></div></section> : !canPay && <section className="checkout-card payment-closed"><Icon name="clock" size={24} /><div><h2>Đơn hiện không thể tạo thanh toán mới</h2><p>Trạng thái: {statusLabels[item.bookingStatus] || item.bookingStatus || 'Chưa cập nhật'}. Vui lòng kiểm tra đơn hoặc liên hệ hỗ trợ.</p></div></section>}
      {canPay && <section className="checkout-card"><div className="checkout-card-title"><span><Icon name="wallet" size={20} /></span><div><h2>Chọn phương thức thanh toán</h2><p>Số tiền giao dịch do hệ thống xác định từ đơn đặt tour.</p></div></div>
        <form className="payment-method-form" onSubmit={create} aria-busy={busy}><fieldset disabled={busy}><legend className="payment-sr-only">Phương thức thanh toán</legend>{methods.map(option => <label className={`payment-method ${method === option.value ? 'selected' : ''}`} key={option.value}><input type="radio" name="method" value={option.value} checked={method === option.value} onChange={() => setMethod(option.value)} /><span className={`payment-method-icon method-${option.value.toLowerCase()}`}><Icon name={option.icon} size={23} /></span><span className="payment-method-copy"><strong>{option.name}{option.mock && <small>Giả lập</small>}</strong><span>{option.text}</span></span></label>)}</fieldset>
          {transactions.some(payment => ['PENDING', 'PROOF_SUBMITTED'].includes(payment.status)) && <p className="payment-pending-note"><Icon name="clock" size={16} />Bạn có giao dịch đang chờ xử lý. Kiểm tra lịch sử bên dưới trước khi tạo thêm để tránh thanh toán trùng.</p>}
          <button className="btn full payment-create" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : 'Tạo giao dịch thanh toán'}<Icon name="arrow" size={17} /></button><p className="payment-small-note">Tạo giao dịch không đồng nghĩa đã thanh toán.</p>
        </form>
      </section>}
      <section className="checkout-card payment-bank"><div className="checkout-card-title"><span><Icon name="document" size={20} /></span><div><h2>Thông tin chuyển khoản</h2><p>Chỉ chuyển tiền sau khi xác nhận thông tin với CSKH.</p></div></div>
        {info.loading ? <p className="payment-small-note" role="status">Đang tải thông tin ngân hàng...</p> : hasBank ? <><dl className="payment-bank-rows">{[['Ngân hàng', bank.bankName], ['Chủ tài khoản', bank.accountName], ['Số tài khoản', bank.accountNumber], ['Nội dung chuyển khoản', item.bookingCode || booking.data?.code || 'Liên hệ CSKH để xác nhận']].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="payment-bank-warning">Không dùng tài khoản minh họa. Gửi chứng từ tại giao dịch chuyển khoản bên dưới sau khi chuyển tiền.</p></> : <p className="notice">{info.error ? 'Không tải được thông tin ngân hàng.' : 'Chưa cấu hình đầy đủ tài khoản ngân hàng.'} Liên hệ CSKH trước khi chuyển tiền.</p>}
      </section>
      <section className="checkout-card payment-history"><div className="checkout-card-title"><span><Icon name="clock" size={20} /></span><div><h2>Lịch sử giao dịch <b>{transactions.length}</b></h2><p>Chứng từ được gửi chưa đồng nghĩa khoản tiền đã được xác nhận.</p></div><button className="payment-refresh" type="button" disabled={busy} onClick={refresh} aria-label="Cập nhật trạng thái thanh toán"><Icon name="clock" size={15} />Cập nhật</button></div>
        {transactions.length === 0 ? <div className="payment-empty"><Icon name="wallet" size={29} /><p>Chưa có giao dịch thanh toán.</p></div> : transactions.map(payment => <article className="payment-transaction" key={payment.id}><div className="payment-transaction-heading"><div><h3>{paymentMethodLabels[payment.method] || payment.method}</h3><span className={`payment-status payment-status-${payment.status.toLowerCase()}`}>{labels[payment.status] || payment.status}</span></div><strong>{money(payment.amount)}</strong></div><p className="payment-reference">Mã tham chiếu: <span>{payment.gatewayTxnRef || payment.id}</span></p>
          {payment.proofNote && <p className="payment-proof-note">Ghi chú: {payment.proofNote}</p>}
          {payment.status === 'PROOF_SUBMITTED' && <p className="payment-review-note"><Icon name="clock" size={16} />Chứng từ đang chờ nhân viên đối chiếu. Không chuyển thêm tiền cho giao dịch này.</p>}
          {canPay && payment.status === 'PENDING' && ['VNPAY', 'MOMO'].includes(payment.method) && <button className="btn payment-simulate" disabled={busy || !payment.gatewayTxnRef} type="button" onClick={() => simulate(payment)}>Thanh toán giả lập — không thu tiền thật <Icon name="arrow" size={15} /></button>}
          {canPay && payment.status === 'PENDING' && payment.method === 'BANK_TRANSFER' && <form className="payment-proof-form" onSubmit={event => proof(event, payment.id)} aria-busy={busy}><p>Chỉ gửi chứng từ sau khi đã chuyển khoản theo thông tin xác nhận với CSKH.</p><label>Đường dẫn ảnh chứng từ <em>*</em><input name="proofUrl" type="url" required maxLength={2048} disabled={busy} placeholder="https://.../chung-tu.jpg" /></label><small>Hệ thống nhận đường dẫn ảnh; chưa hỗ trợ tải tệp trực tiếp.</small><label>Ghi chú chuyển khoản<textarea name="proofNote" rows={3} maxLength={1000} disabled={busy} placeholder="Thời gian chuyển khoản, mã giao dịch..." /></label><button className="btn" type="submit" disabled={busy}>{busy ? 'Đang xử lý...' : 'Gửi chứng từ'}<Icon name="arrow" size={15} /></button></form>}
        </article>)}
      </section>
    </div><aside className="checkout-sidebar payment-sidebar" aria-label="Tóm tắt thanh toán"><div className="checkout-card checkout-summary">{cover && <img className="checkout-cover" src={assetUrl(cover)} alt={booking.data?.tourName || 'Tour đã đặt'} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} />}<div className="checkout-summary-body"><span className="checkout-eyebrow">ĐƠN ĐẶT TOUR CỦA BẠN</span><h2>{booking.data?.tourName || item.bookingCode || 'Thông tin thanh toán'}</h2><div className="payment-booking-code"><span>Mã đặt tour</span><strong>{item.bookingCode || booking.data?.code || 'Chưa cập nhật'}</strong></div>{booking.data && <div className="checkout-schedule"><p><Icon name="calendar" size={17} /><span>Khởi hành<strong>{date(booking.data.startDate)}</strong></span><span>Kết thúc<strong>{date(booking.data.endDate)}</strong></span></p><p><Icon name="users" size={17} /><span>Hành khách<strong>{booking.data.passengerCount ?? booking.data.passengers?.length ?? 'Chưa cập nhật'}</strong></span></p></div>}{booking.error && <p className="payment-small-note">Không tải được thông tin tour bổ sung. Số tiền dưới đây lấy từ dữ liệu thanh toán.</p>}
        <div className="checkout-price"><span>Tổng tiền đơn</span><strong>{money(item.total)}</strong></div><div className="checkout-price"><span>Đã nhận</span><strong>{money(item.paidTotal)}</strong></div><div className="checkout-price"><span>Đã hoàn</span><strong>{money(item.refundedTotal)}</strong></div><div className="checkout-total"><span>Còn phải thanh toán</span><strong>{money(item.outstanding)}</strong></div><p className="checkout-quote-note">Số tiền và trạng thái được cập nhật từ hệ thống. Gửi chứng từ không tự động ghi nhận thanh toán.</p><a className="btn outline full" href={`#/bookings/${id}`}>Xem chi tiết đơn <Icon name="arrow" size={16} /></a>
      </div></div><a className="checkout-support" href="#/support"><Icon name="headset" size={21} /><span>Cần hỗ trợ thanh toán?<strong>Gửi yêu cầu tư vấn</strong></span><Icon name="arrow" size={16} /></a></aside></div>}
  </div></div>;
}
