# Rà soát chữ tiếng Việt trên mobile — 17/11/2026

Lỗi dấu bị tách trong các từ như “chuyến” và “tiếp tục” xuất hiện khi bản
mobile web dùng Georgia trên Windows. Chrome phải chuyển sang Times New Roman
cho một số ký tự có dấu ngay trong cùng từ. Font tiêu đề web trong
`mobile/src/theme.ts` đã được đổi sang `"Times New Roman", serif`; mọi màn hình
dùng chung cấu hình này.

## Phạm vi kiểm tra

- Rà soát 36 file TypeScript/TSX: 92 khai báo `fontFamily` đều lấy từ `fonts`
  trong theme; không có khai báo giãn chữ âm.
- Mở đủ 14 trang trên Chrome Windows: trang chủ, khám phá, đăng nhập, yêu thích,
  danh sách đơn, thông báo, tài khoản, chi tiết tour, đặt tour, chi tiết đơn,
  thanh toán, hỗ trợ, đánh giá và trang không tìm thấy.
- Mở thêm đăng ký, bộ lọc, sửa hồ sơ, đổi mật khẩu, chọn lịch khởi hành,
  chọn ngày sinh, chọn ưu đãi, yêu cầu hủy và phản hồi hỗ trợ.
- Tổng cộng 46 lượt kiểm tra tại viewport 1440×1000 và 390×1000.

Dữ liệu API được giả lập riêng trong trình duyệt với tên người, tên tour và nội
dung tiếng Việt có nhiều dấu; không tạo đơn, gửi email hoặc sửa dữ liệu thật.
Kiểm tra các phần tử chữ, font thực tế do Chrome sử dụng, giãn chữ và ảnh chụp
màn hình, gồm tiêu đề nghiêng, tên hành khách, lịch, thông báo và biểu mẫu.

## Kết quả

Không còn thấy lỗi tách dấu tương tự trong phạm vi trên. Các tiêu đề không dùng
Georgia hoặc giãn chữ âm; nội dung và các trường nhập dùng font chung của theme.
`npm.cmd run typecheck` và `npm.cmd run lint` trong `mobile/` đều thành công.

Đây là kiểm tra bản web trên Windows, gồm mô phỏng chiều rộng điện thoại;
không phải kết quả kiểm thử trên thiết bị Android/iPhone thật. Font native
Android/iOS giữ cấu hình hiện tại.
