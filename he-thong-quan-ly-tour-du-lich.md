# XÂY DỰNG HỆ THỐNG QUẢN LÝ TOUR DU LỊCH

## 1. Giới thiệu đề tài

**Tên đề tài:** Xây dựng Hệ thống quản lý tour du lịch

### Mục tiêu

- Khảo sát hiện trạng hệ thống quản lý tour du lịch.
- Phân tích và thiết kế hệ thống theo hướng đối tượng.
- Xây dựng các biểu đồ UML cho hệ thống.
- Xây dựng ứng dụng Web quản lý tour du lịch.
- Quản lý tour, lịch trình, khách hàng và đơn đặt tour.
- Hỗ trợ phân quyền giữa khách hàng, nhân viên và quản trị viên.

---

## 2. Công nghệ sử dụng

| Thành phần | Công nghệ |
|---|---|
| Frontend | ReactJS + Vite |
| Giao diện | Bootstrap hoặc Tailwind CSS |
| Backend | Spring Boot (Java) |
| API | RESTful API |
| Database | MySQL |
| ORM | Spring Data JPA / Hibernate |
| Authentication | Spring Security + JWT |
| UML | StarUML / Draw.io |
| Quản lý mã nguồn | Git + GitHub |
| IDE | Visual Studio Code / IntelliJ IDEA |

### Kiến trúc hệ thống

```text
ReactJS Frontend
       │
       │ REST API / JSON
       ▼
Spring Boot Backend
       │
       │ JPA / Hibernate
       ▼
     MySQL
```

---

## 3. Cấu trúc thư mục

```text
tour-management/
│
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/
│   │   │   │   └── com.example.tourmanagement/
│   │   │   │       │
│   │   │   │       ├── TourManagementApplication.java
│   │   │   │       │
│   │   │   │       ├── config/
│   │   │   │       │   ├── SecurityConfig.java
│   │   │   │       │   └── CorsConfig.java
│   │   │   │       │
│   │   │   │       ├── controller/
│   │   │   │       │   ├── AuthController.java
│   │   │   │       │   ├── TourController.java
│   │   │   │       │   ├── BookingController.java
│   │   │   │       │   ├── CustomerController.java
│   │   │   │       │   └── AdminController.java
│   │   │   │       │
│   │   │   │       ├── service/
│   │   │   │       │   ├── AuthService.java
│   │   │   │       │   ├── TourService.java
│   │   │   │       │   ├── BookingService.java
│   │   │   │       │   └── CustomerService.java
│   │   │   │       │
│   │   │   │       ├── repository/
│   │   │   │       │   ├── UserRepository.java
│   │   │   │       │   ├── TourRepository.java
│   │   │   │       │   └── BookingRepository.java
│   │   │   │       │
│   │   │   │       ├── entity/
│   │   │   │       │   ├── User.java
│   │   │   │       │   ├── Tour.java
│   │   │   │       │   ├── TourSchedule.java
│   │   │   │       │   ├── Booking.java
│   │   │   │       │   ├── Customer.java
│   │   │   │       │   └── Payment.java
│   │   │   │       │
│   │   │   │       ├── dto/
│   │   │   │       │   ├── LoginRequest.java
│   │   │   │       │   ├── TourRequest.java
│   │   │   │       │   └── BookingRequest.java
│   │   │   │       │
│   │   │   │       └── security/
│   │   │   │           ├── JwtService.java
│   │   │   │           └── JwtAuthenticationFilter.java
│   │   │   │
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── data.sql
│   │   │
│   │   └── test/
│   │
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── TourCard.jsx
│   │   │   └── TourForm.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── Tours.jsx
│   │   │   ├── TourDetail.jsx
│   │   │   ├── Booking.jsx
│   │   │   ├── Login.jsx
│   │   │   └── AdminDashboard.jsx
│   │   │
│   │   ├── services/
│   │   │   └── api.js
│   │   │
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
├── docs/
│   ├── 01-khao-sat-he-thong/
│   │   ├── hien-trang.md
│   │   └── yeu-cau-he-thong.md
│   │
│   ├── 02-phan-tich/
│   │   ├── tac-nhan.md
│   │   ├── use-case.md
│   │   └── dac-ta-use-case.md
│   │
│   ├── 03-UML/
│   │   ├── use-case-diagram/
│   │   ├── class-diagram/
│   │   ├── sequence-diagram/
│   │   ├── activity-diagram/
│   │   ├── state-diagram/
│   │   └── component-diagram/
│   │
│   ├── 04-thiet-ke/
│   │   ├── database/
│   │   └── architecture/
│   │
│   └── images/
│
├── database/
│   ├── database.sql
│   └── sample-data.sql
│
├── README.md
└── .gitignore
```

