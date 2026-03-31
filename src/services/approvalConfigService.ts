import apiClient from './apiClient';
import type { ApiResponse } from '@/types/api';
import type {
  WorkflowScenario,
  ApprovalConfigPayload,
} from '@/features/approvalConfig/types/approvalConfigType';

// ---------------------------------------------------------------------------
// Mock data — xoá khi BE sẵn sàng
// ---------------------------------------------------------------------------

let MOCK_SCENARIOS: WorkflowScenario[] = [
  {
    id: 'inbound',
    name: 'Inbound Request',
    description: 'Quy trình nhập kho tiêu chuẩn từ các nhà cung cấp khu vực.',
    priority: 'high',
    updatedAt: '2026-03-28T06:00:00Z',
    updatedBy: 'Admin',
    steps: [
      {
        id: 'inbound-s1',
        stepNumber: 1,
        name: 'Inbound Request',
        roleId: '3',
        roleName: 'Staff',
        description:
          'Staff tạo và gửi yêu cầu nhập kho. Đảm bảo toàn bộ thông tin vận đơn được nhập chính xác trước khi chuyển tiếp.',
        slaHours: undefined,
      },
      {
        id: 'inbound-s2',
        stepNumber: 2,
        name: 'Verification & Review',
        roleId: '2',
        roleName: 'Warehouse Manager',
        description:
          'Manager kiểm tra dữ liệu và chứng từ trước khi chuyển tiếp. Đối soát số lượng thực tế với hệ thống và kiểm tra ảnh chụp chứng từ.',
        slaHours: 4,
      },
      {
        id: 'inbound-s3',
        stepNumber: 3,
        name: 'Final Approval',
        roleId: '1',
        roleName: 'Director',
        description:
          'Director xem xét và phê duyệt cuối cùng. Phê duyệt cho các lô hàng có giá trị cao hoặc yêu cầu đặc biệt.',
        slaHours: undefined,
      },
    ],
  },
  {
    id: 'stock-adjustment',
    name: 'Stock Adjustment > $1,000',
    description: 'Yêu cầu phê duyệt đặc biệt cho các sai lệch tồn kho lớn.',
    priority: 'financial',
    updatedAt: '2026-03-25T10:30:00Z',
    updatedBy: 'Admin',
    steps: [
      {
        id: 'sa-s1',
        stepNumber: 1,
        name: 'Adjustment Request',
        roleId: '3',
        roleName: 'Staff',
        description: 'Staff ghi nhận sai lệch và tạo phiếu điều chỉnh kèm bằng chứng.',
        slaHours: undefined,
      },
      {
        id: 'sa-s2',
        stepNumber: 2,
        name: 'Manager Approval',
        roleId: '2',
        roleName: 'Warehouse Manager',
        description: 'Manager xác nhận sai lệch và phê duyệt điều chỉnh dưới $5,000.',
        slaHours: 8,
      },
      {
        id: 'sa-s3',
        stepNumber: 3,
        name: 'Financial Audit',
        roleId: '4',
        roleName: 'Auditor (Internal)',
        description: 'Auditor kiểm tra tính hợp lệ của điều chỉnh với hệ thống tài chính.',
        slaHours: 24,
      },
      {
        id: 'sa-s4',
        stepNumber: 4,
        name: 'Director Sign-off',
        roleId: '1',
        roleName: 'Director',
        description: 'Director phê duyệt cuối cùng và ký xác nhận điều chỉnh tài sản.',
        slaHours: undefined,
      },
    ],
  },
];

function generateId() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * GET /api/approval-configs
 * Lấy danh sách tất cả workflow scenario
 */
export const getApprovalConfigs = (): Promise<WorkflowScenario[]> =>
  new Promise((resolve) => setTimeout(() => resolve(MOCK_SCENARIOS.map((s) => ({ ...s, steps: [...s.steps] }))), 300));
// return apiClient.get<WorkflowScenario[]>('/api/approval-configs').then((r) => r.data);

/**
 * PATCH /api/approval-configs/:id  (tương ứng PATCH /api/roles/:id/approval-config theo BE contract)
 * Cập nhật danh sách bước của một workflow scenario
 */
export const updateApprovalConfig = (
  scenarioId: string,
  payload: ApprovalConfigPayload,
): Promise<WorkflowScenario> => {
  const normalizedSteps = payload.steps.map((step, index) => ({
    ...step,
    stepNumber: index + 1,
  }));

  return apiClient
    .patch<ApiResponse<WorkflowScenario>>(`/api/roles/${scenarioId}/approval-config`, {
      steps: normalizedSteps,
    })
    .then((response) => {
      const data = unwrapApiData<WorkflowScenario>(response);
      return {
        ...data,
        steps: data.steps.map((step, index) => ({ ...step, stepNumber: index + 1 })),
      };
    });
};

/**
 * POST /api/approval-configs
 * Tạo workflow scenario mới
 */
export const createApprovalConfig = (
  data: Pick<WorkflowScenario, 'name' | 'description' | 'priority'>,
): Promise<WorkflowScenario> =>
  new Promise((resolve) => {
    setTimeout(() => {
      const newScenario: WorkflowScenario = {
        id: generateId(),
        ...data,
        steps: [],
        updatedAt: new Date().toISOString(),
        updatedBy: 'Admin',
      };
      MOCK_SCENARIOS.push(newScenario);
      resolve(newScenario);
    }, 400);
  });
// return apiClient.post<WorkflowScenario>('/api/approval-configs', data).then((r) => r.data);

/**
 * DELETE /api/approval-configs/:id
 * Xoá workflow scenario
 */
export const deleteApprovalConfig = (scenarioId: string): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(() => {
      MOCK_SCENARIOS = MOCK_SCENARIOS.filter((s) => s.id !== scenarioId);
      resolve();
    }, 400);
  });
// return apiClient.delete(`/api/approval-configs/${scenarioId}`).then(() => undefined);

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
