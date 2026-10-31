import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { queryString } from '../utils.js';
import ActionForm from '../components/ActionForm.jsx';
import ActionDialog from '../components/ActionDialog.jsx';
import { Icon, Pagination, State } from '../components/UI.jsx';
import { passwordField } from './Account.jsx';

const statuses = { ACTIVE: 'Đang hoạt động', LOCKED: 'Đã khóa', PENDING_VERIFY: 'Chờ xác minh' };
export default function StaffUsers({ staff = false }) {
  const { can, user: currentUser } = useAuth();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [revision, setRevision] = useState(0);
  const list = useApi(`/users?${queryString({ page, limit: 10, ...filters, role: staff ? 'STAFF' : 'CUSTOMER' })}`, revision);
  const refresh = () => setRevision(value => value + 1);
  return <section className="records-page users-page"><header className="records-heading"><div><span className="records-eyebrow">QUẢN LÝ TÀI KHOẢN</span><h1>{staff ? 'Nhân viên & phân quyền' : 'Khách hàng'}</h1><p>Tra cứu thông tin và thực hiện thao tác trên từng tài khoản.</p></div>{staff && can('role:manage') && <ActionDialog title="Tạo tài khoản nhân viên" className="primary"><ActionForm path="/users/staff" fields={[{ name: 'fullName', label: 'Họ tên', required: true, minLength: 2, maxLength: 150 }, { name: 'email', label: 'Email', type: 'email', required: true }, { ...passwordField, name: 'password', label: 'Mật khẩu khởi tạo' }, { name: 'phone', label: 'Điện thoại', maxLength: 20 }]} onSuccess={refresh} /></ActionDialog>}</header>
    <form className="records-toolbar" onSubmit={event => { event.preventDefault(); setFilters(Object.fromEntries(new FormData(event.currentTarget))); setPage(1); }}><label className="records-search"><Icon name="search" size={18} /><input name="search" maxLength={120} placeholder="Tìm theo tên hoặc email..." aria-label="Tên hoặc email" /></label><label className="records-filter">Trạng thái<select name="status"><option value="">Tất cả</option>{Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="btn small">Tìm kiếm</button><button className="record-action" type="button" onClick={refresh}>Làm mới</button></form>
    <div className="records-surface"><div className="records-list-heading"><h2>Danh sách {staff ? 'nhân viên' : 'khách hàng'}</h2><span>{list.loading ? 'Đang tải…' : list.data ? `${list.data.total} tài khoản` : 'Chưa tải được dữ liệu'}</span></div><State loading={list.loading} error={list.error} empty={!list.loading && !list.error && !list.data?.items?.length} retry={refresh} />
      {!!list.data?.items?.length && <div className="records-table-scroll"><table className="records-table"><thead><tr><th>Họ và tên</th><th>Liên hệ</th><th>Trạng thái</th><th>Vai trò</th><th>Thao tác</th></tr></thead><tbody>{list.data.items.map(user => <tr key={user.id}><td><div className="record-identity"><span className="record-avatar">{user.fullName?.charAt(0) || 'K'}</span><div><strong>{user.fullName}</strong><small title={user.id}>ID: {user.id.slice(0, 8)}…</small></div></div></td><td>{user.email}<small>{user.phone || 'Chưa có số điện thoại'}</small></td><td><span className={`record-badge ${user.status === 'ACTIVE' ? 'success' : user.status === 'LOCKED' ? 'danger' : 'warning'}`}>{statuses[user.status] || user.status}</span></td><td><div className="record-tags">{user.roles.map(role => <span className="record-badge" key={role}>{role}</span>)}</div></td><td><ActionDialog title={user.fullName || 'Thông tin tài khoản'} label="Chi tiết / Quản lý"><div className="record-profile-summary"><span className="record-avatar">{user.fullName?.charAt(0) || 'K'}</span><div><h3>{user.fullName}</h3><p>{user.email}</p><small>ID: {user.id}</small></div></div><div className="record-action-grid">
        {can('user:manage') && <section className="record-form-card"><h3>Cập nhật hồ sơ</h3><ActionForm path={`/users/${user.id}`} method="PATCH" initial={user} fields={[{ name: 'fullName', label: 'Họ tên', required: true, minLength: 2, maxLength: 150 }, { name: 'phone', label: 'Số điện thoại', maxLength: 20 }]} onSuccess={refresh} /></section>}
        {can('user:manage') && <section className="record-form-card"><h3>Trạng thái tài khoản</h3><ActionForm path={`/users/${user.id}/status`} method="PATCH" initial={user} fields={[{ name: 'status', label: 'Trạng thái', required: true, options: Object.entries(statuses).map(([value, label]) => ({ value, label })) }]} onSuccess={refresh} /></section>}
        {can('role:manage') && currentUser.id !== user.id && <section className="record-form-card"><h3>Gán vai trò</h3><p>Thay thế toàn bộ vai trò hiện có.</p><ActionForm path={`/users/${user.id}/roles`} method="PATCH" initial={{ roles: user.roles }} fields={[{ name: 'roles', label: 'Vai trò (mảng JSON)', required: true, type: 'json', help: '["CUSTOMER"], ["STAFF"], ["GUIDE"] hoặc ["ADMIN"]' }]} onSuccess={refresh} /></section>}
        {!can('user:manage') && <p className="records-hint">Chế độ tra cứu. Liên hệ quản trị viên nếu cần cập nhật hồ sơ.</p>}
      </div></ActionDialog></td></tr>)}</tbody></table></div>}
      <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
    </div>
  </section>;
}
