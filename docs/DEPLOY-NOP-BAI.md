# Nộp TourGo: link website và APK Android

Không cần video, không cần đăng app lên cửa hàng. Website và APK dùng chung API/database.
**Chưa có deployment thật:** các file trong repo chỉ chuẩn bị cấu hình; cần đăng nhập tài khoản và cấp database trước.

## 1. Dịch vụ cần có

- GitHub và Vercel: bạn đã có.
- Render: backend, chọn **Free**.
- Database MySQL truy cập được từ Render, hỗ trợ TLS. Nếu thử TiDB Cloud Starter, phải chọn khu vực hỗ trợ FULLTEXT và chạy migration để xác nhận tương thích trước. Không coi TiDB là MySQL tương đương hoàn toàn.
- Cloudinary: lưu ảnh/chứng từ upload bền vững.
- Expo: build APK bằng profile `preview`, trong hạn mức miễn phí của tài khoản.

Kiểm tra gói miễn phí trong dashboard trước khi tạo dịch vụ; không bật trả phí hoặc nâng cấp tự động.
Không gửi mật khẩu, token, database password hay Cloudinary API secret vào chat/GitHub.

## 2. Chuẩn bị máy và GitHub

Dùng Node.js **24.x** như `.nvmrc`. Máy được kiểm tra đang dùng Node 22 nên cần đổi trước khi build chính thức.
Mở PowerShell tại thư mục gốc repo và chạy:

```powershell
Set-Location 'D:\nam4\project\tour_management'
node --version
npm.cmd ci --prefix backend
npm.cmd ci --prefix frontend
npm.cmd ci --prefix mobile
git status --short
```

Commit/push những thay đổi muốn deploy bằng VS Code Source Control. Không commit `.env`.
File `backend/test/migrations.integration.ts` đã có thay đổi từ trước, hãy kiểm tra riêng trước khi commit.

## 3. Database và Cloudinary

Tạo database cloud, lấy host, port, username, password, database name và CA nếu nhà cung cấp yêu cầu.
Không dùng database chỉ cho kết nối nội bộ nếu Render không truy cập được.

Trong Cloudinary lấy `cloud name`, `API key`, `API secret`. Chỉ đặt ba giá trị này ở backend.
Upload cloud trả URL tuyệt đối, tương thích field `path` đang được web/mobile lưu.
Xóa file cloud tự động chưa được triển khai: endpoint xóa chỉ xử lý file local; có thể dọn file cloud thủ công trong dashboard.

## 4. Vercel: website

1. **Add New Project**, import repository GitHub của bạn.
2. **Root Directory: `frontend`**, Framework: Vite, Node: **24.x**.
3. Build: `npm run build`; Output: `dist`.
4. Có thể deploy trước để lấy domain. Website lúc này chưa dùng được nghiệp vụ vì chưa nối API.
5. Ghi lại origin HTTPS chính xác của website, không có dấu `/` cuối.

File `frontend/vercel.json` đã có rewrite cho route React, không dùng Vite dev proxy trên production.

## 5. Render: API

1. Đăng nhập Render, tạo **Blueprint** từ repo GitHub đã push.
2. Dùng file `render.yaml` ở thư mục gốc; kiểm tra service có **plan free**.
3. Điền các giá trị được hỏi:

| Biến | Giá trị |
| --- | --- |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | Thông tin database cloud |
| `DB_SSL` | `true` |
| `DB_SSL_CA` | Thêm PEM CA nếu nhà cung cấp yêu cầu; có thể dùng `\n` cho xuống dòng |
| `CORS_ORIGIN` | Origin website Vercel, không kèm đường dẫn; nhiều origin ngăn bằng dấu phẩy |
| `APP_PUBLIC_URL`, `PUBLIC_BASE_URL` | Origin HTTPS API Render, không thêm `/api` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | Từ Cloudinary |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Tài khoản admin riêng để nộp; chọn mật khẩu mạnh |

Render hiển thị domain service trong dashboard. Nếu chưa biết khi tạo Blueprint, cập nhật hai biến public URL sau khi service được tạo rồi redeploy.
JWT và khóa thanh toán giả lập được sinh tự động. Không thay các khóa đó sau mỗi lần deploy.

Start command tự chạy migration **không xóa bảng**, phục hồi ảnh mẫu từ repo, sau đó bật API.
Nếu migration lỗi, xem log và dừng tại đây; không dùng `db:sync -- --force` để né lỗi.
API chỉ được coi là triển khai xong khi `/api/health` trả `status: ok`.

Render Free có thể ngủ và lần mở lại chậm; job định kỳ không chạy khi server ngủ.
`MAIL_ENABLED=false` mặc định để chưa gửi thư khi chưa có thông tin dịch vụ.
Để gửi hóa đơn trên Render Free, làm theo `docs/EMAIL-RENDER.md`: cấu hình Brevo HTTPS API, xác minh người gửi rồi bật mail.
Không đánh dấu email là đã gửi khi đang tắt mail.
Thanh toán vẫn là **giả lập**, không phải thanh toán tiền thật.

## 6. Seed database cloud từ máy bạn

