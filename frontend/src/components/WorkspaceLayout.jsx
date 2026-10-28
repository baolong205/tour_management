import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { activeWorkspaceSection, permittedSections } from '../workspace-navigation.js';
import { Icon } from './UI.jsx';

export default function WorkspaceLayout({ path, params, children }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const sections = permittedSections(user);
  const active = activeWorkspaceSection(user, params);
  const title = path === '/admin/account' ? 'Tài khoản & bảo mật' : path === '/admin/notifications' ? 'Thông báo nội bộ' : sections.find(section => section.key === active)?.label || 'Chức năng điều hành';
  const admin = user.roles.includes('ADMIN');
  const groups = ['TỔNG QUAN', 'SẢN PHẨM', 'NGHIỆP VỤ', 'HỆ THỐNG'];
  async function signOut() {
    setBusy(true);
    try { await logout(); } catch { /* AuthProvider clears the local session even if the API is unavailable. */ }
    finally { window.location.replace('#/admin/login'); setBusy(false); }
  }
  function navigate(event) {
    if (event.target.closest('a')) setOpen(false);
  }
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a href="#/admin" className="admin-brand"><span className="admin-brand-mark">V</span><span>ViVu<span className="admin-brand-caption">{admin ? 'ADMIN CONSOLE' : 'STAFF WORKSPACE'}</span></span></a>
      <div className="admin-sidebar-heading"><span>KHÔNG GIAN ĐIỀU HÀNH</span><button className="icon-button admin-menu-toggle" aria-label={open ? 'Đóng menu quản trị' : 'Mở menu quản trị'} aria-controls="admin-navigation" aria-expanded={open} onClick={() => setOpen(value => !value)}><Icon name={open ? 'close' : 'menu'} /></button></div>
      <nav id="admin-navigation" className={`admin-navigation ${open ? 'open' : ''}`} aria-label="Menu quản trị" onClick={navigate}>
        {groups.map(group => {
          const items = sections.filter(section => section.group === group);
          if (!items.length) return null;
          return <div className="admin-nav-group" key={group}><h2>{group}</h2>{items.map(section => <a key={section.key} href={`#/admin?tab=${section.key}`} className={path === '/admin' && active === section.key ? 'active' : ''} aria-current={path === '/admin' && active === section.key ? 'page' : undefined}><Icon name={section.icon} size={18} />{section.label}</a>)}</div>;
        })}
        <div className="admin-nav-group"><h2>CÁ NHÂN NỘI BỘ</h2><a href="#/admin/account" className={path === '/admin/account' ? 'active' : ''} aria-current={path === '/admin/account' ? 'page' : undefined}><Icon name="shield" size={18} />Tài khoản & bảo mật</a><a href="#/admin/notifications" className={path === '/admin/notifications' ? 'active' : ''} aria-current={path === '/admin/notifications' ? 'page' : undefined}><Icon name="calendar" size={18} />Thông báo nội bộ</a></div>
      </nav>
      <div className="admin-sidebar-note"><Icon name="shield" size={18} /><span>{admin ? 'Toàn quyền quản trị hệ thống' : 'Truy cập theo quyền được cấp'}</span></div>
    </aside>
    <div className="admin-workarea"><header className="admin-topbar"><div><span className="admin-eyebrow">{admin ? 'QUẢN TRỊ WEBSITE' : 'NGHIỆP VỤ NHÂN VIÊN'}</span><h1>{title}</h1></div><div className="admin-session"><span className="admin-avatar" aria-hidden="true">{user.fullName?.trim().charAt(0) || 'V'}</span><div><strong>{user.fullName}</strong><small>{admin ? 'Quản trị viên' : 'Nhân viên CSKH'}</small></div><button className="btn outline small" disabled={busy} onClick={signOut}>{busy ? 'Đang thoát...' : 'Đăng xuất'}</button></div></header>
      <section className="admin-content" aria-label={title} key={`${path}:${active || ''}`}>{children}</section>
      <div className="admin-bottomline">ViVu Travel · Hệ thống quản lý tour · {admin ? 'Admin' : 'Staff'}</div>
    </div>
  </div>;
}