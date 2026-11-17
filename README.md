# TourGo — Hệ thống quản lý tour du lịch

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
npm.cmd run setup
```

Lệnh này sẽ:

- Cài dependencies cho cả `backend`, `frontend`, `mobile`.
- Tạo `backend/.env` từ [`backend/.env.example`](backend/.env.example:1) với `JWT_SECRET`, `JWT_REFRESH_SECRET`, `PAYMENT_MOCK_SECRET` ngẫu nhiên (giữ nguyên nếu file đã tồn tại).
- Tạo `frontend/.env` từ [`frontend/.env.example`](frontend/.env.example:1).

### Bước 2 — Cấu hình MySQL

Mở [`backend/.env`](backend/.env:1) và điền thông tin MySQL trên máy bạn:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=mat_khau_mysql_cua_ban
DB_DATABASE=tour_management
DB_SYNCHRONIZE=false
```

Nếu MySQL không đặt mật khẩu, để trống `DB_PASSWORD`.

Tạo database nếu chưa có (MySQL Workbench hoặc MySQL CLI):

```sql
CREATE DATABASE IF NOT EXISTS tour_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### Bước 3 — Khởi tạo bảng và dữ liệu mẫu

Từ thư mục gốc:

```powershell
cd backend
npm.cmd run db:check
npm.cmd run db:sync
npm.cmd run db:seed
npm.cmd run db:seed:tours
npm.cmd run db:seed:images
npm.cmd run db:seed:promotions
npm.cmd run db:seed:destinations
cd ..
```

| Lệnh | Tác dụng |
| --- | --- |
| `db:check` | Kiểm tra kết nối và trạng thái schema |
| `db:sync` | Tạo bảng từ entity — **chỉ chạy khi database còn trống** |
| `db:seed` | Upsert permission, role và tài khoản admin |
| `db:seed:tours` | Thêm tour DEMO |
| `db:seed:images` | Gắn ảnh tour vào DB và thư mục `uploads` |
| `db:seed:promotions` | Thêm 10 mã ưu đãi |
| `db:seed:destinations` | Liên kết điểm đến cho tour demo |

> Nếu database đã có bảng, **bỏ qua `db:sync`**; khi cần cập nhật schema dùng `npm.cmd run db:migrate`.

### Bước 4 — Tài khoản demo để đăng nhập

**Quản trị viên (ADMIN)** — tài khoản mặc định do `db:seed` tạo, đổi qua `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME` trong `.env`:

```
email:    admin@tour.local
password: Admin@123456
đăng nhập: http://localhost:5173/#/admin/login  →  khu vực quản trị #/admin
```

**Nhân viên demo (STAFF)** — tài khoản đã có trong database demo:

```
email:    demo-staff-21cf99eb@example.test
password: Admin@123456
đăng nhập: http://localhost:5173/#/staff/login  →  khu vực nghiệp vụ #/staff
```

**Khách hàng (CUSTOMER)** — không có tài khoản mẫu; tự đăng ký tại `http://localhost:5173/#/login` (mật khẩu tối thiểu 8 ký tự, có chữ hoa, chữ thường và số).

> Tài khoản STAFF demo không phải tài khoản mặc định được tạo trên mọi database — nếu đăng nhập thất bại, dùng tài khoản Admin để tạo nhân viên mới tại **Nhân viên & vai trò**. Không chạy lại `db:sync` để xử lý lỗi đăng nhập vì lệnh này có thể xóa dữ liệu. Mật khẩu trên đây là mật khẩu của database demo hiện tại; nếu bạn đã đổi mật khẩu thì dùng mật khẩu mới. Chi tiết xem [`docs/HUONG-DAN-DANG-NHAP.md`](docs/HUONG-DAN-DANG-NHAP.md:1).

---

## 3. Chạy dự án

Từ **thư mục gốc**, chọn một trong các lệnh sau:

