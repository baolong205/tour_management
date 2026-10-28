import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { safeNext } from '../utils.js';
import { Icon } from '../components/UI.jsx';

export default function Login({ params }) {
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    const values = Object.fromEntries(new FormData(event.currentTarget));
    try {
      if (register) await api('/auth/register', { method: 'POST', body: values });
      await login(values.email, values.password);
      window.location.hash = safeNext(params.get('next'));
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <section className="container auth-layout"><div className="auth-story"><span className="eyebrow light">CHÀO MỪNG ĐẾN VỚI VIVU</span><h1>Mọi hành trình đẹp<br />đều có một khởi đầu.</h1><p>Đăng nhập để đặt tour và lưu giữ những hành trình yêu thích của bạn.</p><img src="/images/hoi-an.jpg" alt="Những ngôi nhà cổ ven sông ở Hội An" onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = "/landscape.svg"; }} /></div><div className="auth-form"><a href="#/" className="eyebrow">← VỀ TRANG CHỦ</a><h2>{register ? 'Bắt đầu hành trình' : 'Chào bạn trở lại!'}</h2><p>{register ? 'Tạo tài khoản để khám phá cùng ViVu.' : 'Một chuyến đi mới đang chờ bạn.'}</p><form onSubmit={submit}>{register && <label>Họ và tên<input name="fullName" autoComplete="name" minLength={2} maxLength={150} required placeholder="Nguyễn Văn An" /></label>}<label>Email<input name="email" type="email" maxLength={191} autoComplete="email" required placeholder="ban@example.com" /></label>{register && <label>Số điện thoại (không bắt buộc)<input name="phone" autoComplete="tel" pattern="[0-9+\-\s]{8,20}" placeholder="0901234567" /></label>}<label>Mật khẩu<input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 8 : 1} maxLength={72} pattern={register ? '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+' : undefined} title={register ? 'Ít nhất 8 ký tự, có chữ hoa, chữ thường và số' : undefined} required placeholder="Nhập mật khẩu" /></label>{register && <small className="muted">Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</small>}{error && <p className="notice error" role="alert">{error}</p>}<button className="btn full" disabled={busy}>{busy ? 'Đang xử lý...' : register ? 'Tạo tài khoản' : 'Đăng nhập'}<Icon name="arrow" size={18} /></button></form><p className="auth-switch">{register ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'} <button className="text-button" disabled={busy} onClick={() => { setRegister(!register); setError(''); }}>{register ? 'Đăng nhập' : 'Đăng ký ngay'}</button></p></div></section>;
}
