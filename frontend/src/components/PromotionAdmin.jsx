import { useEffect, useMemo, useState } from 'react';
import { useApi } from '../hooks/use-api.js';
import { api } from '../services/api.js';
import { date, money } from '../lib/utils.js';
import { parseCustomerIds, scopeLabel, scopeSummary, scopeTypes } from '../promotion-ui.js';
import { Icon, State } from './UI.jsx';

const tabs = [
  ['scopes', 'Phạm vi áp dụng', 'pin'],
  ['assignments', 'Cấp mã cho khách', 'users'],
  ['stats', 'Thống kê', 'document'],
];

/**
 * Bảng điều khiển phụ cho một mã khuyến mãi: phạm vi áp dụng, cấp mã riêng
 * và thống kê lượt dùng. Hiển thị dưới bảng danh sách khuyến mãi.
 */
export default function PromotionAdmin() {
  const [selectedId, setSelectedId] = useState('');
  const [tab, setTab] = useState('scopes');
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const list = useApi('/promotions?limit=100', revision);
  const promotions = useMemo(() => list.data?.items ?? [], [list.data]);

  const scopes = useApi(selectedId ? `/promotions/${selectedId}/scopes` : null, revision);
  const assignments = useApi(selectedId ? `/promotions/${selectedId}/assignments` : null, revision);
  const stats = useApi(selectedId ? `/promotions/${selectedId}/stats` : null, revision);

  const [draftScopes, setDraftScopes] = useState([]);
  const [scopeType, setScopeType] = useState('TOUR');
  const [scopeId, setScopeId] = useState('');
  const [customerText, setCustomerText] = useState('');

  useEffect(() => {
    setDraftScopes(Array.isArray(scopes.data) ? scopes.data.map(scope => ({ scopeType: scope.scopeType, scopeId: scope.scopeId })) : []);
  }, [scopes.data]);

  function reset() { setError(''); setNotice(''); }

  function addScope() {
    reset();
    const id = scopeId.trim();
    if (!id) { setError('Nhập ID đối tượng cần giới hạn phạm vi.'); return; }
    if (draftScopes.some(scope => scope.scopeType === scopeType && scope.scopeId === id)) { setError('Phạm vi này đã có trong danh sách.'); return; }
    setDraftScopes([...draftScopes, { scopeType, scopeId: id }]);
    setScopeId('');
  }

  async function saveScopes() {
    reset(); setBusy(true);
    try {
      await api(`/promotions/${selectedId}/scopes`, { method: 'PUT', body: { scopes: draftScopes } });
      setNotice(draftScopes.length === 0 ? 'Đã bỏ giới hạn: mã áp dụng toàn hệ thống.' : `Đã lưu ${draftScopes.length} phạm vi áp dụng.`);
      setRevision(value => value + 1);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  async function assign() {
    reset();
    const customerIds = parseCustomerIds(customerText);
    if (customerIds.length === 0) { setError('Dán ít nhất một ID khách hàng.'); return; }
    setBusy(true);
    try {
      const result = await api(`/promotions/${selectedId}/assignments`, { method: 'POST', body: { customerIds } });
      setNotice(`Đã cấp mã cho ${result.assigned} khách${result.skipped ? `, bỏ qua ${result.skipped} khách đã có mã` : ''}.`);
      setCustomerText('');
      setRevision(value => value + 1);
    } catch (cause) { setError(cause.message); } finally { setBusy(false); }
  }

  return <section className="panel promotion-admin">
    <div className="section-heading"><h3>Quản trị chi tiết mã</h3><span className="muted">Chọn một mã để cấu hình phạm vi, cấp mã và xem thống kê</span></div>
    <label className="promotion-admin-select">Mã khuyến mãi
      <select value={selectedId} onChange={event => { setSelectedId(event.target.value); reset(); }}>
        <option value="">— Chọn mã —</option>
        {promotions.map(promotion => <option key={promotion.id} value={promotion.id}>{promotion.code}{promotion.name ? ` · ${promotion.name}` : ''}</option>)}
      </select>
    </label>
    {list.error && <p className="notice error" role="alert">{list.error}</p>}
    {!selectedId && <p className="muted">Chưa chọn mã nào.</p>}
    {selectedId && <>
      <nav className="promotion-admin-tabs" aria-label="Quản trị mã">{tabs.map(([key, label, icon]) => <button key={key} type="button" className={tab === key ? 'active' : ''} aria-pressed={tab === key} onClick={() => { setTab(key); reset(); }}><Icon name={icon} size={16} />{label}</button>)}</nav>
      {error && <p className="notice error" role="alert">{error}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      {tab === 'scopes' && <div className="promotion-admin-body">
        <p className="muted">{scopeSummary(draftScopes)}. Để trống danh sách nghĩa là mã áp cho mọi tour.</p>
        <div className="promotion-scope-add">
          <label>Loại phạm vi<select value={scopeType} onChange={event => setScopeType(event.target.value)}>{scopeTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
          <label>ID đối tượng<input value={scopeId} onChange={event => setScopeId(event.target.value)} placeholder="UUID của tour / danh mục / điểm đến / lịch" maxLength={36} /></label>
          <button type="button" className="btn outline small" onClick={addScope}><Icon name="check" size={15} />Thêm</button>
        </div>
        <State loading={scopes.loading} error={scopes.error} retry={() => setRevision(value => value + 1)} />
        {draftScopes.length > 0 && <ul className="promotion-scope-list">{draftScopes.map((scope, index) => <li key={`${scope.scopeType}-${scope.scopeId}`}><span>{scopeLabel(scope)}</span><button type="button" className="text-button danger" onClick={() => setDraftScopes(draftScopes.filter((_, position) => position !== index))}>Bỏ</button></li>)}</ul>}
        <button type="button" className="btn" disabled={busy} onClick={saveScopes}>{busy ? 'Đang lưu...' : 'Lưu phạm vi áp dụng'}</button>
      </div>}

      {tab === 'assignments' && <div className="promotion-admin-body">
        <p className="muted">Chỉ mã nguồn PERSONAL hoặc GIFT mới cấp riêng được. Mã PUBLIC đã hiện với mọi khách.</p>
        <label>ID khách hàng (mỗi dòng một ID hoặc cách nhau bởi dấu phẩy)
          <textarea rows={4} value={customerText} onChange={event => setCustomerText(event.target.value)} placeholder="3f1c…&#10;8a2d…" />
        </label>
        <button type="button" className="btn" disabled={busy} onClick={assign}>{busy ? 'Đang cấp...' : `Cấp mã cho ${parseCustomerIds(customerText).length} khách`}</button>
        <State loading={assignments.loading} error={assignments.error} retry={() => setRevision(value => value + 1)} />
        {Array.isArray(assignments.data) && assignments.data.length > 0 && <div className="table-wrap"><table><thead><tr><th>Khách hàng</th><th>Cấp lúc</th><th>Đã dùng</th><th>Đơn hàng</th></tr></thead><tbody>{assignments.data.map(row => <tr key={row.customerId}><td>{row.customerId}</td><td>{date(row.assignedAt)}</td><td>{row.usedAt ? date(row.usedAt) : '—'}</td><td>{row.bookingId || '—'}</td></tr>)}</tbody></table></div>}
        {Array.isArray(assignments.data) && assignments.data.length === 0 && <p className="muted">Chưa cấp mã cho khách nào.</p>}
      </div>}

      {tab === 'stats' && <div className="promotion-admin-body">
        <State loading={stats.loading} error={stats.error} retry={() => setRevision(value => value + 1)} />
        {stats.data && <dl className="promotion-stats">
          <div><dt>Trạng thái</dt><dd>{stats.data.status}</dd></div>
          <div><dt>Lượt đã dùng</dt><dd>{stats.data.usedCount}{stats.data.usageLimit != null ? ` / ${stats.data.usageLimit}` : ' (không giới hạn)'}</dd></div>
          <div><dt>Còn lại</dt><dd>{stats.data.remainingUses ?? 'Không giới hạn'}</dd></div>
          <div><dt>Ngân sách đã dùng</dt><dd>{money(stats.data.budgetUsed)}{stats.data.budgetCap != null ? ` / ${money(stats.data.budgetCap)}` : ''}</dd></div>
          <div><dt>Tổng tiền đã giảm</dt><dd>{money(stats.data.totalDiscount)}</dd></div>
          <div><dt>Tổng tạm tính đã bán</dt><dd>{money(stats.data.totalSubtotal)}</dd></div>
          <div><dt>Tỷ lệ giảm</dt><dd>{stats.data.discountRate}%</dd></div>
          <div><dt>Khách hàng duy nhất</dt><dd>{stats.data.uniqueCustomers}</dd></div>
          <div><dt>Đã xác nhận</dt><dd>{stats.data.confirmedCount}</dd></div>
          <div><dt>Đang giữ chỗ</dt><dd>{stats.data.reservedCount}</dd></div>
          <div><dt>Đã hoàn lượt</dt><dd>{stats.data.releasedCount}</dd></div>
          <div><dt>Lần dùng gần nhất</dt><dd>{stats.data.lastUsedAt ? date(stats.data.lastUsedAt) : '—'}</dd></div>
        </dl>}
      </div>}
    </>}
  </section>;
}