```powershell
npm.cmd run dev          # backend + website + mobile
npm.cmd run dev:web      # backend + website
npm.cmd run dev:mobile   # backend + mobile (Expo)
```

Script tự động:

- Khởi động backend và chờ đến khi endpoint `/api/health` sẵn sàng.
- Chạy website tại `http://localhost:5173`.
- Chạy Expo tại `http://localhost:8081` và tự chọn IP LAN để truyền địa chỉ API cho mobile.

Nếu backend **đã chạy ở terminal khác**, thêm cờ `--reuse-api`:

```powershell
npm.cmd run dev:web -- --reuse-api
```

Nhấn `Ctrl+C` để dừng các dịch vụ do phiên đó khởi động.

### Chạy riêng từng phần

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
cd backend  && npm.cmd test    # vitest
cd frontend && npm.cmd test    # node --test
cd mobile   && npm.cmd test    # node --test
```

---

## 6. Cấu hình bổ sung

Các biến quan trọng trong [`backend/.env`](backend/.env:1):

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `PORT` | `3000` | Cổng backend |
| `API_PREFIX` | `api` | Tiền tố đường dẫn API |
| `CORS_ORIGIN` | `http://localhost:5173,http://localhost:8081` | Origin được phép |
| `RESPONSE_ENVELOPE` | `false` | Bọc response thành `{ success, data, ... }` |
| `MAIL_ENABLED` | `false` | Bật gửi email xác nhận thanh toán qua SMTP |
| `UPLOAD_DIR` | `uploads` | Thư mục lưu tệp tải lên |

Cấu hình frontend trong [`frontend/.env`](frontend/.env:1):

| Biến | Mặc định | Ý nghĩa |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `/api` | Đường dẫn API phía client |
| `API_PROXY_TARGET` | `http://localhost:3000` | Backend đích cho Vite proxy (dev) |
| `API_PROXY_PREFIX` | `/api` | Tiền tố proxy |

Cấu hình mobile trong `mobile/.env` (tùy chọn — `dev:mobile` tự điền):

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.10:3000/api
```

---

## 7. Xử lý sự cố thường gặp

| Hiện tượng | Cách xử lý |
| --- | --- |
| `Thiếu backend/.env` | Chạy `npm.cmd run setup` rồi điền cấu hình MySQL |
| `Thiếu dependencies của ...` | Chạy `npm.cmd run setup` |
| `Cổng API 3000 đang được dùng` | Dừng backend cũ hoặc thêm `-- --reuse-api` |
| `Cổng 5173/8081 đang được dùng` | Dừng phiên web/Metro cũ trước khi chạy lại |
| `Backend chưa sẵn sàng sau 90 giây` | Kiểm tra MySQL đang chạy và log backend |
| Mobile không kết nối API | Đảm bảo điện thoại cùng Wi-Fi; đổi Wi-Fi thì chạy lại `dev:mobile` để tạo QR mới |
| Không đăng nhập được tài khoản STAFF demo | Tài khoản demo không có trên mọi database; dùng Admin tạo nhân viên mới. **Không** chạy `db:sync` để sửa lỗi đăng nhập vì có thể xóa dữ liệu |

---

## 8. Tài liệu liên quan

- [`backend/README.md`](backend/README.md:1) — xác thực, phân quyền, bảo mật, seed.
- [`frontend/README.md`](frontend/README.md:1) — chức năng website, hiệu ứng, triển khai.
- [`mobile/README.md`](mobile/README.md:1) — hướng dẫn chi tiết ứng dụng di động.
- [`docs/HUONG-DAN-DANG-NHAP.md`](docs/HUONG-DAN-DANG-NHAP.md:1) — hướng dẫn đăng nhập theo vai trò ADMIN / STAFF / CUSTOMER.
- [`docs/`](docs/FEATURE-CHECKLIST.md:1) — checklist tính năng và tài liệu nghiệp vụ.
- [`database/`](database/tour_management_users.sql:1) — script SQL tham chiếu schema.