---

## 4. Các chức năng chính

### 4.1. Khách hàng

- Đăng ký tài khoản.
- Đăng nhập.
- Xem danh sách tour.
- Tìm kiếm tour.
- Xem chi tiết tour.
- Xem lịch trình tour.
- Đặt tour.
- Xem lịch sử đặt tour.
- Hủy đơn đặt tour.

### 4.2. Nhân viên

- Đăng nhập hệ thống.
- Quản lý tour.
- Thêm, sửa, xóa tour.
- Quản lý lịch trình.
- Quản lý khách hàng.
- Xem danh sách booking.
- Xác nhận hoặc hủy booking.

### 4.3. Quản trị viên

- Quản lý tài khoản người dùng.
- Phân quyền người dùng.
- Quản lý tour.
- Quản lý khách hàng.
- Quản lý booking.
- Xem thống kê số lượng tour.
- Xem thống kê booking.
- Xem thống kê doanh thu.

---

## 5. Các đối tượng chính của hệ thống

Các lớp chính dự kiến:

```text
User
Customer
Tour
TourSchedule
Booking
Payment
```

### Quan hệ cơ bản

```text
User
 │
 ├── Customer
 │
 └── Admin / Staff

Customer
    │
    │ đặt
    ▼
  Booking
    │
    │ thuộc về
    ▼
   Tour
    │
    ▼
TourSchedule

Booking
    │
    ▼
 Payment
```

---

## 6. Phân tích hướng đối tượng

### Các tác nhân

1. **Khách hàng**
2. **Nhân viên**
3. **Quản trị viên**
4. **Hệ thống thanh toán** (nếu triển khai thanh toán online)

### Use Case chính

```text
Khách hàng
 ├── Đăng ký
 ├── Đăng nhập
 ├── Xem danh sách tour
 ├── Tìm kiếm tour
 ├── Xem chi tiết tour
 ├── Đặt tour
 ├── Thanh toán
 ├── Xem lịch sử booking
 └── Hủy booking

Nhân viên
 ├── Đăng nhập
 ├── Quản lý tour
 ├── Quản lý lịch trình
 ├── Quản lý khách hàng
 └── Quản lý booking

Admin
 ├── Quản lý tài khoản
 ├── Phân quyền
 ├── Quản lý tour
 ├── Quản lý booking
 └── Xem thống kê
```

---

## 7. Các biểu đồ UML

### 7.1. Biểu đồ tĩnh

#### Use Case Diagram

Mô tả các chức năng của hệ thống và sự tương tác giữa các tác nhân với hệ thống.

#### Class Diagram

Mô tả các lớp:

```text
User
Customer
Tour
TourSchedule
Booking
Payment
```

cùng với thuộc tính, phương thức và mối quan hệ giữa các lớp.

#### Component Diagram

Mô tả các thành phần:

```text
React Frontend
      │
      ▼
REST API
      │
      ▼
Spring Boot
      │
      ├── Authentication
      ├── Tour Management
      ├── Booking Management
      └── Customer Management
      │
      ▼
MySQL Database
```

#### Deployment Diagram

Mô tả môi trường triển khai:

```text
Client Browser
      │
      ▼
Web Server
      │
      ▼
Spring Boot Server
      │
      ▼
MySQL Server
```

---

### 7.2. Biểu đồ động

#### Activity Diagram

Các quy trình nên vẽ:

- Đăng nhập.
- Tìm kiếm tour.
- Đặt tour.
- Thanh toán.
- Quản lý tour.
- Xử lý booking.

#### Sequence Diagram

Các chức năng nên vẽ:

- Đăng nhập.
- Xem chi tiết tour.
- Đặt tour.
- Thanh toán.
- Nhân viên xác nhận booking.

Ví dụ quy trình đặt tour:

```text
Khách hàng
    │
    │ Chọn tour
    ▼
Frontend
    │
    │ Gửi yêu cầu đặt tour
    ▼
BookingController
    │
    ▼
BookingService
    │
    │ Kiểm tra số chỗ
    ▼
TourRepository
    │
    ▼
Database
    │
    │ Trả kết quả
    ▼
BookingService
    │
    ▼
Frontend
    │
    ▼
Thông báo đặt tour thành công
```

#### State Machine Diagram

Có thể xây dựng trạng thái cho **Booking**:

```text
PENDING
   │
   ▼
CONFIRMED
   │
   ├──────────────► CANCELLED
   │
   ▼
COMPLETED
```

---

## 8. Thiết kế cơ sở dữ liệu dự kiến

### Bảng users

```text
users
-------------------------
id
username
email
password
full_name
role
created_at
```

### Bảng customers

```text
customers
-------------------------
id
user_id
phone
address
```

### Bảng tours

