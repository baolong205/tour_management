import React, { useRef, useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api, assetUrl } from '../services/api.js';
import { date, money } from '../utils.js';
import { Icon, State } from '../components/UI.jsx';
import BookingSuccess from '../components/BookingSuccess.jsx';

const ticketNames = { ADULT: 'Người lớn', CHILD: 'Trẻ em', INFANT: 'Em bé' };
export default function Booking({ id, params }) {
  const { user } = useAuth();
  const [revision, setRevision] = useState(0);
  const schedules = useApi(`/schedules/tour/${id}`, revision);
  const tour = useApi(`/tours/${id}`);
  const schedule = schedules.data?.find(s => s.id === params.get('scheduleId'));
  const [passengers, setPassengers] = useState([{ fullName: '', dob: '' }]);
  const [promotionCode, setPromotionCode] = useState('');
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const submitting = useRef(false);
  const quoteRef = useRef(null);
  function changePassenger(index, key, value) { setQuote(null); setPassengers(values => values.map((p, i) => i === index ? { ...p, [key]: value } : p)); }
  async function submit(event) {
    event.preventDefault();
    if (submitting.current || !schedule || (quote && !quote.canBook)) return;
    submitting.current = true; setBusy(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const body = { scheduleId: schedule.id, passengers, ...(promotionCode.trim() ? { promotionCode: promotionCode.trim() } : {}) };
    try {
      if (!quote) {
        setQuote(await api('/bookings/quote', { method: 'POST', body }));
        requestAnimationFrame(() => quoteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      } else setResult(await api('/bookings', { method: 'POST', body: { ...body, ...values } }));
    } catch (error) { setError(error.message); setQuote(null); }
    finally { setBusy(false); submitting.current = false; }
  }
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (result) return <BookingSuccess booking={result} schedule={schedule} tour={tour.data} />;
  if (!schedule) return <div className="checkout-page"><div className="container section"><State loading={schedules.loading} error={schedules.error} empty={!schedules.loading && !schedules.error} retry={() => setRevision(value => value + 1)} /><a href={`#/tours/${id}`} className="btn outline">Quay lại chọn lịch khởi hành</a></div></div>;
  const cover = tour.data?.coverImageUrl || tour.data?.images?.find(image => image.isCover)?.url || tour.data?.images?.[0]?.url;
  return <div className="checkout-page"><div className="container checkout-container">
    <nav className="checkout-breadcrumb" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>/</span><a href={`#/tours/${id}`}>Chi tiết tour</a><span>/</span><span>Đặt tour</span></nav>
    <header className="checkout-heading"><div><span className="checkout-eyebrow">HÀNH TRÌNH CỦA BẠN BẮT ĐẦU TỪ ĐÂY</span><h1>Hoàn tất thông tin đặt tour</h1><p>Chỉ một vài thông tin để chuẩn bị cho chuyến đi của bạn.</p></div><a href={`#/tours/${id}`}><Icon name="back" size={16} />Đổi lịch khởi hành</a></header>
    <ol className="checkout-steps" aria-label="Tiến trình đặt tour"><li aria-current={!quote ? 'step' : undefined} className="active"><span>{quote ? <Icon name="check" size={16} /> : '1'}</span><div>Thông tin đặt tour<small>Liên hệ & hành khách</small></div></li><li aria-current={quote ? 'step' : undefined} className={quote ? 'active' : ''}><span>2</span><div>Kiểm tra báo giá<small>Xác nhận chi phí</small></div></li><li><span>3</span><div>Thanh toán<small>Sau khi tạo đơn</small></div></li></ol>
    <div className="checkout-layout"><form id="tour-booking-form" className="booking-form checkout-form" onSubmit={submit} aria-busy={busy}>
      <section className="checkout-card"><div className="checkout-card-title"><span><Icon name="user" size={20} /></span><div><h2>Thông tin liên hệ</h2><p>Thông tin dùng để liên lạc và gửi xác nhận đặt tour.</p></div></div><div className="form-grid"><label>Họ và tên <em>*</em><input name="contactName" defaultValue={user.fullName} disabled={busy} required minLength={2} maxLength={150} autoComplete="name" placeholder="Nhập họ và tên" /></label><label>Số điện thoại <em>*</em><input name="contactPhone" type="tel" defaultValue={user.phone || ''} disabled={busy} required pattern="(0[0-9]{9}|\+84[0-9]{9})" title="10 số bắt đầu bằng 0 hoặc +84 và 9 số" autoComplete="tel" placeholder="0901234567" /></label><label className="span-2">Địa chỉ email <em>*</em><input name="contactEmail" type="email" defaultValue={user.email} disabled={busy} required maxLength={191} autoComplete="email" placeholder="Nhập email liên hệ" /></label></div><div className="checkout-tip"><Icon name="shield" size={16} />Kiểm tra kỹ số điện thoại và email để không bỏ lỡ thông tin chuyến đi.</div></section>
      <section className="checkout-card"><div className="checkout-card-title"><span><Icon name="users" size={20} /></span><div><h2>Thông tin hành khách <b>{passengers.length}</b></h2><p>Loại vé được hệ thống tính theo ngày sinh và ngày khởi hành.</p></div></div>{passengers.map((passenger, index) => <div className="checkout-passenger" key={index}><div className="passenger-heading"><strong><Icon name="user" size={15} />Hành khách {index + 1}</strong>{passengers.length > 1 && <button className="text-button danger" type="button" disabled={busy} onClick={() => { setPassengers(values => values.filter((_, i) => i !== index)); setQuote(null); }} aria-label={`Xóa hành khách ${index + 1}`}>Xóa</button>}</div><div className="form-grid"><label>Họ và tên <em>*</em><input value={passenger.fullName} disabled={busy} onChange={event => changePassenger(index, 'fullName', event.target.value)} minLength={2} maxLength={150} required placeholder="Họ tên theo giấy tờ tùy thân" /></label><label>Ngày sinh <em>*</em><input type="date" value={passenger.dob} disabled={busy} max={today} onChange={event => changePassenger(index, 'dob', event.target.value)} required /></label></div></div>)}<button className="btn outline checkout-add" type="button" disabled={busy || passengers.length >= 30} onClick={() => { setPassengers(values => [...values, { fullName: '', dob: '' }]); setQuote(null); }}>+ Thêm hành khách</button><small className="checkout-limit">Tối đa 30 hành khách / đơn. Chỗ trống được kiểm tra khi báo giá và tạo đơn.</small></section>
      <section className="checkout-card"><div className="checkout-card-title"><span><Icon name="document" size={20} /></span><div><h2>Thông tin bổ sung</h2><p>Thêm mã ưu đãi hoặc ghi chú cho chuyến đi.</p></div></div><label>Mã ưu đãi <span className="checkout-optional">(không bắt buộc)</span><input value={promotionCode} disabled={busy} maxLength={40} onChange={event => { setPromotionCode(event.target.value); setQuote(null); }} placeholder="Nhập mã ưu đãi của bạn" /></label><label>Ghi chú <span className="checkout-optional">(không bắt buộc)</span><textarea name="note" disabled={busy} maxLength={1000} rows={3} placeholder="Yêu cầu hoặc thông tin thêm cho chuyến đi" /></label></section>
      {error && <p className="notice error" role="alert">{error}</p>}
      <div className="checkout-form-footer"><Icon name="shield" size={19} /><p>Vui lòng xem báo giá trước khi xác nhận. Tạo đơn chưa phải là thanh toán hoặc xác nhận chỗ.</p></div>
    </form>
    <aside className="checkout-sidebar" aria-label="Tóm tắt đặt tour"><div className="checkout-card checkout-summary"><img className="checkout-cover" src={assetUrl(cover)} alt={schedule.tourName || tour.data?.name || 'Hành trình đã chọn'} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} /><div className="checkout-summary-body"><span className="checkout-eyebrow">HÀNH TRÌNH ĐÃ CHỌN</span><h2>{schedule.tourName || tour.data?.name || 'Tour đã chọn'}</h2><div className="checkout-schedule"><p><Icon name="calendar" size={17} /><span>Ngày khởi hành<strong>{date(schedule.startDate)}</strong></span><span>Ngày kết thúc<strong>{date(schedule.endDate)}</strong></span></p><p><Icon name="pin" size={17} /><span>Điểm đón<strong>{schedule.meetingPoint || 'Điểm đón đang cập nhật'}</strong></span></p><p><Icon name="users" size={17} /><span>Số hành khách<strong>{passengers.length} người</strong></span></p></div><h3>Đơn giá theo lịch khởi hành</h3>{[['Người lớn', 'priceAdult'], ['Trẻ em', 'priceChild'], ['Em bé', 'priceInfant']].map(([label, key]) => <div className="checkout-price" key={key}><span>{label}</span><strong>{money(schedule[key])}</strong></div>)}
      <div ref={quoteRef} className="checkout-quote" aria-live="polite">{quote ? <><h3>Báo giá từ hệ thống</h3>{quote.lines.map(line => <div className="checkout-price" key={line.type}><span>{ticketNames[line.type] || line.type} × {line.quantity}</span><strong>{money(line.amount)}</strong></div>)}<div className="checkout-price"><span>Tạm tính</span><strong>{money(quote.subtotal)}</strong></div><div className="checkout-price checkout-discount"><span>Giảm giá</span><strong>−{money(quote.discount)}</strong></div><div className="checkout-total"><span>Tổng thanh toán</span><strong>{money(quote.total)}</strong></div><p className="checkout-quote-note">Báo giá chưa giữ chỗ. Hệ thống kiểm tra lại giá và số chỗ khi tạo đơn.</p>{!quote.canBook && <p className="notice error" role="alert">Không đủ chỗ cho số hành khách đã chọn. Vui lòng giảm số hành khách hoặc chọn lịch khác.</p>}</> : <div className="checkout-awaiting"><Icon name="wallet" size={22} /><p>Điền thông tin hành khách để nhận báo giá chính xác từ hệ thống.</p></div>}</div>
      <button className="btn full checkout-submit" form="tour-booking-form" type="submit" disabled={busy || (quote && !quote.canBook)}>{busy ? 'Đang xử lý...' : quote ? 'Xác nhận đặt tour' : 'Xem báo giá chính xác'}<Icon name="arrow" size={18} /></button><p className="checkout-submit-note">{quote ? 'Tạo đơn trước, thanh toán ở bước tiếp theo.' : 'Bạn chưa phải thanh toán ở bước này.'}</p></div></div><a className="checkout-support" href="#/support"><Icon name="headset" size={21} /><span>Cần hỗ trợ đặt tour?<strong>Gửi yêu cầu tư vấn</strong></span><Icon name="arrow" size={16} /></a></aside>
    </div>
  </div></div>;
}
