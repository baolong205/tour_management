import { useState } from 'react';
import { useApi } from '../hooks/use-api.js';
import { queryString } from '../lib/utils.js';
import TourCard from '../components/TourCard.jsx';
import Banners from '../components/Banners.jsx';
import PublicPromotions from '../components/PublicPromotions.jsx';
import { Icon, State } from '../components/UI.jsx';
import { cleanTourFilter } from '../features/tours/search.js';

const destinations = [
  { name: 'Ninh Bình', image: 'ninh-binh', caption: 'Miền di sản' },
  { name: 'Hạ Long', image: 'ha-long', caption: 'Kỳ quan biển xanh' },
  { name: 'Hội An', image: 'hoi-an', caption: 'Phố cổ bình yên' },
  { name: 'Phú Quốc', image: 'phu-quoc', caption: 'Thiên đường biển đảo' },
  { name: 'Sa Pa', image: 'sa-pa', caption: 'Chạm đến mây trời' },
  { name: 'Đà Lạt', image: 'da-lat', caption: 'Thành phố ngàn hoa' },
];
const benefits = [
  { icon: 'globe', title: 'Tour đa dạng', text: 'Khám phá nhiều điểm đến' },
  { icon: 'shield', title: 'Giá tour minh bạch', text: 'Xem chi tiết trước khi đặt' },
  { icon: 'headset', title: 'Hỗ trợ hành trình', text: 'Gửi yêu cầu tư vấn' },
  { icon: 'star', title: 'Đánh giá thực tế', text: 'Từ khách đã tham gia tour' },
  { icon: 'wallet', title: 'Quản lý thanh toán', text: 'Theo dõi trong tài khoản' },
];

export default function Home() {
  const [revision, setRevision] = useState(0);
  const { data, loading, error } = useApi('/tours?limit=4&sortBy=avgRating&sortOrder=DESC', revision);
  const { data: categories } = useApi('/catalog/categories');
  function search(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    window.location.hash = `/tours?${queryString({ search: cleanTourFilter(form.get('search')), departureCity: cleanTourFilter(form.get('departureCity')), categoryId: form.get('categoryId') })}`;
  }
  return <div className="tourgo-home">
    <section className="home-hero">
      <div className="hero-landscape" aria-hidden="true" />
      <div className="container home-hero-inner">
        <p className="home-kicker">TourGo · Du lịch Việt Nam</p>
        <h1>Mỗi chuyến đi<br />là <em>một câu chuyện</em></h1>
        <p className="home-hero-lede">Từ vịnh biển đến phố cổ, chúng tôi giúp bạn tìm hành trình phù hợp — nơi mỗi ngày trên đường đều đáng nhớ.</p>
        <div className="home-search">
          <form className="search-panel" onSubmit={search} role="search" aria-label="Tìm tour du lịch">
            <label><span>Điểm đến hoặc tên tour</span><div><Icon name="pin" size={16} /><input name="search" maxLength={120} placeholder="Bạn muốn đi đâu?" /></div></label>
            <label><span>Khởi hành từ</span><div><Icon name="flag" size={16} /><input name="departureCity" maxLength={100} placeholder="Thành phố khởi hành" /></div></label>
            <label><span>Loại hành trình</span><div><Icon name="bag" size={16} /><select name="categoryId" defaultValue=""><option value="">Tất cả loại tour</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></label>
            <button className="btn search-submit" type="submit"><Icon name="search" size={17} />Tìm tour</button>
          </form>
        </div>
      </div>
    </section>
    <div className="home-benefits container">{benefits.map(benefit => <div key={benefit.title}><span className="home-benefit-icon"><Icon name={benefit.icon} size={22} /></span><div><strong>{benefit.title}</strong><small>{benefit.text}</small></div></div>)}</div>
    <section className="container home-section home-featured" id="home-featured">
      <div className="home-section-heading"><div><p className="home-eyebrow">Hành trình được yêu thích</p><h2>Tour nổi bật</h2></div><a className="home-more" href="#/tours">Xem tất cả hành trình <Icon name="arrow" size={15} /></a></div>
      <State loading={loading} error={error} empty={!loading && !error && !data?.items?.length} retry={() => setRevision(value => value + 1)} />
      <div className="home-tour-grid">{data?.items?.map(tour => <TourCard key={tour.id} tour={tour} />)}</div>
    </section>
    <section className="container home-section">
      <div className="home-section-heading"><div><p className="home-eyebrow">Cảm hứng cho chuyến đi</p><h2>Điểm đến phổ biến</h2></div><a className="home-more" href="#/tours">Xem tất cả <Icon name="arrow" size={15} /></a></div>
      <div className="home-destinations">{destinations.map(place => <a className="destination-card" href={`#/tours?${queryString({ destination: place.name })}`} key={place.name}><img src={`/images/${place.image}.jpg`} alt={`Cảm hứng du lịch ${place.name}`} loading="lazy" /><div className="home-destination-caption"><h3>{place.name}</h3><small>{place.caption}</small></div></a>)}</div>
    </section>
    <section className="container home-promo">
      <div className="home-promo-copy"><span className="home-eyebrow light">Cảm hứng cho chuyến đi tiếp theo</span><h2>Đi xa hơn,<br /><em>mang về nhiều kỷ niệm hơn</em></h2><p>Chọn một điểm đến mới và bắt đầu câu chuyện của riêng bạn — lịch trình, giá và hỗ trợ đều sẵn sàng trong từng tour.</p><a className="btn home-promo-btn" href="#/tours">Khám phá ngay <Icon name="arrow" size={15} /></a></div>
      <div className="home-promo-art"><img src="/images/phu-quoc.jpg" alt="Bãi biển nhiệt đới minh họa hành trình khám phá" loading="lazy" /></div>
    </section>
    <PublicPromotions />
    <Banners />
    <p className="container home-image-note">Ảnh minh họa điểm đến. Giá, lịch khởi hành và dịch vụ cụ thể được cập nhật trong từng tour. <a href="/images/credits.html">Nguồn ảnh</a></p>
  </div>;
}