```text
tours
-------------------------
id
name
description
destination
price
duration
max_people
image
status
created_at
```

### Bảng tour_schedules

```text
tour_schedules
-------------------------
id
tour_id
departure_date
return_date
departure_location
available_slots
```

### Bảng bookings

```text
bookings
-------------------------
id
customer_id
tour_id
schedule_id
number_of_people
total_price
status
booking_date
```

### Bảng payments

```text
payments
-------------------------
id
booking_id
amount
payment_method
payment_status
payment_date
```

---

## 9. Luồng hoạt động chính

### Luồng đặt tour

```text
Khách hàng
    ↓
Đăng nhập
    ↓
Xem danh sách tour
    ↓
Chọn tour
    ↓
Xem chi tiết
    ↓
Chọn lịch khởi hành
    ↓
Nhập số lượng người
    ↓
Kiểm tra số chỗ
    ↓
Tạo booking
    ↓
Thanh toán
    ↓
Xác nhận booking
    ↓
Hoàn tất
```

---

## 10. Phạm vi triển khai

Để đề tài dễ thực hiện, phiên bản đầu tiên nên tập trung vào:

- Quản lý tài khoản.
- Quản lý tour.
- Quản lý lịch trình.
- Quản lý khách hàng.
- Đặt tour.
- Quản lý booking.
- Phân quyền người dùng.
- Thống kê cơ bản.

Không bắt buộc triển khai các chức năng phức tạp như:

- AI đề xuất tour.
- Chatbot.
- GPS theo thời gian thực.
- Thanh toán ngân hàng thật.
- Ứng dụng mobile.

Nếu cần thanh toán, có thể mô phỏng trạng thái thanh toán trước, sau đó tích hợp cổng thanh toán ở giai đoạn mở rộng.

---

## 11. Công cụ vẽ UML

Có thể sử dụng một trong các công cụ:

- **StarUML**: phù hợp để xây dựng đầy đủ các biểu đồ UML.
- **Draw.io**: dễ sử dụng, miễn phí và thuận tiện cho báo cáo.
- **PlantUML**: phù hợp nếu muốn quản lý biểu đồ bằng code.

Khuyến nghị sử dụng **StarUML hoặc Draw.io** cho báo cáo.

---

## 12. Cấu trúc tài liệu báo cáo

```text
CHƯƠNG 1: KHẢO SÁT HỆ THỐNG
├── 1.1. Giới thiệu đề tài
├── 1.2. Khảo sát hiện trạng
├── 1.3. Các vấn đề của hệ thống hiện tại
└── 1.4. Đề xuất hệ thống mới

CHƯƠNG 2: PHÂN TÍCH HỆ THỐNG
├── 2.1. Xác định tác nhân
├── 2.2. Xác định yêu cầu chức năng
├── 2.3. Xác định yêu cầu phi chức năng
├── 2.4. Xác định các Use Case
└── 2.5. Đặc tả Use Case

CHƯƠNG 3: THIẾT KẾ UML
├── 3.1. Use Case Diagram
├── 3.2. Class Diagram
├── 3.3. Activity Diagram
├── 3.4. Sequence Diagram
├── 3.5. State Diagram
├── 3.6. Component Diagram
└── 3.7. Deployment Diagram

CHƯƠNG 4: THIẾT KẾ HỆ THỐNG
├── 4.1. Kiến trúc hệ thống
├── 4.2. Thiết kế cơ sở dữ liệu
├── 4.3. Thiết kế API
└── 4.4. Thiết kế giao diện

CHƯƠNG 5: XÂY DỰNG HỆ THỐNG
├── 5.1. Xây dựng Backend
├── 5.2. Xây dựng Frontend
├── 5.3. Kết nối cơ sở dữ liệu
├── 5.4. Xác thực và phân quyền
└── 5.5. Kiểm thử

CHƯƠNG 6: KẾT LUẬN
├── 6.1. Kết quả đạt được
├── 6.2. Hạn chế
└── 6.3. Hướng phát triển
```

---

## 13. Kết luận

Đề tài **Xây dựng Hệ thống quản lý tour du lịch** có phạm vi vừa phải và phù hợp để thực hiện theo hướng đối tượng.

Công nghệ đề xuất:

> **ReactJS + Spring Boot + MySQL + JPA/Hibernate + Spring Security/JWT + StarUML/Draw.io + GitHub**

Kiến trúc:

> **ReactJS → REST API → Spring Boot → JPA/Hibernate → MySQL**

Đây là cấu trúc phù hợp để vừa đáp ứng yêu cầu **khảo sát hiện trạng, phân tích thiết kế hướng đối tượng, xây dựng UML**, vừa có thể phát triển thành một sản phẩm Web hoàn chỉnh.
