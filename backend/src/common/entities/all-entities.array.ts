import type { EntitySchema, MixedList } from 'typeorm';

// users
import { AuthToken } from '../../modules/users/entities/auth-token.entity.js';
import { GuideProfile } from '../../modules/users/entities/guide-profile.entity.js';
import { Permission } from '../../modules/users/entities/permission.entity.js';
import { Role } from '../../modules/users/entities/role.entity.js';
import { User } from '../../modules/users/entities/user.entity.js';

// catalog
import { CancelPolicyRule } from '../../modules/catalog/entities/cancel-policy-rule.entity.js';
import { CancelPolicy } from '../../modules/catalog/entities/cancel-policy.entity.js';
import { Category } from '../../modules/catalog/entities/category.entity.js';
import { Destination } from '../../modules/catalog/entities/destination.entity.js';
import { Favorite } from '../../modules/catalog/entities/favorite.entity.js';
import { ItineraryDay } from '../../modules/catalog/entities/itinerary-day.entity.js';
import { TourDestination } from '../../modules/catalog/entities/tour-destination.entity.js';
import { TourImage } from '../../modules/catalog/entities/tour-image.entity.js';
import { Tour } from '../../modules/catalog/entities/tour.entity.js';

// schedule
import { DepartureSchedule } from '../../modules/schedule/entities/departure-schedule.entity.js';
import { ScheduleCheckpoint } from '../../modules/schedule/entities/schedule-checkpoint.entity.js';
import { SeatHold } from '../../modules/schedule/entities/seat-hold.entity.js';

// supplier
import { ResourceAssignment } from '../../modules/supplier/entities/resource-assignment.entity.js';
import { Supplier } from '../../modules/supplier/entities/supplier.entity.js';

// promotion
import { Promotion } from '../../modules/promotion/entities/promotion.entity.js';

// booking
import { Booking } from '../../modules/booking/entities/booking.entity.js';
import { CancelRequest } from '../../modules/booking/entities/cancel-request.entity.js';
import { Invoice } from '../../modules/booking/entities/invoice.entity.js';
import { Passenger } from '../../modules/booking/entities/passenger.entity.js';

// payment
import { PaymentEvent } from '../../modules/payment/entities/payment-event.entity.js';
import { Payment } from '../../modules/payment/entities/payment.entity.js';
import { Refund } from '../../modules/payment/entities/refund.entity.js';

// operations
import { Attendance } from '../../modules/operations/entities/attendance.entity.js';
import { GuideAssignment } from '../../modules/operations/entities/guide-assignment.entity.js';
import { Incident } from '../../modules/operations/entities/incident.entity.js';

// review
import { Review } from '../../modules/review/entities/review.entity.js';

// notification
import { Notification } from '../../modules/notification/entities/notification.entity.js';

// system
import { AuditLog } from '../../modules/system/entities/audit-log.entity.js';
import { Banner } from '../../modules/system/entities/banner.entity.js';
import { EmailTemplate } from '../../modules/system/entities/email-template.entity.js';
import { SystemSetting } from '../../modules/system/entities/system-setting.entity.js';
import { SupportTicket } from '../../modules/support/support.entity.js';

/**
 * 36 entity của hệ thống, theo đúng thứ tự "cha trước con" cho dễ đọc.
 * Thứ tự này không ảnh hưởng tới việc tạo bảng (TypeORM tự sắp xếp theo FK).
 *
 * Lưu ý: 3 bảng nối do `@JoinTable` sinh ra (user_roles, role_permissions,
 * tour_categories) không nằm trong danh sách này nhưng vẫn được TypeORM
 * tạo metadata và migration → tổng cộng 39 bảng trong DB.
 */
export const ALL_ENTITIES_ARRAY = [
  // định danh & phân quyền
  User,
  Role,
  Permission,
  AuthToken,
  GuideProfile,
  Notification,
  Favorite,
  AuditLog,

  // catalog
  CancelPolicy,
  CancelPolicyRule,
  Tour,
  Category,
  Destination,
  TourDestination,
  TourImage,
  ItineraryDay,

  // lịch & vận hành
  DepartureSchedule,
  SeatHold,
  ScheduleCheckpoint,
  Supplier,
  ResourceAssignment,
  GuideAssignment,
  Incident,
  Attendance,

  // booking & thanh toán
  Promotion,
  Booking,
  Passenger,
  Payment,
  PaymentEvent,
  CancelRequest,
  Refund,
  Invoice,
  Review,

  // nội dung hệ thống
  Banner,
  EmailTemplate,
  SystemSetting,
  SupportTicket,
] satisfies MixedList<Function | string | EntitySchema>;