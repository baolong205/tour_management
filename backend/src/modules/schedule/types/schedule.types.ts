/**
 * Kiểu dùng chung của module schedule, tách riêng để module `booking` import mà
 * không phải kéo theo service (tránh vòng phụ thuộc Nest).
 */

export interface ScheduleView {
  id: string;
  tourId: string;
  tourCode: string;
  tourName: string;
  startDate: string;
  endDate: string;
  priceAdult: number;
  priceChild: number;
  priceInfant: number;
  maxSeats: number;
  soldSeats: number;
  /** Tổng chỗ đang bị giữ bởi `seat_holds` còn hiệu lực. */
  heldSeats: number;
  /** `max_seats − sold_seats − held_seats`, không âm. */
  availableSeats: number;
  status: string;
  meetingPoint: string | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  checkpoints: CheckpointView[];
}

export interface CheckpointView {
  id: string;
  name: string;
  meetTime: string;
  dayNo: number;
  sortOrder: number;
}

export interface HoldView {
  holdId: string;
  scheduleId: string;
  seats: number;
  expiresAt: Date;
  /** Số giây còn lại – FE dùng để hiển thị đếm ngược. */
  expiresInSeconds: number;
  bookingId: string | null;
}

export interface SeatQuoteLine {
  type: 'ADULT' | 'CHILD' | 'INFANT';
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SeatQuote {
  scheduleId: string;
  lines: SeatQuoteLine[];
  subtotal: number;
  /** Số chỗ chiếm (em bé mặc định không chiếm chỗ). */
  seatCount: number;
  availableSeats: number;
  canBook: boolean;
}
