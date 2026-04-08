import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  WorkflowScenario,
  ApprovalConfigPayload,
} from '@/features/approvalConfig/types/approvalConfigType';

interface RoleApiItem {
  id: number;
  name: string;
  description: string | null;
  updated_at: string;
}

interface RolesListApiData {
  roles: RoleApiItem[];
}

function generateId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * Derived from GET /api/roles
 * Approval scenarios are projected from role data because dedicated approval-config list endpoint
 * is not available in current backend contract.
 */
export const getApprovalConfigs = async (): Promise<WorkflowScenario[]> => {
  const response = await apiClient.get<ApiResponse<RolesListApiData>>('/api/roles', {
    params: {
      page: 1,
      limit: 200,
    },
  });
  const payload = unwrapApiData<RolesListApiData>(response);

  return payload.roles.map((role) => ({
    id: String(role.id),
    name: `Approval for ${role.name}`,
    description: role.description?.trim() || `Approval configuration bound to role ${role.name}.`,
    priority: 'normal',
    steps: [],
    updatedAt: role.updated_at,
    updatedBy: role.name,
  }));
};

/**
 * PATCH /api/approval-configs/:id  (tương ứng PATCH /api/roles/:id/approval-config theo BE contract)
 * Cập nhật danh sách bước của một workflow scenario
 */
export const updateApprovalConfig = (
  scenarioId: string,
  payload: ApprovalConfigPayload,
): Promise<WorkflowScenario> => {
  void scenarioId;
  void payload;
  throw new Error('Backend hiện chưa hỗ trợ endpoint lưu approval workflow. Vui lòng chờ contract chính thức.');
};

/**
 * POST /api/approval-configs
 * Tạo workflow scenario mới
 */
export const createApprovalConfig = (
  _data: Pick<WorkflowScenario, 'name' | 'description' | 'priority'>,
): Promise<WorkflowScenario> => {
  throw new Error('Backend hiện chưa hỗ trợ tạo approval scenario riêng. Vui lòng dùng role có sẵn.');
};

/**
 * DELETE /api/approval-configs/:id
 * Xoá workflow scenario
 */
export const deleteApprovalConfig = async (_scenarioId: string): Promise<void> => {
  throw new Error('Backend hiện chưa hỗ trợ xóa approval scenario.');
};

// Export helper để tạo step mới với id
export { generateId };

function unwrapApiData<T>(response: unknown): T {
  if (response && typeof response === 'object' && 'data' in response) {
    const level1 = (response as { data: unknown }).data;
    if (level1 && typeof level1 === 'object' && 'data' in level1) {
      return (level1 as { data: T }).data;
    }

    return level1 as T;
  }

  return response as T;
}
