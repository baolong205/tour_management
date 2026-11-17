# Cấu trúc và quy ước dự án

Repo gồm ba ứng dụng độc lập, mỗi ứng dụng giữ `package.json` và lockfile riêng.
Node.js 24 được cố định bằng `.nvmrc`; script ở gốc điều phối cài đặt và kiểm tra.

```text
tour_management/
├── backend/
│   ├── src/
│   │   ├── common/             Auth, entity nền, lỗi HTTP, thời gian nghiệp vụ
│   │   ├── config/             Cấu hình database/JWT
│   │   ├── database/migrations/ Schema và danh sách migration
│   │   └── modules/            Auth, catalog, schedule, booking, payment, ...
│   ├── scripts/                Seed, migrate, chẩn đoán database
│   └── test/                   Kiểm thử API, migration và luồng tích hợp
├── frontend/
│   ├── src/
│   │   ├── components/         UI và layout dùng chung
│   │   ├── context/            Phiên đăng nhập
│   │   ├── features/           Mã nghiệp vụ và component theo chức năng
│   │   ├── hooks/              Hook gọi API
│   │   ├── lib/                Định dạng và hiệu ứng dùng chung
│   │   ├── pages/              Các trang được router hiển thị
│   │   ├── routing/            Điều hướng và phân vùng tài khoản
│   │   ├── services/           API client
│   │   └── styles/             CSS dễ đọc, thứ tự tải tại index.css
│   ├── public/images/          Ảnh công khai và nguồn ảnh
│   └── tests/                  Kiểm thử API client và logic giao diện
├── mobile/
│   ├── src/app/                Route Expo Router, nhóm (tabs), route [id]
│   ├── src/components/         UI React Native
│   ├── src/context/            Phiên đăng nhập
│   ├── src/hooks/              Request, hủy request và làm mới khi quay lại
│   ├── src/lib/                API, kiểu dữ liệu, định dạng và hóa đơn
│   ├── assets/                 Icon và ảnh đóng gói
│   └── tests/                  Kiểm thử client và bộ lọc
├── scripts/                    Điều phối toàn bộ dự án
├── docs/                       Tài liệu nghiệp vụ, chạy và kiểm thử
└── .github/workflows/ci.yml     Kiểm tra khi push main hoặc tạo pull request
```

## Ranh giới backend

- Controller nhận DTO và kiểm tra quyền qua guard. API công khai được giữ ổn định.
- `BookingService` điều phối quyền truy cập, tạo/xác nhận đơn và phát sự kiện.
  `BookingPricingService` tính loại vé/giá, `BookingCancellationService` lưu và xử lý
  yêu cầu hủy, `BookingReservationsService` quản lý khóa dòng/chỗ/lượt dùng mã.
- `PaymentService` điều phối phiên thanh toán và webhook. `RefundService` xử lý
  hoàn tiền; `PaymentReceiptService` chuyển trạng thái đơn, phát hành hóa đơn và
  ghi email vào hàng đợi trong cùng transaction thanh toán.
- Service con nhận `EntityManager` từ transaction đang chạy khi cần; không mở
  transaction lồng nhau cho side effect thanh toán/giữ chỗ.
- Unit test đặt cạnh mã nguồn (`*.spec.ts`); integration/e2e nằm trong `test/`.

## Frontend và mobile

Component gắn nghiệp vụ đặt trong `features/<chức năng>/components/`, UI/layout dùng
chung trong `components/`, trang điều hướng trong `pages/`. File `.jsx` dùng
PascalCase cho component; helper dùng tên mô tả bằng chữ thường.

CSS tập trung tại `frontend/src/styles/`; `index.css` giữ nguyên thứ tự cascade
trước khi sắp xếp. CSS hóa đơn vẫn được component nghiệp vụ import tại vị trí cũ
để giữ hành vi in. Chưa chuyển toàn bộ sang CSS Modules.

ESLint 10 kiểm tra cả JSX và JavaScript. `frontend/package.json` ghim override
`minimatch` 11.0.5 để dùng bản vá GHSA-g3hv-75wg-m249 cho phụ thuộc lint;
kiểm tra lại override khi nâng ESLint. Node.js 24 đáp ứng yêu cầu của bộ công cụ này.

Mobile giữ nguyên cấu trúc Expo: chỉ đặt route/layout trong `src/app/`, logic và
component dùng lại nằm ngoài thư mục đó. `app.json` là cấu hình tĩnh,
`app.config.js` bổ sung cấu hình theo môi trường.

## File cấu hình, dữ liệu và kết quả chạy

- Commit lockfile và `.env.example`; giữ `.env` thật ở máy hoặc môi trường triển khai.
- `node_modules/`, `dist/`, `dist-scripts/`, `.expo/`, file tải lên và `.artifacts/`
  được bỏ qua bằng Git. Báo cáo/screenshot chạy thử nằm trong `.artifacts/`.
- `.editorconfig` thống nhất UTF-8, hai dấu cách và LF; `.gitattributes` thống nhất
  line ending cho file văn bản. Source CSS được định dạng, không lưu ở dạng nén.
- Quy trình schema duy nhất được mô tả trong [DATABASE.md](DATABASE.md).

## Kiểm tra và CI

Từ thư mục gốc:

```powershell
npm.cmd run check
npm.cmd run check:integration
```

`check` chạy build, lint và unit test cho các ứng dụng, kèm typecheck mobile.
`check:integration` chạy migration, e2e, checkout và search trên MySQL.

CI dùng bốn job: backend, frontend, mobile và integration MySQL 8.4. Job mobile
export bundle Android/iOS/web; integration khởi tạo database CI bằng `db:migrate`.
Các job dùng `npm ci` và lockfile đã commit, không cần mật khẩu production.

Khi thêm file vào CI, chạy cùng các lệnh tương ứng ở local. CI trên GitHub chỉ có
kết quả sau khi workflow được push và GitHub Actions thực thi.
