import React, { useState } from 'react';
import ActionForm from '../components/ActionForm.jsx';
import { passwordField } from './Account.jsx';

export default function PasswordRecovery({ params, reset = false }) {
  const [sent, setSent] = useState(false);
  const [demoToken, setDemoToken] = useState('');
  return <section className="container section"><div className="panel recovery-panel"><h1>{reset ? 'Đặt lại mật khẩu' : 'Quên mật khẩu'}</h1>
    <p>{reset ? 'Nhập mã khôi phục được cấp và mật khẩu mới.' : 'Yêu cầu mã khôi phục cho email đăng ký.'}</p>
    <p className="notice">Bản đồ án hiện chưa tích hợp gửi email thật. Liên hệ quản trị để khôi phục tài khoản; không dùng luồng demo này trên môi trường công khai.</p>
    <ActionForm path={reset ? '/auth/reset-password' : '/auth/forgot-password'} fields={reset ? [{ name: 'token', label: 'Mã khôi phục', required: true, minLength: 16 }, passwordField] : [{ name: 'email', label: 'Email', type: 'email', required: true, maxLength: 191 }]} initial={{ token: params.get('token') || '' }} label={reset ? 'Đặt lại mật khẩu' : 'Gửi yêu cầu khôi phục'} onSuccess={result => { setSent(true); setDemoToken(result?.resetToken || ''); }} />
    {demoToken && <p className="notice">Chế độ demo cục bộ — không gửi email: <a href={`#/reset-password?token=${encodeURIComponent(demoToken)}`}>Đặt lại mật khẩu bằng mã demo</a></p>}
    {sent && <p role="status">{reset ? 'Đã đổi mật khẩu. Bạn có thể đăng nhập lại.' : 'Đã tiếp nhận yêu cầu. Nếu tài khoản tồn tại, mã khôi phục đã được tạo ở máy chủ demo.'}</p>}
    <p><a href="#/reset-password">Tôi đã có mã khôi phục</a> · <a href="#/login">Về đăng nhập</a></p>
  </div></section>;
}