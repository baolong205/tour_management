/** Bản hiển thị của một bản ghi nhật ký thao tác. */
export interface AuditLogView {
  id: string;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  ip: string | null;
  createdAt: Date;
}

/** Bản hiển thị của banner trang chủ. */
export interface BannerView {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl: string | null;
  sortOrder: number;
  active: boolean;
  startAt: Date | null;
  endAt: Date | null;
  /** Còn hiển thị được ở thời điểm hiện tại? (active + trong khoảng thời gian). */
  visible: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Bản hiển thị của mẫu email. */
export interface EmailTemplateView {
  id: string;
  code: string;
  subject: string;
  bodyHtml: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Bản hiển thị của một cấu hình hệ thống. */
export interface SystemSettingView {
  key: string;
  value: unknown;
  description: string | null;
}