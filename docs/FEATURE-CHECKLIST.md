# Đối chiếu chức năng khách hàng / Admin / nhân viên

Ngày đối chiếu: 28/10/2026. “Có” là có giao diện nối API, không có nghĩa đã kiểm thử trực quan mọi màn hình.
Cập nhật 11/11/2026: nâng cấp module khuyến mãi thành chiến dịch mã giảm giá (xem mục “Khuyến mãi”).

## Khách hàng

| STT | Chức năng | Trạng thái sau bổ sung |
|---|---|---|
| 1 | Đăng ký | Có |
| 2 | Đăng nhập / đăng xuất | Có, refresh token |
| 3 | Quên mật khẩu | Có giao diện yêu cầu/reset; CHỈ DEMO token cục bộ. Chưa gửi email; production chặn API yêu cầu khôi phục cho tới khi có dịch vụ email |
| 4 | Hồ sơ | Đã thêm tự cập nhật tên/điện thoại và đổi mật khẩu |
| 5 | Danh sách tour | Có |
| 6 | Tìm kiếm | Tên/mã/tóm tắt và tên điểm đến; thêm bộ lọc điểm đến |
| 7 | Lọc và sắp xếp | Đã thêm khoảng giá người lớn thấp nhất, số ngày, sắp giá tăng/giảm, thời lượng, đánh giá |
| 8 | Chi tiết tour | Có lịch trình, ảnh bìa, điểm đến, chính sách, đánh giá công khai. Chưa có thư viện ảnh tương tác và trường dịch vụ bao gồm/không bao gồm riêng |
| 9 | Đặt tour | Có lịch khởi hành, danh sách khách, báo giá server, voucher. Picker gửi `subtotal` + `scheduleId` để server chấm mã và hiện **số tiền tiết kiệm thật** + lý do không dùng được; mã dùng được xếp trước, cùng nhóm thì giảm nhiều tiền hơn đứng trước |
| 10 | Thanh toán | Đã thêm tạo giao dịch, thông tin ngân hàng cấu hình, gửi URL chứng từ và VNPay/MoMo GIẢ LẬP. Chưa VietQR/cổng thật; chưa nút tải chứng từ từ máy |
| 11 | Lịch sử | Có |
| 12 | Hủy | Có yêu cầu hủy và chính sách; đã sửa DTO duyệt hủy bị whitelist chặn |
| 13 | Đánh giá | Đã thêm viết từ đơn COMPLETED, sửa khi PENDING, xem lịch sử và đánh giá đã duyệt ở chi tiết tour |
| 14 | Yêu thích | Có trang riêng theo tài khoản, bỏ yêu thích |
| 15 | Thông báo | Đã thêm hộp thông báo in-app, đánh dấu đọc. Chưa realtime/email; không tự nhận mọi thay đổi lịch |
| 16 | Hỗ trợ | Đã thêm ticket lưu DB, hội thoại trả lời, trạng thái xử lý. Không phải live chat |

## Admin

| STT | Chức năng | Trạng thái |
|---|---|---|
| 1 | Dashboard | Đã thêm tổng tour/đơn/chờ xác nhận và dòng tiền |
| 2 | Tour | Có thêm/sửa/xóa/ẩn/hiện; đã sửa tạo tour gửi /undefined |
| 3 | Lịch trình | Đã nối cập nhật từng ngày qua mảng JSON trong form tour; chưa editor trực quan |
| 4 | Lịch khởi hành | Đã thêm CRUD ngày, số chỗ, giá theo loại khách và trạng thái |
| 5 | Danh mục | Đã thêm CRUD |
| 6 | Địa điểm | Đã thêm CRUD và tọa độ |
| 7 | Đặt tour | Đã thêm xem hành khách/yêu cầu hủy, xác nhận/từ chối/hủy/duyệt yêu cầu |
| 8 | Khách hàng | Đã thêm tìm, sửa tên/điện thoại, khóa/mở; chưa nút xóa ở UI |
| 9 | Nhân viên | Đã thêm tạo STAFF, gán vai trò (JSON), khóa/mở; chưa sửa từng quyền lẻ |
| 10 | Thanh toán | Đã thêm danh sách/duyệt/từ chối chứng từ, quản lý yêu cầu hoàn tiền. Ghi nhận hệ thống không tự chuyển tiền ngân hàng |
| 11 | Khuyến mãi | Đã nâng thành **chiến dịch**: trạng thái `DRAFT/SCHEDULED/ACTIVE/PAUSED/EXPIRED`, nguồn mã `PUBLIC/PERSONAL/GIFT`, phạm vi tour/danh mục/điểm đến/lịch, cấp mã riêng cho khách, trần ngân sách + trần lượt/ngày, cộng dồn có kiểm soát (`stackable`, `exclusiveGroup`, `priority`), sổ cái lượt dùng, thống kê, API công khai + mã tốt nhất cho giỏ. Chi tiết & việc còn lại: [`KE-HOACH-PHAT-TRIEN-MA-GIAM-GIA.md`](KE-HOACH-PHAT-TRIEN-MA-GIAM-GIA.md) §8 |
| 12 | Đánh giá | Đã thêm duyệt công khai/ẩn |
| 13 | Banner | Đã thêm CRUD và hiển thị banner active từ API trên trang chủ |
| 14 | Doanh thu | Đã thêm ngày/tháng/năm, lọc kỳ nhận/hoàn tiền; thu ròng không phải lợi nhuận |
| 15 | Báo cáo | CSV UTF-8 mở bằng Excel và in/lưu PDF bằng trình duyệt; CHƯA xuất .xlsx hoặc PDF server |
| 16 | Cấu hình | Đã thêm cấu hình JSON và chính sách hủy; contact/bank được public theo allowlist |

