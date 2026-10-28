import React, { useEffect, useRef, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Tours from './pages/Tours.jsx';
import Favorites from './pages/Favorites.jsx';
import TourDetail from './pages/TourDetail.jsx';
import Login from './pages/Login.jsx';
import Booking from './pages/Booking.jsx';
import MyBookings from './pages/MyBookings.jsx';
import Workspace from './pages/Workspace.jsx';
import Account from './pages/Account.jsx';
import PasswordRecovery from './pages/PasswordRecovery.jsx';
import Notifications from './pages/Notifications.jsx';
import Support from './pages/Support.jsx';
import Payment from './pages/Payment.jsx';
import Reviews from './pages/Reviews.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { observePageMotion } from './motion.js';
import { observeTilt } from './tilt.js';
import WorkspaceLayout from './components/WorkspaceLayout.jsx';
import { canEnterWorkspace } from './management.js';
import { isWorkspacePath, routeForUser } from './routing.js';
import AccountLayout from './components/AccountLayout.jsx';
import AccountOverview from './pages/AccountOverview.jsx';
import BookingDetail from './pages/BookingDetail.jsx';
import { isAccountPath } from './booking-view.js';
import StaffLayout from './components/StaffLayout.jsx';
import StaffWorkspace from './pages/StaffWorkspace.jsx';

function Protected({ children, permission, next }) {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="state" role="status">Đang kiểm tra tài khoản...</div>;
  if (!user) return <div className="state"><h1>Đăng nhập để tiếp tục</h1><p>Tài khoản giúp bạn quản lý và theo dõi các hành trình.</p><a className="btn" href={`#/login?next=${encodeURIComponent(next)}`}>Đăng nhập</a></div>;
  if (permission && !can(permission)) return <div className="state"><h1>Bạn chưa có quyền truy cập</h1><a className="btn" href="#/">Về trang chủ</a></div>;
  return children;
}
export default function App() {
  const { user, loading } = useAuth();
  const mainRef = useRef(null);
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => { const change = () => { setRoute(window.location.hash.slice(1) || '/'); window.scrollTo(0, 0); }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  const [path, query = ''] = route.split('?');
  const params = new URLSearchParams(query);
  const redirect = loading ? null : routeForUser(user, route);
  const staffArea = path === '/staff' || path.startsWith('/staff/');
  const managementArea = staffArea || path === '/admin' || path.startsWith('/admin/');
  useEffect(() => { if (redirect) window.location.replace(`#${redirect}`); }, [redirect, route]);
  useEffect(() => {
    if (loading || redirect || managementArea) return;
    const stopMotion = observePageMotion(mainRef.current);
    const stopTilt = observeTilt(mainRef.current);
    return () => { stopMotion(); stopTilt(); };
  }, [loading, redirect, managementArea]);
  const skip = <a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Bỏ qua menu</a>;
  if (loading || redirect) return <main id="main" ref={mainRef} tabIndex={-1}><div className="state" role="status">{loading ? 'Đang kiểm tra tài khoản...' : 'Đang chuyển đến trang quản trị...'}</div></main>;
  if (managementArea) {
    let content;
    const base = staffArea ? '/staff' : '/admin';
    if (!user) content = <Login key={base} managementLogin staffLogin={staffArea} params={new URLSearchParams({ next: isWorkspacePath(path) ? route : base })} />;
    else if (!canEnterWorkspace(user)) content = <div className="state"><h1>Bạn không có quyền truy cập khu vực quản trị</h1><p>Khu vực này chỉ dành cho Admin và nhân viên được cấp quyền.</p><a className="btn" href="#/">Về trang khách hàng</a></div>;
    else {
      const screen = path === base ? (staffArea ? <StaffWorkspace params={params} /> : <Workspace params={params} />) : path === `${base}/account` ? <Account managementAccount /> : path === `${base}/notifications` ? <Notifications managementNotifications /> : <div className="state"><h1>Không tìm thấy chức năng</h1><a className="btn" href={`#${base}`}>Về không gian làm việc</a></div>;
      content = staffArea ? <StaffLayout path={path} params={params}>{screen}</StaffLayout> : <WorkspaceLayout path={path} params={params}>{screen}</WorkspaceLayout>;
    }
    return <>{skip}<main id="main" ref={mainRef} tabIndex={-1} className="management-root">{content}</main></>;
  }
  let page;
  if (path === '/') page = <Home />;
  else if (path === '/tours') page = <Tours params={params} />;
  else if (path === '/favorites') page = <Protected next={route}><Favorites /></Protected>;
  else if (/^\/tours\/[^/]+$/.test(path)) page = <TourDetail key={path} id={path.split('/')[2]} />;
  else if (path === '/login') page = <Login params={params} />;
  else if (path === '/forgot-password' || path === '/reset-password') page = <PasswordRecovery key={path} params={params} reset={path === '/reset-password'} />;
  else if (path === '/account') page = <Protected next={route}><Account /></Protected>;
  else if (path === '/account/security') page = <Protected next={route}><Account securityOnly /></Protected>;
  else if (path === '/account/overview') page = <Protected next={route}><AccountOverview /></Protected>;
  else if (path === '/notifications') page = <Protected next={route}><Notifications /></Protected>;
  else if (path === '/support') page = <Protected next={route}><Support /></Protected>;
  else if (path === '/reviews') page = <Protected next={route}><Reviews key={params.get('bookingId') || 'mine'} bookingId={params.get('bookingId')} /></Protected>;
  else if (/^\/payment\/[^/]+$/.test(path)) page = <Protected next={route}><Payment key={path} id={path.split('/')[2]} /></Protected>;
  else if (/^\/booking\/[^/]+$/.test(path)) page = <Protected next={route} permission="booking:create"><Booking key={route} id={path.split('/')[2]} params={params} /></Protected>;
  else if (path === '/bookings') page = <Protected next={route}><MyBookings /></Protected>;
  else if (/^\/bookings\/[^/]+$/.test(path)) page = <Protected next={route}><BookingDetail key={path} id={path.split('/')[2]} /></Protected>;
  else page = <div className="state"><h1>Không tìm thấy trang</h1><a className="btn" href="#/">Về trang chủ</a></div>;
  const accountArea = user && isAccountPath(path);
  if (path === '/login') return <div className="customer-site login-site">{skip}<main id="main" ref={mainRef} tabIndex={-1}>{page}</main></div>;
  return <div className={`customer-site ${accountArea ? 'customer-account-site' : ''}`}>{skip}<Navbar path={path} /><main id="main" ref={mainRef} tabIndex={-1}><div className="route-view" key={path}>{accountArea ? <AccountLayout path={path}>{page}</AccountLayout> : page}</div></main>{!accountArea && <Footer />}</div>;
}
