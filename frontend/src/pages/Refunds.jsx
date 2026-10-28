import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { money } from '../utils.js';
import ActionForm from '../components/ActionForm.jsx';
import { Pagination, State } from '../components/UI.jsx';

export default function Refunds() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const list = useApi(`/payments/refunds/list?page=${page}&limit=10`, revision);
  const refresh = () => setRevision(value => value + 1);
  return <><h2>Quản lý hoàn tiền</h2><p>Chỉ xác nhận hoàn sau khi đã chuyển tiền thực tế. Cập nhật hệ thống không tự chuyển tiền ngân hàng.</p>
    <details className="panel workspace-form"><summary>Tạo yêu cầu hoàn</summary><ActionForm path="/payments/refunds" fields={[{ name: 'paymentId', label: 'ID giao dịch', required: true }, { name: 'amount', label: 'Số tiền (bỏ trống = số còn được hoàn)', type: 'number', min: 1 }, { name: 'reason', label: 'Lý do', required: true, options: ['CANCEL', 'REJECTED', 'SCHEDULE_CANCELLED', 'LATE_PAYMENT'] }, { name: 'note', label: 'Ghi chú', maxLength: 500 }]} onSuccess={refresh} /></details>
    <State loading={list.loading} error={list.error} retry={refresh} />{list.data?.items?.map(item => <article className="panel workspace-form" key={item.id}><h3>{money(item.amount)} · {item.status}</h3><p>Giao dịch: {item.paymentId}</p><p>{item.reason} · {item.gatewayRef}</p>{item.status === 'PENDING' && <><details><summary>Xác nhận đã hoàn</summary><ActionForm path={`/payments/refunds/${item.id}/complete`} method="PATCH" fields={[{ name: 'gatewayRef', label: 'Mã giao dịch hoàn', maxLength: 64 }]} label="Xác nhận đã chuyển tiền hoàn" onSuccess={refresh} /></details><details><summary>Đánh dấu hoàn thất bại</summary><ActionForm path={`/payments/refunds/${item.id}/reject`} method="PATCH" fields={[{ name: 'errorMessage', label: 'Lý do thất bại', required: true, minLength: 3, maxLength: 500 }]} onSuccess={refresh} /></details></>}</article>)}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} /></>;
}