## Nhân viên

1. Dùng đăng nhập chung, vào `#/admin`: giao diện riêng theo quyền STAFF.
2. Xem/tìm/lọc đơn và chi tiết khách.
3. Xác nhận/từ chối đơn.
4. Trả lời ticket CSKH.
5. Duyệt/từ chối yêu cầu hủy theo snapshot chính sách.
6. Chỉ chỉnh hồ sơ khách hàng (tên/điện thoại), không sửa hồ sơ nhân viên/Admin.
7. Gửi thông báo in-app cho tài khoản.
8. Quản lý ticket và trạng thái xử lý.

STAFF có 11 quyền, ADMIN có 26 quyền. STAFF không có role:manage, user:manage, tour:write/delete, system:setting, report:read hay payment:refund. Các kiểm tra quyền chạy cả backend, không chỉ ẩn menu.

## Khuyến mãi (chiến dịch mã giảm giá)

Đã triển khai phần lõi theo [`KE-HOACH-PHAT-TRIEN-MA-GIAM-GIA.md`](KE-HOACH-PHAT-TRIEN-MA-GIAM-GIA.md).

**Dữ liệu**

- `promotions` thêm: `name`, `description`, `image_url`, `status`, `kind`, `budget_cap`/`budget_used`, `daily_limit`/`daily_used`/`daily_date`, `channel_scope`, `customer_scope`, `stackable`, `exclusive_group`, `priority`, `terms_text`.
- Bảng mới: `promotion_scopes` (phạm vi áp dụng), `promotion_assignments` (mã cấp riêng), `promotion_redemptions` (sổ cái `RESERVED/CONFIRMED/RELEASED`), `booking_discounts` (chi tiết từng dòng giảm).
- `bookings.discount`/`bookings.total` **giữ nguyên** nghĩa; `booking_discounts` chỉ thêm chi tiết nên hóa đơn cũ không đổi.

**Nghiệp vụ**

- Một engine thuần [`discount-engine.ts`](../backend/src/modules/promotion/services/discount-engine.ts) quyết định giảm bao nhiêu, dùng chung cho `quote`, `create`, `validate`, `available`, `best-for-cart`.
- Xét: trần `maxDiscount`, không giảm quá tạm tính, hạn mức mỗi khách, kênh bán (`ONLINE`/`COUNTER`), khách mới, mã `PERSONAL` phải được cấp, 4 loại phạm vi, trần ngân sách, trần lượt/ngày.
- Cộng dồn: chỉ khi mã `stackable`, tôn trọng `exclusiveGroup`, sắp theo `priority` rồi mức giảm thực tế, có trần tổng giảm và số mã tối đa.
- `reserveForBooking` cập nhật `used_count` + `budget_used` + `daily_used` trong **một** câu `UPDATE` có điều kiện ⇒ hai request đồng thời không vượt trần; thua thì trả 409.
- Hủy/hết hạn/từ chối đơn → `releaseForBooking` hoàn counter và đánh dấu sổ cái `RELEASED` kèm lý do.
- Thanh toán xong → `PaymentService` chốt sổ cái `RESERVED → CONFIRMED`.

**API**

- Công khai: `GET /promotions/public`, `GET /promotions/available?subtotal&scheduleId&channel`.
- Khách: `GET /promotions/my-vouchers`, `POST /promotions/validate`, `POST /promotions/best-for-cart`.
- Quản trị: CRUD mã, `PATCH /promotions/:id/active`, `GET|PUT /promotions/:id/scopes`, `GET|POST /promotions/:id/assignments`, `GET /promotions/:id/redemptions`, `GET /promotions/:id/stats`.

**Vận hành**

- Migration [`1794186000000-PromotionCampaigns.ts`](../backend/src/database/migrations/1794186000000-PromotionCampaigns.ts) chỉ `ADD COLUMN` nullable + `CREATE TABLE IF NOT EXISTS` ⇒ chạy lại idempotent, không mất đơn cũ.
- Script [`backfill-promotion-redemptions.ts`](../backend/scripts/backfill-promotion-redemptions.ts) sinh sổ cái từ `bookings` cũ, idempotent, có `--dry-run`.
- Cron mỗi giờ `expirePromotions()` chuyển mã quá `valid_to` sang `EXPIRED` (chỉ đổi trạng thái, không xóa, không đụng counter).

