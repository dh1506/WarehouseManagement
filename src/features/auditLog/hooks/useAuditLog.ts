import { useQuery } from '@tanstack/react-query';
import { getAuditLogs } from '../services/auditLogService';
import type { AuditLogListParams } from '../types/auditLogType';

export const auditLogKeys = {
  all: ['auditLogs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: AuditLogListParams) => [...auditLogKeys.lists(), filters] as const,
};

export function useAuditLogs(params: AuditLogListParams) {
  return useQuery({
    queryKey: auditLogKeys.list(params),
    queryFn: () => getAuditLogs(params),
  });
}
