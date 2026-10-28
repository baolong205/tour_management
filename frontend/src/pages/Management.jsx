import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { columnLabels } from '../management.js';
import ActionForm from '../components/ActionForm.jsx';
import { Pagination, State } from '../components/UI.jsx';

export default function Management({ config }) {
  const { can } = useAuth();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const list = useApi(`${config.path}${config.paginated ? `?page=${page}&limit=10` : ''}`, revision);
  const rows = config.paginated ? list.data?.items : list.data;
  const writable = can(config.write || config.permission);
  const refresh = () => setRevision(value => value + 1);
  async function edit(row) {
    setBusy(true); setError('');
    try {
      const detail = config.detail ? await api(`${config.path}/${row[config.key || 'id']}`) : row;
      const initial = { ...detail };
      for (const field of config.fields) {
        if (field.type === 'datetime-local' && initial[field.name]) initial[field.name] = initial[field.name].slice(0, 16);
      }
      setEditing(initial);
    } catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  async function remove(row) {
    if (!window.confirm(`Xóa ${row.name || row.title || row.code || row.key || 'bản ghi này'}?`)) return;
    setBusy(true); setError('');
    try { await api(`${config.path}/${encodeURIComponent(row[config.key || 'id'])}`, { method: 'DELETE' }); refresh(); }
    catch (error) { setError(error.message); } finally { setBusy(false); }
  }
  return <><div className="section-heading"><h2>{config.title}</h2>{writable && <button className="btn" onClick={() => setEditing({})}>Thêm mới</button>}</div>
    {error && <p className="notice error" role="alert">{error}</p>}
    {editing && <section className="panel workspace-form"><h3>{editing[config.key || 'id'] ? 'Cập nhật' : 'Thêm mới'}</h3><ActionForm key={editing[config.key || 'id'] || 'new'} path={config.method ? config.path : editing.id ? `${config.path}/${editing.id}` : config.path} method={config.method || (editing.id ? 'PATCH' : 'POST')} fields={config.fields} initial={editing} onSuccess={() => { setEditing(null); refresh(); }} /><button className="text-button" onClick={() => setEditing(null)}>Đóng biểu mẫu</button></section>}
    <State loading={list.loading} error={list.error} empty={!list.loading && !list.error && !rows?.length} retry={refresh} />
    {!!rows?.length && <div className="table-wrap"><table><thead><tr>{config.columns.map(key => <th key={key}>{columnLabels[key] || key}</th>)}<th>Thao tác</th></tr></thead><tbody>{rows.map(row => <tr key={row[config.key || 'id']}>{config.columns.map(key => <td key={key}>{typeof row[key] === 'object' ? JSON.stringify(row[key]) : typeof row[key] === 'boolean' ? row[key] ? 'Có' : 'Không' : row[key] ?? '—'}</td>)}<td>{writable && <div className="table-actions"><button className="text-button" disabled={busy} onClick={() => edit(row)}>Sửa</button><button className="text-button danger" disabled={busy} onClick={() => remove(row)}>Xóa</button></div>}<small>ID: {row[config.key || 'id']}</small></td></tr>)}</tbody></table></div>}
    {config.paginated && <Pagination page={page} total={list.data?.total || 0} limit={10} onChange={setPage} />}
  </>;
}