import React from 'react';
import StaffDashboard from './StaffDashboard.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { permittedStaffSections } from '../staff-navigation.js';
import StaffSchedules from './StaffSchedules.jsx';
import StaffBookings from './StaffBookings.jsx';
import StaffPayments from './StaffPayments.jsx';
import StaffUsers from './StaffUsers.jsx';
import Support from './Support.jsx';
import ActionForm from '../components/ActionForm.jsx';
import { Icon } from '../components/UI.jsx';

export default function StaffWorkspace({ params }) {
  const { user } = useAuth();
  const sections = permittedStaffSections(user);
  const tab = params.get('tab') || 'home';
  if (!user?.roles?.includes('STAFF') || user.roles.includes('ADMIN')) return <div className="state">Khu vực chỉ dành cho nhân viên.</div>;
  if (tab === 'home') return <StaffDashboard />;
  if (!sections.some(section => section.key === tab)) return <div className="state" role="alert"><Icon name="shield" size={32} /><h2>Bạn không có quyền sử dụng chức năng này</h2><p>Khu vực nhân viên không bao gồm chức năng quản trị hệ thống.</p><a className="btn" href="#/staff">Về bàn làm việc</a></div>;
  const screens = { bookings: <StaffBookings initialSearch={params.get('search') || ''} initialSelected={params.get('booking') || ''} />, payments: <StaffPayments />, schedules: <StaffSchedules initialSelected={params.get('schedule') || ''} />, customers: <StaffUsers />, support: <Support staff />, notify: <section className="panel workspace-form"><h2>Gửi thông báo cho khách</h2><ActionForm path="/notifications" fields={[{ name: 'userId', label: 'ID tài khoản người nhận', required: true, help: 'Lấy ID từ danh sách khách hàng.' }, { name: 'type', label: 'Loại', required: true, options: ['SYSTEM', 'DEPARTURE_REMINDER'] }, { name: 'title', label: 'Tiêu đề', required: true, maxLength: 200 }, { name: 'body', label: 'Nội dung', type: 'textarea', maxLength: 2000 }]} label="Gửi thông báo" /></section> };
  return <div className="workspace-page">{screens[tab]}</div>;
}


