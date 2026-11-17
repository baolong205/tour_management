# TourGo Mobile · Android và iOS

Ứng dụng khách hàng viết bằng React Native, TypeScript và Expo SDK 57. Mobile gọi
backend NestJS hiện có: tài khoản, tour, đơn đặt, thanh toán, hóa đơn và email dùng
chung database với website. Admin và nhân viên vận hành qua website.

## Chức năng

- Đăng ký/đăng nhập, lưu phiên bằng SecureStore trên Android/iOS, làm mới phiên
  khi access token hết hạn. Preview web chỉ lưu phiên trong tab.
- Trang chủ dùng cùng logo, ảnh Hạ Long, nội dung, màu xanh dương và giá màu đỏ
  như website; có tour nổi bật và sáu điểm đến phổ biến. Ảnh điểm đến được đóng
  gói trong app, thông tin tour và giá luôn lấy từ backend.
- Khám phá tour: tìm từ khóa, điểm đến, nơi khởi hành; lọc danh mục, ngân sách,
  số ngày; sắp xếp giá, đánh giá, tên và thời gian. Xem ảnh, đánh giá khách hàng,
  lịch trình và lịch khởi hành trong chi tiết tour.
- Đặt tour cho nhiều hành khách, chọn ngày sinh, chọn/nhập/gỡ mã giảm giá từ
  danh sách ưu đãi còn dùng được; báo giá và kiểm tra chỗ được thực hiện ở server.
- Xem đơn, thanh toán, gửi yêu cầu hủy và xem phí hủy theo chính sách.
- Chọn ảnh chứng từ từ điện thoại, chuyển sang JPEG, tải lên backend và gửi nhân
  viên đối chiếu. VNPay/MoMo giữ chế độ giả lập như website.
- Xem trạng thái email, in hóa đơn và lưu/chia sẻ PDF bằng giao diện của thiết bị.
- Tour yêu thích, thông báo, hồ sơ, đổi mật khẩu, hỗ trợ CSKH và đánh giá sau tour.

Email do backend gửi khi thanh toán được ghi nhận, theo cấu hình SMTP và quy tắc
người nhận hiện có. Không lưu tài khoản SMTP hoặc mật khẩu trong app.

## Yêu cầu trước khi chạy

- Node.js **24.x**, đúng phiên bản trong `.nvmrc`; kiểm tra bằng `node --version`.
- MySQL đang chạy và có tài khoản được phép tạo bảng trong database dự án.
- Điện thoại Android hoặc iPhone cài **Expo Go tương thích Expo SDK 57**.
- Điện thoại và máy tính cùng Wi-Fi, có thể kết nối trực tiếp với nhau.

Các lệnh dưới dùng Windows PowerShell và `npm.cmd` để tránh lỗi execution policy.
Trên macOS/Linux có thể dùng `npm`/`npx` thay cho `npm.cmd`/`npx.cmd`.
Thư mục gốc là `tour_management`, chứa ba thư mục `backend`, `frontend`, `mobile`.

## Cài đặt lần đầu

### 1. Cài thư viện

Mở terminal tại **thư mục gốc dự án**:

```powershell
npm.cmd run setup
```

Lệnh này cài thư viện cho backend, web và mobile. Nếu chưa có `backend/.env`,
script tạo file đó cùng khóa JWT và thanh toán ngẫu nhiên; giữ nguyên `.env` đã có.

### 2. Cấu hình MySQL

Mở `backend/.env`, điền thông tin MySQL trên máy của bạn:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_DATABASE=tour_management
DB_SYNCHRONIZE=false
```

Nếu MySQL không đặt mật khẩu, để trống `DB_PASSWORD`. Các giá trị trên là ví dụ;
mobile không kết nối trực tiếp đến MySQL.

Trong MySQL Workbench hoặc MySQL CLI, chạy SQL sau để tạo database nếu chưa có:

```sql
CREATE DATABASE IF NOT EXISTS tour_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 3. Khởi tạo bảng và dữ liệu mẫu

