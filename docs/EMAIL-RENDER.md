# Gửi hóa đơn trên Render Free bằng Brevo HTTPS API

Backend hỗ trợ hai provider: `smtp` (mặc định, giữ cách chạy local) và `brevo` (HTTPS, không dùng cổng SMTP).
Không đổi người nhận: hóa đơn vẫn gửi tới email liên hệ được chụp vào hóa đơn khi phát hành.
Đính kèm vẫn là tài liệu HTML, không phải PDF.

## Kích hoạt

1. Đăng ký Brevo, hoàn tất các bước kích hoạt tài khoản mà dịch vụ yêu cầu.
2. Trong phần Senders, tạo và xác minh email người gửi. Nếu dùng tên miền riêng, hoàn tất xác thực domain theo hướng dẫn Brevo.
3. Tạo API key cho API gửi email (không phải SMTP password).
4. Push code mới lên GitHub. Trên Render Environment đặt:

```env
MAIL_ENABLED=true
MAIL_PROVIDER=brevo
MAIL_FROM=TourGo <dia-chi-da-xac-minh-cua-ban>
BREVO_API_KEY=api-key-cua-ban
```

Thay các giá trị minh họa bằng giá trị thật. Trong giao diện Render không cần dấu nháy bao quanh MAIL_FROM.
Không gửi key vào chat, không commit key, không đặt key ở Vercel/frontend/mobile.
Các biến SMTP cũ không được sử dụng khi chọn `brevo`; không cần đổi port để thử vượt hạn chế Render.
Chỉ bật MAIL_ENABLED sau khi đã cấu hình và xác minh sender. Lưu và deploy lại backend.

**Lưu ý:** thư PENDING từ trước có thể bắt đầu gửi khi bật mail. Không bật đồng thời worker local trỏ cùng database nếu không có chủ đích.
Thư FAILED sau khi hết 8 lần thử không tự được gửi lại. Không reset hàng loạt hoặc xóa hàng đợi để thử.

## Kiểm tra

Có thể thử riêng một email từ máy local, không cần thanh toán:
điền cấu hình trên vào `backend/.env`, rồi chạy trong thư mục backend:

```powershell
Set-Location 'D:\nam4\project\tour_management\backend'
npm.cmd run mail:test -- --to dia-chi-nhan-thu-that-cua-ban
```

Lệnh thử dùng cùng transport nhưng không chạy hàng đợi và không tạo giao dịch.
Sau khi deploy, tạo một đơn thử mới, thanh toán giả lập thành công, kiểm tra log Render và transactional email logs của Brevo.
Kiểm tra Inbox/Spam tại email liên hệ trong đơn, không nhất thiết là email đăng nhập.

- BREVO_HTTP_401: kiểm tra API key.
- BREVO_HTTP_400: kiểm tra sender đã xác minh, người nhận và cấu hình tài khoản trong Brevo logs.
- BREVO_HTTP_429: giới hạn tần suất/hạn mức; hàng đợi áp dụng retry hiện có, không retry vô hạn.
- BREVO_NETWORK_ERROR: timeout hoặc lỗi mạng; worker thử lại theo lịch.

SENT trong ứng dụng nghĩa là dịch vụ đã chấp nhận email, không đảm bảo thư đã vào Inbox. Xem delivered/bounced trong Brevo để xác nhận phát thư.
Render ngủ thì cron gửi mail cũng dừng, thư chờ chỉ được xử lý khi backend hoạt động lại.
HTTPS request có timeout 20 giây. Nếu nhà cung cấp nhận thư nhưng phản hồi bị mất, lần retry có khả năng gửi trùng; transport này không cam kết exactly-once.

Tài liệu chính thức:
`https://developers.brevo.com/reference/sendtransacemail`
`https://help.brevo.com/hc/en-us/articles/208836149-Create-a-new-sender-From-name-and-From-email-for-your-emails`
`https://render.com/docs/free`