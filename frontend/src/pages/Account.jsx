import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { getSession, saveSession } from '../services/api.js';
import ActionForm from '../components/ActionForm.jsx';

export const passwordField = { name: 'newPassword', label: 'Mật khẩu mới', type: 'password', required: true, minLength: 8, maxLength: 72, pattern: '(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9]).+', help: 'Ít nhất 8 ký tự, có chữ hoa, chữ thường và số.' };

export default function Account({ managementAccount = false, securityOnly = false }) {
  const { user } = useAuth();
  return <section className="container section"><span className="eyebrow">TÀI KHOẢN CỦA BẠN</span><h1>{securityOnly ? 'Bảo mật tài khoản' : 'Hồ sơ cá nhân'}</h1><div className={securityOnly ? 'account-security-form' : 'workspace-columns'}>
    {!securityOnly && <section className="panel"><h2>Thông tin cá nhân</h2><p>Email: {user.email}</p><ActionForm path="/auth/me" method="PATCH" initial={user} fields={[
      { name: 'fullName', label: 'Họ và tên', required: true, minLength: 2, maxLength: 150 },
      { name: 'phone', label: 'Số điện thoại', maxLength: 20 },
    ]} onSuccess={updated => saveSession({ ...getSession(), user: updated })} /></section>}
    <section className="panel"><h2>Đổi mật khẩu</h2><ActionForm path="/auth/change-password" fields={[{ name: 'currentPassword', label: 'Mật khẩu hiện tại', type: 'password', required: true }, passwordField]} onSuccess={() => { saveSession(null); window.location.hash = managementAccount ? (user.roles?.includes('ADMIN') ? '/admin/login' : '/staff/login') : '/login'; }} /><p className="muted">Đổi mật khẩu thành công sẽ yêu cầu đăng nhập lại.</p></section>
  </div></section>;
}