Từ terminal ở thư mục gốc, chạy:

```powershell
cd backend
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run db:seed
npm.cmd run db:seed:tours
npm.cmd run db:seed:images
npm.cmd run db:seed:promotions
npm.cmd run db:seed:destinations
cd ..
```

`db:migrate` tạo bảng trên database mới hoặc áp dụng migration còn thiếu cho
schema đầy đủ đã cài đặt; không cần bỏ bước này khi database đã có dữ liệu.
Xem [hướng dẫn database](../docs/DATABASE.md) cho nâng cấp và trường hợp schema thiếu.
`db:seed:promotions` thêm 10 mã ưu đãi; `db:seed:destinations` liên kết điểm đến
cho các tour demo còn thiếu.

## Chạy mobile hằng ngày

Sau khi cài đặt, mở terminal ở **thư mục gốc** và chạy:

```powershell
npm.cmd run dev:mobile
```

Lệnh này khởi động backend rồi Expo, tự chọn IP LAN và truyền địa chỉ API cho
mobile. Với cách chạy này, không cần tự điền IP vào `mobile/.env`.
Terminal hiển thị `Mobile API`, địa chỉ Expo và QR để mở app.

Nếu backend đã chạy ở terminal khác, dùng lệnh này **thay cho** lệnh trên:

```powershell
npm.cmd run dev:mobile -- --reuse-api
```

Nếu muốn chạy cả website, backend và mobile trong một phiên, dùng `npm.cmd run dev`
thay cho `dev:mobile`. Dừng các phiên web/Expo cũ trước để giải phóng cổng.

Giữ terminal chạy trong khi sử dụng app. `Ctrl+C` dừng các dịch vụ do phiên đó
khởi động; backend được tái sử dụng bằng `--reuse-api` vẫn chạy ở phiên của nó.
Khi đổi Wi-Fi/IP, dừng Expo và chạy lại lệnh để tạo QR mới.

## Mở ứng dụng trên điện thoại

### iPhone

Đăng nhập Expo CLI bằng tài khoản Expo của bạn, thực hiện từ thư mục gốc:

```powershell
cd mobile
npx.cmd expo login
cd ..
```

Sau đó:

1. Đăng nhập Expo Go trên iPhone bằng **cùng tài khoản Expo** với CLI.
2. Chạy lệnh `dev:mobile` ở trên nếu chưa khởi động.
3. Mở **Camera iPhone**, quét QR trong terminal và chọn mở bằng Expo Go.
4. Cho phép Expo Go truy cập **Mạng cục bộ / Local Network** khi được hỏi.

