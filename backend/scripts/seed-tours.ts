/** Thêm tour DEMO, không xóa bảng và không sửa tour/lịch đã tồn tại. */
import 'reflect-metadata';
import { ConfigModule } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { ScheduleStatus, TourStatus } from '../src/common/enums/index.js';
import { CancelPolicy } from '../src/modules/catalog/entities/cancel-policy.entity.js';
import { CancelPolicyRule } from '../src/modules/catalog/entities/cancel-policy-rule.entity.js';
import { Category } from '../src/modules/catalog/entities/category.entity.js';
import { ItineraryDay } from '../src/modules/catalog/entities/itinerary-day.entity.js';
import { Tour } from '../src/modules/catalog/entities/tour.entity.js';
import { DepartureSchedule } from '../src/modules/schedule/entities/departure-schedule.entity.js';
import { seedDemoDestinations } from './lib/demo-destinations.js';

const tours = [
  {
    code: 'DEMO-DNHA', slug: 'demo-da-nang-hoi-an-4n3d', name: 'Đà Nẵng – Hội An: Hành trình miền di sản',
    category: 'Biển & di sản', categorySlug: 'demo-bien-di-san', city: 'Hà Nội', price: 5990000,
    summary: 'Dạo bước phố cổ Hội An, tận hưởng biển Mỹ Khê và khám phá vẻ đẹp miền Trung.',
    days: [
      ['Đà Nẵng – Biển Mỹ Khê', 'Đón đoàn tại sân bay Đà Nẵng, dùng bữa trưa và nhận phòng. Buổi chiều tự do khám phá biển Mỹ Khê.'],
      ['Bà Nà – Cầu Vàng', 'Tham quan Bà Nà Hills, chụp ảnh Cầu Vàng và khám phá các khu vui chơi theo lịch trình của đoàn.'],
      ['Ngũ Hành Sơn – Phố cổ Hội An', 'Tham quan Ngũ Hành Sơn. Buổi chiều dạo phố cổ Hội An, thưởng thức đặc sản địa phương và ngắm đèn lồng.'],
      ['Chợ Hàn – Tiễn đoàn', 'Mua sắm đặc sản tại chợ Hàn, trả phòng và di chuyển ra sân bay.'],
    ],
  },
  {
    code: 'DEMO-PQ', slug: 'demo-phu-quoc-3n2d', name: 'Phú Quốc: Chạm vào mùa biển xanh',
    category: 'Nghỉ dưỡng', categorySlug: 'demo-nghi-duong', city: 'TP. Hồ Chí Minh', price: 4490000,
    summary: 'Nghỉ dưỡng bên bờ biển, khám phá đảo ngọc và ngắm hoàng hôn trên biển.',
    days: [
      ['Xin chào đảo ngọc', 'Đón đoàn tại sân bay Phú Quốc, nhận phòng khách sạn và thư giãn bên bờ biển.'],
      ['Khám phá Nam đảo', 'Tham quan các điểm đến Nam đảo, thưởng thức hải sản và dành thời gian ngắm hoàng hôn.'],
      ['Chợ địa phương – Tạm biệt Phú Quốc', 'Tự do mua sắm đặc sản, trả phòng và đưa đoàn ra sân bay.'],
    ],
  },
  {
    code: 'DEMO-SP', slug: 'demo-sa-pa-fansipan-3n2d', name: 'Sa Pa – Fansipan: Hẹn với mây trời',
    category: 'Núi & thiên nhiên', categorySlug: 'demo-nui-thien-nhien', city: 'Hà Nội', price: 3290000,
    summary: 'Tận hưởng không khí vùng cao, khám phá bản làng và trải nghiệm hành trình chạm mây.',
    days: [
      ['Hà Nội – Sa Pa', 'Đón đoàn tại điểm hẹn ở Hà Nội, di chuyển đến Sa Pa. Nhận phòng và khám phá thị trấn.'],
      ['Fansipan – Bản làng vùng cao', 'Trải nghiệm cáp treo Fansipan khi thời tiết phù hợp. Buổi chiều tham quan bản làng, tìm hiểu đời sống địa phương.'],
      ['Sa Pa – Hà Nội', 'Tự do dạo chợ, thưởng thức ẩm thực vùng cao và trở về Hà Nội.'],
    ],
  },
  {
    code: 'DEMO-DL', slug: 'demo-da-lat-3n2d', name: 'Đà Lạt: Một khoảng trời bình yên',
    category: 'Nghỉ dưỡng', categorySlug: 'demo-nghi-duong', city: 'TP. Hồ Chí Minh', price: 2790000,
    summary: 'Dạo quanh thành phố ngàn hoa, ghé những quán cà phê và tận hưởng không khí cao nguyên.',
    days: [
      ['Thành phố ngàn hoa', 'Đón đoàn, di chuyển đến Đà Lạt và nhận phòng. Dạo hồ Xuân Hương và khám phá chợ đêm.'],
      ['Cao nguyên xanh – Không gian cà phê', 'Tham quan các điểm ngắm cảnh và vườn hoa, tìm hiểu văn hóa cà phê cao nguyên.'],
      ['Lưu giữ kỷ niệm – Trở về', 'Mua sắm đặc sản địa phương, trả phòng và kết thúc chuyến đi.'],
    ],
  },
  {
    code: 'DEMO-HL', slug: 'demo-ha-long-2n1d', name: 'Hạ Long: Một đêm giữa miền kỳ quan',
    category: 'Biển & di sản', categorySlug: 'demo-bien-di-san', city: 'Hà Nội', price: 3590000,
    summary: 'Trải nghiệm nghỉ đêm trên du thuyền, ngắm cảnh vịnh và tận hưởng không gian biển bình yên.',
    days: [
      ['Hà Nội – Hạ Long – Du thuyền', 'Đón đoàn tại điểm hẹn ở Hà Nội, di chuyển đến Hạ Long và lên du thuyền. Dùng bữa trưa, ngắm cảnh vịnh và tham gia hoạt động ngoài trời tùy điều kiện thời tiết. Nghỉ đêm trên du thuyền.'],
      ['Bình minh trên vịnh – Hà Nội', 'Đón bình minh, dùng bữa sáng và tiếp tục ngắm cảnh vịnh theo tuyến của du thuyền. Trả phòng, lên bờ và di chuyển về Hà Nội.'],
    ],
  },
  {
    code: 'DEMO-NB', slug: 'demo-ninh-binh-trang-an-2n1d', name: 'Ninh Bình – Tràng An: Về miền non nước',
    category: 'Núi & thiên nhiên', categorySlug: 'demo-nui-thien-nhien', city: 'Hà Nội', price: 1890000,
    summary: 'Khám phá cảnh sắc non nước Tràng An, ghé cố đô Hoa Lư và tận hưởng nhịp sống chậm tại Ninh Bình.',
    days: [
      ['Hà Nội – Hoa Lư – Tràng An', 'Đón đoàn tại Hà Nội, di chuyển đến Ninh Bình. Tham quan cố đô Hoa Lư, dùng bữa trưa và trải nghiệm thuyền tham quan Tràng An. Nhận phòng và nghỉ ngơi.'],
      ['Hang Múa – Trở về Hà Nội', 'Dùng bữa sáng, tham quan Hang Múa và ngắm cảnh theo sức khỏe, điều kiện thời tiết. Trả phòng, thưởng thức ẩm thực địa phương rồi trở về Hà Nội.'],
    ],
  },
  {
    code: 'DEMO-NT', slug: 'demo-nha-trang-3n2d', name: 'Nha Trang: Nắng vàng biển xanh',
    category: 'Biển & di sản', categorySlug: 'demo-bien-di-san', city: 'TP. Hồ Chí Minh', price: 3890000,
    summary: 'Tắm biển, khám phá các đảo quanh vịnh Nha Trang và thưởng thức hải sản tươi ngon.',
    days: [
      ['TP. Hồ Chí Minh – Nha Trang', 'Đón đoàn tại điểm hẹn, di chuyển đến Nha Trang. Nhận phòng, buổi chiều tự do tắm biển và dạo phố biển.'],
      ['Tour đảo – Vịnh Nha Trang', 'Đi tàu tham quan các đảo trong vịnh, tắm biển và tham gia hoạt động ngoài trời tùy điều kiện thời tiết. Buổi tối tự do.'],
      ['Tháp Bà Ponagar – Tạm biệt Nha Trang', 'Tham quan Tháp Bà Ponagar, mua sắm đặc sản, trả phòng và trở về TP. Hồ Chí Minh.'],
    ],
  },
  {
    code: 'DEMO-HUE', slug: 'demo-hue-co-do-3n2d', name: 'Huế: Dấu xưa cố đô',
    category: 'Biển & di sản', categorySlug: 'demo-bien-di-san', city: 'Hà Nội', price: 4290000,
    summary: 'Thăm Đại Nội, lăng tẩm triều Nguyễn, nghe ca Huế trên sông Hương và thưởng thức ẩm thực cung đình.',
    days: [
      ['Hà Nội – Huế – Sông Hương', 'Đón đoàn tại sân bay Huế, nhận phòng. Buổi tối đi thuyền trên sông Hương, nghe ca Huế.'],
      ['Đại Nội – Lăng tẩm', 'Tham quan Đại Nội Huế, chùa Thiên Mụ và một số lăng tẩm triều Nguyễn theo lịch trình của đoàn.'],
      ['Chợ Đông Ba – Trở về', 'Mua sắm đặc sản tại chợ Đông Ba, trả phòng và di chuyển ra sân bay.'],
    ],
  },
  {
    code: 'DEMO-QN', slug: 'demo-quy-nhon-phu-yen-4n3d', name: 'Quy Nhơn – Phú Yên: Miền biển hoang sơ',
    category: 'Biển & di sản', categorySlug: 'demo-bien-di-san', city: 'TP. Hồ Chí Minh', price: 5290000,
    summary: 'Khám phá Kỳ Co, Eo Gió, Gành Đá Đĩa và những bãi biển yên tĩnh của miền Trung.',
    days: [
      ['Đến Quy Nhơn', 'Đón đoàn tại sân bay Phù Cát, về thành phố nhận phòng. Dạo biển và thưởng thức bún chả cá.'],
      ['Kỳ Co – Eo Gió', 'Di chuyển đến Kỳ Co, tắm biển và tham quan Eo Gió. Nghỉ đêm tại Quy Nhơn.'],
      ['Gành Đá Đĩa – Phú Yên', 'Tham quan Gành Đá Đĩa, Mũi Điện theo điều kiện thời tiết. Nhận phòng tại Tuy Hòa.'],
      ['Tuy Hòa – Tiễn đoàn', 'Tự do mua sắm đặc sản, trả phòng và đưa đoàn ra sân bay.'],
    ],
  },
  {
    code: 'DEMO-CT', slug: 'demo-can-tho-mien-tay-2n1d', name: 'Cần Thơ: Sông nước miền Tây',
    category: 'Văn hóa & ẩm thực', categorySlug: 'demo-van-hoa-am-thuc', city: 'TP. Hồ Chí Minh', price: 1790000,
    summary: 'Trải nghiệm chợ nổi Cái Răng, vườn trái cây và ẩm thực miệt vườn Nam Bộ.',
    days: [
      ['TP. Hồ Chí Minh – Cần Thơ', 'Đón đoàn, di chuyển đến Cần Thơ. Tham quan vườn trái cây, dùng bữa trưa đặc sản. Buổi tối dạo bến Ninh Kiều.'],
      ['Chợ nổi Cái Răng – Trở về', 'Đi thuyền tham quan chợ nổi Cái Răng vào buổi sáng sớm, dùng bữa sáng rồi trả phòng và trở về TP. Hồ Chí Minh.'],
    ],
  },
  {
    code: 'DEMO-MC', slug: 'demo-moc-chau-2n1d', name: 'Mộc Châu: Đồi chè và mùa hoa',
    category: 'Núi & thiên nhiên', categorySlug: 'demo-nui-thien-nhien', city: 'Hà Nội', price: 1990000,
    summary: 'Ngắm đồi chè, thung lũng hoa theo mùa và thưởng thức sữa, đặc sản vùng cao nguyên.',
    days: [
      ['Hà Nội – Mộc Châu', 'Đón đoàn tại Hà Nội, di chuyển đến Mộc Châu. Tham quan đồi chè trái tim và các điểm check-in theo mùa. Nhận phòng nghỉ đêm.'],
      ['Thác Dải Yếm – Trở về', 'Tham quan thác Dải Yếm, mua đặc sản địa phương, trả phòng và trở về Hà Nội.'],
    ],
  },
  {
    code: 'DEMO-HG', slug: 'demo-ha-giang-4n3d', name: 'Hà Giang: Hành trình cực Bắc',
    category: 'Núi & thiên nhiên', categorySlug: 'demo-nui-thien-nhien', city: 'Hà Nội', price: 4890000,
    summary: 'Chinh phục đèo Mã Pí Lèng, ngắm sông Nho Quế và khám phá văn hóa các dân tộc vùng cao.',
    days: [
      ['Hà Nội – Hà Giang', 'Đón đoàn tại Hà Nội, di chuyển đến thành phố Hà Giang, nhận phòng và nghỉ ngơi.'],
      ['Quản Bạ – Yên Minh – Đồng Văn', 'Qua Cổng Trời Quản Bạ, rừng thông Yên Minh và đến cao nguyên đá Đồng Văn. Nghỉ đêm tại Đồng Văn.'],
      ['Mã Pí Lèng – Sông Nho Quế', 'Chinh phục đèo Mã Pí Lèng, đi thuyền trên sông Nho Quế theo điều kiện thời tiết. Nghỉ đêm tại Mèo Vạc.'],
      ['Hà Giang – Hà Nội', 'Dùng bữa sáng, trả phòng và di chuyển về Hà Nội.'],
    ],
  },
  {
    code: 'DEMO-CD', slug: 'demo-con-dao-3n2d', name: 'Côn Đảo: Hành trình tâm linh và biển xanh',
    category: 'Nghỉ dưỡng', categorySlug: 'demo-nghi-duong', city: 'TP. Hồ Chí Minh', price: 6490000,
    summary: 'Viếng các di tích lịch sử, tắm biển hoang sơ và tận hưởng không gian yên bình của đảo.',
    days: [
      ['TP. Hồ Chí Minh – Côn Đảo', 'Đón đoàn tại sân bay Côn Đảo, nhận phòng. Buổi chiều tham quan các di tích lịch sử trên đảo.'],
      ['Biển Đầm Trầu – Hòn Bảy Cạnh', 'Tắm biển, tham quan các điểm thiên nhiên theo điều kiện thời tiết và thư giãn buổi tối.'],
      ['Chợ Côn Đảo – Trở về', 'Mua đặc sản, trả phòng và ra sân bay.'],
    ],
  },
  {
    code: 'DEMO-PN', slug: 'demo-phong-nha-quang-binh-3n2d', name: 'Phong Nha – Quảng Bình: Thế giới hang động',
    category: 'Núi & thiên nhiên', categorySlug: 'demo-nui-thien-nhien', city: 'Hà Nội', price: 4190000,
    summary: 'Khám phá động Phong Nha, Thiên Đường và vẻ đẹp rừng núi vườn quốc gia.',
    days: [
      ['Hà Nội – Đồng Hới – Phong Nha', 'Đón đoàn tại sân bay Đồng Hới, di chuyển đến Phong Nha, nhận phòng và dạo quanh thị trấn.'],
      ['Động Phong Nha – Động Thiên Đường', 'Đi thuyền vào động Phong Nha, tham quan động Thiên Đường theo lịch trình của đoàn.'],
      ['Suối Moọc – Trở về', 'Tham quan suối Moọc, dùng bữa trưa, trả phòng và ra sân bay.'],
    ],
  },
  {
    code: 'DEMO-MN', slug: 'demo-mui-ne-phan-thiet-2n1d', name: 'Mũi Né: Đồi cát và biển gió',
    category: 'Nghỉ dưỡng', categorySlug: 'demo-nghi-duong', city: 'TP. Hồ Chí Minh', price: 1590000,
    summary: 'Ngắm bình minh trên đồi cát, ghé suối Tiên, làng chài và thưởng thức hải sản Phan Thiết.',
    days: [
      ['TP. Hồ Chí Minh – Mũi Né', 'Đón đoàn, di chuyển đến Mũi Né. Tham quan suối Tiên, làng chài và nhận phòng. Buổi tối thưởng thức hải sản.'],
      ['Đồi cát – Trở về', 'Ngắm bình minh trên đồi cát, dùng bữa sáng, trả phòng và trở về TP. Hồ Chí Minh.'],
    ],
  },
];

