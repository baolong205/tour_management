import React, { useState } from 'react';
import { useApi } from '../hooks.js';
import { queryString } from '../utils.js';
import TourCard from '../components/TourCard.jsx';
import Banners from '../components/Banners.jsx';
import { Icon, State } from '../components/UI.jsx';

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
  const { data, loading, error } = useApi('/tours?limit=5&sortBy=avgRating&sortOrder=DESC', revision);
  const { data: categories } = useApi('/catalog/categories');
  function search(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    window.location.hash = `/tours?${queryString({ search: form.get('search')?.trim(), departureCity: form.get('departureCity')?.trim(), categoryId: form.get('categoryId') })}`;
  }
  return <div className="tourgo-home">
    <section className="hero home-hero"><div className="hero-landscape" />
      <div className="container home-hero-inner"><div className="home-hero-copy"><span className="home-kicker">KHÁM PHÁ VIỆT NAM CÙNG TOURGO</span><h1>Mỗi chuyến đi<br />là <em>một câu chuyện</em></h1><p>Hành trình mới, cảm hứng mới từ những miền đất đẹp.<br />Tìm chuyến đi phù hợp, mang về kỷ niệm đáng nhớ.</p></div>
        <div className="home-search"><div className="home-search-heading"><Icon name="globe" size={17} /> Khám phá hành trình <span>Điểm đến tiếp theo của bạn</span></div>
          <form className="search-panel" onSubmit={search} role="search" aria-label="Tìm tour du lịch">
            <label><span>Điểm đến hoặc tên tour</span><div><Icon name="pin" size={17} /><input name="search" maxLength={120} placeholder="Bạn muốn đi đâu?" /></div></label>
            <label><span>Khởi hành từ</span><div><Icon name="flag" size={17} /><input name="departureCity" maxLength={100} placeholder="Thành phố khởi hành" /></div></label>
            <label><span>Loại hành trình</span><div><Icon name="bag" size={17} /><select name="categoryId" defaultValue=""><option value="">Tất cả loại tour</option>{categories?.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select></div></label>
            <button className="btn search-submit" type="submit"><Icon name="search" size={18} />Tìm tour</button>
          </form>
        </div>
      </div>
    </section>
    <div className="home-benefits container">{benefits.map(benefit => <div key={benefit.title}><span className="home-benefit-icon"><Icon name={benefit.icon} size={27} /></span><div><strong>{benefit.title}</strong><small>{benefit.text}</small></div></div>)}</div>
    <section className="container home-section home-featured"><div className="home-section-heading"><div><h2>Tour nổi bật</h2><p>Những hành trình được yêu thích nhất</p></div><a href="#/tours">Xem tất cả <Icon name="arrow" size={16} /></a></div>
      <State loading={loading} error={error} empty={!loading && !error && !data?.items?.length} retry={() => setRevision(value => value + 1)} />
      <div className="home-tour-grid">{data?.items?.map(tour => <TourCard key={tour.id} tour={tour} />)}</div>
    </section>
    <section className="container home-section"><div className="home-section-heading"><div><h2>Điểm đến phổ biến</h2><p>Khám phá những miền đất đẹp của Việt Nam</p></div><a href="#/tours">Xem tất cả <Icon name="arrow" size={16} /></a></div>
      <div className="home-destinations">{destinations.map(place => <a className="destination-card" href={`#/tours?${queryString({ destination: place.name })}`} key={place.name}><img src={`/images/${place.image}.jpg`} alt={`Cảm hứng du lịch ${place.name}`} loading="lazy" /><div className="home-destination-caption"><h3>{place.name}</h3><small>{place.caption}</small></div></a>)}</div>
    </section>
    <section className="container home-promo"><div className="home-promo-copy"><span className="home-promo-plane"><Icon name="plane" size={42} /></span><div><span>CẢM HỨNG CHO CHUYẾN ĐI TIẾP THEO</span><h2>Đi xa hơn, mang về nhiều kỷ niệm hơn</h2><p>Chọn một điểm đến mới, bắt đầu câu chuyện của riêng bạn.</p><a className="btn small" href="#/tours">Khám phá ngay <Icon name="arrow" size={15} /></a></div></div><div className="home-promo-art"><img src="/images/phu-quoc.jpg" alt="Bãi biển nhiệt đới minh họa hành trình khám phá" loading="lazy" /><span>Travel<br /><em>More</em></span></div></section>
    <Banners />
    <p className="container home-image-note">Ảnh minh họa điểm đến. Giá, lịch khởi hành và dịch vụ cụ thể được cập nhật trong từng tour. <a href="/images/credits.html">Nguồn ảnh</a></p>
  </div>;
}
