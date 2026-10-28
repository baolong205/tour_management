import React from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { management } from '../management.js';
import AdminDashboard from './AdminDashboard.jsx';
import Management from './Management.jsx';
import StaffBookings from './StaffBookings.jsx';
import StaffPayments from './StaffPayments.jsx';
import StaffUsers from './StaffUsers.jsx';
import Moderation from './Moderation.jsx';
import Reports from './Reports.jsx';
import Support from './Support.jsx';
import ActionForm from '../components/ActionForm.jsx';
import Refunds from './Refunds.jsx';
import { activeWorkspaceSection, permittedSections } from '../workspace-navigation.js';

export default function Workspace({ params }) {
  const { user } = useAuth();
  if (!user?.roles?.includes('ADMIN')) return <div className="state"><h1>Khu vực chỉ dành cho Admin</h1></div>;
  const tabs = permittedSections(user);
  const tab = activeWorkspaceSection(user, params);
  const allowed = tabs.some(section => section.key === tab);
  let content;
  if (!allowed) content = <div className="state">Bạn không có quyền sử dụng chức năng này.</div>;
  else if (management[tab]) content = <Management key={tab} config={management[tab]} />;
  else if (tab === 'overview') content = <Reports />;
  else if (tab === 'tours') content = <AdminDashboard />;
  else if (tab === 'bookings') content = <StaffBookings />;
  else if (tab === 'payments') content = <StaffPayments />;
  else if (tab === 'refunds') content = <Refunds />;
  else if (tab === 'customers' || tab === 'staff') content = <StaffUsers key={tab} staff={tab === 'staff'} />;
  else if (tab === 'reviews') content = <Moderation />;
  else if (tab === 'support') content = <Support staff />;
  else if (tab === 'notify') content = <section className="panel workspace-form"><h2>Gửi thông báo cho khách</h2><ActionForm path="/notifications" fields={[{ name: 'userId', label: 'ID tài khoản người nhận', required: true, help: 'Lấy ID từ danh sách khách hàng.' }, { name: 'type', label: 'Loại', required: true, options: ['SYSTEM', 'DEPARTURE_REMINDER'] }, { name: 'title', label: 'Tiêu đề', required: true, maxLength: 200 }, { name: 'body', label: 'Nội dung', type: 'textarea', maxLength: 2000 }]} label="Gửi thông báo" /></section>;
  return <div className="workspace-page">{content}</div>;
}