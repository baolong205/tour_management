# Thanh toán TourGo

Trang thanh toán đồng bộ với trang đặt tour: tiến trình ba bước, thẻ lựa chọn phương thức, thông tin ngân hàng và lịch sử giao dịch bên trái; tóm tắt tour và số tiền còn phải trả bên phải. Mobile chuyển một cột.

## Giới hạn và hành vi

- Chỉ hiện tạo giao dịch khi API trả bookingStatus `PENDING_PAYMENT` và outstanding lớn hơn 0.
- Tạo giao dịch chỉ gửi bookingId và method; không gửi số tiền từ trình duyệt.
- Chuyển khoản nhận đường dẫn ảnh chứng từ, chưa hỗ trợ tải tệp hoặc VietQR. Ngân hàng chỉ hiển thị khi có đủ tên ngân hàng, chủ tài khoản và số tài khoản từ public-info; không tạo tài khoản minh họa.
- Gửi chứng từ chuyển sang chờ nhân viên đối chiếu, không coi là thanh toán thành công.
- VNPay/MoMo là giả lập. Thực hiện giao dịch giả lập yêu cầu xác nhận rõ ràng, không mở cổng thanh toán thật.
- Cảnh báo nếu đã có giao dịch đang chờ để hạn chế thanh toán trùng; backend vẫn quyết định tạo giao dịch và trạng thái.
- Hiển thị tiền đã nhận, tiền hoàn, còn phải trả riêng biệt theo API. Không suy trạng thái xác nhận đơn từ việc đã thu đủ tiền.
- Không thay đổi backend, phân quyền hoặc workspace Admin/STAFF.

## Kiểm tra

Từ frontend: `npm test`, `npm run build`, `node scripts/verify-travel-ui.mjs`.
Browser fixture kiểm tra lựa chọn phương thức, thiếu cấu hình ngân hàng, payload không có amount, gửi chứng từ chờ duyệt, đồng ý/hủy giả lập, ghi nhận thanh toán, đơn đã đóng, lỗi API/thử lại và không tràn ngang desktop/390px/320px. Các giao dịch kiểm thử chỉ nằm trong trình duyệt, không ghi database hay thu tiền thật.