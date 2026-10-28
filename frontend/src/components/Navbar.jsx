import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { Icon } from './UI.jsx';

export default function Navbar({ path }) {
  const [open, setOpen] = useState(false);
  const { user, can, logout } = useAuth();
  return <header className="header"><div className="container nav"><a className="brand" href="#/" aria-label="ViVu Travel trang chủ"><span className="brand-icon">v<span>v</span></span><span>ViVu<span className="brand-sub">TRAVEL & EXPLORE</span></span></a><button className="menu-toggle icon-button" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Mở menu"><Icon name={open ? 'close' : 'menu'} /></button><nav className={open ? 'nav-links open' : 'nav-links'} onClick={() => setOpen(false)} aria-label="Menu chính"><a className={path === '/' ? 'active' : ''} href="#/">Trang chủ</a><a className={path.startsWith('/tours') ? 'active' : ''} href="#/tours">Khám phá tour</a><a href="#/tours?sortBy=avgRating">Tour được yêu thích</a>{user && <a href="#/bookings">Đơn của tôi</a>}{can('tour:read') && <a href="#/admin">Quản lý</a>}</nav><div className="nav-account">{user ? <><span className="user-name">{user.fullName}</span><button className="text-button" onClick={() => logout().catch(() => {})}>Đăng xuất</button></> : <a href="#/login" className="btn small">Đăng nhập <Icon name="arrow" size={16} /></a>}</div></div></header>;
}
