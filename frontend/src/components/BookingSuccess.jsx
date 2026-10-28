import React, { useEffect, useRef } from 'react';
import { assetUrl } from '../services/api.js';
import { date, money, statusLabels } from '../utils.js';
import { Icon } from './UI.jsx';

export default function BookingSuccess({ booking, schedule, tour }) {
  const heading = useRef(null);
  useEffect(() => { window.scrollTo(0, 0); heading.current?.focus({ preventScroll: true }); }, []);
  const cover = tour?.coverImageUrl || tour?.images?.find(image => image.isCover)?.url || tour?.images?.[0]?.url;
  const name = booking.tourName || schedule?.tourName || tour?.name || 'Hành trình đã chọn';
  const pending = booking.status === 'PENDING_PAYMENT';
  const expires = booking.expiresAt ? new Date(booking.expiresAt) : null;
  const deadline = expires && !Number.isNaN(expires.getTime()) ? expires.toLocaleString('vi-VN') : null;
  const rows = [
    ['calendar', 'Ngày khởi hành', date(booking.startDate || schedule?.startDate)],
    ['calendar', 'Ngày kết thúc', date(booking.endDate || schedule?.endDate)],
    ['users', 'Hành khách', booking.passengerCount != null ? `${booking.passengerCount} người` : booking.passengers?.length ? `${booking.passengers.length} người` : 'Xem trong chi tiết đơn'],
    ['user', 'Người liên hệ', booking.contactName || 'Xem trong chi tiết đơn'],
  ];
  return <div className="checkout-page booking-success-page"><div className="container success-shell">
    <nav className="checkout-breadcrumb" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>/</span><a href="#/bookings">Đơn của tôi</a><span>/</span><span>Tạo đơn thành công</span></nav>
    <section className="checkout-success success-receipt" aria-labelledby="success-heading">
      <header className="success-hero"><span className="success-check"><Icon name="check" size={37} /></span><span className="checkout-eyebrow">TOURGO · CẢM ƠN BẠN ĐÃ LỰA CHỌN</span><h1 id="success-heading" ref={heading} tabIndex={-1}>Đặt tour thành công!</h1><p>Đơn đặt tour đã được tạo. Cùng chuẩn bị cho hành trình tiếp theo của bạn.</p><div className="success-code"><span>Mã đặt tour</span><strong>{booking.code || 'Xem trong đơn của tôi'}</strong></div><span className="success-status"><Icon name="clock" size={14} />{statusLabels[booking.status] || booking.status || 'Đã tạo đơn'}</span></header>
      <div className="success-body"><div className="success-tour">{cover && <img src={assetUrl(cover)} alt={name} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} />}<div><span>HÀNH TRÌNH CỦA BẠN</span><h2>{name}</h2><a href={`#/bookings/${booking.id}`}>Xem thông tin đơn <Icon name="arrow" size={14} /></a></div></div>
        <dl className="success-details">{rows.map(([icon, label, value]) => <div key={label}><Icon name={icon} size={18} /><div><dt>{label}</dt><dd>{value}</dd></div></div>)}</dl>
        {booking.total != null && <div className="success-amount"><div><span>Tổng tiền đơn đặt tour</span><small>Theo dữ liệu đơn được hệ thống tạo</small></div><strong>{money(booking.total)}</strong></div>}
        <div className="success-advisory"><Icon name="shield" size={21} /><div><strong>Tạo đơn thành công chưa phải hoàn tất thanh toán</strong><p>Việc tạo đơn chưa đồng nghĩa đã thanh toán hoặc được xác nhận chỗ. Kiểm tra trạng thái và làm theo hướng dẫn trong đơn.</p>{deadline && <p className="success-deadline">Hạn xử lý đơn: <strong>{deadline}</strong></p>}</div></div>
        <section className="success-next" aria-labelledby="success-next-heading"><h2 id="success-next-heading">Tiếp theo, bạn cần làm gì?</h2><ol><li><span>1</span><div><strong>Kiểm tra thông tin đơn</strong><p>Xem lịch khởi hành, hành khách và thông tin liên hệ.</p></div></li><li><span>2</span><div><strong>{pending ? 'Tiếp tục thanh toán' : 'Theo dõi thanh toán & xác nhận'}</strong><p>Chuyển khoản cần đối chiếu chứng từ. VNPay / MoMo hiện là giả lập.</p></div></li><li><span>3</span><div><strong>Theo dõi trước khởi hành</strong><p>Kiểm tra thông báo và liên hệ hỗ trợ khi cần xác nhận điểm đón.</p></div></li></ol></section>
        <div className="success-actions">{pending ? <><a className="btn" href={`#/payment/${booking.id}`}>Tiếp tục thanh toán <Icon name="arrow" size={18} /></a><a className="btn outline" href={`#/bookings/${booking.id}`}>Xem chi tiết đơn</a></> : <><a className="btn" href={`#/bookings/${booking.id}`}>Xem chi tiết đơn <Icon name="arrow" size={18} /></a><a className="btn outline" href={`#/payment/${booking.id}`}>Xem thanh toán</a></>}</div>
      </div><footer className="success-footer"><span><Icon name="headset" size={18} />Cần hỗ trợ với đơn đặt tour?</span><a href="#/support">Gửi yêu cầu tư vấn <Icon name="arrow" size={14} /></a></footer>
    </section><a className="success-back" href="#/tours"><Icon name="back" size={15} />Tiếp tục khám phá tour</a>
  </div></div>;
}