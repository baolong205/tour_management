import { useApi } from '../hooks/use-api.js';
import { promotionCondition, promotionHeadline } from '../promotion-ui.js';
import { Icon } from './UI.jsx';

const expiry = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', day: '2-digit', month: '2-digit', year: 'numeric' });

/**
 * Khối ưu đãi công khai trên trang chủ.
 *
 * Gọi `GET /promotions/public` (endpoint @Public, không cần đăng nhập) để lấy
 * các mã đang chạy. Không hiển thị gì nếu chưa có mã nào còn hiệu lực để trang
 * chủ không bị khoảng trống.
 */
export default function PublicPromotions() {
  const { data, loading, error } = useApi('/promotions/public');
  const promotions = Array.isArray(data) ? data : [];
  if (loading || error || promotions.length === 0) return null;
  return <section className="container home-section home-vouchers" aria-labelledby="home-vouchers-title">
    <div className="home-section-heading"><div><h2 id="home-vouchers-title">Ưu đãi đang diễn ra</h2><p>Lưu mã bên dưới và dùng khi đặt tour</p></div><a href="#/account/vouchers">Ưu đãi của tôi <Icon name="arrow" size={16} /></a></div>
    <div className="home-voucher-grid">{promotions.map(promotion => <article className="home-voucher" key={promotion.code}>
      <div className="home-voucher-heading"><span className="home-voucher-icon"><Icon name="ticket" size={22} /></span><div><strong>{promotionHeadline(promotion)}</strong><code>{promotion.code}</code></div></div>
      {promotion.name && <p className="home-voucher-name">{promotion.name}</p>}
      {promotion.description && <p className="home-voucher-desc">{promotion.description}</p>}
      {promotionCondition(promotion) && <small>{promotionCondition(promotion)}</small>}
      <small>Hết hạn {expiry.format(new Date(promotion.validTo))}</small>
      <a className="btn outline small" href="#/tours">Dùng ngay <Icon name="arrow" size={15} /></a>
    </article>)}</div>
  </section>;
}
