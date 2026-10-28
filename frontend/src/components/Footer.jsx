import React from 'react';
import { Icon } from './UI.jsx';
import Brand from './Brand.jsx';

export default function Footer() {
  return <footer className="footer">
    <div className="container footer-invitation"><div><span>HÀNH TRÌNH MỚI ĐANG CHỜ</span><h2>Bạn đã sẵn sàng để lên đường?</h2></div><a className="btn white" href="#/tours">Khám phá ngay <Icon name="arrow" size={18} /></a></div>
    <div className="container footer-grid">
      <div><Brand /><p>Mỗi chuyến đi, một góc nhìn mới.<br />Cùng bạn khám phá vẻ đẹp Việt Nam<br />và những trải nghiệm đáng nhớ.</p><span className="footer-location"><Icon name="pin" size={16} /> Made for your next journey.</span></div>
      <div><h4>Khám phá cùng TourGo</h4><a href="#/tours">Tất cả hành trình</a><a href="#/tours?destination=Ph%C3%BA+Qu%E1%BB%91c">Biển đảo Phú Quốc</a><a href="#/tours?destination=%C4%90%C3%A0+L%E1%BA%A1t">Nghỉ dưỡng Đà Lạt</a><a href="#/favorites">Hành trình yêu thích</a></div>
      <div><h4>Chuyến đi của bạn</h4><a href="#/bookings">Theo dõi đơn đặt tour</a><a href="#/account">Tài khoản & bảo mật</a><a href="#/reviews">Đánh giá trải nghiệm</a><a href="#/notifications">Thông báo của bạn</a></div>
      <div><h4>Luôn sẵn sàng kết nối</h4><p>Cần thêm thông tin cho chuyến đi?<br />Gửi câu hỏi, TourGo sẽ hỗ trợ bạn.</p><a className="footer-cta" href="#/support">Trung tâm hỗ trợ <Icon name="arrow" size={18} /></a><a className="footer-internal" href="#/admin/login">Cổng nội bộ <Icon name="shield" size={14} /></a></div>
    </div>
    <div className="container footer-bottom"><span>© {new Date().getFullYear()} TourGo. Khám phá. Trải nghiệm. Kết nối.</span><a href="/images/credits.html" target="_blank" rel="noopener noreferrer">Thông tin & nguồn ảnh ↗</a><span>VIỆT NAM · TIẾNG VIỆT · VND</span></div>
  </footer>;
}