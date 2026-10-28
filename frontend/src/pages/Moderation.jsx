import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import ActionForm from '../components/ActionForm.jsx';
import { Pagination, State } from '../components/UI.jsx';

export default function Moderation() {
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const list = useApi(`/reviews?page=${page}&limit=10`, revision);
  return <><h2>Kiểm duyệt đánh giá</h2><State loading={list.loading} error={list.error} retry={() => setRevision(value => value + 1)} />{list.data?.items?.map(review => <article className="panel workspace-form" key={review.id}><h3>{review.tourName} · {review.rating}/5 ★</h3><p>{review.userName} · {review.status}</p><p className="pre-line">{review.comment}</p><ActionForm path={`/reviews/${review.id}/moderate`} method="PATCH" fields={[{ name: 'status', label: 'Kết quả kiểm duyệt', required: true, options: [{ value: 'VISIBLE', label: 'Công khai' }, { value: 'HIDDEN', label: 'Ẩn' }] }]} onSuccess={() => setRevision(value => value + 1)} /></article>)}<Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} /></>;
}