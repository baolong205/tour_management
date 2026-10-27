import type { ResourceType, SupplierType } from '../../../common/enums/index.js';

/** Bản hiển thị của nhà cung cấp. */
export interface SupplierView {
  id: string;
  type: SupplierType;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  meta: Record<string, unknown> | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Bản hiển thị của phân bổ nguồn lực cho một lịch khởi hành. */
export interface ResourceAssignmentView {
  id: string;
  scheduleId: string;
  supplierId: string;
  supplierName: string | null;
  supplierType: SupplierType | null;
  type: ResourceType;
  quantity: number;
  cost: number | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Tổng hợp chi phí nguồn lực của một lịch. */
export interface ScheduleResourceSummary {
  scheduleId: string;
  items: ResourceAssignmentView[];
  totalCost: number;
}