# Khởi tạo và nâng cấp database

Backend dùng MySQL; CI kiểm tra bằng MySQL 8.4. Cấu hình kết nối nằm trong
`backend/.env`. Tạo database `tour_management` với charset `utf8mb4` trước khi chạy.

## Một lệnh cho database mới và database đã cài đặt

Chạy trong `backend/`:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:seed:tours
npm.cmd run db:seed:images
npm.cmd run db:seed:promotions
npm.cmd run db:seed:destinations
```

`db:migrate` build script rồi chạy các migration chưa được ghi nhận trong bảng
`migrations`. Chạy lại khi đã cập nhật xong sẽ không áp dụng lại các migration cũ.
Seed là bước tạo dữ liệu mẫu riêng, không tự chạy khi server khởi động.

Danh sách migration duy nhất nằm tại
`backend/src/database/migrations/index.ts`, được dùng bởi CLI, ứng dụng và kiểm thử.

| Migration | Trách nhiệm |
| --- | --- |
| `InitialSchema1794000000000` | Tạo 41 bảng và các khóa/index từ snapshot SQL cố định trên database trống; nhận diện schema đầy đủ đã tạo bằng cách cũ |
| `PaymentReceipts1794099600000` | Bổ sung hàng đợi email và index tra cứu lượt dùng mã giảm giá |
| `SupportTickets1794180000000` | Bổ sung bảng hỗ trợ, thay cho SQL chạy thủ công trước đây |
| `PromotionCampaigns1794186000000` | Bổ sung chiến dịch khuyến mãi, phạm vi áp dụng, cấp voucher và sổ cái lượt dùng |

Baseline dùng `initial-schema.snapshot.ts` cố định; không gọi `synchronize()` hay
đọc entity hiện tại để tự sinh lệnh thay đổi schema trong lúc migrate.

## Database đã có dữ liệu

Sao lưu trước khi triển khai thay đổi schema. Giữ `DB_SYNCHRONIZE=false`.

- Nếu đã có đầy đủ bảng cốt lõi từ phiên bản cũ, baseline chỉ được ghi nhận,
  không tạo lại hoặc ghi đè bảng; các migration tiếp theo thêm phần còn thiếu.
- Nếu migration thanh toán đã chạy trước đây, lịch sử đó được giữ nguyên;
  baseline và bảng hỗ trợ còn thiếu vẫn được xử lý.
- Nếu schema chỉ được tạo một phần, baseline dừng và liệt kê bảng thiếu. Kiểm tra
  lại `DB_DATABASE`, backup và lịch sử cài đặt; không dùng `--force` để vượt lỗi.
- Schema cũ phải tương thích các entity hiện hành. Baseline không sửa cột tùy biến
  hoặc thay thế migration chuyên biệt của các phiên bản trước.

MySQL có các lệnh DDL tự commit. Nếu quá trình dựng database mới bị ngắt giữa
chừng, cần kiểm tra schema trước khi chạy tiếp; không coi transaction là cơ chế
rollback toàn bộ việc tạo bảng.

Các lệnh `db:check` và `db:sync` vẫn còn để chẩn đoán/thử nghiệm. Quy trình cài đặt
và nâng cấp thông thường dùng `db:migrate`. Script cũ
`upgrade-customer-features.ts` hiện chuyển tiếp sang cùng quy trình migration.

## Thêm thay đổi schema

1. Tạo migration mới có timestamp trong `backend/src/database/migrations/`.
2. Đăng ký class mới trong `ALL_MIGRATIONS` ở `index.ts`.
3. Thêm kiểm thử cho nâng cấp từ schema cũ và bảo toàn dữ liệu.
4. Chạy `npm.cmd run test:migrations` và các kiểm thử nghiệp vụ liên quan.

Không sửa snapshot hoặc migration đã phát hành; thêm migration mới cho thay đổi
tiếp theo. Các migration hiện tại từ chối `down` tự xóa dữ liệu; phương án rollback
là khôi phục backup hoặc triển khai migration sửa lỗi phù hợp.

## Kiểm thử

```powershell
npm.cmd run test:migrations
npm.cmd run test:checkout
npm.cmd run test:search
```

Các bộ integration tạo database ngẫu nhiên có tiền tố kiểm thử, kiểm tra tên trước
khi dọn và xóa database đó khi kết thúc. Tài khoản MySQL dùng để chạy integration
cần quyền tạo/xóa database kiểm thử. Không chạy các bộ này bằng tài khoản production.
