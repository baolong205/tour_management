# Khám phá tour — TourGo

Trang danh sách tour dùng nền xanh nhạt, banner có đường dẫn và gợi ý điểm đến, bộ lọc bên trái và lưới ba thẻ tour trên desktop. Mobile dùng nút hiện/ẩn bộ lọc và danh sách một cột.

Ảnh tham chiếu chỉ đọc được phần header. Nội dung bên dưới được thiết kế đồng bộ với trang chủ TourGo; không khẳng định khớp các ảnh nội dung bị lỗi.

## Chức năng

- Lọc theo từ khóa, điểm đến, thành phố khởi hành, giá, số ngày và danh mục API hiện có.
- Áp dụng toàn bộ bộ lọc bằng nút; danh mục dùng radio, không tự gửi khi đang nhập điều kiện khác.
- Kiểm tra giá tối thiểu/tối đa và số ngày tối thiểu/tối đa; số ngày từ 1 đến 365.
- Các nhãn bộ lọc có thể xóa riêng; xóa tất cả giữ đường dẫn về danh sách mặc định.
- Sắp xếp và phân trang giữ các điều kiện trên URL.
- Có trạng thái tải, lỗi/thử lại, không có kết quả và nút xóa bộ lọc.
- Giá, tổng số tour, đánh giá lấy từ API; không tạo giá giảm hoặc số liệu giả.
- Không thêm mục Ưu đãi/Blog chưa có trang chức năng. Không thay đổi phân quyền hoặc workspace Admin/STAFF.

## Xác minh

Chạy từ frontend: `npm test`, `npm run build`, `node scripts/verify-travel-ui.mjs`.
Browser smoke kiểm tra khoảng giá sai, áp dụng/xóa điều kiện, sắp xếp, kết quả rỗng, mở/đóng bộ lọc mobile, không tràn ngang ở 390px/320px, và các luồng UI đã có.