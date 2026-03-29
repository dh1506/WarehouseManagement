import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getApprovalConfigs,
  updateApprovalConfig,
  createApprovalConfig,
  deleteApprovalConfig,
} from '@/services/approvalConfigService';
import type { ApprovalConfigPayload, WorkflowScenario } from '../types/approvalConfigType';

export const APPROVAL_CONFIG_KEYS = {
  all: ['approvalConfigs'] as const,
  lists: () => [...APPROVAL_CONFIG_KEYS.all, 'list'] as const,
};

export function useApprovalConfigs() {
  return useQuery({
    queryKey: APPROVAL_CONFIG_KEYS.lists(),
    queryFn: getApprovalConfigs,
  });
}

export function useUpdateApprovalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scenarioId, payload }: { scenarioId: string; payload: ApprovalConfigPayload }) =>
      updateApprovalConfig(scenarioId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_CONFIG_KEYS.lists() });
    },
  });
}

export function useCreateApprovalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Pick<WorkflowScenario, 'name' | 'description' | 'priority'>) =>
      createApprovalConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_CONFIG_KEYS.lists() });
    },
  });
}

export function useDeleteApprovalConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (scenarioId: string) => deleteApprovalConfig(scenarioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: APPROVAL_CONFIG_KEYS.lists() });
    },
  });
}
