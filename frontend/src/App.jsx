import React, { useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from './pages/Home.jsx';
import Tours from './pages/Tours.jsx';
import TourDetail from './pages/TourDetail.jsx';
import Login from './pages/Login.jsx';
import Booking from './pages/Booking.jsx';
import MyBookings from './pages/MyBookings.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import { useAuth } from './context/AuthContext.jsx';

function Protected({ children, permission, next }) {
  const { user, loading, can } = useAuth();
  if (loading) return <div className="state" role="status">Đang kiểm tra tài khoản...</div>;
  if (!user) return <div className="state"><h1>Đăng nhập để tiếp tục</h1><p>Tài khoản giúp bạn quản lý và theo dõi các hành trình.</p><a className="btn" href={`#/login?next=${encodeURIComponent(next)}`}>Đăng nhập</a></div>;
  if (permission && !can(permission)) return <div className="state"><h1>Bạn chưa có quyền truy cập</h1><a className="btn" href="#/">Về trang chủ</a></div>;
  return children;
}
export default function App() {
  const [route, setRoute] = useState(window.location.hash.slice(1) || '/');
  useEffect(() => { const change = () => { setRoute(window.location.hash.slice(1) || '/'); window.scrollTo(0, 0); }; window.addEventListener('hashchange', change); return () => window.removeEventListener('hashchange', change); }, []);
  const [path, query = ''] = route.split('?');
  const params = new URLSearchParams(query);
  let page;
  if (path === '/') page = <Home />;
  else if (path === '/tours') page = <Tours params={params} />;
  else if (/^\/tours\/[^/]+$/.test(path)) page = <TourDetail key={path} id={path.split('/')[2]} />;
  else if (path === '/login') page = <Login params={params} />;
  else if (/^\/booking\/[^/]+$/.test(path)) page = <Protected next={route} permission="booking:create"><Booking key={route} id={path.split('/')[2]} params={params} /></Protected>;
  else if (path === '/bookings') page = <Protected next={route}><MyBookings /></Protected>;
  else if (path === '/admin') page = <Protected next={route} permission="tour:read"><AdminDashboard /></Protected>;
  else page = <div className="state"><h1>Không tìm thấy trang</h1><a className="btn" href="#/">Về trang chủ</a></div>;
  return <><a className="skip-link" href="#main" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus(); }}>Bỏ qua menu</a><Navbar path={path} /><main id="main" tabIndex={-1}>{page}</main><Footer /></>;
}
