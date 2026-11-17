import { useState } from 'react';
import { useApi } from '../hooks/use-api.js';
import { promotionCondition, promotionHeadline } from '../promotion-ui.js';
import { sortVouchers } from '../lib/utils.js';
import { Icon, State } from '../components/UI.jsx';

const expiry = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Trang "Ưu đãi của tôi" — ví voucher của khách đang đăng nhập.
 *
 * Gọi `GET /promotions/my-vouchers`: gồm mã công khai + mã được cấp riêng
 * (PERSONAL/GIFT, `assigned = true`). Mã dùng được khi đặt tour nằm trong
 * PromotionPicker ở bước đặt tour.
 */
export default function MyVouchers() {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useApi('/promotions/my-vouchers', revision);
  const vouchers = sortVouchers(data);
  const assignedCount = vouchers.filter(voucher => voucher.assigned).length;

  return <section className="my-vouchers-page">
    <nav className="account-breadcrumbs" aria-label="Đường dẫn"><a href="#/">Trang chủ</a><span>›</span><a href="#/account/overview">Tài khoản</a><span>›</span>Ưu đãi của tôi</nav>
    <h1>Ưu đãi của tôi</h1>
    <p>Các mã giảm giá bạn có thể dùng khi đặt tour. Mã được cấp riêng chỉ hiện với tài khoản của bạn.</p>
    <State loading={loading} error={error} empty={!loading && !error && vouchers.length === 0} retry={() => setRevision(value => value + 1)} />
    {!loading && !error && vouchers.length > 0 && <>
      <div className="results-heading"><p><strong>{vouchers.length}</strong> mã khả dụng{assignedCount > 0 && <> · <strong>{assignedCount}</strong> mã được cấp riêng</>}</p><a className="btn outline" href="#/tours">Chọn tour để dùng mã</a></div>
      <div className="voucher-grid">{vouchers.map(promotion => <article className="voucher-card panel" key={promotion.code}>
        <div className="row-between"><span className="voucher-headline"><Icon name="ticket" size={20} />{promotionHeadline(promotion)}</span>{promotion.assigned && <span className="voucher-badge">Cấp riêng</span>}</div>
        <code className="voucher-code">{promotion.code}</code>
        {promotion.name && <p className="voucher-name">{promotion.name}</p>}
        {promotion.description && <p className="voucher-desc">{promotion.description}</p>}
        {promotionCondition(promotion) && <p className="voucher-meta">{promotionCondition(promotion)}</p>}
        <p className="voucher-meta">Tối đa {promotion.perUserLimit} lượt / khách</p>
        <p className="voucher-expiry"><Icon name="clock" size={15} /> Hiệu lực đến {expiry.format(new Date(promotion.validTo))}</p>
      </article>)}</div>
    </>}
    {!loading && !error && vouchers.length === 0 && <div className="state"><Icon name="ticket" size={34} /><h2>Chưa có mã ưu đãi nào</h2><p>Theo dõi trang chủ hoặc khuyến mãi qua email để nhận mã mới.</p><a className="btn" href="#/">Về trang chủ</a></div>}
  </section>;
}
