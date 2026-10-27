import type { ReviewStatus } from '../../../common/enums/index.js';

/**
 * Bản hiển thị của đánh giá trả về cho client.
 *
 * Kèm thông tin tour (tên) và người viết (tên) để FE hiển thị danh sách đánh giá
 * mà không phải gọi thêm API.
 */
export interface ReviewView {
  id: string;
  bookingId: string;
  tourId: string;
  tourName: string | null;
  userId: string;
  userName: string | null;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  moderatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Điểm đánh giá tổng hợp của một tour (dùng cho trang chi tiết tour). */
export interface TourRatingSummary {
  tourId: string;
  avgRating: number;
  reviewCount: number;
  /** Số lượng theo từng mức sao (1..5) – chỉ tính review đang VISIBLE. */
  distribution: Record<number, number>;
}