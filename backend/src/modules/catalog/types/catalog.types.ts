/**
 * Kiểu dùng chung trong module catalog.
 *
 * Đặt riêng để module `booking` import được mà không phải phụ thuộc vào file DTO
 * hay entity cụ thể của catalog.
 */

/** Một dòng ảnh đã chuẩn hóa để trả cho client (không kèm `tourId` thừa). */
export interface TourImageView {
  id: string;
  url: string;
  publicId: string | null;
  isCover: boolean;
  sortOrder: number;
}

export interface TourDestinationView {
  destinationId: string;
  name: string;
  slug: string;
  latitude: number | null;
  longitude: number | null;
  sortOrder: number;
}

export interface ItineraryDayView {
  id: string;
  dayNo: number;
  title: string;
  content: string | null;
  meals: string | null;
}

export interface CategoryView {
  id: string;
  name: string;
  slug: string;
}

export interface CancelPolicyRuleView {
  daysBefore: number;
  feePercent: number;
}

export interface CancelPolicyView {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  rules: CancelPolicyRuleView[];
}

/** Tour dạng rút gọn cho danh sách (kèm ảnh bìa + giá thấp nhất). */
export interface TourSummaryView {
  id: string;
  code: string;
  slug: string;
  name: string;
  summary: string | null;
  durationDays: number;
  durationNights: number;
  departureCity: string | null;
  status: string;
  avgRating: number;
  reviewCount: number;
  coverImageUrl: string | null;
  /** Giá người lớn thấp nhất trong các lịch khởi hành còn mở bán; null nếu chưa có lịch. */
  fromPrice: number | null;
  categories: CategoryView[];
}

/** Tour dạng đầy đủ cho trang chi tiết / màn hình quản trị. */
export interface TourDetailView extends Omit<TourSummaryView, 'coverImageUrl'> {
  description: string | null;
  cancelPolicy: CancelPolicyView | null;
  images: TourImageView[];
  destinations: TourDestinationView[];
  itinerary: ItineraryDayView[];
  createdAt: Date;
  updatedAt: Date;
}

/** Kết quả tính phí hủy, kèm dữ liệu để chụp vào `cancel_requests.policy_snapshot`. */
export interface CancellationFeeQuote {
  policyId: string;
  policyName: string;
  rules: CancelPolicyRuleView[];
  /** `YYYY-MM-DD` */
  startDate: string;
  feePercent: number;
  fee: number;
  refund: number;
  matchedDaysBefore: number | null;
}
