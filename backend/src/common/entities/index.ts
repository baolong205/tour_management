/**
 * Barrel export của toàn bộ entity – dùng khi cần khai báo `entities: [...]`
 * trong một `DataSource` độc lập (CLI migration/seed, script kiểm tra metadata).
 * Ứng dụng Nest đã bật `autoLoadEntities: true` nên không cần import ở đây.
 */
export * from './base.entity.js';
export * from './soft-deletable.entity.js';

// users
export * from '../../modules/users/entities/auth-token.entity.js';
export * from '../../modules/users/entities/guide-profile.entity.js';
export * from '../../modules/users/entities/permission.entity.js';
export * from '../../modules/users/entities/role.entity.js';
export * from '../../modules/users/entities/user.entity.js';

// catalog
export * from '../../modules/catalog/entities/cancel-policy-rule.entity.js';
export * from '../../modules/catalog/entities/cancel-policy.entity.js';
export * from '../../modules/catalog/entities/category.entity.js';
export * from '../../modules/catalog/entities/destination.entity.js';
export * from '../../modules/catalog/entities/favorite.entity.js';
export * from '../../modules/catalog/entities/itinerary-day.entity.js';
export * from '../../modules/catalog/entities/tour-destination.entity.js';
export * from '../../modules/catalog/entities/tour-image.entity.js';
export * from '../../modules/catalog/entities/tour.entity.js';

// schedule
export * from '../../modules/schedule/entities/departure-schedule.entity.js';
export * from '../../modules/schedule/entities/schedule-checkpoint.entity.js';
export * from '../../modules/schedule/entities/seat-hold.entity.js';

// supplier
export * from '../../modules/supplier/entities/resource-assignment.entity.js';
export * from '../../modules/supplier/entities/supplier.entity.js';

// promotion
export * from '../../modules/promotion/entities/promotion.entity.js';

// booking
export * from '../../modules/booking/entities/booking.entity.js';
export * from '../../modules/booking/entities/cancel-request.entity.js';
export * from '../../modules/booking/entities/invoice.entity.js';
export * from '../../modules/booking/entities/passenger.entity.js';

// payment
export * from '../../modules/payment/entities/payment-event.entity.js';
export * from '../../modules/payment/entities/payment.entity.js';
export * from '../../modules/payment/entities/refund.entity.js';

// operations
export * from '../../modules/operations/entities/attendance.entity.js';
export * from '../../modules/operations/entities/guide-assignment.entity.js';
export * from '../../modules/operations/entities/incident.entity.js';

// review
export * from '../../modules/review/entities/review.entity.js';

// notification
export * from '../../modules/notification/entities/notification.entity.js';

// system
export * from '../../modules/system/entities/audit-log.entity.js';
export * from '../../modules/system/entities/banner.entity.js';
export * from '../../modules/system/entities/email-template.entity.js';
export * from '../../modules/system/entities/system-setting.entity.js';