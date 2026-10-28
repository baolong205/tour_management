import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from '../components/UI.jsx';

export default function AccountOverview() {
  const { user } = useAuth();
  return <section className="account-overview"><div className="account-breadcrumbs"><a href="#/">Trang chủ</a><span>›</span>Tài khoản</div><h1>Xin chào, {user.fullName}!</h1><p>Quản lý hành trình và thông tin của bạn trong một không gian.</p><div className="account-shortcuts">{[
    ['/bookings', 'Tour của tôi', 'Theo dõi trạng thái, hành khách và thanh toán của từng đơn.', 'bag'],
    ['/favorites', 'Hành trình yêu thích', 'Tiếp tục khám phá những tour bạn đã lưu.', 'heart'],
    ['/account', 'Thông tin cá nhân', 'Cập nhật hồ sơ và thông tin liên hệ của bạn.', 'user'],
    ['/support', 'Cần hỗ trợ?', 'Gửi yêu cầu và theo dõi phản hồi từ nhân viên.', 'headset'],
  ].map(([href, title, text, icon]) => <a href={`#${href}`} className="panel" key={href}><Icon name={icon} size={26} /><h2>{title}</h2><p>{text}</p><span>Xem ngay <Icon name="arrow" size={16} /></span></a>)}</div></section>;
}