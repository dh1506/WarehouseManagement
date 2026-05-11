import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';
import { usePermission } from '@/hooks/usePermission';
import { toast } from '@/hooks/use-toast';
import {
  useSubmitStockDisposal,
  useApproveStockDisposal,
  useCompleteStockDisposal,
  useCancelStockDisposal,
} from '../hooks/useStockDisposal';
import type { StockDisposal, StockDisposalStatus } from '../types/stockDisposalType';
import { STOCK_DISPOSAL_STATUS_LABELS, STOCK_DISPOSAL_STATUS_STYLES } from '../types/stockDisposalType';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface StockDisposalDetailProps {
  stockDisposal: StockDisposal;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// ── Status steps for the workflow timeline ─────────────────────────────────────
const WORKFLOW_STEPS: { status: StockDisposalStatus; label: string; icon: string }[] = [
  { status: 'DRAFT', label: 'Đã tạo (Nháp)', icon: 'edit_note' },
  { status: 'PENDING', label: 'Đã gửi duyệt', icon: 'send' },
  { status: 'APPROVED', label: 'Đã duyệt', icon: 'verified' },
  { status: 'COMPLETED', label: 'Hoàn thành (Đã trừ kho)', icon: 'check_circle' },
];

const STATUS_ORDER: Record<StockDisposalStatus, number> = {
  DRAFT: 0,
  PENDING: 1,
  APPROVED: 2,
  COMPLETED: 3,
  CANCELLED: -1,
};

export function StockDisposalDetail({ stockDisposal }: StockDisposalDetailProps) {
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const sd = stockDisposal;
  const details = Array.isArray(sd.details) ? sd.details : [];
  const history = Array.isArray(sd.history) ? sd.history : [];

  const canUpdate = usePermission('stock_disposals:update');
  const canApprove = usePermission('stock_disposals:approve');
  const canCancel = usePermission('stock_disposals:cancel');

  const submitMutation = useSubmitStockDisposal();
  const approveMutation = useApproveStockDisposal();
  const completeMutation = useCompleteStockDisposal();
  const cancelMutation = useCancelStockDisposal();

  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    action: () => void;
    variant: 'default' | 'destructive';
  }>({ open: false, title: '', description: '', action: () => { }, variant: 'default' });

  const isMutating = submitMutation.isPending || approveMutation.isPending ||
    completeMutation.isPending || cancelMutation.isPending;

  // ── Computed values ───────────────────────────────────────────────────────
  const totalValue = details.reduce((sum, d) => {
    const qty = Number(d.quantity) || 0;
    const price = Number(d.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const totalQty = details.reduce((sum, d) => sum + (Number(d.quantity) || 0), 0);

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleSubmit = () => {
    setConfirmDialog({
      open: true,
      title: 'Gửi duyệt',
      description: 'Phiếu sẽ được gửi để quản lý phê duyệt. Phiếu sẽ bị khóa chỉnh sửa.',
      variant: 'default',
      action: () => {
        submitMutation.mutate(sd.id, {
          onSuccess: () => toast({ title: 'Đã gửi duyệt', description: 'Phiếu đã được gửi để phê duyệt.' }),
          onError: (err) => toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }),
        });
      },
    });
  };

  const handleApprove = () => {
    setConfirmDialog({
      open: true,
      title: 'Duyệt phiếu',
      description: 'Xác nhận phê duyệt phiếu thanh lý này. Sau đó có thể hoàn thành để trừ kho.',
      variant: 'default',
      action: () => {
        approveMutation.mutate(sd.id, {
          onSuccess: () => toast({ title: 'Đã duyệt', description: 'Phiếu đã được phê duyệt.' }),
          onError: (err) => toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }),
        });
      },
    });
  };

  const handleComplete = () => {
    setConfirmDialog({
      open: true,
      title: 'Hoàn thành thanh lý',
      description: `Thao tác này sẽ trừ vĩnh viễn ${totalQty} mặt hàng khỏi kho. Không thể hoàn tác.`,
      variant: 'destructive',
      action: () => {
        completeMutation.mutate(sd.id, {
          onSuccess: () => toast({ title: 'Hoàn thành', description: 'Kho đã được trừ thành công.' }),
          onError: (err) => toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }),
        });
      },
    });
  };

  const handleCancel = () => {
    setConfirmDialog({
      open: true,
      title: 'Huỷ phiếu',
      description: 'Bạn có chắc chắn muốn huỷ phiếu thanh lý này? Thao tác này không thể hoàn tác.',
      variant: 'destructive',
      action: () => {
        cancelMutation.mutate(sd.id, {
          onSuccess: () => toast({ title: 'Đã huỷ', description: 'Phiếu đã được huỷ.' }),
          onError: (err) => toast({ title: 'Lỗi', description: err.message, variant: 'destructive' }),
        });
      },
    });
  };

  const currentStep = STATUS_ORDER[sd.status] ?? -1;
  const isCancelled = sd.status === 'CANCELLED';
  const styleCfg = STOCK_DISPOSAL_STATUS_STYLES[sd.status];

  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.22 }}
      className="flex flex-col h-full overflow-auto"
    >
      <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full">
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.22, delay: prefersReducedMotion ? 0 : 0.03 }}
          className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button
                onClick={() => navigate('/stock-disposal')}
                className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Quay lại
              </button>
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ring-inset',
                  styleCfg.bg, styleCfg.text, styleCfg.ring,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', styleCfg.dot)} />
                {STOCK_DISPOSAL_STATUS_LABELS[sd.status]}
              </span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-slate-900">{sd.code}</h2>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="material-symbols-outlined text-[14px]">calendar_today</span>
              Tạo lúc {formatDate(sd.created_at)} bởi {sd.creator?.full_name ?? 'Không xác định'}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {sd.status === 'DRAFT' && canUpdate && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={isMutating || details.length === 0}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Gửi duyệt
              </motion.button>
            )}
            {sd.status === 'PENDING' && canApprove && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleApprove}
                disabled={isMutating}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Duyệt
              </motion.button>
            )}
            {sd.status === 'APPROVED' && canApprove && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleComplete}
                disabled={isMutating}
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Hoàn thành & Trừ kho
              </motion.button>
            )}
            {!isCancelled && sd.status !== 'COMPLETED' && canCancel && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCancel}
                disabled={isMutating}
                className="px-5 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Huỷ phiếu
              </motion.button>
            )}
          </div>
        </motion.div>

        {/* ── Bento Grid ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column: Details & Items */}
          <div className="col-span-12 lg:col-span-8 space-y-6">
            {/* Disposal Context Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="bg-white rounded-xl p-6 shadow-sm border border-slate-100"
            >
              <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">description</span>
                Thông tin thanh lý
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mã phiếu</p>
                  <p className="text-sm font-semibold text-slate-800 font-mono">{sd.code}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Người duyệt</p>
                  <p className="text-sm font-medium text-slate-700">
                    {sd.approver ? sd.approver.full_name : <span className="text-slate-400 italic">Chưa được phân công</span>}
                  </p>
                </div>
                {sd.description && (
                  <div className="col-span-full space-y-1">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mô tả</p>
                    <p className="text-sm text-slate-600 leading-relaxed">{sd.description}</p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Items Table */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100"
            >
              <div className="p-5 border-b border-slate-100">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-800">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">list_alt</span>
                  Mặt hàng thanh lý
                  <span className="ml-auto text-xs font-medium text-slate-400 tabular-nums">
                    {details.length} dòng
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-150 text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">#</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sản phẩm</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Vị trí</th>
                      <th className="px-5 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Lý do</th>
                      <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">SL</th>
                      <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Đơn giá</th>
                      <th className="px-5 py-3 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {details.map((detail, i) => {
                      const qty = Number(detail.quantity) || 0;
                      const price = Number(detail.unit_price) || 0;
                      const lineAmount = qty * price;
                      return (
                        <motion.tr
                          key={detail.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: 0.2 + i * 0.03 }}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          <td className="px-5 py-3.5 text-xs text-slate-400 tabular-nums">{i + 1}</td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-slate-800">{detail.product.name}</span>
                              <span className="text-[11px] text-slate-400 font-mono">{detail.product.code}</span>
                              {detail.lot && (
                                <span className="text-[10px] text-slate-400 mt-0.5">
                                  Lô: {detail.lot.lot_no}
                                  {detail.lot.expired_date && ` · HSD: ${new Date(detail.lot.expired_date).toLocaleDateString('vi-VN')}`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="text-xs text-slate-600">{detail.location.full_path}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                              {detail.reason.name}
                            </span>
                            {detail.reason_note && (
                              <p className="text-[10px] text-slate-400 mt-0.5 max-w-40 truncate" title={detail.reason_note}>
                                {detail.reason_note}
                              </p>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm font-medium text-slate-700 tabular-nums">{qty}</td>
                          <td className="px-5 py-3.5 text-right text-sm text-slate-600 tabular-nums">
                            {price > 0 ? formatCurrency(price) : '—'}
                          </td>
                          <td className="px-5 py-3.5 text-right text-sm font-bold text-slate-800 tabular-nums">
                            {lineAmount > 0 ? formatCurrency(lineAmount) : '—'}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                  {totalValue > 0 && (
                    <tfoot>
                      <tr className="bg-slate-50/70">
                        <td colSpan={4} />
                        <td className="px-5 py-3 text-right text-xs font-bold text-slate-500 uppercase">Tổng cộng</td>
                        <td />
                        <td className="px-5 py-3 text-right text-base font-extrabold text-rose-600">
                          {formatCurrency(totalValue)}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
              {details.length === 0 && (
                <div className="p-8 text-center">
                  <span className="material-symbols-outlined text-[40px] text-slate-300">inbox</span>
                  <p className="text-sm text-slate-400 mt-2">Chưa có mặt hàng nào</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column: Workflow & Summary */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.1 }}
              className="bg-linear-to-br from-blue-600 to-blue-800 text-white rounded-2xl p-6 shadow-lg relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-symbols-outlined text-blue-200 text-[20px]">analytics</span>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-blue-200">Tổng quan</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-blue-200">Tổng mặt hàng</p>
                    <p className="text-2xl font-extrabold">{details.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-blue-200">Tổng số lượng</p>
                    <p className="text-2xl font-extrabold">{totalQty}</p>
                  </div>
                </div>
                {totalValue > 0 && (
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <p className="text-xs text-blue-200">Tổng giá trị thanh lý</p>
                    <p className="text-2xl font-extrabold mt-1">{formatCurrency(totalValue)}</p>
                  </div>
                )}
              </div>
              <span className="material-symbols-outlined text-white/10 absolute -right-4 -bottom-4 select-none pointer-events-none" style={{ fontSize: 140 }}>
                receipt_long
              </span>
            </motion.div>

            {/* Approval Workflow Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
            >
              <h3 className="text-base font-bold mb-5 flex items-center gap-2 text-slate-800">
                <span className="material-symbols-outlined text-blue-600 text-[20px]">account_tree</span>
                Quy trình phê duyệt
              </h3>
              <div className="space-y-6 relative">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-200" />

                {isCancelled ? (
                  /* Cancelled state */
                  <div className="relative flex gap-4">
                    <div className="z-10 w-6 h-6 rounded-full bg-rose-500 flex items-center justify-center">
                      <span className="material-symbols-outlined text-xs text-white" style={{ fontVariationSettings: "'wght' 700" }}>close</span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-rose-600">Đã huỷ</p>
                      <p className="text-xs text-slate-500">Phiếu này đã bị huỷ</p>
                    </div>
                  </div>
                ) : (
                  WORKFLOW_STEPS.map((step, i) => {
                    const stepOrder = STATUS_ORDER[step.status];
                    const isDone = currentStep > stepOrder;
                    const isActive = currentStep === stepOrder;
                    const isUpcoming = currentStep < stepOrder;

                    return (
                      <motion.div
                        key={step.status}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2, delay: 0.2 + i * 0.06 }}
                        className={cn('relative flex gap-4', isUpcoming && 'opacity-40')}
                      >
                        <div
                          className={cn(
                            'z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0',
                            isDone && 'bg-blue-600',
                            isActive && 'bg-blue-100 border-4 border-white shadow-sm',
                            isUpcoming && 'bg-slate-200 border-4 border-white',
                          )}
                        >
                          {isDone && (
                            <span className="material-symbols-outlined text-xs text-white" style={{ fontVariationSettings: "'wght' 700" }}>check</span>
                          )}
                          {isActive && (
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                          )}
                        </div>
                        <div>
                          <p className={cn('text-sm font-bold', isActive ? 'text-blue-600' : 'text-slate-700')}>{step.label}</p>
                          {isActive && (
                            <p className="text-xs text-blue-500 font-medium mt-0.5">Đang xử lý</p>
                          )}
                          {isDone && (
                            <p className="text-xs text-slate-400 mt-0.5">Hoàn thành</p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </motion.div>

            {/* Status History */}
            {history.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.2 }}
                className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100"
              >
                <h3 className="text-base font-bold mb-4 flex items-center gap-2 text-slate-800">
                  <span className="material-symbols-outlined text-blue-600 text-[20px]">history</span>
                  Lịch sử hoạt động
                </h3>
                <div className="space-y-4">
                  {history.map((h, i) => {
                    const hStyle = STOCK_DISPOSAL_STATUS_STYLES[h.status];
                    return (
                      <motion.div
                        key={h.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: 0.25 + i * 0.04 }}
                        className="flex gap-3"
                      >
                        <div className={cn('mt-0.5 w-2 h-2 rounded-full shrink-0', hStyle.dot)} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className={cn('text-[10px] font-bold uppercase tracking-wide', hStyle.text)}>
                              {STOCK_DISPOSAL_STATUS_LABELS[h.status]}
                            </span>
                            <span className="text-[10px] text-slate-400">·</span>
                            <span className="text-[10px] text-slate-400">{h.creator.full_name}</span>
                          </div>
                          {h.note && <p className="text-xs text-slate-500 mt-0.5">{h.note}</p>}
                          <p className="text-[10px] text-slate-400 mt-0.5">{formatDate(h.created_at)}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmDialog.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDialog.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Huỷ</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirmDialog.action();
                setConfirmDialog((prev) => ({ ...prev, open: false }));
              }}
              disabled={isMutating}
              className={cn(
                confirmDialog.variant === 'destructive'
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white',
              )}
            >
              {isMutating ? 'Đang xử lý…' : 'Xác nhận'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}