Render Free không cần shell: chạy seed từ máy cá nhân qua kết nối TLS tới database cloud.
Sao lưu `backend/.env` hiện có ngoài repo trước khi đổi. Điền database cloud, `DB_SSL=true`, CA nếu có và đúng `ADMIN_EMAIL`/`ADMIN_PASSWORD` của Render.
Seed là thao tác ghi dữ liệu: chỉ chạy trên database dành cho bài nộp, không chạy nhầm database khác.

```powershell
Set-Location 'D:\nam4\project\tour_management\backend'
npm.cmd run db:check
npm.cmd run db:migrate
npm.cmd run db:seed:demo
```

Các seed hiện có giữ dữ liệu đã tồn tại thay vì xóa sạch database. Nếu email admin đã tồn tại, seed không đặt lại mật khẩu.
Seed ảnh sử dụng file trong `frontend/public/images`, nên cần giữ nguyên cấu trúc repo.
Sau khi xong, khôi phục `.env` local nếu muốn tiếp tục phát triển trên MySQL máy bạn.

## 7. Nối website với API

Trong Vercel → Project → Settings → Environment Variables, thêm `VITE_API_BASE_URL`:
giá trị là origin HTTPS API Render cộng `/api`, không phải địa chỉ localhost.
Áp dụng cho Production, rồi **Redeploy**. Vite đóng gói giá trị lúc build, thay biến mà không redeploy sẽ chưa có tác dụng.
Đảm bảo `CORS_ORIGIN` trên Render khớp domain website thực tế, không dùng wildcard khi gửi credentials.

## 8. Build APK bằng tài khoản Expo

Mở PowerShell:

```powershell
Set-Location 'D:\nam4\project\tour_management\mobile'
npx.cmd eas-cli@latest login
npx.cmd eas-cli@latest init
```

Đây là bước tương tác do chủ tài khoản thực hiện. Với dynamic config, lấy UUID project thật từ Expo và đặt vào `extra.eas.projectId` trong `mobile/app.json`, hoặc dùng biến `EAS_PROJECT_ID`. Không tự bịa UUID.

Trong Expo dashboard → Project settings → Environment variables, tạo:

- Environment **preview**.
- Tên `EXPO_PUBLIC_API_URL`, giá trị API HTTPS Render có `/api`.
- Visibility **plaintext**. Đây là địa chỉ công khai, không phải secret.
- Nếu dùng `EAS_PROJECT_ID`, đặt cùng UUID ở môi trường preview và terminal local.

Đặt cùng API URL vào `mobile/.env` theo `mobile/.env.example`, rồi chạy:

```powershell
npm.cmd run api:check
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npx.cmd eas-cli@latest build --platform android --profile preview
```

Khi Expo hỏi tạo Android keystore cho project mới, có thể cho EAS tạo và quản lý. Giữ keystore để cập nhật bản cài sau này.
Profile `preview` đã cấu hình APK. Build này từ chối URL HTTP, localhost và một số dải LAN phổ biến để tránh nộp nhầm bản chỉ chạy trên máy bạn.
Sau khi build thành công, tải APK từ trang build Expo, cài trên Android thật và thử bằng 4G/5G.
APK không cài trên iPhone. Không cần đăng lên Google Play để cài trực tiếp trên Android.

## 9. Những thứ gửi giảng viên

- Link website Production Vercel.
- File `TourGo.apk` hoặc link tải APK.
- Tài khoản khách hàng và admin/nhân viên đã thử đăng nhập thành công.

Tạo tài khoản khách hàng trên website/app, dùng admin cấp role nhân viên nếu cần. Không công khai mật khẩu admin trong repo.
Trước khi nộp: kiểm tra refresh trang chi tiết tour không 404, login, đặt tour, thanh toán giả lập, upload chứng từ và quản lý đơn; chạy lại sau khi backend ngủ/khởi động lại.

## Kết quả kiểm tra local ngày 20/11/2026

- Backend: 191/191 unit test đạt; build API và script database đạt; lint không lỗi, còn 5 cảnh báo ở code hiện có.
- Tooling: 8/8 test đạt, gồm kiểm tra URL APK và rewrite Vercel.
- Mobile: 17/17 test đạt, typecheck và lint đạt; export Android/iOS/web báo hoàn tất. Export không phải file APK.
- Frontend: build và lint đạt; test đạt 58/59. Test ảnh hiện yêu cầu 6 mục nhưng manifest có 15; một số nguồn ảnh có `ID_...` chưa xác minh. Chưa sửa metadata hay làm yếu test để che vấn đề này.
- Môi trường kiểm tra local dùng Node 22.20.0, chưa xác nhận chạy trên Node 24 tại máy này.
- Chưa chạy migration trên database cloud, chưa upload Cloudinary thật, chưa deploy Vercel/Render, chưa build/cài APK qua EAS.

## Tài liệu dịch vụ chính thức

- Vercel: `https://vercel.com/docs/frameworks/frontend/vite`
- Render: `https://render.com/docs/blueprint-spec`, `https://render.com/docs/free`
- TiDB compatibility: `https://docs.pingcap.com/tidbcloud/compatibility/`
- Cloudinary: `https://cloudinary.com/documentation/upload_images`
- Expo APK: `https://docs.expo.dev/build-reference/apk/`
- Expo environments: `https://docs.expo.dev/eas/environment-variables/`