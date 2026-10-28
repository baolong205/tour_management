import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { queryString } from '../utils.js';
import ActionForm from '../components/ActionForm.jsx';
import { Pagination, State } from '../components/UI.jsx';
import { passwordField } from './Account.jsx';

export default function StaffUsers({ staff = false }) {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [revision, setRevision] = useState(0);
  const list = useApi(`/users?${queryString({ page, limit: 10, search, role: staff ? 'STAFF' : 'CUSTOMER' })}`, revision);
  const refresh = () => setRevision(value => value + 1);
  return <><h2>{staff ? 'Nhân viên & phân quyền' : 'Khách hàng'}</h2>
    {staff && can('role:manage') && <details className="panel workspace-form"><summary>Tạo tài khoản nhân viên</summary><ActionForm path="/users/staff" fields={[{ name: 'fullName', label: 'Họ tên', required: true, minLength: 2, maxLength: 150 }, { name: 'email', label: 'Email', type: 'email', required: true }, { ...passwordField, name: 'password', label: 'Mật khẩu khởi tạo' }, { name: 'phone', label: 'Điện thoại', maxLength: 20 }]} onSuccess={refresh} /></details>}
    <form className="admin-toolbar" onSubmit={event => { event.preventDefault(); setSearch(new FormData(event.currentTarget).get('search')); setPage(1); }}><input name="search" placeholder="Tên hoặc email" /><button className="btn">Tìm kiếm</button></form><State loading={list.loading} error={list.error} retry={refresh} />
    {list.data?.items?.map(user => <article className="panel workspace-form" key={user.id}><h3>{user.fullName}</h3><p>{user.email} · {user.status} · {user.roles.join(', ')}</p><small>ID: {user.id}</small>{can('user:manage') && <details><summary>Cập nhật hồ sơ</summary><ActionForm path={`/users/${user.id}`} method="PATCH" initial={user} fields={[{ name: 'fullName', label: 'Họ tên', required: true, minLength: 2, maxLength: 150 }, { name: 'phone', label: 'Số điện thoại', maxLength: 20 }]} onSuccess={refresh} /></details>}
      {can('user:manage') && <details><summary>Khóa / mở tài khoản</summary><ActionForm path={`/users/${user.id}/status`} method="PATCH" initial={user} fields={[{ name: 'status', label: 'Trạng thái', required: true, options: ['ACTIVE', 'LOCKED', 'PENDING_VERIFY'] }]} onSuccess={refresh} /></details>}
      {can('role:manage') && <details><summary>Gán vai trò</summary><p>Thao tác này thay thế toàn bộ vai trò hiện có. Không thể tự đổi vai trò của chính mình.</p><ActionForm path={`/users/${user.id}/roles`} method="PATCH" initial={{ roles: user.roles }} fields={[{ name: 'roles', label: 'Vai trò (mảng JSON)', required: true, type: 'json', help: '["CUSTOMER"], ["STAFF"], ["GUIDE"] hoặc ["ADMIN"]' }]} onSuccess={refresh} /></details>}
    </article>)}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
  </>;
}

