import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from './UI.jsx';

const links = [
  ['/account/overview', 'Tổng quan', 'grid'], ['/account', 'Thông tin cá nhân', 'user'], ['/bookings', 'Tour của tôi', 'bag'],
  ['/favorites', 'Tour yêu thích', 'heart'], ['/reviews', 'Đánh giá của tôi', 'star'], ['/notifications', 'Thông báo', 'bell'],
  ['/account/security', 'Bảo mật tài khoản', 'shield'], ['/support', 'Trung tâm hỗ trợ', 'headset'],
];
export default function AccountLayout({ path, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  async function signOut() {
    setBusy(true);
    try { await logout(); } catch { /* Local session is still cleared by AuthProvider. */ }
    finally { window.location.hash = '/login'; setBusy(false); }
  }
  return <div className="account-shell">
    <aside className="account-sidebar"><div className="account-sidebar-title"><Icon name="grid" /><strong>Tài khoản của tôi</strong><button className="icon-button account-menu-toggle" aria-label="Menu tài khoản" aria-expanded={open} aria-controls="account-navigation" onClick={() => setOpen(value => !value)}><Icon name="menu" /></button></div>
      <div className="account-identity"><span className="customer-avatar">{user.fullName?.trim().charAt(0).toUpperCase() || 'T'}</span><h2>{user.fullName}</h2><p>{user.email}</p></div>
      <nav className={`account-navigation ${open ? 'open' : ''}`} id="account-navigation" aria-label="Tài khoản cá nhân" onClick={() => setOpen(false)}>{links.map(([href, label, icon]) => {
        const active = path === href || (href === '/bookings' && (path.startsWith('/bookings/') || path.startsWith('/payment/')));
        return <a key={href} href={`#${href}`} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined}><Icon name={icon} size={20} />{label}</a>;
      })}<button className="account-signout" disabled={busy} onClick={signOut}><Icon name="logout" />{busy ? 'Đang thoát...' : 'Đăng xuất'}</button></nav>
    </aside><div className="account-main">{children}</div>
  </div>;
}