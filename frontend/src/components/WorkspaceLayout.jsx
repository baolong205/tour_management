import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { activeWorkspaceSection, permittedSections } from '../workspace-navigation.js';
import { Icon } from './UI.jsx';
import Brand from './Brand.jsx';

export default function WorkspaceLayout({ path, params, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const sections = permittedSections(user);
  const active = activeWorkspaceSection(user, params);
  const title = path === '/admin/account' ? 'Tài khoản & bảo mật' : path === '/admin/notifications' ? 'Thông báo nội bộ' : sections.find(section => section.key === active)?.label || 'Chức năng điều hành';
  const admin = user.roles.includes('ADMIN');
  const groups = ['TỔNG QUAN', 'QUẢN LÝ TOUR', 'QUẢN LÝ BOOKING', 'QUẢN LÝ KHÁCH HÀNG', 'NỘI DUNG', 'BÁO CÁO', 'HỆ THỐNG'];
  const navGroup = key => key === 'overview' ? 'TỔNG QUAN' : ['bookings', 'payments', 'refunds', 'support'].includes(key) ? 'QUẢN LÝ BOOKING' : ['customers', 'reviews'].includes(key) ? 'QUẢN LÝ KHÁCH HÀNG' : ['banners', 'notify'].includes(key) ? 'NỘI DUNG' : key === 'reports' ? 'BÁO CÁO' : ['settings', 'staff'].includes(key) ? 'HỆ THỐNG' : 'QUẢN LÝ TOUR';
  const labels = { overview: 'Trang tổng quan', tours: 'Danh sách tour', reviews: 'Đánh giá', support: 'Yêu cầu hỗ trợ', staff: 'Quản lý nhân viên', settings: 'Cài đặt' };
  function search(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    window.location.hash = `/admin?tab=${values.get('scope')}&search=${encodeURIComponent(values.get('search').trim())}`;
  }
  async function signOut() {
    setBusy(true);
    try { await logout(); } catch { /* AuthProvider clears the local session even if the API is unavailable. */ }
    finally { window.location.replace('#/admin/login'); setBusy(false); }
  }
  function navigate(event) {
    if (event.target.closest('a')) setOpen(false);
  }
  return <div className={`admin-shell tourgo-admin ${collapsed ? 'admin-collapsed' : ''}`}>
    <aside className="admin-sidebar">
      <div className="admin-logo"><Brand /><span>Admin</span></div>
      <div className="admin-sidebar-heading"><span>KHÔNG GIAN ĐIỀU HÀNH</span><button className="icon-button admin-menu-toggle" aria-label={open ? 'Đóng menu quản trị' : 'Mở menu quản trị'} aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(value => !value)}><Icon name={open ? 'close' : 'menu'} /></button></div>
      <nav id="admin-navigation" className={`admin-navigation ${open ? 'open' : ''}`} aria-label="Menu quản trị" onClick={navigate}>
        {groups.map(group => {
          const items = sections.filter(section => navGroup(section.key) === group);
          if (!items.length) return null;
          return <div className="admin-nav-group" key={group}><h2>{group}</h2>{items.map(section => <a key={section.key} href={`#/admin?tab=${section.key}`} className={path === '/admin' && active === section.key ? 'active' : ''} aria-current={path === '/admin' && active === section.key ? 'page' : undefined}><Icon name={section.key === 'overview' ? 'grid' : section.icon} size={18} />{labels[section.key] || section.label}</a>)}</div>;
        })}
        <div className="admin-nav-group"><h2>CÁ NHÂN NỘI BỘ</h2><a href="#/admin/account" className={path === '/admin/account' ? 'active' : ''} aria-current={path === '/admin/account' ? 'page' : undefined}><Icon name="shield" size={18} />Tài khoản & bảo mật</a><a href="#/admin/notifications" className={path === '/admin/notifications' ? 'active' : ''} aria-current={path === '/admin/notifications' ? 'page' : undefined}><Icon name="calendar" size={18} />Thông báo nội bộ</a></div>
      </nav>
      <div className="admin-sidebar-note"><Icon name="shield" size={18} /><span>{admin ? 'Toàn quyền quản trị hệ thống' : 'Truy cập theo quyền được cấp'}</span></div>
    </aside>
    <div className="admin-workarea"><header className="admin-topbar"><button className="icon-button admin-collapse-toggle" aria-label={collapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><Icon name="menu" /></button>{sections.some(section => ['tours', 'bookings'].includes(section.key)) && <form className="admin-search" onSubmit={search}><Icon name="search" size={19} /><input name="search" required maxLength={120} aria-label="Tìm kiếm quản trị" placeholder="Tìm kiếm tour, booking..." /><select name="scope" aria-label="Phạm vi tìm kiếm">{sections.filter(section => ['tours', 'bookings'].includes(section.key)).map(section => <option key={section.key} value={section.key}>{section.key === 'tours' ? 'Tour' : 'Booking'}</option>)}</select></form>}<div className="admin-session"><a href="#/admin/notifications" className="admin-header-icon" aria-label="Thông báo nội bộ"><Icon name="bell" /></a>{sections.some(section => section.key === 'support') && <a href="#/admin?tab=support" className="admin-header-icon" aria-label="Yêu cầu hỗ trợ"><Icon name="headset" /></a>}<a href="#/admin/account" className="admin-profile"><span className="admin-avatar" aria-hidden="true">{user.fullName?.trim().charAt(0) || 'T'}</span><div><strong>{user.fullName}</strong><small>Quản trị viên</small></div></a><button className="admin-signout" disabled={busy} onClick={signOut} aria-label="Đăng xuất" title="Đăng xuất"><Icon name="logout" size={18} /></button></div></header>
      <section className="admin-content" aria-label={title} key={`${path}:${active || ''}:${params.get('search') || ''}:${params.get('booking') || ''}`}>{children}</section>
      <div className="admin-bottomline">TourGo · Hệ thống quản lý tour · Admin</div>
    </div>
  </div>;
}