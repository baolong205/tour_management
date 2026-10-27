import type { AssignmentStatus, AttendanceStatus } from '../../../common/enums/index.js';

export interface GuideAssignmentView {
  id: string;
  scheduleId: string;
  guideId: string;
  guideName: string | null;
  guideEmail: string | null;
  periodStart: string;
  periodEnd: string;
  status: AssignmentStatus;
  assignedBy: string | null;
  note: string | null;
  createdAt: Date;
}

export interface AttendanceView {
  id: string;
  checkpointId: string;
  passengerId: string;
  passengerName: string;
  status: AttendanceStatus;
  markedBy: string | null;
  markedAt: Date;
}

/** Bảng điểm danh của một checkpoint kèm thống kê nhanh. */
export interface CheckpointAttendanceBoard {
  checkpointId: string;
  checkpointName: string;
  dayNo: number;
  meetTime: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  /** Hành khách chưa được điểm danh. */
  unmarked: number;
  items: AttendanceView[];
}

export interface IncidentView {
  id: string;
  scheduleId: string;
  scheduleTourName: string | null;
  scheduleStartDate: string | null;
  description: string;
  extraCost: number;
  occurredAt: Date;
  reportedBy: string | null;
  reporterName: string | null;
  createdAt: Date;
}

/** Thống kê điểm danh gộp của cả lịch (mọi checkpoint). */
export interface AttendanceSummary {
  /** Số bản ghi điểm danh đã tạo (một khách có thể được điểm danh ở nhiều checkpoint). */
  total: number;
  present: number;
  absent: number;
  late: number;
  /** Số khách đi tour chưa có bất kỳ bản ghi điểm danh nào. */
  unmarked: number;
  /** Tổng số hành khách của các booking CONFIRMED/COMPLETED trong lịch. */
  travellers: number;
}

/** Tổng hợp vận hành một lịch khởi hành. */
export interface ScheduleOpsOverview {
  scheduleId: string;
  tourName: string;
  startDate: string;
  endDate: string;
  status: string;
  guides: GuideAssignmentView[];
  checkpoints: { id: string; name: string; dayNo: number; meetTime: string }[];
  attendanceSummary: AttendanceSummary;
  incidents: IncidentView[];
  totalExtraCost: number;
}
