import { useState, useEffect, useCallback } from 'react';
import {
  useApprovalConfigs,
  useUpdateApprovalConfig,
  useCreateApprovalConfig,
  useDeleteApprovalConfig,
} from '../hooks/useApprovalConfig';
import { PRIORITY_META, getStepColor } from '../types/approvalConfigType';
import type { WorkflowStep, WorkflowScenario } from '../types/approvalConfigType';
import { StepEditorDialog } from './StepEditorDialog';
import { NewScenarioDialog } from './NewScenarioDialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

// Icon SVG paths cho từng step
const STEP_ICONS = [
  'M13 10V3L4 14h7v7l9-11h-7z', // bolt
  'M15.5 14.5L19 18m-2-6a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z', // person_search
  'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', // verified_user
  'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', // clipboard
  'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', // settings
];

function getStepIcon(index: number) {
  return STEP_ICONS[index % STEP_ICONS.length];
}

function formatTimeAgo(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return 'vừa xong';
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

export function ApprovalConfiguration() {
  const { toast } = useToast();
  const { data: scenarios, isLoading } = useApprovalConfigs();
  const updateMutation = useUpdateApprovalConfig();
  const createMutation = useCreateApprovalConfig();
  const deleteMutation = useDeleteApprovalConfig();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localSteps, setLocalSteps] = useState<WorkflowStep[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Dialog states
  const [stepDialogOpen, setStepDialogOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkflowStep | null>(null);
  const [insertIndex, setInsertIndex] = useState<number>(0);
  const [newScenarioOpen, setNewScenarioOpen] = useState(false);
  const [deleteStepConfirmOpen, setDeleteStepConfirmOpen] = useState(false);
  const [stepToDelete, setStepToDelete] = useState<string | null>(null);
  const [deleteScenarioConfirmOpen, setDeleteScenarioConfirmOpen] = useState(false);

  // Chọn scenario đầu tiên khi load xong
  useEffect(() => {
    if (scenarios && scenarios.length > 0 && !selectedId) {
      setSelectedId(scenarios[0].id);
    }
  }, [scenarios, selectedId]);

  // Sync local steps khi chọn scenario khác
  const selectedScenario = scenarios?.find((s) => s.id === selectedId);
  useEffect(() => {
    if (selectedScenario) {
      setLocalSteps(selectedScenario.steps.map((s) => ({ ...s })));
      setIsDirty(false);
    }
  }, [selectedScenario]);

  // --- Step CRUD handlers ---

  const handleAddStep = useCallback((atIndex: number) => {
    setEditingStep(null);
    setInsertIndex(atIndex);
    setStepDialogOpen(true);
  }, []);

  const handleEditStep = useCallback((step: WorkflowStep) => {
    setEditingStep(step);
    setInsertIndex(step.stepNumber - 1);
    setStepDialogOpen(true);
  }, []);

  const handleSaveStep = useCallback((step: WorkflowStep) => {
    setLocalSteps((prev) => {
      // Nếu đang sửa, thay thế theo id
      const existingIdx = prev.findIndex((s) => s.id === step.id);
      if (existingIdx !== -1) {
        const updated = [...prev];
        updated[existingIdx] = step;
        return updated.map((s, i) => ({ ...s, stepNumber: i + 1 }));
      }
      // Nếu thêm mới, insert tại vị trí
      const updated = [...prev];
      updated.splice(insertIndex, 0, step);
      return updated.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
    setIsDirty(true);
  }, [insertIndex]);

  const handleConfirmDeleteStep = useCallback(() => {
    if (!stepToDelete) return;
    setLocalSteps((prev) => {
      const updated = prev.filter((s) => s.id !== stepToDelete);
      return updated.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
    setIsDirty(true);
    setStepToDelete(null);
    setDeleteStepConfirmOpen(false);
  }, [stepToDelete]);

  const handleMoveStep = useCallback((stepId: string, direction: 'up' | 'down') => {
    setLocalSteps((prev) => {
      const idx = prev.findIndex((s) => s.id === stepId);
      if (idx === -1) return prev;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const updated = [...prev];
      [updated[idx], updated[newIdx]] = [updated[newIdx], updated[idx]];
      return updated.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
    setIsDirty(true);
  }, []);

  // --- Scenario-level handlers ---

  const handleSaveWorkflow = useCallback(() => {
    if (!selectedId) return;
    updateMutation.mutate(
      { scenarioId: selectedId, payload: { steps: localSteps } },
      {
        onSuccess: () => {
          setIsDirty(false);
          toast({ title: 'Đã lưu quy trình', description: 'Workflow configuration đã được cập nhật.' });
        },
        onError: (error) => {
          toast({
            title: 'Không thể lưu quy trình',
            description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra khi lưu cấu hình.',
            variant: 'destructive',
          });
        },
      },
    );
  }, [selectedId, localSteps, updateMutation, toast]);

  const handleDiscard = useCallback(() => {
    if (selectedScenario) {
      setLocalSteps(selectedScenario.steps.map((s) => ({ ...s })));
      setIsDirty(false);
    }
  }, [selectedScenario]);

  const handleCreateScenario = useCallback(
    (data: Pick<WorkflowScenario, 'name' | 'description' | 'priority'>) => {
      createMutation.mutate(data, {
        onSuccess: (created) => {
          setSelectedId(created.id);
          setNewScenarioOpen(false);
          toast({ title: 'Đã tạo scenario', description: `${created.name} đã được thêm vào hệ thống.` });
        },
        onError: () => {
          toast({ title: 'Không thể tạo scenario', description: 'Đã có lỗi xảy ra khi tạo scenario mới.', variant: 'destructive' });
        },
      });
    },
    [createMutation, toast],
  );

  const handleConfirmDeleteScenario = useCallback(() => {
    if (!selectedId) return;
    deleteMutation.mutate(selectedId, {
      onSuccess: () => {
        setSelectedId(null);
        setDeleteScenarioConfirmOpen(false);
        toast({ title: 'Đã xóa scenario', description: 'Quy trình đã được xóa khỏi hệ thống.' });
      },
      onError: () => {
        toast({ title: 'Không thể xóa scenario', description: 'Đã có lỗi xảy ra khi xóa.', variant: 'destructive' });
      },
    });
  }, [selectedId, deleteMutation, toast]);

  // --- Summary stats ---
  const triggerCount = localSteps.length > 0 ? 1 : 0;
  const operationalCount = localSteps.length > 1 ? localSteps.length - 2 : 0;
  const approvalCount = localSteps.length > 0 ? 1 : 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* ── Page Header ──────────────────────────────────────── */}
      <section className="px-8 py-5 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
            Cấu hình Quy trình &amp; Phê duyệt
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Thiết lập chi tiết các bước, vai trò và mô tả nghiệp vụ cho hệ thống.
          </p>
        </div>
      </section>

      {/* ── Main Content ─────────────────────────────────────── */}
      <div className="flex-1 flex px-8 pb-6 gap-6 overflow-hidden">

        {/* ── Left Sidebar: Active Scenarios ── */}
        <div className="w-80 flex flex-col gap-4 overflow-y-auto pr-2 shrink-0">
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
            Active Scenarios
          </h3>

          {isLoading ? (
            <div className="animate-pulse space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-28 bg-white rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {scenarios?.map((scenario) => {
                const isActive = scenario.id === selectedId;
                const meta = PRIORITY_META[scenario.priority];
                return (
                  <button
                    key={scenario.id}
                    onClick={() => setSelectedId(scenario.id)}
                    className={`group relative w-full text-left p-4 rounded-xl transition-all border-l-4 ${isActive
                        ? 'bg-white shadow-sm border-blue-700'
                        : 'bg-slate-100/80 hover:bg-white border-transparent'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${meta.className}`}>
                        {meta.label}
                      </span>
                      <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{scenario.name}</h4>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{scenario.description}</p>
                  </button>
                );
              })}
            </>
          )}

          {/* Thêm quy trình mới */}
          <button
            onClick={() => setNewScenarioOpen(true)}
            className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-white hover:border-blue-300 hover:text-blue-600 transition-all"
          >
            <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
            </svg>
            <span className="text-xs font-bold">Thêm quy trình mới</span>
          </button>
        </div>

        {/* ── Right: Workflow Builder ── */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm flex flex-col overflow-hidden">

          {/* Builder Toolbar */}
          <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-slate-900">
                  Workflow Builder:{' '}
                  <span className="text-blue-700">{selectedScenario?.name ?? '—'}</span>
                </h3>
                <p className="text-xs text-slate-500 italic">
                  {selectedScenario
                    ? `Cập nhật lần cuối ${formatTimeAgo(selectedScenario.updatedAt)} bởi ${selectedScenario.updatedBy}`
                    : 'Chọn một scenario bên trái'}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {selectedScenario && (
                <button
                  onClick={() => setDeleteScenarioConfirmOpen(true)}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                  </svg>
                  Xoá
                </button>
              )}
            </div>
          </div>

          {/* Builder Canvas — vertical stepper */}
          <div className="flex-1 overflow-y-auto p-8"
            style={{
              backgroundImage: 'radial-gradient(#c3c6d6 0.5px, transparent 0.5px)',
              backgroundSize: '24px 24px',
            }}
          >
            {!selectedScenario ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                Chọn một quy trình ở sidebar bên trái để bắt đầu cấu hình.
              </div>
            ) : (
              <div className="max-w-3xl mx-auto relative">
                {/* Đường kẻ dọc nối các step */}
                {localSteps.length > 0 && (
                  <div
                    className="absolute left-[23px] top-6 w-0.5 bg-gradient-to-b from-blue-700 via-teal-600 to-orange-600 z-0"
                    style={{ bottom: '40px' }}
                  />
                )}

                {/* Render các step */}
                {localSteps.map((step, index) => {
                  const color = getStepColor(index);
                  const iconPath = getStepIcon(index);
                  const isLast = index === localSteps.length - 1;

                  return (
                    <div key={step.id}>
                      {/* Step card */}
                      <div className="relative z-10 flex gap-8 pb-4">
                        {/* Step circle */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${color.bg} ${color.text} flex items-center justify-center shadow-lg ring-4 ${color.ring}`}>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d={iconPath} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                        </div>

                        {/* Step content */}
                        <div className={`flex-1 bg-white p-5 rounded-2xl shadow-md border hover:shadow-lg transition-all ${color.border}`}>
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h4 className="font-bold text-xs text-slate-900">
                                Step {step.stepNumber}: {step.name}
                              </h4>
                              <div className={`px-3 py-1 rounded-full flex items-center gap-2 border text-xs font-bold uppercase tracking-wider ${color.badge}`}>
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                                Vai trò: {step.roleName}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex items-center gap-1 shrink-0 ml-2">
                              <button
                                onClick={() => handleMoveStep(step.id, 'up')}
                                disabled={index === 0}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                                title="Di chuyển lên"
                              >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M5 15l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleMoveStep(step.id, 'down')}
                                disabled={isLast}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-30"
                                title="Di chuyển xuống"
                              >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleEditStep(step)}
                                className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Chỉnh sửa"
                              >
                                <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                              </button>
                              <button
                                onClick={() => { setStepToDelete(step.id); setDeleteStepConfirmOpen(true); }}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                                title="Xoá bước"
                              >
                                <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Description */}
                          <div>
                            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Mô tả chi tiết</label>
                            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 leading-relaxed">
                              {step.description}
                            </div>
                          </div>

                          {/* SLA badge nếu có */}
                          {step.slaHours !== undefined && (
                            <div className="flex gap-2 mt-3">
                              <span className="px-3 py-1.5 bg-slate-50 text-[11px] font-medium border border-slate-200 rounded-lg flex items-center gap-2">
                                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                                </svg>
                                SLA: {step.slaHours} Hours
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Nút thêm bước giữa các step */}
                      <div className="relative z-10 flex justify-center py-3">
                        <button
                          onClick={() => handleAddStep(index + 1)}
                          className="group flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-full text-xs font-bold shadow-sm hover:border-blue-400 hover:text-blue-700 transition-all"
                        >
                          <svg className="w-4 h-4 text-blue-600 group-hover:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                          Thêm bước xử lý mới
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Nút thêm step đầu tiên — chỉ khi chưa có step nào */}
                {localSteps.length === 0 && (
                  <div className="flex justify-center py-8">
                    <button
                      onClick={() => handleAddStep(0)}
                      className="group flex items-center gap-3 px-6 py-4 bg-white border-2 border-dashed border-slate-300 rounded-2xl text-sm font-bold text-slate-500 hover:border-blue-400 hover:text-blue-700 transition-all"
                    >
                      <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M12 4v16m8-8H4" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                      Thêm bước đầu tiên cho quy trình
                    </button>
                  </div>
                )}

                {/* Workflow End node */}
                {localSteps.length > 0 && (
                  <div className="relative z-10 flex justify-center mt-4">
                    <div className="bg-slate-200 px-8 py-2 rounded-full text-xs font-black uppercase tracking-[0.2em] text-slate-500 border border-slate-300">
                      Workflow End
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          {selectedScenario && (
            <div className="p-5 border-t border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-6">
                {triggerCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-700 rounded-full" />
                    <span className="text-xs font-bold text-slate-700">{triggerCount} Trigger</span>
                  </div>
                )}
                {operationalCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-teal-600 rounded-full" />
                    <span className="text-xs font-bold text-slate-500">
                      {operationalCount} Operational Step{operationalCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {approvalCount > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-orange-600 rounded-full" />
                    <span className="text-xs font-bold text-slate-500">{approvalCount} Approval Layer</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDiscard}
                  disabled={!isDirty || updateMutation.isPending}
                  className="text-slate-500 text-sm font-bold px-4 py-2 hover:bg-slate-100 rounded-lg transition-all disabled:opacity-40"
                >
                  Hủy cấu hình
                </button>
                <button
                  onClick={handleSaveWorkflow}
                  disabled={!isDirty || updateMutation.isPending}
                  className="bg-blue-800 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg hover:bg-blue-900 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending && (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Lưu quy trình
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────── */}
      <StepEditorDialog
        open={stepDialogOpen}
        onClose={() => setStepDialogOpen(false)}
        onSave={handleSaveStep}
        initialStep={editingStep}
        stepNumber={insertIndex + 1}
      />

      <NewScenarioDialog
        open={newScenarioOpen}
        onClose={() => setNewScenarioOpen(false)}
        onSave={handleCreateScenario}
        isPending={createMutation.isPending}
      />

      {/* Xác nhận xoá bước */}
      <Dialog open={deleteStepConfirmOpen} onOpenChange={(v) => { if (!v) setDeleteStepConfirmOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline">Xác nhận xoá bước</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn có chắc muốn xoá bước này? Hành động này không thể hoàn tác.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteStepConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmDeleteStep}
              className="px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Xoá
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Xác nhận xoá quy trình */}
      <Dialog open={deleteScenarioConfirmOpen} onOpenChange={(v) => { if (!v) setDeleteScenarioConfirmOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-headline">Xác nhận xoá quy trình</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-600">
            Bạn có chắc muốn xoá quy trình <span className="font-bold text-slate-900">&quot;{selectedScenario?.name}&quot;</span>?
            Toàn bộ các bước trong quy trình sẽ bị mất và không thể hoàn tác.
          </p>
          <DialogFooter>
            <button
              onClick={() => setDeleteScenarioConfirmOpen(false)}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              onClick={handleConfirmDeleteScenario}
              disabled={deleteMutation.isPending}
              className="px-5 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {deleteMutation.isPending && (
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              Xoá quy trình
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