Yêu cầu tài khoản Expo trên iOS được mô tả trong
[hướng dẫn mở app của Expo](https://docs.expo.dev/get-started/start-developing/).

### Android

1. Chạy lệnh `dev:mobile` ở trên nếu chưa khởi động.
2. Mở Expo Go, chọn quét QR và quét mã trong terminal.
3. Chờ Metro tạo bundle và mở giao diện TourGo.

Tài khoản **Expo** dùng để mở dự án qua Expo Go; tài khoản **TourGo** dùng để
đăng nhập ứng dụng. Trong TourGo, bấm **Đăng nhập → Đăng ký ngay** để tạo tài khoản
khách hàng. Tài khoản admin/nhân viên sử dụng website quản trị.

Thanh điều hướng dưới gồm Trang chủ, Khám phá, Tour của tôi, Yêu thích và Tài khoản;
thông báo mở bằng biểu tượng chuông ở đầu màn hình.

## Sửa lỗi không kết nối được máy chủ

Lấy IP từ dòng `Mobile API` trong terminal. Ví dụ nếu IP là `192.168.1.10`, mở
các địa chỉ sau **trong trình duyệt điện thoại** (thay IP bằng giá trị thực tế):

| Địa chỉ | Kết quả mong đợi | Ý nghĩa |
| --- | --- | --- |
| `http://192.168.1.10:8081/status` | `packager-status:running` | Điện thoại kết nối được Expo |
| `http://192.168.1.10:3000/api/health` | JSON có `status: "ok"` | Điện thoại kết nối được backend |

Nếu đổi `PORT` hoặc `API_PREFIX` trong backend, dùng cổng/đường dẫn tương ứng.

| Hiện tượng | Cách xử lý |
| --- | --- |
| Không mở được `/status` | Kiểm tra cùng Wi-Fi, quyền Local Network trên iPhone và quyền Node.js qua Windows Firewall trên mạng nội bộ. Mạng khách/trường học có thể chặn thiết bị truy cập nhau; thử Wi-Fi cho phép các thiết bị kết nối trực tiếp. |
| Mở được `/status`, không mở được `/api/health` | Kiểm tra backend, MySQL, cổng API và firewall cho cổng backend. |
| Quét QR cũ sau khi đổi Wi-Fi | Dừng Expo, chạy lại `dev:mobile`, quét QR mới. Không dùng `localhost`/`127.0.0.1` trên điện thoại thật. |
| iPhone báo sai tài khoản Expo | Đăng nhập cùng tài khoản trong CLI và Expo Go, rồi mở lại app. |
| Báo API 3000 đang được dùng | Nếu đúng backend dự án, dùng `-- --reuse-api`; nếu không, dừng tiến trình đang chiếm cổng. |
| Báo cổng 8081 đang được dùng | Dừng terminal Expo cũ bằng `Ctrl+C` rồi khởi động lại một phiên Expo. |
| QR mở được nhưng lần đầu tải lâu | Theo dõi log `iOS Bundled` / `Android Bundled`; lần đầu có thể hơn một phút. Giữ terminal chạy, không xóa cache ở mỗi lần mở. |
| Báo SDK không tương thích | Dùng Expo Go tương thích SDK 57 theo [hướng dẫn thiết lập môi trường](https://docs.expo.dev/get-started/set-up-your-environment/). |

## Chạy riêng từng dịch vụ và tự cấu hình API

Dùng cách này khi cần tự chọn máy chủ API. Hoàn thành phần cài đặt/database ở trên
trước, rồi mở hai terminal, mỗi terminal bắt đầu từ thư mục gốc.

Terminal 1 — backend:

```powershell
cd backend
npm.cmd run dev
```

Terminal 2 — Expo:

```powershell
cd mobile
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Mở `mobile/.env` và sửa địa chỉ máy chạy backend, ví dụ:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
```

Xem địa chỉ IPv4 của Wi-Fi bằng `ipconfig`. Sau khi lưu `.env`, tại terminal 2 chạy:

```powershell
npm.cmd run api:check
npm.cmd start
```

`api:check` kiểm tra API từ máy tính; vẫn cần mở `/api/health` trên điện thoại
để xác nhận kết nối từ điện thoại. Khi sửa `.env`, khởi động lại Expo.
Biến `EXPO_PUBLIC_*` được đóng gói trong app; chỉ đặt URL API ở đây, giữ thông tin
MySQL/JWT/SMTP trong `backend/.env`.

Nếu máy có nhiều card mạng và lệnh chạy từ gốc chọn sai IP, có thể chỉ định:

```powershell
# Chạy tại thư mục gốc, thay bằng IPv4 Wi-Fi của máy.
$env:TOURGO_HOST = '192.168.1.10'
npm.cmd run dev:mobile
```

Biến này có hiệu lực trong terminal hiện tại; mở terminal mới để chọn IP tự động.

## Giả lập và preview web

- Android Emulator: cài Android Studio/SDK, mở emulator, đặt URL
  `http://10.0.2.2:3000/api` rồi chạy `npm.cmd run android`.
- iOS Simulator: cần macOS/Xcode, URL `http://localhost:3000/api`, chạy
  `npm.cmd run ios`.
- Preview trình duyệt: khi Expo đã chạy, nhấn `w` trong terminal đó rồi mở
  http://localhost:8081. Nếu Expo chưa chạy và đã cấu hình `.env` theo cách thủ
  công, chạy `npm.cmd run web` trong `mobile/`.

Khi tự chạy backend hoặc dùng `--reuse-api`, thêm origin preview, thường là
`http://localhost:8081` và `http://127.0.0.1:8081`, vào `CORS_ORIGIN` của backend
rồi khởi động lại backend nếu trình duyệt báo CORS. Lệnh `dev:mobile` tự bổ sung
origin khi chính nó khởi động backend. Website React/Vite chính vẫn chạy ở
http://localhost:5173 từ thư mục `frontend/`.

Ảnh public `/uploads/` cho phép nhúng khác origin; ảnh có URL `localhost` được
mobile chuyển sang origin API đã cấu hình. API vẫn giữ xác thực, phân quyền và
allowlist CORS hiện có.

## Tạo APK / bản iOS để cài đặt

`eas.json` có profile `preview` tạo APK Android và `production` dành cho store.
Xác nhận hoặc đổi identifier `com.tourgo.travel` trong `app.json` theo tài khoản
phát hành của đơn vị trước khi đưa lên cửa hàng.

```powershell
cd mobile
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
npx.cmd eas-cli@latest build --platform android --profile preview
```

EAS cần tài khoản Expo và liên kết project. Nếu EAS yêu cầu cập nhật dynamic
config, thêm `extra.eas.projectId` mà EAS cung cấp vào `app.json`, dùng đúng UUID
do tài khoản của bạn tạo.

Build production cần `EXPO_PUBLIC_API_URL` trỏ tới backend HTTPS trong môi trường
EAS; config từ chối production nếu URL thiếu hoặc dùng HTTP. Android chỉ bật
cleartext khi cấu hình API HTTP cho phát triển/LAN. Bản iOS cài thật hoặc phát hành
cần thông tin ký ứng dụng tương ứng; xem [hướng dẫn build Expo](https://docs.expo.dev/build/introduction/).

Export JavaScript/Hermes cho Android/iOS không tạo APK/IPA có chữ ký. Cần bước EAS
hoặc môi trường Android/Xcode để tạo binary cài đặt.

## Kiểm tra

```powershell
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd expo-doctor
npm.cmd run export:check
```

`export:check` bundle Android, iOS và web vào `mobile/dist` (không đưa lên Git).
Client được kiểm thử refresh đồng thời, logout trong lúc refresh, lỗi mạng,
form-data chứng từ và ngăn gửi bearer token sang URL ngoài.

Kết quả kiểm tra giao diện và luồng nghiệp vụ ngày 09/11/2026 được ghi tại
[docs/MOBILE_TESTING.md](../docs/MOBILE_TESTING.md), phân biệt rõ bản xem trước
trình duyệt, export native và các bước còn cần kiểm tra trên iPhone thật.

Trong `backend`, chạy `npm.cmd run test:checkout` để kiểm tra API trên database
MySQL thử nghiệm riêng, gồm đăng ký → đăng nhập → refresh → đặt tour → thanh toán
→ hóa đơn. Email trong bộ test dùng transport giả lập.

## Cấu trúc

```text
src/app/                 Điều hướng và màn hình bằng Expo Router
src/components/          UI, thẻ tour, chọn ngày sinh
src/context/session.tsx  Khôi phục phiên, đăng nhập/đăng xuất, hồ sơ
src/hooks/               Request có hủy và refresh khi quay lại màn hình
src/lib/                 API client, kiểu dữ liệu, định dạng, in/chia sẻ hóa đơn
tests/                   Kiểm thử client không cần giả lập điện thoại
```

Tham khảo: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/),
[SecureStore](https://docs.expo.dev/versions/v57.0.0/sdk/securestore/),
[Print](https://docs.expo.dev/versions/v57.0.0/sdk/print/),
[Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).
