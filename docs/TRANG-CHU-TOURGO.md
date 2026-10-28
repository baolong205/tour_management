# Trang chủ TourGo

Trang chủ được chỉnh theo ảnh tham chiếu: header gọn, banner Hạ Long, khung tìm tour trên ảnh, năm tiện ích, năm tour nổi bật, sáu điểm đến và banner khám phá.

- Tour, giá, đánh giá và danh mục lấy từ API hiện tại; không tự tạo số lượt đặt, số tour hay giá giảm.
- Tìm kiếm hỗ trợ từ khóa, thành phố khởi hành và danh mục. Chưa thêm lọc ngày đi / số khách vì API danh sách tour chưa hỗ trợ các bộ lọc đó.
- Các thẻ điểm đến chuyển sang danh sách với bộ lọc `destination`.
- Banner khám phá không phải một chương trình giảm giá. Banner do quản trị cấu hình vẫn hiển thị qua `Banners`.
- Ảnh Hạ Long dùng ảnh minh họa sẵn trong dự án, không phải ảnh hoàng hôn chính xác trong tham chiếu. Nguồn ảnh nằm tại `frontend/public/images/credits.html`.
- CSS giới hạn ở trang chủ và header của trang chủ, không thay đổi bố cục Admin/STAFF.

Kiểm tra: chạy `npm test`, `npm run build` và `node scripts/verify-travel-ui.mjs` từ thư mục frontend. Kiểm tra trình duyệt cần frontend, backend, dữ liệu tour và Chrome đang sẵn sàng.