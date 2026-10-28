import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { permittedStaffSections } from '../staff-navigation.js';
import { Icon } from './UI.jsx';

export default function StaffLayout({ path, params, children }) {
  const { user, logout, can } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sections = permittedStaffSections(user);
  const active = params.get('tab') || 'home';
  const title = path === '/staff/account' ? 'Tài khoản & bảo mật' : path === '/staff/notifications' ? 'Thông báo nội bộ' : active === 'home' ? 'Trang tổng quan' : sections.find(section => section.key === active)?.label || 'Chức năng không khả dụng';
  async function signOut() {
    setBusy(true);
    try { await logout(); } catch { /* AuthProvider clears the local session. */ }
    finally { window.location.replace('#/staff/login'); setBusy(false); }
  }
  function search(event) {
    event.preventDefault();
    const query = new FormData(event.currentTarget).get('search').trim();
    window.location.hash = `/staff?tab=bookings&search=${encodeURIComponent(query)}`;
  }
  return <div className="staff-shell">
    <aside className="staff-sidebar">
      <a href="#/staff" className="staff-brand" aria-label="TourGo nhân viên"><svg width="44" height="36" viewBox="0 0 56 44" fill="none" aria-hidden="true"><path d="M3 34 19 10l10 15 8-14 16 25H38L28 24 18 38Z" fill="#0068ff" /><path d="m23 16 11-15 17 26-9-2L34 12l-6 10Z" fill="#00c889" /><path d="m5 38 14-10 9 7c9 7 15 7 25-1" stroke="#0068ff" strokeWidth="4" strokeLinecap="round" /></svg><strong>TourGo</strong></a>
      <div className="staff-menu-title"><span>NHÂN VIÊN</span><button className="icon-button staff-menu-toggle" type="button" aria-label={open ? 'Đóng menu nhân viên' : 'Mở menu nhân viên'} aria-expanded={open} aria-controls="staff-navigation" onClick={() => setOpen(value => !value)}><Icon name={open ? 'close' : 'menu'} /></button></div>
      <nav id="staff-navigation" className={open ? 'open' : ''} aria-label="Menu nhân viên" onClick={event => { if (event.target.closest('a')) setOpen(false); }}>
        <a href="#/staff" className={path === '/staff' && active === 'home' ? 'active' : ''} aria-current={path === '/staff' && active === 'home' ? 'page' : undefined}><Icon name="grid" />Trang tổng quan</a>
        {sections.filter(section => section.key !== 'notify').map(section => <a key={section.key} href={`#/staff?tab=${section.key}`} className={path === '/staff' && active === section.key ? 'active' : ''} aria-current={path === '/staff' && active === section.key ? 'page' : undefined}><Icon name={section.icon} />{section.label}</a>)}
        <h2>HỆ THỐNG</h2>
        <a href="#/staff/notifications" className={path === '/staff/notifications' ? 'active' : ''}><Icon name="bell" />Thông báo</a>
        {sections.some(section => section.key === 'notify') && <a href="#/staff?tab=notify" className={active === 'notify' ? 'active' : ''}><Icon name="document" />Gửi thông báo</a>}
        <a href="#/staff/account" className={path === '/staff/account' ? 'active' : ''}><Icon name="user" />Tài khoản & bảo mật</a>
        <a href="#/" className="staff-back-home"><Icon name="back" />Quay về trang chủ</a>
      </nav>
    </aside>
    <div className="staff-workarea">
      <header className="staff-topbar">
        <span className="staff-desktop-menu" aria-hidden="true"><Icon name="menu" /></span>
        {can('booking:read') && <form className="staff-search" role="search" onSubmit={search}><Icon name="search" size={19} /><input name="search" aria-label="Tìm kiếm booking" placeholder="Tìm kiếm booking, tên khách, số điện thoại..." maxLength={120} /><button type="submit" aria-label="Tìm kiếm"><Icon name="arrow" size={17} /></button></form>}
        <div className="staff-session"><a className="staff-header-icon" href="#/staff/notifications" aria-label="Thông báo"><Icon name="bell" /></a>{can('support:manage') && <a className="staff-header-icon" href="#/staff?tab=support" aria-label="Yêu cầu hỗ trợ"><Icon name="headset" /></a>}<a href="#/staff/account" className="staff-profile"><span className="staff-avatar">{user.fullName?.trim().charAt(0) || 'N'}</span><span><strong>{user.fullName}</strong><small>Nhân viên</small></span></a><button className="staff-signout" type="button" disabled={busy} onClick={signOut} title="Đăng xuất" aria-label="Đăng xuất"><Icon name="logout" size={18} /></button></div>
      </header>
      <section className="staff-content" aria-label={title} key={`${path}:${active}:${params.get('search') || ''}:${params.get('booking') || ''}:${params.get('schedule') || ''}`}>{children}</section>
      <footer className="staff-bottomline">TourGo · Đồng hành cùng khách hàng trong mỗi chuyến đi</footer>
    </div>
  </div>;
}

