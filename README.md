# TourGo — Hệ thống quản lý tour du lịch

## Deploy để nộp bài

Hướng dẫn website Vercel, API Render và APK Android: `docs/DEPLOY-NOP-BAI.md`.
Cấu hình deploy đã có trong repo; cần tài khoản dịch vụ và database cloud để tạo link/APK thật.
Gửi hóa đơn qua HTTPS trên Render Free: `docs/EMAIL-RENDER.md`.

Dự án gồm ba phần dùng chung một backend NestJS và database MySQL:

| Thư mục | Mô tả | Công nghệ |
| --- | --- | --- |
| [`backend/`](backend/README.md) | API nghiệp vụ, xác thực, phân quyền | NestJS 12 + TypeORM + MySQL |
| [`frontend/`](frontend/README.md) | Website khách hàng, nhân viên, quản trị | React 19 + Vite |
| [`mobile/`](mobile/README.md) | Ứng dụng khách hàng Android/iOS | React Native + Expo SDK 57 |

---

## 1. Yêu cầu môi trường

- **Node.js 24.x** — đúng phiên bản trong [`.nvmrc`](.nvmrc:1). Kiểm tra bằng `node --version`.
- **MySQL 8** đang chạy, có tài khoản được phép tạo bảng trong database dự án.
- **Git** (để clone mã nguồn).
- Với mobile: điện thoại cài **Expo Go tương thích Expo SDK 57**, cùng Wi-Fi với máy tính.

> Trên Windows PowerShell, dùng `npm.cmd` / `npx.cmd` để tránh lỗi execution policy.
> Trên macOS/Linux dùng `npm` / `npx`.

---

## 2. Cài đặt lần đầu

### Bước 1 — Cài thư viện và tạo file cấu hình

Mở terminal tại **thư mục gốc dự án** và chạy:

```powershell
cd backend
npm.cmd install
# Chỉ sao chép nếu chưa có .env; sau đó điền thông tin MySQL và JWT.
if (!(Test-Path .env)) { Copy-Item .env.example .env }
```

Tạo database `tour_management` trong MySQL nếu chưa có, dùng charset `utf8mb4`.
`database/database.sql` hiện trống; khởi tạo bảng bằng entity:

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

`db:sync` chỉ chạy khi database chưa có bảng. Nếu database đã có dữ liệu, dùng migration để cập nhật schema.
Cờ `--force` xóa toàn bộ bảng và dữ liệu, chỉ dùng khi chủ động muốn dựng lại database.
Các script database build vào `backend/dist-scripts`, tách khỏi bản build server trong `backend/dist`.

## Chạy project

Terminal backend:

```powershell
# Backend (watch mode) — http://localhost:3000/api
cd backend
npm.cmd run dev

# Website — http://localhost:5173
cd frontend
npm.cmd run dev

# Mobile — quét QR bằng Expo Go
cd mobile
npm.cmd start
```

---

## 4. Mở ứng dụng mobile

1. Chạy `npm.cmd run dev:mobile` ở thư mục gốc.
2. **Android:** mở Expo Go → quét QR trong terminal.
3. **iPhone:** đăng nhập Expo Go bằng cùng tài khoản Expo với CLI, mở Camera quét QR, cho phép truy cập **Mạng cục bộ** khi được hỏi.

Chi tiết xem [`mobile/README.md`](mobile/README.md:1).

---

## 5. Kiểm thử và build

```powershell
npm.cmd run check              # test + build + lint toàn bộ ba phần
npm.cmd run build              # build backend, frontend và kiểm tra export mobile
npm.cmd run check:integration  # test tích hợp backend (e2e, checkout, search)
npm.cmd test                   # test script tiện ích ở thư mục gốc
```

Chạy test riêng từng phần:

```powershell
npm.cmd run dev:mobile -- --reuse-api
```

Cài Expo Go tương thích SDK 57, kết nối điện thoại cùng Wi-Fi với máy tính rồi
quét QR. iPhone dùng Camera để mở liên kết bằng Expo Go; đăng nhập cùng tài khoản
Expo trên điện thoại và Expo CLI. Tạo tài khoản khách hàng trong app để đặt tour.

Nhấn `w` trong terminal Expo để xem bản mobile trên trình duyệt tại
http://localhost:8081. Dừng bằng `Ctrl+C`. Hướng dẫn quét QR, cấu hình API và
xử lý lỗi **could not connect to the server** có trong [mobile/README.md](mobile/README.md).

## Kiểm tra

Trong `backend`: `npm.cmd run build`, `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run test:e2e`.
E2e cần database đã được khởi tạo và kiểm tra các API công khai, xác thực và validation.

Trong `frontend`: `npm.cmd run build`, `npm.cmd test`.

Không sửa trực tiếp `backend/dist`: đây là mã sinh ra từ `backend/src` khi build.
