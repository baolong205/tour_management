import React, { useState } from 'react';
import Brand from './Brand.jsx';
import { Icon } from './UI.jsx';

export default function CustomerLogin({ register, busy, error, submit, toggleRegister }) {
  const [visible, setVisible] = useState(false);
  return <div className="destination-login">
    <section className="login-landscape" aria-label="Khám phá cùng TourGo">
      <img className="login-background" src="/images/ha-long.jpg" alt="Phong cảnh vịnh biển minh họa hành trình khám phá" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} />
      <header className="login-header"><Brand /><nav aria-label="Điều hướng đăng nhập"><a href="#/">Trang chủ</a><a href="#/tours">Khám phá tour</a><a href="#/support">Liên hệ</a></nav><button className="login-register-link" type="button" disabled={busy} onClick={toggleRegister}><Icon name="user" size={17} />{register ? 'Đăng nhập' : 'Đăng ký'}</button></header>
      <div className="login-story-copy"><span className="login-eyebrow">KHÁM PHÁ THẾ GIỚI CÙNG TOURGO</span><h1>Mỗi chuyến đi<br />là <em>một câu chuyện.</em></h1><p>Đăng nhập để quản lý tour, theo dõi hành trình<br className="login-desktop-break" /> và khám phá những điểm đến tuyệt vời.</p>
        <div className="login-benefits">{[['globe', 'Đa dạng điểm đến', 'Khám phá Việt Nam'], ['shield', 'Đặt tour dễ dàng', 'Chủ động kế hoạch'], ['star', 'Trải nghiệm đáng nhớ', 'Hành trình của riêng bạn']].map(([icon, title, text]) => <div key={icon}><span><Icon name={icon} size={26} /></span><div><strong>{title}</strong><small>{text}</small></div></div>)}</div>
      </div><span className="login-photo-credit">Ảnh minh họa điểm đến · <a href="/images/credits.html" target="_blank" rel="noopener noreferrer">Nguồn ảnh</a></span>
    </section>
    <section className="login-form-side"><div className="login-card auth-form"><Brand /><h2>{register ? 'Tạo tài khoản TourGo' : 'Đăng nhập tài khoản'}</h2><p className="login-intro">{register ? 'Bắt đầu hành trình mới. Tạo tài khoản để lưu tour yêu thích và quản lý chuyến đi của bạn.' : 'Chào mừng bạn trở lại! Đăng nhập để tiếp tục khám phá những hành trình tuyệt vời cùng TourGo.'}</p>
      <form onSubmit={submit}>
        {register && <label>Họ và tên<span className="login-input"><Icon name="user" size={20} /><input name="fullName" autoComplete="name" required minLength={2} maxLength={150} placeholder="Nhập họ và tên" disabled={busy} /></span></label>}
        <label>Email<span className="login-input"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></svg><input name="email" type="email" maxLength={191} autoComplete="email" required placeholder="Nhập địa chỉ email" disabled={busy} /></span></label>
        {register && <label>Số điện thoại (không bắt buộc)<span className="login-input"><Icon name="user" size={20} /><input name="phone" autoComplete="tel" pattern="[0-9+\-\s]{8,20}" placeholder="0901234567" disabled={busy} /></span></label>}
        <label>Mật khẩu<span className="login-input"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg><input name="password" type={visible ? 'text' : 'password'} autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={72} pattern={register ? '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+' : undefined} title={register ? 'Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số' : undefined} required placeholder="Nhập mật khẩu" disabled={busy} /><button className="password-toggle" type="button" onClick={() => setVisible(value => !value)} aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} aria-pressed={visible}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" />{!visible && <path d="m3 21 18-18" />}</svg></button></span></label>
        {register ? <small className="login-password-help">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</small> : <div className="login-options"><span><Icon name="shield" size={15} />Phiên đăng nhập trong tab này</span><a href="#/forgot-password">Quên mật khẩu?</a></div>}
        {error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn login-submit" disabled={busy} type="submit">{busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'}<Icon name="arrow" size={22} /></button>
      </form>
      {!register && <><div className="login-divider"><span>hoặc</span></div><div className="login-social"><button type="button" disabled><span className="google-symbol" aria-hidden="true">G</span>Đăng nhập với Google</button><button type="button" disabled><span className="facebook-symbol" aria-hidden="true">f</span>Đăng nhập với Facebook</button></div><p className="login-social-note">Google / Facebook chưa được tích hợp. Vui lòng dùng email.</p></>}
      <p className="login-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button className="text-button" disabled={busy} onClick={toggleRegister}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p>
      <a className="login-internal" href="#/staff/login">Cổng đăng nhập nhân viên <Icon name="arrow" size={13} /></a><a className="login-internal" href="#/admin/login">Cổng đăng nhập Admin <Icon name="arrow" size={13} /></a>
    </div></section>
  </div>;
}