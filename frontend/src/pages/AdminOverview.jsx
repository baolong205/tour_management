import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useApi } from '../hooks.js';
import { date, money, statusLabels } from '../utils.js';
import { vietnamToday, bookingChart } from '../staff-dashboard.js';
import { popularTours, revenueMonths } from '../admin-dashboard.js';
import { Icon, State } from '../components/UI.jsx';

const colors = ['#00bf97', '#ffb900', '#1687ff', '#ff5367', '#97a3bd', '#8259ef', '#556b8b', '#c1ccdc'];
const link = tab => `#/admin?tab=${tab}`;
function Heading({ icon, title, tab, children }) {
  return <div className="ao-heading"><h2><Icon name={icon} size={19} />{title}</h2>{children || (tab && <a href={link(tab)}>Xem tất cả <Icon size={13} /></a>)}</div>;
}
function Result({ source, retry, empty, children }) {
  return <><State loading={source.loading} error={source.error} retry={retry} />{!source.loading && !source.error && (empty ? <p className="ao-empty">Chưa có dữ liệu.</p> : children)}</>;
}
export default function AdminOverview() {
  const { user, can } = useAuth();
  const today = vietnamToday();
  const currentYear = Number(today.slice(0, 4));
  const [year, setYear] = useState(currentYear);
  const [revision, setRevision] = useState(0);
  const retry = () => setRevision(value => value + 1);
  const report = useApi(`/reports/overview?groupBy=month&fromDate=${year}-01-01&toDate=${year}-12-31`, revision);
  const bookings = useApi(can('booking:read') ? '/bookings?page=1&limit=100' : null, revision);
  const customers = useApi(can('user:read') ? '/users?page=1&limit=5&role=CUSTOMER' : null, revision);
  const schedules = useApi(can('schedule:read') ? `/schedules?page=1&limit=100&fromDate=${today}` : null, revision);
  const notifications = useApi('/notifications?page=1&limit=5', revision);
  const items = bookings.data?.items || [];
  const months = revenueMonths(report.data?.items, year);
  const max = Math.max(1, ...months);
  const statuses = Object.entries(bookingChart(items, year).statuses);
  let cursor = 0;
  const gradient = statuses.map(([, count], index) => { const start = cursor; cursor += count / items.length * 100; return `${colors[index % colors.length]} ${start}% ${cursor}%`; }).join(',');
  const tours = popularTours(items);
  const upcoming = (schedules.data?.items || []).filter(item => ['OPEN', 'FULL'].includes(item.status)).slice(0, 5);
  const monthly = report.data?.items?.find(row => row.period === today.slice(0, 7));
  const metrics = [
    { title: 'Tổng tour', value: report.data?.tourCount, source: report, icon: 'document', color: 'blue', note: 'Toàn hệ thống' },
    ...(can('user:read') ? [{ title: 'Tổng khách hàng', value: customers.data?.total, source: customers, icon: 'users', color: 'green', note: 'Tài khoản khách hàng' }] : []),
    { title: 'Tổng booking', value: report.data?.bookingCount, source: report, icon: 'calendar', color: 'orange', note: 'Toàn hệ thống' },
    { title: year === currentYear ? 'Tiền nhận (tháng này)' : `Tiền nhận (năm ${year})`, value: report.data ? money(year === currentYear ? monthly?.received || 0 : report.data.received) : null, source: report, icon: 'wallet', color: 'purple', note: 'Chưa trừ tiền hoàn · không phải lợi nhuận' },
  ];
  return <div className="admin-overview">
    <section className="ao-welcome"><div><span>Trang tổng quan</span><h1>Xin chào, {user.fullName || 'bạn'}!</h1><p>Chúc bạn một ngày làm việc hiệu quả. Cùng TourGo phát triển du lịch Việt Nam!</p></div><div className="ao-date"><Icon name="calendar" size={30} /><div><strong>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date())}</strong><small>Đồng hành cùng những hành trình mới</small></div></div></section>
    <div className="ao-metrics">{metrics.map(item => <section className="ao-metric" key={item.title}><span className={`ao-metric-icon ${item.color}`}><Icon name={item.icon} size={30} /></span><div><h2>{item.title}</h2><strong>{item.source.loading ? '…' : item.source.error ? '—' : item.value ?? '—'}</strong><small>{item.source.error ? 'Chưa tải được dữ liệu' : item.note}</small></div></section>)}</div>
    <div className="ao-main-grid"><div className="ao-main"><div className="ao-charts">
      <section className="ao-card"><Heading icon="grid" title="Dòng tiền nhận theo tháng"><select aria-label="Năm thống kê" value={year} onChange={event => setYear(Number(event.target.value))}>{[currentYear, currentYear - 1, currentYear - 2].map(value => <option key={value} value={value}>Năm {value}</option>)}</select></Heading><Result source={report} retry={retry}><div className="ao-bar-chart" role="img" aria-label={`Tiền nhận từng tháng năm ${year}`}><div className="ao-axis"><span>{money(max)}</span><span>{money(max / 2)}</span><span>0đ</span></div><div className="ao-bars">{months.map((value, index) => <div className="ao-bar-column" key={index}><div className="ao-bar-track"><span title={`Tháng ${index + 1}: ${money(value)}`} style={{ height: `${value / max * 100}%` }}><span className="ao-tooltip">T{index + 1}: {money(value)}</span></span></div><small>T{index + 1}</small></div>)}</div></div><p className="ao-note">Tiền thực nhận; chưa trừ hoàn tiền. <a href={link('reports')}>Xem báo cáo chi tiết →</a></p></Result></section>
      {can('booking:read') && <section className="ao-card"><Heading icon="globe" title="Booking theo trạng thái" /><Result source={bookings} retry={retry} empty={!items.length}><div className="ao-donut-layout"><div className="ao-donut" role="img" aria-label={statuses.map(([status, count]) => `${statusLabels[status] || status}: ${count}`).join(', ')} style={{ background: `conic-gradient(${gradient || '#e8eef8 0% 100%'})` }}><div><strong>{items.length}</strong><small>booking</small></div></div><ul>{statuses.map(([status, count], index) => <li key={status}><i style={{ background: colors[index % colors.length] }} /><div>{statusLabels[status] || status}<small>{count} ({Math.round(count / items.length * 100)}%)</small></div></li>)}</ul></div></Result><p className="ao-note">Tối đa 100 booking gần nhất; trạng thái đơn không thay thế kết quả thanh toán.</p></section>}
    </div>
    {can('booking:read') && <section className="ao-card ao-recent"><Heading icon="calendar" title="Đơn đặt tour gần đây" tab="bookings" /><Result source={bookings} retry={retry} empty={!items.length}><div className="ao-table-scroll"><table><thead><tr>{['Mã booking', 'Khách hàng', 'Tour', 'Ngày khởi hành', 'Số lượng', 'Tổng tiền', 'Trạng thái', 'Thao tác'].map(title => <th key={title}>{title}</th>)}</tr></thead><tbody>{items.slice(0, 5).map(item => <tr key={item.id}><td><a href={`${link('bookings')}&booking=${encodeURIComponent(item.id)}`}>{item.code}</a></td><td>{item.contactName}</td><td>{item.tourName}</td><td>{date(item.startDate)}</td><td>{item.passengerCount}</td><td>{money(item.total)}</td><td><span className={`ao-status ${item.status?.toLowerCase()}`}>{statusLabels[item.status] || item.status}</span></td><td><a className="ao-view" aria-label={`Xem đơn ${item.code}`} href={`${link('bookings')}&booking=${encodeURIComponent(item.id)}`}>Xem</a></td></tr>)}</tbody></table></div></Result></section>}
    </div>{can('booking:read') && <aside className="ao-card ao-popular"><Heading icon="flag" title="Tour được đặt nhiều" tab="tours" /><Result source={bookings} retry={retry} empty={!tours.length}>{tours.map((item, index) => <a className="ao-tour" key={item.id} href={`${link('bookings')}&search=${encodeURIComponent(item.name || '')}`}><span className="ao-tour-art"><Icon name="plane" size={30} /><b>{index + 1}</b></span><div><h3>{item.name}</h3><small><Icon name="calendar" size={12} /> {item.count} booking</small><strong>{money(item.total)}</strong></div></a>)}</Result><p className="ao-note">Theo tối đa 100 booking gần nhất, loại đơn hủy/từ chối/hết hạn. Số tiền là tổng giá trị đơn, không phải tiền đã nhận.</p></aside>}</div>
    <div className="ao-bottom-grid">
      {can('user:read') && <section className="ao-card"><Heading icon="users" title="Khách hàng mới" tab="customers" /><Result source={customers} retry={retry} empty={!customers.data?.items?.length}>{customers.data?.items?.map(item => <a className="ao-customer" key={item.id} href={link('customers')}><span className="admin-avatar">{item.fullName?.charAt(0) || 'K'}</span><strong>{item.fullName}</strong><small>{item.email}</small></a>)}</Result></section>}
      {can('schedule:read') && <section className="ao-card"><Heading icon="calendar" title="Lịch khởi hành sắp tới" tab="schedules" /><Result source={schedules} retry={retry} empty={!upcoming.length}><div className="ao-table-scroll"><table><thead><tr><th>Ngày</th><th>Tour</th><th>Đã bán / tổng</th><th>Trạng thái</th></tr></thead><tbody>{upcoming.map(item => <tr key={item.id}><td>{date(item.startDate)}</td><td><a href={link('schedules')}>{item.tourName}</a></td><td>{item.soldSeats}/{item.maxSeats}</td><td><span className="ao-status confirmed">{item.status === 'FULL' ? 'Đủ chỗ' : 'Còn chỗ'}</span></td></tr>)}</tbody></table></div></Result></section>}
      <section className="ao-card"><Heading icon="bell" title="Thông báo hệ thống"><a href="#/admin/notifications">Xem tất cả <Icon size={13} /></a></Heading><Result source={notifications} retry={retry} empty={!notifications.data?.items?.length}>{notifications.data?.items?.map(item => <a className="ao-notification" href="#/admin/notifications" key={item.id}><span><Icon name="bell" size={19} /></span><div><strong>{item.title}</strong><p>{item.body}</p><small>{date(item.createdAt)}</small></div></a>)}</Result></section>
    </div>
  </div>;
}
