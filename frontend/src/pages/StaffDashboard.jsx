import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks.js';
import { permittedStaffSections } from '../staff-navigation.js';
import { bookingChart, bookingLink, vietnamToday } from '../staff-dashboard.js';
import { date, statusLabels } from '../utils.js';
import { Icon, State } from '../components/UI.jsx';

const statusColors = { CONFIRMED: '#0068ff', PENDING_PAYMENT: '#00b77b', PENDING_CONFIRMATION: '#ff9900', CANCEL_REQUESTED: '#f05a65', CANCELLED: '#ff3949', COMPLETED: '#9caac2', REJECTED: '#b080d5', EXPIRED: '#c6cdd9' };

function Heading({ icon, children, href, action = 'Xem tất cả' }) {
  return <div className="staff-card-heading"><h2><Icon name={icon} size={20} />{children}</h2>{href && <a href={href}>{action}<Icon name="arrow" size={14} /></a>}</div>;
}

export default function StaffDashboard() {
  const { user, can } = useAuth();
  const today = vietnamToday();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [revision, setRevision] = useState(0);
  const bookings = useApi(can('booking:read') ? '/bookings?page=1&limit=100' : null, revision);
  const cancellations = useApi(can('booking:read') ? '/bookings?page=1&limit=1&status=CANCEL_REQUESTED' : null, revision);
  const customers = useApi(can('user:read') ? '/users?page=1&limit=1&role=CUSTOMER' : null, revision);
  const schedules = useApi(can('schedule:read') ? `/schedules?page=1&limit=100&fromDate=${today}` : null, revision);
  const notifications = useApi('/notifications?page=1&limit=3', revision);
  const sections = permittedStaffSections(user);
  const items = bookings.data?.items || [];
  const { months, statuses } = bookingChart(items, year);
  const max = Math.max(2, ...months);
  const statusEntries = Object.entries(statuses);
  let cursor = 0;
  const gradient = statusEntries.map(([status, count]) => {
    const start = cursor;
    cursor += count / items.length * 100;
    return `${statusColors[status] || '#8c9db5'} ${start}% ${cursor}%`;
  }).join(', ');
  const upcoming = (schedules.data?.items || []).filter(item => ['OPEN', 'FULL'].includes(item.status));
  const metrics = [
    { label: 'Tổng booking', icon: 'document', color: 'blue', source: bookings, allowed: can('booking:read'), note: 'Tất cả đơn đặt tour', href: '#/staff?tab=bookings' },
    { label: 'Khách hàng', icon: 'users', color: 'green', source: customers, allowed: can('user:read'), note: 'Tài khoản khách hàng', href: '#/staff?tab=customers' },
    { label: 'Yêu cầu hủy', icon: 'wallet', color: 'orange', source: cancellations, allowed: can('booking:read'), note: 'Đang chờ xử lý', href: '#/staff?tab=bookings' },
    { label: 'Lịch sắp khởi hành', icon: 'plane', color: 'purple', source: schedules, allowed: can('schedule:read'), note: 'Lịch từ hôm nay · mọi trạng thái', href: '#/staff?tab=schedules' },
  ].filter(metric => metric.allowed);
  const retry = () => setRevision(value => value + 1);

  return <div className="staff-home">
    <section className="staff-welcome"><div><span>TRANG NHÂN VIÊN</span><h1>Xin chào, {user.fullName || 'bạn'}!</h1><p>Cùng TourGo mang đến những hành trình tuyệt vời cho khách hàng.</p></div><div className="staff-date"><span><Icon name="calendar" size={27} /></span><div><strong>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</strong><small>Chúc bạn một ngày làm việc hiệu quả!</small></div></div></section>
    <div className="staff-metrics">{metrics.map(metric => <a href={metric.href} className="staff-metric" key={metric.label}><span className={`staff-metric-icon ${metric.color}`}><Icon name={metric.icon} size={29} /></span><div><h2>{metric.label}</h2><strong>{metric.source.loading ? '…' : metric.source.error ? '—' : metric.source.data?.total ?? '—'}</strong><small>{metric.source.error ? 'Chưa tải được dữ liệu' : metric.note}</small></div></a>)}</div>
    {metrics.some(metric => metric.source.error) && <div className="notice error" role="alert">Một số số liệu chưa tải được. <button className="text-button" onClick={retry}>Thử lại</button></div>}
    <div className="staff-dashboard-columns">
      <div className="staff-dashboard-main">
        {can('booking:read') && <>
          <div className="staff-chart-grid">
            <section className="staff-card staff-monthly"><Heading icon="grid">Booking theo tháng</Heading><label className="staff-year"><span>Năm</span><select aria-label="Năm thống kê booking" value={year} onChange={event => setYear(Number(event.target.value))}>{[currentYear, currentYear - 1, currentYear - 2].map(value => <option key={value} value={value}>{value}</option>)}</select></label><p className="staff-data-scope">Trong {items.length} đơn gần nhất · theo ngày tạo đơn</p><State loading={bookings.loading} error={bookings.error} retry={retry} />{!bookings.loading && !bookings.error && <div className="staff-bar-chart" role="img" aria-label={`Booking theo tháng năm ${year}: ${months.map((count, index) => `tháng ${index + 1}: ${count}`).join(', ')}`}><div className="staff-chart-scale"><span>{max}</span><span>{Math.round(max / 2)}</span><span>0</span></div><div className="staff-chart-bars">{months.map((count, index) => <div key={index} className="staff-chart-column"><div><span style={{ height: `${count / max * 100}%` }} title={`Tháng ${index + 1}: ${count} booking`} /></div><small>T{index + 1}</small></div>)}</div></div>}</section>
            <section className="staff-card staff-booking-status"><Heading icon="globe">Tình trạng booking</Heading><p className="staff-data-scope">{items.length} đơn gần nhất · trạng thái đơn, không phải trạng thái thanh toán</p><State loading={bookings.loading} error={bookings.error} retry={retry} />{!bookings.loading && !bookings.error && <div className="staff-donut-layout"><div className="staff-donut" style={{ background: gradient ? `conic-gradient(${gradient})` : '#e9eff8' }} role="img" aria-label={`${items.length} booking; ${statusEntries.map(([status, count]) => `${statusLabels[status] || status}: ${count}`).join(', ')}`}><div><strong>{items.length}</strong><span>booking</span></div></div><ul>{statusEntries.map(([status, count]) => <li key={status}><i style={{ background: statusColors[status] || '#8c9db5' }} /><div>{statusLabels[status] || status}<small>{count} ({Math.round(count / items.length * 100)}%)</small></div></li>)}{!items.length && <li>Chưa có booking.</li>}</ul></div>}</section>
          </div>
          <section className="staff-card staff-recent"><Heading icon="calendar" href="#/staff?tab=bookings">Danh sách booking gần đây</Heading><State loading={bookings.loading} error={bookings.error} retry={retry} />{!bookings.loading && !bookings.error && (items.length ? <div className="staff-table-scroll"><table><thead><tr><th>Mã booking</th><th>Khách hàng</th><th>Tour</th><th>Ngày khởi hành</th><th>Số lượng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{items.slice(0, 5).map(item => <tr key={item.id}><td><a href={bookingLink(item.id)}>{item.code}</a></td><td>{item.contactName}</td><td>{item.tourName}</td><td>{date(item.startDate)}</td><td>{item.passengerCount} người</td><td><span className={`staff-booking-badge ${item.status?.toLowerCase()}`}>{statusLabels[item.status] || item.status}</span></td><td><a className="staff-view" href={bookingLink(item.id)}>Xem</a></td></tr>)}</tbody></table></div> : <p className="staff-empty">Chưa có đơn đặt tour.</p>)}</section>
        </>}
        <section className="staff-help-banner"><div><h2>Hỗ trợ khách hàng, kiến tạo hành trình đáng nhớ</h2><p>Luôn sẵn sàng đồng hành cùng khách hàng trong mọi chuyến đi.</p><button type="button" onClick={() => document.getElementById('staff-quick-actions')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>Xem nghiệp vụ của bạn <Icon name="arrow" size={16} /></button></div><Icon name="headset" size={82} /></section>
        <section className="staff-card staff-quick-actions" id="staff-quick-actions"><Heading icon="bag">Nghiệp vụ của bạn</Heading>{sections.length ? <div className="staff-task-grid">{sections.map(section => <a className="staff-task" key={section.key} href={`#/staff?tab=${section.key}`}><Icon name={section.icon} size={20} /><span>{section.label}</span><Icon name="arrow" size={14} /></a>)}</div> : <p className="staff-empty">Chưa có quyền nghiệp vụ. Liên hệ quản trị viên để được cấp quyền.</p>}</section>
      </div>
      <aside className="staff-dashboard-aside">
        {can('schedule:read') && <section className="staff-card staff-upcoming"><Heading icon="calendar" href="#/staff?tab=schedules">Lịch khởi hành sắp tới</Heading><State loading={schedules.loading} error={schedules.error} retry={retry} />{!schedules.loading && !schedules.error && (upcoming.length ? upcoming.slice(0, 3).map(item => <a className="staff-departure" href="#/staff?tab=schedules" key={item.id}><span className="staff-departure-art"><Icon name="plane" size={28} /></span><div><h3>{item.tourName}</h3><p><Icon name="calendar" size={14} />{date(item.startDate)}</p><span className="staff-departure-badge">{item.status === 'FULL' ? 'Đã đủ chỗ' : 'Sắp khởi hành'}</span></div></a>) : <p className="staff-empty">Chưa có lịch mở bán hoặc đủ chỗ sắp khởi hành trong {schedules.data?.items?.length || 0} lịch gần nhất.</p>)}</section>}
        <section className="staff-card staff-notification-card"><Heading icon="bell" href="#/staff/notifications">Thông báo mới</Heading><State loading={notifications.loading} error={notifications.error} retry={retry} />{!notifications.loading && !notifications.error && (notifications.data?.items?.length ? notifications.data.items.map(item => <a className={`staff-notification ${item.isRead ? 'read' : ''}`} href="#/staff/notifications" key={item.id}><span><Icon name="bell" size={23} /></span><div><h3>{item.title}</h3><p>{item.body}</p><small>{new Date(item.createdAt).toLocaleString('vi-VN')}</small></div></a>) : <p className="staff-empty">Bạn chưa có thông báo mới.</p>)}</section>
      </aside>
    </div>
  </div>;
}
