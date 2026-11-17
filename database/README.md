# Database TourGo

Schema được quản lý trong `backend/src/database/migrations/`, dữ liệu mẫu được
quản lý bởi `backend/scripts/seed*.ts`.

Chạy trong `backend/`:

```powershell
npm.cmd run db:migrate
npm.cmd run db:seed
```

Xem [hướng dẫn database](../docs/DATABASE.md) cho cài mới, nâng cấp và kiểm thử.
Các file SQL trống và script SQL hỗ trợ thủ công trước đây đã được thay bằng
migration; không cần import file SQL từ thư mục này.
