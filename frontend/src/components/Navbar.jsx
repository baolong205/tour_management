import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { queryString } from '../utils.js';
import Brand from './Brand.jsx';
import { Icon } from './UI.jsx';

export default function Navbar({ path }) {
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { user, logout } = useAuth();
  function search(event) {
    event.preventDefault();
    window.location.hash = `/tours?${queryString({ search: new FormData(event.currentTarget).get('search')?.trim() })}`;
    setOpen(false);
  }
  return <header className="header tourgo-header"><div className="container nav"><Brand />
    <button className="menu-toggle icon-button" onClick={() => setOpen(value => !value)} aria-expanded={open} aria-controls="customer-navigation" aria-label={open ? 'Đóng menu' : 'Mở menu'}><Icon name={open ? 'close' : 'menu'} /></button>
    <nav id="customer-navigation" className={`nav-links ${open ? 'open' : ''}`} onClick={() => setOpen(false)} aria-label="Menu chính"><a href="#/" className={path === '/' ? 'active' : ''}>Trang chủ</a><a href="#/tours" className={path.startsWith('/tours') ? 'active' : ''}>Khám phá tour</a><a href="#/favorites" className={path === '/favorites' ? 'active' : ''}>Yêu thích</a><a href="#/support" className={path === '/support' ? 'active' : ''}>Liên hệ</a>{user && <><a className="mobile-account-link" href="#/bookings">Tour của tôi</a><a className="mobile-account-link" href="#/account">Tài khoản</a><a className="mobile-account-link" href="#/notifications">Thông báo</a></>}</nav>
    <form className="header-search" onSubmit={search} role="search"><Icon name="search" size={17} /><input name="search" aria-label="Tìm tour, điểm đến" maxLength={120} placeholder="Tìm tour, điểm đến..." /><button aria-label="Tìm kiếm" type="submit"><Icon name="search" size={21} /></button></form>
    <div className="nav-account">{user ? <><a className="header-icon-link" href="#/notifications" aria-label="Thông báo"><Icon name="bell" size={23} /></a><a className="header-icon-link" href="#/bookings" aria-label="Tour của tôi"><Icon name="bag" size={23} /></a><div className="header-user-menu"><button className="header-user-button" aria-expanded={accountOpen} aria-controls="header-user-links" onClick={() => setAccountOpen(value => !value)}><span className="header-avatar">{user.fullName?.trim().charAt(0) || 'T'}</span><span className="header-user-name">{user.fullName}</span><span aria-hidden="true">⌄</span></button>{accountOpen && <div id="header-user-links" className="header-user-links"><a href="#/account/overview" onClick={() => setAccountOpen(false)}>Tổng quan tài khoản</a><a href="#/account" onClick={() => setAccountOpen(false)}>Thông tin cá nhân</a><a href="#/bookings" onClick={() => setAccountOpen(false)}>Tour của tôi</a><button onClick={() => { setAccountOpen(false); logout().catch(() => {}); }}>Đăng xuất</button></div>}</div></> : <a className="btn small" href="#/login"><Icon name="user" size={17} />Đăng nhập</a>}</div>
  </div></header>;
}