export type AuditLogSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'SUCCESS' | 'SYSTEM';

export interface AuditLogUser {
  id: string;
  name: string;
  initials: string;
  role: string;
}

export interface AuditLogAction {
  type: string;
  description: string;
}

export interface AuditLogDevice {
  icon: string;
  description: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  dateStr: string;
  timeStr: string;
  user: AuditLogUser;
  action: AuditLogAction;
  module: string;
  ipAddress: string;
  device: AuditLogDevice;
  severity: AuditLogSeverity;
}

export interface AuditLogListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  module?: string;
  action?: string;
}

export interface AuditLogListResponse {
  data: AuditLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
