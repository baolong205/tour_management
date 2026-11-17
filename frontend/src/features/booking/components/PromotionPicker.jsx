import { useEffect, useId, useMemo, useState } from 'react';
import { useApi } from '../../../hooks/use-api.js';
import { api } from '../../../services/api.js';
import { promotionHeadline } from '../../../promotion-ui.js';
import { bestOfferCode, canRequestBestOffer, money, promotionAvailablePath, sortVouchers } from '../../../lib/utils.js';
import { Icon } from '../../../components/UI.jsx';

const expiry = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function PromotionPicker({ selectedCode, subtotal, scheduleId, disabled, onSelect }) {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const regionId = useId();
  const path = open ? promotionAvailablePath(subtotal, scheduleId) : null;
  const { data, loading, error } = useApi(path, revision);
  const vouchers = useMemo(() => sortVouchers(data), [data]);
  const usableCount = vouchers.filter(voucher => !voucher.rejectedReason).length;

  // Gợi ý "mã tốt nhất": hỏi backend chạy DiscountEngine chọn bộ mã tối ưu
  // cho tạm tính hiện tại (POST /promotions/best-for-cart).
  const [bestOffer, setBestOffer] = useState(null);
  const [bestError, setBestError] = useState('');
  const [bestLoading, setBestLoading] = useState(false);
  const canBest = open && canRequestBestOffer(subtotal, scheduleId);
  useEffect(() => {
    if (!canBest) { setBestOffer(null); setBestError(''); return; }
    let cancelled = false;
    setBestLoading(true);
    setBestOffer(null);
    setBestError('');
    api('/promotions/best-for-cart', { method: 'POST', body: { subtotal, scheduleId } })
      .then(offer => { if (!cancelled) setBestOffer(offer); })
      .catch(cause => { if (!cancelled) setBestError(cause.message); })
      .finally(() => { if (!cancelled) setBestLoading(false); });
    return () => { cancelled = true; };
  }, [canBest, subtotal, scheduleId, revision]);
  const best = bestOfferCode(bestOffer);
  const bestSelected = best && selectedCode.trim().toUpperCase() === best.code;

  return <div className="promotion-picker">
    <button type="button" className="promotion-picker-toggle" disabled={disabled} aria-expanded={open} aria-controls={regionId} onClick={() => setOpen(value => !value)}><Icon name="ticket" size={19} /><span>{open ? 'Ẩn mã ưu đãi' : 'Chọn mã ưu đãi'}<small>Xem mức giảm và điều kiện áp dụng</small></span><Icon name={open ? 'close' : 'arrow'} size={17} /></button>
    {open && <div id={regionId} className="promotion-picker-content" aria-label="Danh sách mã ưu đãi">
      <div className="promotion-picker-heading"><strong>Ưu đãi cho hành trình của bạn</strong><span>{usableCount}/{vouchers.length} mã dùng được</span></div>
      <p className="promotion-picker-note">Mỗi đơn dùng một mã. Mức giảm bên dưới được tính theo tạm tính hiện tại; con số chính xác được chốt khi bấm Áp dụng hoặc xem báo giá.</p>
      {loading && <p role="status" className="promotion-picker-note">Đang tải mã ưu đãi...</p>}
      {error && <div className="notice error" role="alert"><p>{error}</p><button type="button" className="text-button" onClick={() => setRevision(value => value + 1)}>Thử lại</button></div>}
      {!loading && !error && vouchers.length === 0 && <p className="promotion-picker-note">Hiện chưa có mã còn hiệu lực hoặc bạn đã dùng hết lượt. Bạn vẫn có thể nhập mã được cung cấp riêng.</p>}
      {canBest && (bestLoading ? <p role="status" className="promotion-picker-note">Đang tìm bộ mã tối ưu cho đơn này...</p>
        : bestError ? <p className="promotion-picker-note">Không tính được gợi ý mã: {bestError}</p>
          : best ? <div className="promotion-best" role="status"><Icon name="star" size={16} /><p>Gợi ý: dùng mã <code>{best.code}</code> để tiết kiệm <strong>{money(best.discount)}</strong> — tổng giảm <strong>{money(bestOffer.totalDiscount)}</strong>, còn lại <strong>{money(bestOffer.total)}</strong>.</p>
            {!bestSelected && <button type="button" className="btn outline small" disabled={disabled} onClick={() => { onSelect(best.code); setOpen(false); }}>Dùng mã này</button>}
            {bestSelected && <span className="promotion-best-selected"><Icon name="check" size={15} /> Đã chọn</span>}</div>
            : <p className="promotion-picker-note">Chưa có mã nào áp dụng được cho tạm tính hiện tại.</p>)}
      <div className="promotion-grid">{vouchers.map(promotion => {
        const shortfall = Number.isFinite(subtotal) ? Math.max(0, promotion.minOrder - subtotal) : null;
        const selected = selectedCode.trim().toUpperCase() === promotion.code;
        const blocked = Boolean(promotion.rejectedReason) || shortfall > 0;
        return <article className={`promotion-voucher ${blocked ? 'promotion-voucher-unavailable' : ''} ${selected ? 'promotion-voucher-selected' : ''}`} key={promotion.code}>
          <div className="promotion-voucher-heading"><span className="promotion-voucher-icon"><Icon name="ticket" size={23} /></span><div><strong>{promotionHeadline(promotion)}</strong><code>{promotion.code}</code></div></div>
          {promotion.name && <p className="promotion-voucher-name">{promotion.name}</p>}
          <p>Đơn từ <strong>{money(promotion.minOrder)}</strong>{promotion.maxDiscount != null && <> · Giảm tối đa <strong>{money(promotion.maxDiscount)}</strong></>}</p>
          <small>Tối đa {promotion.perUserLimit} lượt / khách · Hết hạn {expiry.format(new Date(promotion.validTo))}</small>
          {promotion.estimatedDiscount > 0 && <p className="promotion-savings" role="status">Tiết kiệm <strong>{money(promotion.estimatedDiscount)}</strong> cho đơn này</p>}
          {shortfall > 0 && <p className="promotion-shortfall">Cần thêm {money(shortfall)} để sử dụng</p>}
          {!shortfall && promotion.rejectedReason && <p className="promotion-shortfall">{promotion.rejectedReason}</p>}
          <button type="button" className="btn outline small" aria-label={`Chọn mã ${promotion.code}`} aria-pressed={selected} disabled={disabled || blocked} onClick={() => { onSelect(promotion.code); setOpen(false); }}>{selected ? 'Đã chọn' : 'Chọn mã'}<Icon name={selected ? 'check' : 'arrow'} size={15} /></button>
        </article>;
      })}</div>
    </div>}
  </div>;
}