// Lấy ngày theo giờ Việt Nam rồi cộng ngày thuần, không phụ thuộc múi giờ máy chạy.
function futureDate(offset: number): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find(p => p.type === type)!.value);
  return new Date(Date.UTC(part('year'), part('month') - 1, part('day') + offset)).toISOString().slice(0, 10);
}

await ConfigModule.forRoot({ envFilePath: '.env' });
const source = new DataSource({
  type: 'mysql', host: process.env.DB_HOST ?? 'localhost', port: Number(process.env.DB_PORT ?? 3306),
  username: process.env.DB_USERNAME ?? 'root', password: process.env.DB_PASSWORD ?? '',
  database: process.env.DB_DATABASE ?? 'tour_management', timezone: '+07:00', charset: 'utf8mb4',
  entities: ALL_ENTITIES, synchronize: false, logging: false,
});

try {
  await source.initialize();
  await source.transaction(async manager => {
    const policies = manager.getRepository(CancelPolicy);
    let policy = await policies.findOneBy({ name: 'DEMO - Chính sách hủy tiêu chuẩn' });
    if (!policy) {
      policy = await policies.save(policies.create({
        name: 'DEMO - Chính sách hủy tiêu chuẩn', isDefault: false,
        description: 'Chính sách mẫu để thử nghiệm: từ 14 ngày miễn phí; 7–13 ngày phí 30%; 3–6 ngày phí 50%; dưới 3 ngày phí 100%.',
      }));
      const rules = manager.getRepository(CancelPolicyRule);
      await rules.save([{ daysBefore: 14, feePercent: 0 }, { daysBefore: 7, feePercent: 30 }, { daysBefore: 3, feePercent: 50 }, { daysBefore: 0, feePercent: 100 }].map(rule => rules.create({ ...rule, policyId: policy!.id })));
    }
    let created = 0;
    let schedulesCreated = 0;
    for (const [index, item] of tours.entries()) {
      const tourRepo = manager.getRepository(Tour);
      const existing = await tourRepo.findOne({ where: [{ slug: item.slug }, { code: item.code }], withDeleted: true });
      if (existing) { console.log(`Giữ nguyên tour đã tồn tại: ${existing.code}`); continue; }
      const categories = manager.getRepository(Category);
      let category = await categories.findOneBy({ slug: item.categorySlug });
      if (!category) category = await categories.save(categories.create({ name: item.category, slug: item.categorySlug }));
      const tour = await tourRepo.save(tourRepo.create({
        code: item.code, slug: item.slug, name: item.name, summary: item.summary,
        description: `${item.summary}\n\nĐây là tour DEMO phục vụ kiểm thử hệ thống, không phải sản phẩm đang được chào bán thực tế. Giá mẫu tính bằng VNĐ; thông tin bao gồm/không bao gồm cần được xác nhận trước khi dùng kinh doanh.`,
        durationDays: item.days.length, durationNights: item.days.length - 1, departureCity: item.city,
        status: TourStatus.PUBLISHED, cancelPolicyId: policy.id, categories: [category], avgRating: 0, reviewCount: 0,
      }));
      const itineraries = manager.getRepository(ItineraryDay);
      await itineraries.save(item.days.map(([title, content], day) => itineraries.create({ tourId: tour.id, dayNo: day + 1, title, content, meals: day === 0 ? 'Trưa, Tối' : day === item.days.length - 1 ? 'Sáng, Trưa' : 'Sáng, Trưa, Tối' })));
      const schedules = manager.getRepository(DepartureSchedule);
      await schedules.save([14, 28, 42].map(offset => {
        const start = offset + index;
        return schedules.create({ tourId: tour.id, startDate: futureDate(start), endDate: futureDate(start + item.days.length - 1), priceAdult: item.price, priceChild: Math.round(item.price * 0.75), priceInfant: 300000, maxSeats: 30, soldSeats: 0, status: ScheduleStatus.OPEN, meetingPoint: `Điểm đón mẫu tại ${item.city} — liên hệ trước khi khởi hành` });
      }));
      created++;
      schedulesCreated += 3;
      console.log(`Đã thêm ${tour.code}: ${tour.name} — ${item.price.toLocaleString('vi-VN')} VNĐ/người lớn`);
    }
    const linked = await seedDemoDestinations(manager);
    console.log(`Hoàn tất: thêm ${created} tour, ${schedulesCreated} lịch khởi hành và ${linked.linksCreated} liên kết điểm đến còn thiếu. Giữ nguyên tour/lịch/điểm đến đã cấu hình.`);
  });
  const rows: unknown = await source.query(`SELECT t.code, t.name, t.status, COUNT(s.id) AS schedule_count, MIN(s.price_adult) AS from_price FROM tours t LEFT JOIN departure_schedules s ON s.tour_id = t.id WHERE t.code IN (${tours.map(() => '?').join(',')}) AND t.deleted_at IS NULL GROUP BY t.id, t.code, t.name, t.status ORDER BY t.code`, tours.map(tour => tour.code));
  console.table(rows);
} finally {
  if (source.isInitialized) await source.destroy();
}
