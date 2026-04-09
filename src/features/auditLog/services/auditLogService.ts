import type { AuditLogListParams, AuditLogListResponse } from '../types/auditLogType';
import apiClient from '@/services/apiClient';

export async function getAuditLogs(params: AuditLogListParams): Promise<AuditLogListResponse> {
  const response: any = await apiClient.get('/api/audit-logs', {
    params: {
      page: params.page,
      limit: params.pageSize,
      search: params.search,
      module: params.module,
      action: params.action
    }
  });

  const body = response.data; // { data: logs[], total, page, limit, totalPages }

  if (!body || !body.data) {
    return {
      data: [],
      total: 0,
      page: params.page || 1,
      pageSize: params.pageSize || 25,
      totalPages: 0,
    };
  }

  const mappedData = body.data.map((item: any) => {
    const d = new Date(item.created_at);
    // Map AuditAction enum from backend to severity for frontend
    const severity = item.action === 'DELETE' ? 'ERROR' : (item.action === 'CREATE' ? 'SUCCESS' : 'INFO');
    
    return {
      id: `log-${item.id}`,
      timestamp: item.created_at,
      dateStr: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timeStr: d.toISOString().split('T')[1].substring(0, 12),
      user: {
        id: `u${item.creator?.id || '0'}`,
        name: item.creator?.full_name || 'System User',
        initials: (item.creator?.full_name || 'SU').substring(0, 2).toUpperCase(),
        role: item.creator?.role?.name || 'User',
      },
      action: {
        type: item.action,
        description: item.note || `${item.action} on ${item.entity_type} #${item.entity_id}`,
      },
      module: item.module,
      ipAddress: 'System Internal',
      device: {
        icon: 'terminal',
        description: 'API Origin',
      },
      severity,
    };
  });

  return {
    data: mappedData,
    total: body.total,
    page: body.page,
    pageSize: body.limit,
    totalPages: body.totalPages,
  };
}
