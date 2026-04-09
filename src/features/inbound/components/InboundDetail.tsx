import { useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';
import { useStockInDetail, useRecordReceipt, useCreateDiscrepancy, useResolveDiscrepancy } from '../hooks/useInboundDetail';
import { useApproveStockIn, useCompleteStockIn } from '../hooks/useInbound';
import { WorkflowStepper } from './WorkflowStepper';
import { StatePanel } from '@/components/StatePanel';
import { ZoneMapEmbed, extractZoneCode } from './ZoneMapEmbed';
import { cn } from '@/lib/utils';
import type { StockIn, StockInDetail } from '../types/inboundType';
import { STOCK_IN_STATUS_LABELS, computeStockInTotalValue } from '../types/inboundType';
import { Loader2 } from 'lucide-react';

export function InboundDetail() {
  const { id } = useParams<{ id: string }>();
  const numId = Number(id);
  const navigate = useNavigate();
  const { toast } = useToast();

  const canApprove = usePermission('stock_ins:approve');
  const canRecord = usePermission('stock_ins:update');
  const canSeeValue = usePermission('stock_ins:approve');

  const { data, isLoading, isError } = useStockInDetail(numId);
  const approveMutation = useApproveStockIn();
  const completeMutation = useCompleteStockIn();
  const recordMutation = useRecordReceipt(numId);
  const discrepancyMutation = useCreateDiscrepancy(numId);
  const resolveMutation = useResolveDiscrepancy(numId);

  // Local edit state for received quantities
  const [receivedQtys, setReceivedQtys] = useState<Record<number, number>>({});
  const [discReason, setDiscReason] = useState('');
  const [showDiscForm, setShowDiscForm] = useState(false);

  const handleQtyChange = useCallback((detailId: number, val: number) => {
    setReceivedQtys((prev) => ({ ...prev, [detailId]: val }));
  }, []);

  const handleApprove = useCallback(() => {
    if (!data) return;
    approveMutation.mutate(data.id, {
      onSuccess: () => toast({ title: 'Approved', description: 'Order status changed to Pending Approval.' }),
      onError: (e) => toast({ title: 'Approve failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }, [data, approveMutation, toast]);

  const handleRecord = useCallback(() => {
    if (!data) return;
    const details = data.details.map((d) => ({
      stock_in_detail_id: d.id,
      received_quantity: receivedQtys[d.id] ?? Number(d.received_quantity),
    }));
    recordMutation.mutate({ details }, {
      onSuccess: () => {
        toast({
          title: 'Receipt recorded',
          description: 'Received quantities saved. Warehouse Hub occupancy updates after the Complete step.',
        });
        setReceivedQtys({});
      },
      onError: (e) => toast({ title: 'Record failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }, [data, receivedQtys, recordMutation, toast]);

  const handleDiscrepancy = useCallback(() => {
    if (!discReason.trim()) return;
    discrepancyMutation.mutate({ reason: discReason }, {
      onSuccess: () => {
        toast({ title: 'Discrepancy reported', description: 'Discrepancy record created.' });
        setShowDiscForm(false);
        setDiscReason('');
      },
      onError: (e) => toast({ title: 'Failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }, [discReason, discrepancyMutation, toast]);

  const handleComplete = useCallback(() => {
    if (!data) return;
    completeMutation.mutate(data.id, {
      onSuccess: () => toast({ title: 'Completed', description: 'Stock-in order has been finalised.' }),
      onError: (e) => toast({ title: 'Complete failed', description: (e as Error).message, variant: 'destructive' }),
    });
  }, [data, completeMutation, toast]);

  if (!id || isNaN(numId)) {
    return <StatePanel tone="error" title="Invalid ID" description="No valid order ID in URL." />;
  }
  if (isLoading) return <StatePanel title="Loading order..." description="Please wait while order data is loading." />;
  if (isError || !data) return <StatePanel tone="error" title="Load failed" description="Could not fetch order details." />;

  const totalValue = computeStockInTotalValue(data.details);

  return (
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
            className="flex items-center gap-1 text-xs text-slate-500 mb-1 hover:text-slate-700 transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            <span className="uppercase tracking-widest font-medium">Inbound Management</span>
          </button>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{data.code}</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Location: <span className="font-semibold text-slate-700">{data.location.full_path}</span>
            {' '}·{' '}
            Created by <span className="font-semibold text-slate-700">{data.creator.full_name}</span>
          </p>
        </div>

        {/* Action buttons — role + status gated */}
        <div className="flex flex-wrap gap-2">
          {/* CEO: Approve — only on DRAFT */}
          {canApprove && data.status === 'DRAFT' && (
            <ActionButton
              label="Approve"
              icon="approval"
              color="blue"
              loading={approveMutation.isPending}
              onClick={handleApprove}
            />
          )}

          {/* Manager/Staff: Record Receipt — on PENDING or IN_PROGRESS */}
          {canRecord && (data.status === 'PENDING' || data.status === 'IN_PROGRESS') && (
            <ActionButton
              label="Save Receipt"
              icon="save"
              color="slate"
              loading={recordMutation.isPending}
              onClick={handleRecord}
            />
          )}

          {/* Manager/Staff: Report Discrepancy — on IN_PROGRESS */}
          {canRecord && data.status === 'IN_PROGRESS' && (
            <ActionButton
              label="Report Discrepancy"
              icon="warning"
              color="amber"
              loading={false}
              onClick={() => setShowDiscForm((v) => !v)}
            />
          )}

          {/* CEO: Complete — on IN_PROGRESS or DISCREPANCY (no pending discrepancies) */}
          {canApprove && (data.status === 'IN_PROGRESS' || data.status === 'DISCREPANCY') && (
            <ActionButton
              label="Complete"
              icon="task_alt"
              color="emerald"
              loading={completeMutation.isPending}
              onClick={handleComplete}
            />
          )}
        </div>
      </div>

      {/* Discrepancy form */}
      {showDiscForm && (
        <motion.div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          <p className="text-sm font-semibold text-amber-800">Report Discrepancy</p>
          <textarea
            value={discReason}
            onChange={(e) => setDiscReason(e.target.value)}
            placeholder="Describe the discrepancy (min. 5 characters)…"
            rows={3}
            className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none"
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowDiscForm(false); setDiscReason(''); }}
              className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDiscrepancy}
              disabled={discReason.trim().length < 5 || discrepancyMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
            >
              {discrepancyMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Submit
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
        {/* Left: Items table */}
        <div className="col-span-12 xl:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900">Order Items</h3>
            <span className="text-xs text-slate-500 font-medium">{data.details.length} product(s)</span>
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
                resolveMutation.mutate({ discId, payload: { action_taken } }, {
                  onSuccess: () => toast({ title: 'Discrepancy resolved' }),
                  onError: (e) => toast({ title: 'Resolve failed', description: (e as Error).message, variant: 'destructive' }),
                })
              }
              isResolving={resolveMutation.isPending}
            />
          )}
        </div>

        {/* Right: Info panel + Zone map */}
        <div className="col-span-12 xl:col-span-4 space-y-4">
          <InfoCard data={data} canSeeValue={canSeeValue} totalValue={totalValue} />
          {/* Live bin inventory map for the assigned zone */}
          {(() => {
            const zoneCode = data.location?.location_code
              ? extractZoneCode(data.location.location_code)
              : null;
            if (!zoneCode) return null;
            return (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Zone Map · {data.location.location_code}
                </p>
                <ZoneMapEmbed zoneCode={zoneCode} compact />
              </div>
            );
          })()}
        </div>
      </div>
    </motion.div>
  );
}

// ── Action button ─────────────────────────────────────────────────────────────
function ActionButton({
  label, icon, color, loading, onClick,
}: {
  label: string; icon: string; color: 'blue' | 'slate' | 'amber' | 'emerald';
  loading: boolean; onClick: () => void;
}) {
  const colorMap = {
    blue: 'bg-blue-600 hover:bg-blue-700 text-white',
    slate: 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-700',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  };
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors disabled:opacity-50',
        colorMap[color],
      )}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : <span className="material-symbols-outlined text-lg">{icon}</span>}
      {label}
    </button>
  );
}

// ── Items table ───────────────────────────────────────────────────────────────
function ItemsTable({
  details, receivedQtys, onQtyChange, canEdit,
}: {
  details: StockInDetail[];
  receivedQtys: Record<number, number>;
  onQtyChange: (id: number, val: number) => void;
  canEdit: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm overflow-auto">
      <table className="w-full min-w-140 border-collapse">
        <thead className="border-b border-slate-100 bg-slate-50">
          <tr>
            <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">Product</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Expected Qty</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Received Qty</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unit</th>
            <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wider text-slate-500">Unit Price</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {details.map((d, i) => {
            const expected = Number(d.expected_quantity);
            const received = receivedQtys[d.id] ?? Number(d.received_quantity);
            const hasGap = expected !== received && Number(d.received_quantity) > 0;

            return (
              <motion.tr
                key={d.id}
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
                      className="w-20 h-7 rounded-md border border-slate-200 bg-white px-2 text-right text-sm tabular-nums outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  ) : (
                    <span className={cn('text-sm tabular-nums', hasGap ? 'text-amber-600 font-semibold' : 'text-slate-600')}>
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
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Discrepancy list ──────────────────────────────────────────────────────────
function DiscrepancyList({
  discrepancies, canResolve, onResolve, isResolving,
}: {
  discrepancies: StockIn['discrepancies'];
  stockInId: number;
  canResolve: boolean;
  onResolve: (discId: number, action_taken: string) => void;
  isResolving: boolean;
}) {
  const [resolvingId, setResolvingId] = useState<number | null>(null);
  const [actionText, setActionText] = useState('');

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
      <p className="text-sm font-bold text-amber-800">Discrepancy Records</p>
      {discrepancies.map((d) => (
        <div key={d.id} className="rounded-lg bg-white border border-amber-100 p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-xs text-slate-500">
                Expected <span className="font-semibold text-slate-700">{Number(d.expected_qty).toLocaleString()}</span>
                {' '}· Actual <span className="font-semibold text-slate-700">{Number(d.actual_qty).toLocaleString()}</span>
              </p>
              <p className="text-sm text-slate-700">{d.reason}</p>
              {d.action_taken && (
                <p className="text-xs text-emerald-600">Resolution: {d.action_taken}</p>
              )}
            </div>
            <span className={cn(
              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset',
              d.status === 'RESOLVED'
                ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                : 'bg-amber-50 text-amber-700 ring-amber-200',
            )}>
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
                  placeholder="Describe action taken (min. 5 chars)…"
                  className="w-full h-8 rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                />
                <div className="flex gap-1.5 justify-end">
                  <button onClick={() => { setResolvingId(null); setActionText(''); }} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                  <button
                    onClick={() => { onResolve(d.id, actionText); setResolvingId(null); setActionText(''); }}
                    disabled={actionText.trim().length < 5 || isResolving}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 text-white text-xs font-medium disabled:opacity-50"
                  >
                    {isResolving && <Loader2 className="h-3 w-3 animate-spin" />}
                    Resolve
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setResolvingId(d.id)} className="text-xs text-blue-600 font-medium hover:underline">
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
function InfoCard({ data, canSeeValue, totalValue }: { data: StockIn; canSeeValue: boolean; totalValue: number }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Order Code', value: data.code },
    { label: 'Status', value: STOCK_IN_STATUS_LABELS[data.status] },
    { label: 'Location', value: data.location.full_path },
    { label: 'Supplier', value: data.supplier ? `${data.supplier.name} (${data.supplier.code})` : '—' },
    { label: 'Created By', value: data.creator.full_name },
    { label: 'Approved By', value: data.approver?.full_name ?? '—' },
    { label: 'Created', value: new Date(data.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { label: 'Last Updated', value: new Date(data.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
  ];

  return (
    <div className="rounded-xl border border-slate-100 bg-white shadow-sm p-5 space-y-3">
      <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">Order Info</h4>
      <dl className="space-y-2">
        {rows.map(({ label, value }) => (
          <div key={label} className="flex justify-between gap-2 text-sm">
            <dt className="text-slate-500 shrink-0">{label}</dt>
            <dd className="font-medium text-slate-800 text-right truncate">{value}</dd>
          </div>
        ))}
        {canSeeValue && totalValue > 0 && (
          <div className="flex justify-between gap-2 text-sm pt-2 border-t border-slate-100">
            <dt className="text-slate-500">Total Value</dt>
            <dd className="font-bold text-blue-600 tabular-nums">
              ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </dd>
          </div>
        )}
      </dl>
      {data.description && (
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-500 mb-1">Notes</p>
          <p className="text-sm text-slate-700">{data.description}</p>
        </div>
      )}
    </div>
  );
}
