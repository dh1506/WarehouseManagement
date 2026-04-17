import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'motion/react';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';
import {
  useStockOutReview,
  useCreateSalesStockOut,
  useCreateReturnStockOut,
  useSubmitStockOut,
  useApproveStockOut,
  useCancelStockOut,
} from '../hooks/useOutbound';
import {
  getOutboundProductInventoryAvailability,
  getStoredStockOutDiscrepancyResolution,
  getOutboundProductInventoryAvailabilityWithOptions,
} from '../services/outboundService';
import { createStockOutSchema, type CreateStockOutSchemaValues } from '../schemas/outboundSchema';
import {
  OUTBOUND_STEPPER_STEPS,
  OUTBOUND_STATUS_ORDER,
  type StockOut,
  type OutboundStatus,
} from '../types/outboundType';
import { OutboundStatusBadge, OutboundTypeBadge } from './OutboundStatusBadge';
import { LineItemEditor } from './LineItemEditor';

// ─── Confirm Dialog (dùng chung cho Submit / Approve / Cancel) ────────────────

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  confirmClass?: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  /** Nếu true, hiển thị textarea nhập lý do */
  withReason?: boolean;
  reason?: string;
  onReasonChange?: (v: string) => void;
}

function ConfirmDialog({
  title,
  description,
  confirmLabel,
  confirmClass = 'bg-blue-600 hover:bg-blue-700 text-white',
  isPending,
  onConfirm,
  onClose,
  withReason,
  reason,
  onReasonChange,
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {withReason && (
          <div className="px-6 pt-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">
              Lý do <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => onReasonChange?.(e.target.value)}
              placeholder="Nhập lý do hủy phiếu..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400"
            />
          </div>
        )}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className={`px-5 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2 ${confirmClass}`}
          >
            {isPending && (
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            )}
            {confirmLabel}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Workflow Stepper ─────────────────────────────────────────────────────────

function WorkflowStepper({ status }: { status: OutboundStatus }) {
  const currentIdx = OUTBOUND_STATUS_ORDER[status];
  const progressPct =
    status === 'CANCELLED'
      ? 0
      : (Math.max(0, currentIdx) / (OUTBOUND_STEPPER_STEPS.length - 1)) * 100;

  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
      <div className="relative flex justify-between">
        {/* Track */}
        <div className="absolute top-5 left-0 w-full h-1 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-linear-to-r from-blue-600 to-blue-400 rounded-full"
            initial={{ width: '0%' }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          />
        </div>

        {OUTBOUND_STEPPER_STEPS.map((step, i) => {
          const stepIdx = OUTBOUND_STATUS_ORDER[step.status];
          const isPassed = stepIdx < currentIdx;
          const isCurrent = step.status === status;

          return (
            <div key={step.status} className="relative z-10 flex flex-col items-center">
              {isPassed ? (
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-600/30">
                  <span className="material-symbols-outlined text-[16px]">check</span>
                </div>
              ) : isCurrent ? (
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-10 h-10 rounded-full bg-white border-[3px] border-blue-600 text-blue-600 flex items-center justify-center font-bold text-sm shadow-md"
                >
                  {i + 1}
                </motion.div>
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center font-semibold text-sm">
                  {i + 1}
                </div>
              )}
              <span
                className={`mt-2.5 text-xs font-semibold text-center max-w-15 leading-tight ${isCurrent
                  ? 'text-blue-700'
                  : isPassed
                    ? 'text-blue-600'
                    : 'text-slate-400'
                  }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Action Panel ─────────────────────────────────────────────────────────────

interface ActionPanelProps {
  order: StockOut;
  isManager: boolean;
  approveDisabled: boolean;
  approveDisabledReason?: string;
  onApprovePrecheck: () => Promise<boolean>;
  onActionDone: () => void;
}

function ActionPanel({
  order,
  isManager,
  approveDisabled,
  approveDisabledReason,
  onApprovePrecheck,
  onActionDone,
}: ActionPanelProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dialog, setDialog] = useState<'submit' | 'approve' | 'cancel' | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const submitMutation = useSubmitStockOut(order.id);
  const approveMutation = useApproveStockOut(order.id);
  const cancelMutation = useCancelStockOut(order.id);

  const isTerminal = order.status === 'COMPLETED' || order.status === 'CANCELLED';
  const canCancel = !isTerminal;

  const handleSubmit = async () => {
    await submitMutation.mutateAsync();
    onActionDone();
    setDialog(null);
  };

  const handleApprove = async () => {
    let canApproveNow = false;

    try {
      canApproveNow = await onApprovePrecheck();
    } catch {
      toast({
        title: 'Không thể kiểm tra tồn kho',
        description: 'Vui lòng thử lại sau vài giây.',
        variant: 'destructive',
      });
    }

    if (!canApproveNow) {
      setDialog(null);
      return;
    }

    try {
      await approveMutation.mutateAsync();
      onActionDone();
      setDialog(null);
    } catch {
      // Toast đã được xử lý tập trung trong hook mutation.
      setDialog(null);
    }
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length === 0) {
      toast({
        title: 'Thiếu lý do hủy phiếu',
        description: 'Vui lòng nhập lý do trước khi xác nhận hủy phiếu.',
        variant: 'destructive',
      });
      return;
    }

    await cancelMutation.mutateAsync({ reason: cancelReason.trim() || undefined });
    onActionDone();
    setDialog(null);
    setCancelReason('');
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* DRAFT → Submit */}
        {order.status === 'DRAFT' && (
          <button
            onClick={() => setDialog('submit')}
            className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-sm shadow-amber-500/20 transition-all active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">send</span>
            Gửi duyệt
          </button>
        )}

        {/* PENDING → Approve (Manager only) */}
        {order.status === 'PENDING' && isManager && (
          <button
            onClick={() => setDialog('approve')}
            disabled={approveDisabled || approveMutation.isPending}
            title={approveDisabled ? approveDisabledReason : undefined}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all active:scale-95 text-sm disabled:cursor-not-allowed disabled:opacity-55"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            Phê duyệt
          </button>
        )}

        {/* PENDING → Staff sees awaiting badge */}
        {order.status === 'PENDING' && !isManager && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm font-semibold">
            <span className="material-symbols-outlined text-[18px] animate-pulse">hourglass_empty</span>
            Đang chờ quản lý phê duyệt
          </div>
        )}

        {/* APPROVED → Start Picking */}
        {order.status === 'APPROVED' && (
          <button
            onClick={() => navigate(`/outbound/${order.id}/picking`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-all active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">hail</span>
            Bắt đầu lấy hàng
          </button>
        )}

        {/* PICKING → Continue */}
        {order.status === 'PICKING' && (
          <button
            onClick={() => navigate(`/outbound/${order.id}/picking`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm shadow-blue-600/20 transition-all active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            Tiếp tục lấy hàng
          </button>
        )}

        {/* Cancel (any non-terminal state) */}
        {canCancel && (
          <button
            onClick={() => setDialog('cancel')}
            className="flex items-center gap-2 px-5 py-2.5 border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl transition-all active:scale-95 text-sm"
          >
            <span className="material-symbols-outlined text-[18px]">cancel</span>
            Hủy phiếu
          </button>
        )}
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {dialog === 'submit' && (
          <ConfirmDialog
            title="Xác nhận gửi duyệt"
            description={`Phiếu ${order.code} sẽ chuyển sang trạng thái "Chờ duyệt" và không thể chỉnh sửa nội dung.`}
            confirmLabel="Gửi duyệt"
            confirmClass="bg-amber-500 hover:bg-amber-600 text-white"
            isPending={submitMutation.isPending}
            onConfirm={handleSubmit}
            onClose={() => setDialog(null)}
          />
        )}

        {dialog === 'approve' && (
          <ConfirmDialog
            title="Xác nhận phê duyệt"
            description={`Phiếu ${order.code} sẽ được phê duyệt. Tồn kho khả dụng sẽ bị khoá tương ứng cho đơn này.`}
            confirmLabel="Phê duyệt"
            confirmClass="bg-emerald-600 hover:bg-emerald-700 text-white"
            isPending={approveMutation.isPending}
            onConfirm={handleApprove}
            onClose={() => setDialog(null)}
          />
        )}

        {dialog === 'cancel' && (
          <ConfirmDialog
            title="Xác nhận hủy phiếu"
            description={`Hủy phiếu ${order.code}. Nếu đã duyệt, tồn kho khoá sẽ được hoàn trả.`}
            confirmLabel="Hủy phiếu"
            confirmClass="bg-red-600 hover:bg-red-700 text-white"
            isPending={cancelMutation.isPending}
            onConfirm={handleCancel}
            onClose={() => { setDialog(null); setCancelReason(''); }}
            withReason
            reason={cancelReason}
            onReasonChange={setCancelReason}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// ─── Detail View ──────────────────────────────────────────────────────────────

export function OutboundDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuthStore();
  const { toast } = useToast();
  const isManager = hasPermission('stock_outs:approve');

  const numericId = parseInt(id ?? '0', 10);
  const { data: reviewData, isLoading, isError, refetch } = useStockOutReview(numericId);

  const order = reviewData?.order;
  const availableByProduct = reviewData?.availableByProduct ?? {};

  const formatDate = (s: string) =>
    new Date(s).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Đang tải chi tiết phiếu...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-100 gap-3">
        <span className="material-symbols-outlined text-3xl text-red-300">error</span>
        <p className="text-slate-500">Không thể tải phiếu xuất #{id}</p>
        <div className="flex gap-3">
          <button onClick={() => refetch()} className="text-sm text-blue-600 font-semibold hover:underline">
            Thử lại
          </button>
          <button onClick={() => navigate('/outbound')} className="text-sm text-slate-500 hover:underline">
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  const toIntQuantity = (value: unknown) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.trunc(parsed);
  };

  const getUomLabel = (detail: StockOut['details'][number]) => {
    const product = detail.product as unknown as {
      uom_code?: string;
      uom_name?: string;
      unit_of_measure?: { code?: string; name?: string };
      uom?: { code?: string; name?: string };
    };

    return (
      product.unit_of_measure?.code
      || product.unit_of_measure?.name
      || product.uom?.code
      || product.uom?.name
      || product.uom_code
      || product.uom_name
      || '—'
    );
  };

  const totalRequired = order.details.reduce((sum, detail) => sum + toIntQuantity(detail.quantity), 0);
  const totalPicked = order.details.reduce(
    (s, d) => s + d.lots.reduce((ls, l) => ls + toIntQuantity(l.quantity), 0),
    0,
  );
  const showLots = order.status === 'PICKING' || order.status === 'COMPLETED';
  const storedDiscrepancyResolution = useMemo(
    () => getStoredStockOutDiscrepancyResolution(order.id),
    [order.id],
  );

  const hasInsufficientInventory = order.details.some((detail) => {
    const requestedQty = toIntQuantity(detail.quantity);
    const availableQty = Math.max(0, Math.trunc(availableByProduct[detail.product_id] ?? 0));
    return requestedQty > availableQty;
  });

  const approveDisabled = order.status === 'PENDING' && hasInsufficientInventory;

  const approveDisabledReason = approveDisabled
    ? 'Không thể phê duyệt vì có sản phẩm vượt tồn kho khả dụng tại thời điểm tải trang.'
    : undefined;

  const validateInventoryBeforeApprove = async (): Promise<boolean> => {
    if (order.status !== 'PENDING') {
      return false;
    }

    const checks = await Promise.all(
      order.details.map(async (detail) => {
        const availability = await getOutboundProductInventoryAvailabilityWithOptions(
          detail.product_id,
          { forceNetwork: true },
        );
        return {
          detail,
          availableQty: availability.availableQty,
        };
      }),
    );

    const insufficient = checks.find(({ detail, availableQty }) => {
      const requestedQty = toIntQuantity(detail.quantity);
      return requestedQty > Math.max(0, Math.trunc(availableQty));
    });

    if (!insufficient) {
      return true;
    }

    const requestedQty = toIntQuantity(insufficient.detail.quantity);
    const availableQty = Math.max(0, Math.trunc(insufficient.availableQty));

    toast({
      title: 'Không thể phê duyệt',
      description: `Sản phẩm ${insufficient.detail.product?.name ?? `#${insufficient.detail.product_id}`} thiếu tồn kho: yêu cầu ${requestedQty}, khả dụng ${availableQty}.`,
      variant: 'destructive',
    });
    await refetch();

    return false;
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">

        {/* Breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-sm"
        >
          <button
            onClick={() => navigate('/outbound')}
            className="flex items-center gap-1 text-slate-400 hover:text-blue-600 transition-colors font-medium"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Phiếu xuất
          </button>
          <span className="material-symbols-outlined text-[14px] text-slate-300">chevron_right</span>
          <span className="text-slate-600 font-semibold">{order.code}</span>
        </motion.div>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm p-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <h1 className="text-base font-bold text-blue-900 tracking-tight">{order.code}</h1>
                <OutboundStatusBadge status={order.status} size="lg" />
                <OutboundTypeBadge type={order.type} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 mt-3">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vị trí xuất</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">
                    {order.location?.name ?? `#${order.warehouse_location_id}`}
                  </p>
                  {order.location?.code && (
                    <p className="text-[10px] text-slate-400 font-mono">{order.location.code}</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người tạo</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">
                    {order.creator?.full_name ?? `#${order.created_by}`}
                  </p>
                </div>
                {order.approver && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Người duyệt</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{order.approver.full_name}</p>
                  </div>
                )}
                {order.supplier && (
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhà cung cấp</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{order.supplier.name}</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ngày tạo</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{formatDate(order.created_at)}</p>
                </div>
              </div>
              {order.description && (
                <p className="mt-3 text-sm text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
                  {order.description}
                </p>
              )}
            </div>
            <div className="shrink-0">
              <ActionPanel
                order={order}
                isManager={isManager}
                approveDisabled={approveDisabled}
                approveDisabledReason={approveDisabledReason}
                onApprovePrecheck={validateInventoryBeforeApprove}
                onActionDone={() => {
                  void refetch();
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Stepper */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {order.status === 'CANCELLED' ? (
            <div className="bg-red-50 border-l-4 border-red-500 rounded-xl p-5 flex items-center gap-3">
              <span className="material-symbols-outlined text-red-500 text-xl">cancel</span>
              <div>
                <h3 className="text-red-700 font-bold">Phiếu đã bị hủy</h3>
                <p className="text-red-600 text-sm">Phiếu xuất này đã bị hủy và không thể tiếp tục xử lý.</p>
              </div>
            </div>
          ) : (
            <WorkflowStepper status={order.status} />
          )}
        </motion.div>

        {order.status === 'PENDING' && hasInsufficientInventory ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            Một hoặc nhiều dòng sản phẩm đang thiếu tồn kho khả dụng. Nút phê duyệt đã bị khóa để bảo vệ tồn kho.
          </motion.div>
        ) : null}

        {storedDiscrepancyResolution ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
          >
            <div className="flex items-start gap-2">
              <span className="material-symbols-outlined text-[18px] text-amber-700">report</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-amber-800">Biên bản xử lý chênh lệch</p>
                <p className="mt-1 text-xs text-amber-700">
                  Mã biên bản #{storedDiscrepancyResolution.discrepancyId} - {formatDate(storedDiscrepancyResolution.resolvedAt)}
                </p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Lý do</p>
                <p className="text-sm text-amber-900">{storedDiscrepancyResolution.reason}</p>
                <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-amber-700">Phương án xử lý</p>
                <p className="text-sm text-amber-900">{storedDiscrepancyResolution.actionTaken}</p>
              </div>
            </div>
          </motion.div>
        ) : null}

        {/* Danh sách sản phẩm */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-600 text-[18px]">inventory_2</span>
              Danh sách sản phẩm
              <span className="text-slate-400 font-normal text-sm">({order.details.length} dòng)</span>
            </h2>
            {showLots && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-blue-50 px-2.5 py-1 rounded-full">
                <span className="material-symbols-outlined text-[13px] text-blue-500">assignment_turned_in</span>
                Đã lấy {totalPicked} / {totalRequired}
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-125">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-3">Sản phẩm</th>
                  <th className="px-4 py-3 text-center">Số lượng yêu cầu</th>
                  <th className="px-4 py-3 text-center">Khả dụng realtime</th>
                  <th className="px-4 py-3 text-center">Đơn vị tính</th>
                  {showLots && <th className="px-4 py-3">Lô đã lấy</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {order.details.length === 0 ? (
                  <tr>
                    <td colSpan={showLots ? 5 : 4} className="py-12 text-center text-slate-400 text-sm">
                      <span className="material-symbols-outlined text-xl block mb-1">inventory</span>
                      Chưa có sản phẩm trong phiếu.
                    </td>
                  </tr>
                ) : (
                  order.details.map((detail) => {
                    const requestedQty = toIntQuantity(detail.quantity);
                    const pickedQty = detail.lots.reduce((s, l) => s + toIntQuantity(l.quantity), 0);
                    const isFulfilled = showLots && pickedQty >= requestedQty;
                    const isPartial = showLots && pickedQty > 0 && pickedQty < requestedQty;
                    const availableQty = Math.max(0, Math.trunc(availableByProduct[detail.product_id] ?? 0));
                    const isInsufficient = requestedQty > availableQty;

                    return (
                      <tr key={detail.id} className={`hover:bg-slate-50/60 transition-colors ${isInsufficient ? 'bg-red-50/40' : ''}`}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-slate-400 text-[18px]">package_2</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">
                                {detail.product?.name ?? `Sản phẩm #${detail.product_id}`}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono">
                                {detail.product?.sku ?? '—'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <div className="inline-flex items-center gap-1.5">
                            <span className={`text-sm font-bold ${isInsufficient ? 'text-red-700' : 'text-slate-800'}`}>{requestedQty}</span>
                            {isInsufficient ? (
                              <span className="material-symbols-outlined text-[14px] text-red-600" title="Out of stock at approval time">
                                warning
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`text-sm font-semibold ${isInsufficient ? 'text-red-700' : 'text-slate-700'}`}>
                            {availableQty}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center text-sm text-slate-500">
                          {getUomLabel(detail)}
                        </td>
                        {showLots && (
                          <td className="px-4 py-4">
                            {detail.lots.length === 0 ? (
                              <span className="text-xs text-slate-400 italic">Chưa gán lô</span>
                            ) : (
                              <div className="space-y-1">
                                {detail.lots.map((lot) => (
                                  <div key={lot.id} className="flex items-center gap-2 text-xs">
                                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded font-mono font-semibold">
                                      Lô #{lot.product_lot_id}
                                    </span>
                                    {lot.product_lot?.lot_number && (
                                      <span className="text-slate-500">{lot.product_lot.lot_number}</span>
                                    )}
                                    <span className="text-slate-600 font-medium">×{lot.quantity}</span>
                                  </div>
                                ))}
                                {/* Fulfillment indicator */}
                                <div className="mt-1">
                                  {isFulfilled ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                                      <span className="material-symbols-outlined text-[12px]">check_circle</span>
                                      Đủ ({pickedQty}/{requestedQty})
                                    </span>
                                  ) : isPartial ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                                      <span className="material-symbols-outlined text-[12px]">warning</span>
                                      Thiếu ({pickedQty}/{requestedQty})
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
              {order.details.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50 border-t border-slate-200">
                    <td className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Tổng</td>
                    <td className="px-4 py-3 text-center text-sm font-extrabold text-blue-900">
                      {totalRequired}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    {showLots && (
                      <td className="px-4 py-3 text-xs font-semibold text-slate-500">
                        Đã lấy: <span className="font-bold text-blue-700">{totalPicked}</span>
                      </td>
                    )}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </motion.div>

      </div>
    </div>
  );
}

// ─── Create Form ──────────────────────────────────────────────────────────────

export function OutboundCreateForm() {
  const navigate = useNavigate();
  const createSalesMutation = useCreateSalesStockOut();
  const createReturnMutation = useCreateReturnStockOut();

  const methods = useForm<CreateStockOutSchemaValues>({
    resolver: zodResolver(createStockOutSchema),
    defaultValues: {
      warehouse_location_id: 0,
      type: 'SALES',
      reference_number: '',
      supplier_id: null,
      description: '',
      details: [],
    },
  });

  const {
    register,
    handleSubmit,
    watch,
    setError,
    clearErrors,
    setFocus,
    formState: { errors, isSubmitting },
  } = methods;

  const selectedType = watch('type');
  const isReturn = selectedType === 'RETURN_TO_SUPPLIER';

  const validateDetailsWithInventory = async (
    details: CreateStockOutSchemaValues['details'],
  ): Promise<boolean> => {
    let firstInvalidField: `details.${number}.product_id` | `details.${number}.quantity` | null = null;

    for (let index = 0; index < details.length; index += 1) {
      const detail = details[index];

      if (!Number.isFinite(detail.product_id) || detail.product_id <= 0) {
        const fieldName = `details.${index}.product_id` as const;
        setError(fieldName, {
          type: 'manual',
          message: 'Vui lòng chọn sản phẩm hợp lệ',
        });

        if (!firstInvalidField) {
          firstInvalidField = fieldName;
        }
        continue;
      }

      if (!Number.isFinite(detail.quantity) || detail.quantity <= 0) {
        const fieldName = `details.${index}.quantity` as const;
        setError(fieldName, {
          type: 'manual',
          message: 'Số lượng xuất phải lớn hơn 0',
        });

        if (!firstInvalidField) {
          firstInvalidField = fieldName;
        }
        continue;
      }

      const inventory = await getOutboundProductInventoryAvailability(detail.product_id);
      const availableQty = inventory.availableQty;

      if (detail.quantity > availableQty) {
        const fieldName = `details.${index}.quantity` as const;
        setError(fieldName, {
          type: 'manual',
          message: `Số lượng xuất vượt quá tồn kho khả dụng (${availableQty})`,
        });

        if (!firstInvalidField) {
          firstInvalidField = fieldName;
        }
      } else {
        clearErrors(`details.${index}.quantity` as const);
      }
    }

    if (firstInvalidField) {
      setFocus(firstInvalidField);
      return false;
    }

    return true;
  };

  const onSubmit = async (values: CreateStockOutSchemaValues) => {
    const isInventoryValid = await validateDetailsWithInventory(values.details);
    if (!isInventoryValid) {
      return;
    }

    const payload = {
      warehouse_location_id: values.warehouse_location_id,
      type: values.type,
      reference_number: values.reference_number || undefined,
      supplier_id: values.supplier_id ?? undefined,
      description: values.description || undefined,
      details: values.details.map((d) => ({
        product_id: d.product_id,
        quantity: d.quantity,
        unit_price: d.unit_price ?? undefined,
      })),
    };

    const mutation = isReturn ? createReturnMutation : createSalesMutation;
    const order = await mutation.mutateAsync(payload);
    navigate(`/outbound/${order.id}`);
  };

  const isSaving = isSubmitting || createSalesMutation.isPending || createReturnMutation.isPending;

  return (
    <div className="h-full overflow-y-auto bg-slate-50">
      <div className="max-w-3xl mx-auto p-6 lg:p-8 space-y-6">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3"
        >
          <button
            onClick={() => navigate('/outbound')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
              <span className="material-symbols-outlined text-[12px]">local_shipping</span>
              Phiếu xuất / Tạo mới
            </div>
            <h1 className="text-xl font-bold text-slate-800">Tạo phiếu xuất kho mới</h1>
          </div>
        </motion.div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

            {/* Thông tin chung */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-6 space-y-5"
            >
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <span className="material-symbols-outlined text-blue-600 text-[18px]">info</span>
                <h2 className="text-sm font-bold text-slate-800">Thông tin phiếu</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Loại phiếu */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Loại phiếu <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('type')}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-colors font-medium"
                  >
                    <option value="SALES">Xuất bán (SALES)</option>
                    <option value="RETURN_TO_SUPPLIER">Trả NCC (RETURN_TO_SUPPLIER)</option>
                  </select>
                </div>

                {/* Warehouse Location ID */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    ID Vị trí kho <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    placeholder="VD: 5"
                    {...register('warehouse_location_id', { valueAsNumber: true })}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-colors"
                  />
                  {errors.warehouse_location_id && (
                    <p className="text-xs text-red-500 mt-1">{errors.warehouse_location_id.message}</p>
                  )}
                </div>

                {/* Reference Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Số tham chiếu
                  </label>
                  <input
                    {...register('reference_number')}
                    placeholder="VD: SO-2024-001"
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-colors"
                  />
                </div>

                {/* Supplier ID (chỉ hiện khi RETURN) */}
                <AnimatePresence>
                  {isReturn && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        ID Nhà cung cấp
                      </label>
                      <input
                        type="number"
                        min={1}
                        placeholder="VD: 12"
                        {...register('supplier_id', {
                          setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                        })}
                        className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-colors"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Ghi chú / Mô tả
                  </label>
                  <textarea
                    {...register('description')}
                    rows={2}
                    placeholder="Mô tả thêm về phiếu xuất..."
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white focus:border-blue-400 transition-colors"
                  />
                </div>
              </div>
            </motion.div>

            {/* Line Items */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-100 shadow-sm p-6"
            >
              <LineItemEditor />
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="flex items-center justify-end gap-3 pb-8"
            >
              <button
                type="button"
                onClick={() => navigate('/outbound')}
                disabled={isSaving}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-xl font-bold text-sm transition-all active:scale-95 shadow-sm shadow-blue-700/20 disabled:opacity-60"
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]">save</span>
                    Tạo phiếu xuất
                  </>
                )}
              </button>
            </motion.div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}
