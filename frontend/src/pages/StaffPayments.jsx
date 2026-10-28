import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { api } from '../services/api.js';
import { money } from '../utils.js';
import ActionForm from '../components/ActionForm.jsx';
import { Pagination, State } from '../components/UI.jsx';

export default function StaffPayments() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useApi(`/payments?page=${page}&limit=10`, revision);
  const refresh = () => setRevision(value => value + 1);
  async function approve(item) {
    if (!window.confirm('Chỉ xác nhận khi đã đối chiếu tiền thực nhận. Tiếp tục?')) return;
    setBusy(true); setError('');
    try { await api(`/payments/${item.id}/proof/approve`, { method: 'PATCH' }); refresh(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <><h2>Giao dịch thanh toán</h2>{error && <p className="notice error" role="alert">{error}</p>}<State loading={list.loading} error={list.error} retry={refresh} />
    {list.data?.items?.map(item => <article className="panel" key={item.id}><h3>{item.bookingCode || item.bookingId} · {money(item.amount)}</h3><p>{item.method} · {item.status}</p><p>Chứng từ: {item.proofUrl || 'Chưa gửi'}</p><p>{item.proofNote}</p>
      <small>ID giao dịch: {item.id}</small>
      {item.status === 'PROOF_SUBMITTED' && <><button className="btn" disabled={busy} onClick={() => approve(item)}>Xác nhận đã nhận tiền</button><details><summary>Từ chối chứng từ</summary><ActionForm path={`/payments/${item.id}/proof/reject`} method="PATCH" fields={[{ name: 'errorMessage', label: 'Lý do từ chối', required: true, minLength: 3, maxLength: 500 }]} onSuccess={refresh} /></details></>}
    </article>)}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
  </>;
}