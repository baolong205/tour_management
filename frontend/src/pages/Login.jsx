import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { loginDestination } from '../routing.js';
import { Icon } from '../components/UI.jsx';
import CustomerLogin from '../components/CustomerLogin.jsx';

export default function Login({ params, managementLogin = false, staffLogin = false }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (register) await api('/auth/register', { method: 'POST', body: values });
      const profile = await login(values.email, values.password);
      window.location.hash = loginDestination(profile, params.get('next'));
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  if (!managementLogin) return <CustomerLogin register={register} busy={busy} error={error} submit={submit} toggleRegister={() => { setRegister(value => !value); setError(''); }} />;
  return <section className={`container auth-layout ${managementLogin ? 'management-login' : ''}`}>
    <div className="auth-story"><span className="eyebrow light">{staffLogin ? 'TOURGO · KHÔNG GIAN NHÂN VIÊN' : 'TOURGO · ADMIN CONSOLE'}</span>
      <h1>{staffLogin ? <>Mỗi công việc tốt.<br />Một hành trình trọn vẹn.</> : <>Quản trị tập trung.<br />Vận hành hiệu quả.</>}</h1>
      <p>{staffLogin ? 'Bàn làm việc dành riêng cho nhân viên vận hành và CSKH. Xử lý nghiệp vụ theo quyền được cấp.' : 'Khu vực dành riêng cho quản trị viên. Quản lý sản phẩm, phân quyền và cấu hình hệ thống.'}</p>
      <img src="/images/hoi-an.jpg" alt="Những ngôi nhà cổ ven sông ở Hội An" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = '/landscape.svg'; }} />
    </div><div className="auth-form"><span className="eyebrow">{managementLogin ? 'HỆ THỐNG QUẢN LÝ TOUR' : 'VIVU TRAVEL'}</span>
      <h2>{staffLogin ? 'Đăng nhập nhân viên' : 'Đăng nhập quản trị'}</h2>
      <p>{staffLogin ? 'Sử dụng tài khoản STAFF được cấp bởi quản trị viên.' : 'Sử dụng tài khoản ADMIN được cấp.'}</p>
      <form onSubmit={submit}>{register && !managementLogin && <label>Họ và tên<input name="fullName" autoComplete="name" minLength={2} maxLength={150} required placeholder="Nguyễn Văn An" /></label>}
        <label>Email<input name="email" type="email" maxLength={191} autoComplete="email" required placeholder={managementLogin ? 'admin@tour.local' : 'ban@example.com'} /></label>
        {register && !managementLogin && <label>Số điện thoại (không bắt buộc)<input name="phone" autoComplete="tel" pattern="[0-9+\-\s]{8,20}" placeholder="0901234567" /></label>}
        <label>Mật khẩu<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={72} pattern={register ? '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+' : undefined} title={register ? 'Ít nhất 8 ký tự, có chữ hoa, chữ thường và số' : undefined} required placeholder="Nhập mật khẩu" /></label>
        {register && <small className="muted">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</small>}{error && <p className="notice error" role="alert">{error}</p>}
        <button className="btn full" disabled={busy}>{busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'}<Icon name="arrow" size={18} /></button>
      </form>
      {!managementLogin && <><p><a href="#/forgot-password">Quên mật khẩu?</a></p><p className="auth-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button className="text-button" disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p><p><a href="#/admin/login">Cổng đăng nhập quản trị / nhân viên</a></p></>}
      {managementLogin && <><p className="muted">Không có tài khoản? Liên hệ quản trị hệ thống để được cấp quyền.</p><p><a href={staffLogin ? '#/admin/login' : '#/staff/login'}>{staffLogin ? 'Cổng đăng nhập Admin' : 'Cổng đăng nhập nhân viên'}</a></p><p><a href="#/login">Về đăng nhập khách hàng</a></p></>}
    </div>
  </section>;
}
