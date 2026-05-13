import { Fragment, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import {
  useStockInDetail,
  useRecordReceipt,
  useCreateDiscrepancy,
  useResolveDiscrepancy,
} from '../hooks/useInboundDetail';
import { useApproveStockIn, useCompleteStockIn } from '../hooks/useInbound';
import { WorkflowStepper } from './WorkflowStepper';
import { AllocateLotsSheet } from './AllocateLotsSheet';
import { StatePanel } from '@/components/StatePanel';
import { ZoneMapEmbed, extractZoneCode } from './ZoneMapEmbed';
import { cn } from '@/lib/utils';
import type { StockIn, StockInDetail } from '../types/inboundType';
import { STOCK_IN_STATUS_LABELS, computeStockInTotalValue } from '../types/inboundType';
import { Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export function InboundDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const canApprove = usePermission('stock_ins:approve');
  const canRecord  = usePermission('stock_ins:update');
  const canSeeValue = usePermission('stock_ins:approve');

  const { data, isLoading, isError } = useStockInDetail(numId);
  const approveMutation     = useApproveStockIn();
  const completeMutation    = useCompleteStockIn();
  const recordMutation      = useRecordReceipt(numId);
  const discrepancyMutation = useCreateDiscrepancy(numId);
  const resolveMutation     = useResolveDiscrepancy(numId);

  const [receivedQtys, setReceivedQtys]       = useState<Record<number, number>>({});
  const [discReason, setDiscReason]           = useState('');
  const [showDiscForm, setShowDiscForm]       = useState(false);
  const [showAllocateSheet, setShowAllocateSheet] = useState(false);

  const handleQtyChange = useCallback((detailId: number, val: number) => {
    setReceivedQtys((prev) => ({ ...prev, [detailId]: val }));
  }, []);

  const handleApprove = useCallback(() => {
    if (!data) return;
    approveMutation.mutate(data.id, {
      onSuccess: () =>
        toast({ title: 'Đã duyệt', description: 'Trạng thái đơn hàng đã chuyển sang Chờ duyệt.' }),
      onError: (e) =>
        toast({ title: 'Duyệt thất bại', description: (e as Error).message, variant: 'destructive' }),
    });
  }, [data, approveMutation, toast]);

  const handleRecord = useCallback(() => {
    if (!data) return;
    const details = data.details.map((d) => ({
      stock_in_detail_id: d.id,
      received_quantity: receivedQtys[d.id] ?? Number(d.received_quantity),
    }));
    recordMutation.mutate(
      { details },
      {
        onSuccess: () => {
          toast({
            title: 'Đã lưu biên nhận',
            description:
              'Số lượng thực nhận đã được lưu. Hãy phân bổ lô hàng vào vị trí trước khi hoàn tất.',
          });
          setReceivedQtys({});
        },
        onError: (e) =>
          toast({ title: 'Lưu thất bại', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }, [data, receivedQtys, recordMutation, toast]);

  const handleDiscrepancy = useCallback(() => {
    if (!discReason.trim()) return;
    discrepancyMutation.mutate(
      { reason: discReason },
      {
        onSuccess: () => {
          toast({ title: 'Đã báo cáo sai lệch', description: 'Bản ghi sai lệch đã được tạo.' });
          setShowDiscForm(false);
          setDiscReason('');
        },
        onError: (e) =>
          toast({ title: 'Thất bại', description: (e as Error).message, variant: 'destructive' }),
      },
    );
  }, [discReason, discrepancyMutation, toast]);

  // AC03/AC04/AC05 — FE pre-submit guard before calling completeStockIn
  const handleComplete = useCallback(() => {
    if (!data) return;

    for (const detail of data.details) {
      const received = Number(detail.received_quantity);
      if (received <= 0) continue;

      // AC03 & AC04 — storage location + lot must be allocated
      if (detail.lots.length === 0) {
        toast({
          title: 'Chưa phân bổ lô hàng',
          description: `Sản phẩm "${detail.product.name}" chưa được phân bổ vào vị trí lưu kho. Vui lòng phân bổ lô trước khi hoàn tất.`,
          variant: 'destructive',
        });
        return;
      }

      // AC05 — sum of allocated lot quantities must equal received quantity
      const totalAllocated = detail.lots.reduce((acc, l) => acc + Number(l.quantity), 0);
      if (Math.abs(totalAllocated - received) > 0.001) {
        toast({
          title: 'Số lượng phân bổ chưa khớp',
          description: `Sản phẩm "${detail.product.name}": đã nhận ${received.toLocaleString()}, đã phân bổ ${totalAllocated.toLocaleString()}. Vui lòng kiểm tra lại.`,
          variant: 'destructive',
        });
        return;
      }
    }

    completeMutation.mutate(data.id, {
      onSuccess: () =>
        toast({ title: 'Hoàn tất', description: 'Phiếu nhập kho đã được hoàn tất thành công.' }),
      onError: (e) =>
        toast({ title: 'Hoàn tất thất bại', description: (e as Error).message, variant: 'destructive' }),
    });
  }, [data, completeMutation, toast]);

  if (!id || isNaN(numId)) {
    return (
      <StatePanel
        tone="error"
        title="ID không hợp lệ"
        description="Không có mã đơn hàng hợp lệ trong URL."
      />
    );
  }
  if (isLoading) {
    return (
      <StatePanel
        title="Đang tải đơn hàng..."
        description="Vui lòng chờ trong khi dữ liệu đơn hàng đang được tải."
      />
    );
  }
  if (isError || !data) {
    return (
      <StatePanel
        tone="error"
        title="Tải thất bại"
        description="Không thể lấy chi tiết đơn hàng."
      />
    );
  }

  const totalValue = computeStockInTotalValue(data.details);

  return (
    <>
      <motion.div
        className="space-y-5 p-3 md:p-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <button
              onClick={() => navigate('/inbound')}
              className="mb-1 flex items-center gap-1 text-xs text-slate-500 transition-colors hover:text-slate-700"
            >
              <span className="material-symbols-outlined text-sm">arrow_back</span>
              <span className="font-medium uppercase tracking-widest">Quản lý nhập kho</span>
            </button>
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{data.code}</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Vị trí:{' '}
              <span className="font-semibold text-slate-700">{data.location.full_path}</span>
              {' '}·{' '}
              Tạo bởi{' '}
              <span className="font-semibold text-slate-700">{data.creator.full_name}</span>
            </p>
          </div>

          {/* Action buttons — role + status gated */}
          <div className="flex flex-wrap gap-2">
            {/* Approve — only on DRAFT */}
            {canApprove && data.status === 'DRAFT' && (
              <ActionButton
                label="Duyệt phiếu"
                icon="approval"
                color="blue"
                loading={approveMutation.isPending}
                onClick={handleApprove}
              />
            )}

            {/* Record Receipt — on PENDING or IN_PROGRESS */}
            {canRecord && (data.status === 'PENDING' || data.status === 'IN_PROGRESS') && (
              <ActionButton
                label="Lưu biên nhận"
                icon="save"
                color="slate"
                loading={recordMutation.isPending}
                onClick={handleRecord}
              />
            )}

            {/* Allocate Lots — on IN_PROGRESS */}
            {canRecord && data.status === 'IN_PROGRESS' && (
              <ActionButton
                label="Phân bổ lô"
                icon="inventory_2"
                color="indigo"
                loading={false}
                onClick={() => setShowAllocateSheet(true)}
              />
            )}

            {/* Report Discrepancy — on IN_PROGRESS */}
            {canRecord && data.status === 'IN_PROGRESS' && (
              <ActionButton
                label="Báo cáo sai lệch"
                icon="warning"
                color="amber"
                loading={false}
                onClick={() => setShowDiscForm((v) => !v)}
              />
            )}

            {/* Complete — on IN_PROGRESS or DISCREPANCY */}
            {canApprove &&
              (data.status === 'IN_PROGRESS' || data.status === 'DISCREPANCY') && (
                <ActionButton
                  label="Hoàn tất"
                  icon="task_alt"
                  color="emerald"
                  loading={completeMutation.isPending}
                  onClick={handleComplete}
                />
              )}
          </div>
        </div>

        {/* Discrepancy inline form */}
        {showDiscForm && (
          <motion.div
            className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-sm font-semibold text-amber-800">Báo cáo sai lệch</p>
            <textarea
              value={discReason}
              onChange={(e) => setDiscReason(e.target.value)}
              placeholder="Mô tả sai lệch (tối thiểu 5 ký tự)…"
              rows={3}
              className="w-full resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowDiscForm(false); setDiscReason(''); }}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-white"
              >
                Huỷ
              </button>
              <button
                onClick={handleDiscrepancy}
                disabled={discReason.trim().length < 5 || discrepancyMutation.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                {discrepancyMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Gửi
              </button>
            </div>
          </motion.div>
        )}

        {/* Workflow stepper */}
        <WorkflowStepper
          status={data.status}
          createdAt={data.created_at}
          updatedAt={data.updated_at}
        />

        {/* Main grid */}
        <div className="grid grid-cols-12 gap-5">
          {/* Left: items table + discrepancy list */}
          <div className="col-span-12 space-y-4 xl:col-span-8">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">Danh sách sản phẩm</h3>
              <span className="text-xs font-medium text-slate-500">
                {data.details.length} sản phẩm
              </span>
            </div>
            <ItemsTable
              details={data.details}
              receivedQtys={receivedQtys}
              onQtyChange={handleQtyChange}
              canEdit={canRecord && (data.status === 'PENDING' || data.status === 'IN_PROGRESS')}
            />

            {/* Discrepancy list */}
            {data.discrepancies.length > 0 && (
              <DiscrepancyList
                discrepancies={data.discrepancies}
                stockInId={data.id}
                canResolve={canApprove}
                onResolve={(discId, action_taken) =>
                  resolveMutation.mutate(
                    { discId, payload: { action_taken } },
                    {
                      onSuccess: () => toast({ title: 'Đã giải quyết sai lệch' }),
                      onError: (e) =>
                        toast({
                          title: 'Giải quyết thất bại',
                          description: (e as Error).message,
                          variant: 'destructive',
                        }),
                    },
                  )
                }
                isResolving={resolveMutation.isPending}
              />
            )}
          </div>

          {/* Right: info panel + zone map */}
          <div className="col-span-12 space-y-4 xl:col-span-4">
            <InfoCard data={data} canSeeValue={canSeeValue} totalValue={totalValue} />
            {(() => {
              const zoneCode = data.location?.location_code
                ? extractZoneCode(data.location.location_code)
                : null;
              if (!zoneCode) return null;
              return (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Zone Map · {data.location.location_code}
                  </p>
                  <ZoneMapEmbed zoneCode={zoneCode} compact />
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>

      {/* Lot allocation sheet */}
      <AllocateLotsSheet
        open={showAllocateSheet}
        onClose={() => setShowAllocateSheet(false)}
        stockInId={data.id}
        details={data.details}
        defaultLocationId={data.location.id}
        defaultLocationCode={data.location.location_code}
      />
    </>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────

type ActionColor = 'blue' | 'slate' | 'amber' | 'emerald' | 'indigo';

const ACTION_COLOR_MAP: Record<ActionColor, string> = {
  blue:    'bg-blue-600 hover:bg-blue-700 text-white',
  slate:   'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700',
  amber:   'bg-amber-500 hover:bg-amber-600 text-white',
  emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  indigo:  'bg-indigo-600 hover:bg-indigo-700 text-white',
};

function ActionButton({
  label,
  icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  icon: string;
  color: ActionColor;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        ACTION_COLOR_MAP[color],
      )}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span className="material-symbols-outlined text-lg">{icon}</span>
      )}
      {label}
    </button>
  );
}

// ── Items table ───────────────────────────────────────────────────────────────

type LotStatus = 'na' | 'none' | 'partial' | 'full';

function getLotStatus(detail: StockInDetail): LotStatus {
  const received = Number(detail.received_quantity);
  if (received <= 0) return 'na';
  if (detail.lots.length === 0) return 'none';
  const totalAllocated = detail.lots.reduce((acc, l) => acc + Number(l.quantity), 0);
  return Math.abs(totalAllocated - received) > 0.001 ? 'partial' : 'full';
}

function ItemsTable({
  details,
  receivedQtys,
  onQtyChange,
  canEdit,
}: {
  details: StockInDetail[];
  receivedQtys: Record<number, number>;
  onQtyChange: (id: number, val: number) => void;
  canEdit: boolean;
}) {
  return (
    <div className="overflow-auto rounded-xl border border-slate-100 bg-white shadow-sm">
      <table className="w-full min-w-[680px] border-collapse">
        <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Sản phẩm
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              SL dự kiến
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              SL thực nhận
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Đơn vị
            </th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Đơn giá
            </th>
            <th className="px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Phân bổ lô
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {details.map((d, i) => {
            const expected = Number(d.expected_quantity);
            const received = receivedQtys[d.id] ?? Number(d.received_quantity);
            const hasGap   = expected !== received && Number(d.received_quantity) > 0;
            const lotStatus = getLotStatus(d);
            const receivedFromBE = Number(d.received_quantity);
            const totalAllocated = d.lots.reduce((acc, l) => acc + Number(l.quantity), 0);

            return (
              <Fragment key={d.id}>
                {/* Main product row */}
                <motion.tr
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.18, delay: i * 0.04 }}
                  className={cn('hover:bg-slate-50/50', hasGap && 'bg-amber-50/40')}
                >
                  <td className="px-4 py-2.5">
                    <p className="text-sm font-medium text-slate-800">{d.product.name}</p>
                    <p className="text-[11px] text-slate-400">{d.product.code}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">
                    {expected.toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canEdit ? (
                      <input
                        type="number"
                        value={receivedQtys[d.id] ?? Number(d.received_quantity)}
                        onChange={(e) => onQtyChange(d.id, Number(e.target.value))}
                        min={0}
                        className="h-7 w-20 rounded-md border border-slate-200 bg-white px-2 text-right text-sm tabular-nums outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                      />
                    ) : (
                      <span
                        className={cn(
                          'text-sm tabular-nums',
                          hasGap ? 'font-semibold text-amber-600' : 'text-slate-600',
                        )}
                      >
                        {Number(d.received_quantity).toLocaleString()}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-slate-500">
                    {d.product.base_uom.code}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm tabular-nums text-slate-600">
                    {d.unit_price ? `$${Number(d.unit_price).toFixed(2)}` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {lotStatus === 'na' && (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                    {lotStatus === 'none' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-rose-200">
                        <AlertTriangle className="h-3 w-3" />
                        Chưa phân bổ
                      </span>
                    )}
                    {lotStatus === 'partial' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-200">
                        <AlertTriangle className="h-3 w-3" />
                        Còn thiếu {(receivedFromBE - totalAllocated).toLocaleString()}
                      </span>
                    )}
                    {lotStatus === 'full' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
                        <CheckCircle2 className="h-3 w-3" />
                        Đầy đủ
                      </span>
                    )}
                  </td>
                </motion.tr>

                {/* Lot chips sub-row — only when lots have been allocated */}
                {d.lots.length > 0 && (
                  <tr className="bg-slate-50/30">
                    <td colSpan={6} className="px-4 pb-3 pt-0">
                      <div className="flex flex-wrap gap-1.5 border-l-2 border-indigo-200 pl-2">
                        {d.lots.map((lot) => (
                          <span
                            key={lot.id}
                            className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200"
                          >
                            <span className="font-semibold text-indigo-600">
                              {lot.product_lot.lot_no}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="tabular-nums">
                              {Number(lot.quantity).toLocaleString()} {d.product.base_uom.code}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              @ {lot.product_lot.inventory.location.full_path}
                            </span>
                            {lot.product_lot.expired_date && (
                              <>
                                <span className="text-slate-300">·</span>
                                <span className="text-[10px] text-slate-400">
                                  HSD:{' '}
                                  {new Date(lot.product_lot.expired_date).toLocaleDateString(
                                    'vi-VN',
                                  )}
                                </span>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Discrepancy list ──────────────────────────────────────────────────────────

function DiscrepancyList({
  discrepancies,
  canResolve,
  onResolve,
  isResolving,
}: {
  discrepancies: StockIn['discrepancies'];
  stockInId: number;
  canResolve: boolean;
  onResolve: (discId: number, action_taken: string) => void;
  isResolving: boolean;
}) {
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [actionText, setActionText]   = useState('');

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-bold text-amber-800">Danh sách sai lệch</p>
      {discrepancies.map((d) => (
        <div
          key={d.id}
          className="space-y-2 rounded-lg border border-amber-100 bg-white p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-500">
                Dự kiến{' '}
                <span className="font-semibold text-slate-700">
                  {Number(d.expected_qty).toLocaleString()}
                </span>
                {' '}· Thực tế{' '}
                <span className="font-semibold text-slate-700">
                  {Number(d.actual_qty).toLocaleString()}
                </span>
              </p>
              <p className="text-sm text-slate-700">{d.reason}</p>
              {d.action_taken && (
                <p className="text-xs text-emerald-600">Giải pháp: {d.action_taken}</p>
              )}
            </div>
            <span
              className={cn(
                'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
                d.status === 'RESOLVED'
                  ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-amber-200',
              )}
            >
              {d.status}
            </span>
          </div>

          {canResolve && d.status === 'PENDING' && (
            resolvingId === d.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={actionText}
                  onChange={(e) => setActionText(e.target.value)}
                  placeholder="Mô tả hành động đã thực hiện (tối thiểu 5 ký tự)…"
                  className="h-8 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    onClick={() => { setResolvingId(null); setActionText(''); }}
                    className="text-xs text-slate-500 hover:text-slate-700"
                  >
                    Huỷ
                  </button>
                  <button
                    onClick={() => {
                      onResolve(d.id, actionText);
                      setResolvingId(null);
                      setActionText('');
                    }}
                    disabled={actionText.trim().length < 5 || isResolving}
                    className="flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {isResolving && <Loader2 className="h-3 w-3 animate-spin" />}
                    Resolve
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setResolvingId(d.id)}
                className="text-xs font-medium text-blue-600 hover:underline"
              >
                Resolve…
              </button>
            )
          )}
        </div>
      ))}
    </div>
  );
}

// ── Info card (right sidebar) ─────────────────────────────────────────────────

function InfoCard({
  data,
  canSeeValue,
  totalValue,
}: {
  data: StockIn;
  canSeeValue: boolean;
  totalValue: number;
}) {
  // Collect unique allocated storage locations from all lots (AC02)
  const allocatedLocations = useMemo(() => {
    const seen = new Set<number>();
    const result: { id: number; path: string }[] = [];
    for (const detail of data.details) {
      for (const lot of detail.lots) {
        const loc = lot.product_lot.inventory.location;
        if (!seen.has(loc.id)) {
          seen.add(loc.id);
          result.push({ id: loc.id, path: loc.full_path });
        }
      }
    }
    return result;
  }, [data.details]);

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Order Code', value: data.code },
    { label: 'Status',     value: STOCK_IN_STATUS_LABELS[data.status] },
    { label: 'Location',   value: data.location.full_path },
    {
      label: 'Supplier',
      value: data.supplier ? `${data.supplier.name} (${data.supplier.code})` : '—',
    },
    { label: 'Created By',   value: data.creator.full_name },
    { label: 'Approved By',  value: data.approver?.full_name ?? '—' },
    {
      label: 'Created',
      value: new Date(data.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
    {
      label: 'Last Updated',
      value: new Date(data.updated_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
    },
  ];

  return (
    <div className="space-y-3 rounded-xl border border-slate-100 bg-white p-5 shadow-sm">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order Info</h4>
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-2 text-sm">
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="truncate text-right font-medium text-slate-800">{value}</dd>
          </div>
        ))}

        {/* AC02 — actual allocated storage locations (distinct from default receipt location) */}
        {allocatedLocations.length > 0 && (
          <div className="flex justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
            <dt className="shrink-0 text-slate-500">Vị trí lưu kho</dt>
            <dd className="flex flex-col items-end gap-0.5">
              {allocatedLocations.map((loc) => (
                <span
                  key={loc.id}
                  className="truncate text-right text-xs font-semibold text-indigo-600"
                >
                  {loc.path}
                </span>
              ))}
            </dd>
          </div>
        )}

        {canSeeValue && totalValue > 0 && (
          <div className="flex justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
            <dt className="text-slate-500">Total Value</dt>
            <dd className="font-bold tabular-nums text-blue-600">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </dd>
          </div>
        )}
      </dl>
      {data.description && (
        <div className="border-t border-slate-100 pt-2">
          <p className="mb-1 text-xs font-semibold text-slate-500">Notes</p>
          <p className="text-sm text-slate-700">{data.description}</p>
        </div>
      )}
    </div>
  );
}
