import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import ActionForm from '../components/ActionForm.jsx';
import { Pagination, State } from '../components/UI.jsx';

const labels = { OPEN: 'Chờ tiếp nhận', IN_PROGRESS: 'Đang xử lý', RESOLVED: 'Đã giải quyết' };
export default function Support({ staff = false }) {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const list = useApi(`${staff ? '/support' : '/support/me'}?page=${page}&limit=10`, revision);
  const info = useApi('/system/settings/public-info');
  const refresh = () => setRevision(value => value + 1);
  return <section className="container section"><span className="eyebrow">CHĂM SÓC KHÁCH HÀNG</span><h1>{staff ? 'Quản lý yêu cầu hỗ trợ' : 'Liên hệ hỗ trợ'}</h1>
    {info.data && <p>{info.data.contact.phone && `Điện thoại: ${info.data.contact.phone} · `}{info.data.contact.email && `Email: ${info.data.contact.email} · `}{info.data.contact.address}</p>}
    {!staff && <section className="panel"><h2>Gửi yêu cầu mới</h2><p>Đội ngũ CSKH sẽ trả lời trong yêu cầu của bạn. Đây không phải chat trực tiếp.</p><ActionForm path="/support" fields={[{ name: 'subject', label: 'Tiêu đề', required: true, minLength: 3, maxLength: 200 }, { name: 'message', label: 'Nội dung cần hỗ trợ', type: 'textarea', required: true, minLength: 10, maxLength: 4000 }]} label="Gửi yêu cầu" onSuccess={refresh} /></section>}
    <State loading={list.loading} error={list.error} retry={refresh} />
    {!list.loading && !list.error && !list.data?.items?.length && <div className="state">Chưa có yêu cầu hỗ trợ.</div>}
    {list.data?.items?.map(ticket => <article className="panel" key={ticket.id}><span className="eyebrow">{labels[ticket.status]}</span><h2>{ticket.subject}</h2><p className="muted">{ticket.customerName} · {new Date(ticket.createdAt).toLocaleString('vi-VN')}</p><p className="pre-line">{ticket.message}</p>
      {ticket.replies.map((reply, index) => <blockquote key={index}><strong>{reply.authorName}</strong><small> · {new Date(reply.createdAt).toLocaleString('vi-VN')}</small><p className="pre-line">{reply.message}</p></blockquote>)}
      <details><summary>Trả lời yêu cầu</summary><ActionForm path={`/support/${ticket.id}/replies`} fields={[{ name: 'message', label: 'Nội dung trả lời', type: 'textarea', required: true, maxLength: 4000 }]} label="Gửi trả lời" onSuccess={refresh} /></details>
      {staff && <ActionForm path={`/support/${ticket.id}/status`} method="PATCH" initial={ticket} fields={[{ name: 'status', label: 'Trạng thái xử lý', required: true, options: Object.entries(labels).map(([value, label]) => ({ value, label })) }]} onSuccess={refresh} />}
    </article>)}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />
  </section>;
}