**Còn lại** (xem §8.4 của tài liệu kế hoạch): job đối chiếu `used_count` ↔ sổ cái, audit log cho thao tác admin, in từng dòng giảm trên hóa đơn/email, rate limit `POST /promotions/validate`, trang "Ưu đãi của tôi", báo cáo so sánh mã + xuất CSV, test tích hợp luồng đặt → thanh toán → hủy → hoàn mã.

## Cập nhật máy khác (không xóa dữ liệu)

Trong `D:\nam4\project\tour_management\backend`:

```powershell
npm run db:build
node dist/scripts/upgrade-customer-features.js
node dist/scripts/seed.js
```

Schema được nâng cấp qua `npm run db:migrate` trong `backend/`, gồm cả bảng hỗ trợ.
Script upgrade cũ chuyển tiếp sang cùng quy trình migration; seed đồng bộ bộ quyền,
không reset mật khẩu tài khoản đã tồn tại. Xem [DATABASE.md](DATABASE.md).

Nếu DB đã có dữ liệu khuyến mãi cũ, chạy thêm migration + backfill sổ cái (cả hai đều idempotent):

```powershell
npm run db:migrate
npx tsx scripts/backfill-promotion-redemptions.ts --dry-run   # chỉ đếm, không ghi
npx tsx scripts/backfill-promotion-redemptions.ts             # ghi thật
```

Migration chỉ thêm cột/bảng, không sửa hay xóa dữ liệu `promotions`/`bookings` hiện có.
Backfill đọc `bookings` cũ, ghi `promotion_redemptions` + `booking_discounts` rồi tính lại
`used_count`/`budget_used` từ sổ cái để counter khớp lịch sử.

Khởi động lại backend sau cập nhật. Đăng xuất/đăng nhập lại để frontend nhận quyền và vai trò mới. Trong Admin > Nhân viên có thể tạo tài khoản STAFF. Seed cũng hỗ trợ STAFF_EMAIL và STAFF_PASSWORD nếu khai báo rõ trước khi chạy; không có mật khẩu STAFF mặc định.

Các khóa cấu hình:

- `site.contact`: `{ "email": "...", "phone": "...", "address": "..." }`
- `payment.bank`: `{ "bankName": "...", "accountName": "...", "accountNumber": "..." }`

Không đưa thông tin ngân hàng giả lên production. GET public-info chỉ công bố các trường contact/bank cho phép, không toàn bộ cấu hình.

## Kiểm thử & dữ liệu demo

- Frontend: `npm test`, `npm run build`.
- Backend: `npm test`, `npm run db:build`.
- HTTP smoke: `node dist/scripts/verify-customer-features.js` (chỉ chạy local; tạo khách/nhân viên/ticket, booking/payment giả lập lưu DB; đơn demo được hủy để nhả chỗ). Các giao dịch demo vẫn được thống kê, cần phân biệt khi trình bày báo cáo.
- Test bao gồm owner ticket, phân quyền STAFF/ADMIN/CUSTOMER, chặn thu OFFICE bởi khách, DTO hủy, CSV chống công thức, chuyển đổi payload form; HTTP smoke kiểm tra cả thanh toán và hủy với MySQL thật.
- Khuyến mãi: `npx vitest run src/modules/promotion/services/discount-engine.spec.ts` (37 test cho engine thuần), `npx vitest run src/database/verify-entities.spec.ts` (18 test metadata + máy trạng thái + tính giảm giá), `npm test` ở `frontend/` (gồm test đường dẫn `available` và sắp xếp voucher).
- `mail-transport.service.spec.ts` đang fail 3 test do mock `nodemailer` không áp dụng dưới Vitest 4 (`getaddrinfo ENOTFOUND smtp.example.test`); lỗi có sẵn, không liên quan khuyến mãi.
- Chưa kiểm thử trực quan tự động desktop/mobile. Chưa chứng minh mọi thao tác CRUD qua trình duyệt hoặc tích hợp ngoài.

## Các phần còn phải làm để đạt đầy đủ yêu cầu production

1. Dịch vụ email thực, bỏ hoàn toàn reset token demo khỏi response public.
2. Cổng thanh toán thật/VietQR, upload chứng từ và bảo vệ mọi endpoint giả lập khi production.
3. Thông báo tự động khi đổi lịch + realtime/email tùy nhu cầu.
4. Xuất .xlsx/PDF chuyên dụng, bộ lọc báo cáo nâng cao.
5. Editor lịch trình/ảnh/chính sách/phân quyền trực quan thay JSON, dịch vụ bao gồm/không bao gồm và gallery.
6. Kiểm thử E2E trên trình duyệt, rà soát bảo mật và vận hành trước triển khai công khai.
7. Khuyến mãi: job đối chiếu `used_count` với sổ cái, audit log thao tác admin, in từng dòng giảm trên hóa đơn/email, rate limit chống dò mã, trang "Ưu đãi của tôi", báo cáo so sánh mã + xuất CSV, test tích hợp luồng đặt → thanh toán → hủy → hoàn mã.
