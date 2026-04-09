import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useOutboundOrder, useCreateOutboundOrder } from '../hooks/useOutbound';
import { outboundFormSchema, type OutboundFormSchemaValues } from '../schemas/outboundSchema';
import { OUTBOUND_STATUS_TRANSITIONS, OUTBOUND_PRIORITY_LABELS, type OutboundStatus } from '../types/outboundType';
import { LineItemEditor } from './LineItemEditor';
import { StatusTransitionDialog } from './StatusTransitionDialog';

const MOCK_WAREHOUSES = [
  { id: '1', name: 'Hanoi Warehouse' },
  { id: '2', name: 'HCM Warehouse' },
  { id: '3', name: 'Da Nang Warehouse' },
];

// ──────────────────────────────────────────────────────────────────────────────
// Create Form
// ──────────────────────────────────────────────────────────────────────────────
export function OutboundCreateForm() {
  const navigate = useNavigate();
  const createMutation = useCreateOutboundOrder();

  const methods = useForm<OutboundFormSchemaValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(outboundFormSchema) as any,
    defaultValues: {
      warehouseId: '',
      priority: 'NORMAL',
      expectedDate: '',
      note: '',
      lineItems: [],
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = methods;

  const onSubmit = async (values: OutboundFormSchemaValues) => {
    const order = await createMutation.mutateAsync(values);
    navigate(`/outbound/${order.id}`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 lg:p-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/outbound')}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]" data-icon="arrow_back">arrow_back</span>
          </button>
          <div>
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-0.5">
              <span className="material-symbols-outlined text-[13px]" data-icon="local_shipping">local_shipping</span>
              <span>Outbound</span>
              <span>/</span>
              <span>Create</span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">Create New Outbound Order</h1>
          </div>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

            {/* General Info Card */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
                <span className="material-symbols-outlined text-primary text-[18px]" data-icon="info">info</span>
                <h2 className="text-sm font-bold text-slate-800">General Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {/* Warehouse */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                    Source Warehouse <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('warehouseId')}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-colors"
                  >
                    <option value="">-- Select Warehouse --</option>
                    {MOCK_WAREHOUSES.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  {errors.warehouseId && (
                    <p className="text-xs text-red-500 mt-1">{errors.warehouseId.message}</p>
                  )}
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Priority</label>
                  <select
                    {...register('priority')}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-colors"
                  >
                    {Object.entries(OUTBOUND_PRIORITY_LABELS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Expected Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Expected Ship Date</label>
                  <input
                    type="date"
                    {...register('expectedDate')}
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-colors"
                  />
                </div>

                {/* Note */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1.5">Note</label>
                  <textarea
                    {...register('note')}
                    rows={2}
                    placeholder="Order notes..."
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white focus:border-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <LineItemEditor />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/outbound')}
                className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl font-bold text-sm hover:bg-primary/90 transition-all active:scale-95 shadow-sm shadow-primary/20 disabled:opacity-60"
              >
                {(isSubmitting || createMutation.isPending) ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[16px]" data-icon="save">save</span>
                    Create Order
                  </>
                )}
              </button>
            </div>
          </form>
        </FormProvider>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Detail View (Refactored to 100% Mockup Spec)
// ──────────────────────────────────────────────────────────────────────────────

export function OutboundDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showTransitionDialog, setShowTransitionDialog] = useState(false);

  const { data: order, isLoading, isError, refetch } = useOutboundOrder(id!);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading Order...</p>
        </div>
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <span className="material-symbols-outlined text-5xl text-red-300" data-icon="error">error</span>
        <p className="text-slate-500">Could not load order #{id}</p>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="text-sm text-primary font-semibold hover:underline">
            Retry
          </button>
          <button onClick={() => navigate('/outbound')} className="text-sm text-slate-500 hover:underline">
            Back to List
          </button>
        </div>
      </div>
    );
  }

  const transitions = OUTBOUND_STATUS_TRANSITIONS[order.status];
  const isPickingActive = order.status === 'PICKING';

  // Format Helper
  const formatEtd = (dateStr: string | null) => {
    if (!dateStr) return '—';
    const dateObj = new Date(dateStr);
    return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Steps Progress Mapping
  // Mockup requested 5 steps: New, Allocated, Picked, Packed, Shipped
  // Our system enum: DRAFT -> CONFIRMED -> PICKING -> COMPLETED
  const STEPS = [
    { label: 'New', mappedStatus: 'DRAFT', stepIdx: 1 },
    { label: 'Allocated', mappedStatus: 'CONFIRMED', stepIdx: 2 },
    { label: 'Picked', mappedStatus: 'PICKING', stepIdx: 3 },
    { label: 'Packed', mappedStatus: 'PICKING_DONE', stepIdx: 4 }, // Logic adapter
    { label: 'Shipped', mappedStatus: 'COMPLETED', stepIdx: 5 }
  ];

  const getStepProgress = (status: OutboundStatus) => {
    if (status === 'COMPLETED') return 5;
    if (status === 'PICKING') return 3;
    if (status === 'CONFIRMED') return 2;
    return 1;
  };
  const currentProgressStep = getStepProgress(order.status);
  const progressBarWidth = `${Math.max(0, (currentProgressStep - 1) * 25)}%`;

  return (
    <div className="h-full overflow-y-auto bg-surface">
      <div className="p-8 max-w-7xl mx-auto w-full space-y-8">

        {/* Breadcrumb & Actions */}
        <div className="flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 text-on-surface-variant text-sm mb-2">
              <span className="cursor-pointer hover:underline" onClick={() => navigate('/outbound')}>Outbound Orders</span>
              <span className="material-symbols-outlined text-xs" data-icon="chevron_right">chevron_right</span>
              <span className="font-medium text-on-surface">Order Detail</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-blue-900">{order.code}</h2>
          </div>
          <div className="flex gap-3">
            {transitions.length > 0 && order.status !== 'CANCELLED' && (
              <button
                onClick={() => setShowTransitionDialog(true)}
                className="px-6 py-2.5 rounded-xl text-primary font-bold bg-surface-container-low hover:bg-surface-container-high transition-all"
              >
                Change Status
              </button>
            )}
            {isPickingActive ? (
              <button
                onClick={() => navigate(`/outbound/${order.id}/picking`)}
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-on-primary font-bold shadow-lg shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl" data-icon="barcode_scanner">barcode_scanner</span>
                Pick Order
              </button>
            ) : (
              <button
                onClick={() => setShowTransitionDialog(true)}
                className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-xl" data-icon="bolt" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
                Allocate Stock
              </button>
            )}
          </div>
        </div>

        {/* Header Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-blue-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Customer</p>
            <p className="text-lg font-bold text-on-surface">{order.requestedBy || 'Global Logistics Inc.'}</p>
            <p className="text-sm text-on-surface-variant">Priority Account</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-blue-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Destination</p>
            <p className="text-lg font-bold text-on-surface">{order.warehouseName}</p>
            <p className="text-sm text-on-surface-variant">Gate 4, Dock C</p>
          </div>
          <div className="bg-surface-container-lowest p-6 rounded-xl shadow-sm border-b-2 border-blue-50">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Est. Ship Date</p>
            <p className="text-lg font-bold text-on-surface">{formatEtd(order.expectedDate)}</p>
            <p className="text-sm text-secondary font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-xs" data-icon="schedule">schedule</span>
              T-minus 14h
            </p>
          </div>
          <div className="bg-surface-container-low p-6 rounded-xl border-2 border-dashed border-outline-variant/30 flex flex-col justify-center items-center text-center">
            <span className="material-symbols-outlined text-secondary text-3xl mb-1" data-icon="auto_awesome">auto_awesome</span>
            <p className="text-xs font-bold text-secondary uppercase">AI Optimization</p>
            <p className="text-sm font-medium text-on-surface">LTL Route Active</p>
          </div>
        </div>

        {/* Stepper */}
        {order.status !== 'CANCELLED' ? (
          <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm">
            <div className="relative flex justify-between">
              {/* Progress Line */}
              <div className="absolute top-5 left-0 w-full h-1 bg-surface-container-high rounded-full overflow-hidden">
                <div className="h-full bg-primary transition-all duration-700 ease-in-out" style={{ width: progressBarWidth }}></div>
              </div>
              {/* Steps */}
              {STEPS.map((step) => {
                const isPassed = step.stepIdx < currentProgressStep;
                const isCurrent = step.stepIdx === currentProgressStep;
                
                return (
                  <div key={step.stepIdx} className={`relative z-10 flex flex-col items-center group ${!isPassed && !isCurrent ? 'text-slate-400' : ''}`}>
                    {isPassed ? (
                      <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold shadow-lg shadow-primary/30">
                        <span className="material-symbols-outlined text-sm" data-icon="check">check</span>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-10 h-10 rounded-full bg-white border-4 border-primary text-primary flex items-center justify-center font-bold">
                        {step.stepIdx}
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-bold">
                        {step.stepIdx}
                      </div>
                    )}
                    <span className={`mt-3 text-sm font-bold ${isPassed || isCurrent ? (isCurrent ? 'text-on-surface' : 'text-primary') : 'font-medium'}`}>
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-red-50 p-6 rounded-xl border-l-4 border-red-500 shadow-sm flex items-center gap-4">
            <span className="material-symbols-outlined text-red-500 text-3xl">cancel</span>
            <div>
              <h3 className="text-red-700 font-bold">Order Cancelled</h3>
              <p className="text-red-600 text-sm">This outbound order has been cancelled and cannot be fulfilled.</p>
            </div>
          </div>
        )}

        {/* Order Lines Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold tracking-tight">Order Line Items <span className="text-slate-400 font-normal ml-2 text-base">({order.lineItems.length} Total)</span></h3>
            <div className="flex gap-2">
              <button className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined" data-icon="filter_list">filter_list</span>
              </button>
              <button className="p-2 bg-white rounded-lg border border-slate-100 shadow-sm text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined" data-icon="download">download</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full border-separate border-spacing-y-3">
              <thead>
                <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest px-4">
                  <th className="pb-2 px-6">Product Item</th>
                  <th className="pb-2 px-6">Bin Source (AI Suggested)</th>
                  <th className="pb-2 px-6 text-center">Ordered Qty</th>
                  <th className="pb-2 px-6 text-center">Picked Qty</th>
                  <th className="pb-2 px-6">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {order.lineItems.map((item, idx) => {
                  const done = item.pickedQty >= item.requestedQty;
                  const partial = item.pickedQty > 0 && item.pickedQty < item.requestedQty;
                  
                  // Faking AI insight visually based on index (just to match the mockup 100% physically)
                  const hasAIInsight = idx < 2;

                  return (
                    <tr key={item.id} className="bg-surface-container-lowest hover:bg-surface-container-low transition-colors group">
                      <td className="px-6 py-5 rounded-l-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-surface-container-high rounded-lg flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-slate-500" data-icon="box">package_2</span>
                          </div>
                          <div>
                            <p className="font-bold text-on-surface line-clamp-1">{item.productName}</p>
                            <p className="text-xs text-on-surface-variant font-mono">{item.productCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {hasAIInsight ? (
                            <div className="px-2 py-1 bg-secondary-container/20 rounded-md flex items-center gap-1.5 border border-secondary-container/30">
                              <span className="material-symbols-outlined text-secondary text-base" data-icon="auto_awesome">auto_awesome</span>
                              <span className="font-bold text-secondary text-xs">{item.locationCode}</span>
                            </div>
                          ) : (
                            <div className="px-2 py-1 bg-slate-100 rounded-md flex items-center gap-1.5 border border-slate-200">
                              <span className="material-symbols-outlined text-slate-400 text-base" data-icon="warehouse">warehouse</span>
                              <span className="font-bold text-slate-600 text-xs">{item.locationCode}</span>
                            </div>
                          )}
                          <span className="text-xs text-on-surface-variant shrink-0">Zone: Area {idx + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5 text-center font-bold text-lg">{item.requestedQty}</td>
                      <td className="px-6 py-5 text-center">
                        <span className={`font-medium ${done ? 'text-primary' : partial ? 'text-secondary' : 'text-slate-300'}`}>
                          {item.pickedQty}
                        </span>
                      </td>
                      <td className="px-6 py-5 rounded-r-xl">
                        {done ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-[10px] font-bold uppercase tracking-wider rounded-full">Completed</span>
                        ) : partial ? (
                          <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold uppercase tracking-wider rounded-full">Picking</span>
                        ) : (
                          <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold uppercase tracking-wider rounded-full">Unallocated</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {order.lineItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-slate-500 bg-surface-container-lowest rounded-xl">
                      <span className="material-symbols-outlined mb-2 block text-3xl">inventory_2</span>
                      No items found for this order.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* AI Insight Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-gradient-to-br from-secondary/5 to-secondary/10 p-8 rounded-2xl border border-secondary/10 relative overflow-hidden">
            <div className="absolute -right-10 -top-10 opacity-10 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]" data-icon="auto_awesome">auto_awesome</span>
            </div>
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-6">
                <span className="material-symbols-outlined text-secondary" data-icon="query_stats">query_stats</span>
                <h4 className="text-lg font-bold text-on-surface">Fulfillment Optimization Insight</h4>
              </div>
              <p className="text-on-surface-variant mb-6 max-w-lg leading-relaxed">
                AI suggests batching this order with <span className="text-secondary font-bold">OB-49202-Y</span>. Picking routes can be optimized by 22% by combining these orders at South Wing Cluster A.
              </p>
              <div className="mt-auto flex items-center gap-4">
                <button className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-bold text-sm">Apply Batching</button>
                <button className="text-secondary font-bold text-sm hover:underline">View Route Map</button>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm space-y-6">
            <h4 className="text-lg font-bold text-on-surface">Order Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Subtotal Units</span>
                <span className="font-bold">
                  {order.lineItems.reduce((acc, curr) => acc + curr.requestedQty, 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Total Volume</span>
                <span className="font-bold">12.4 m³</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-on-surface-variant">Est. Package Count</span>
                <span className="font-bold">8 Pallets</span>
              </div>
              <div className="h-[1px] bg-slate-100 my-2"></div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-bold text-on-surface">Order Weight</span>
                <span className="text-xl font-extrabold text-primary">1,420 kg</span>
              </div>
            </div>
            <button className="w-full py-3 rounded-xl bg-surface-container-low text-on-surface font-bold hover:bg-surface-container-high transition-colors flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-xl" data-icon="print">print</span>
              Print Pick Tickets
            </button>
          </div>
        </div>

      </div>

      {/* Floating AI Prompt (Contextual) */}
      <div className="fixed bottom-8 right-8 z-50">
        <button className="w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all">
          <span className="material-symbols-outlined text-2xl" data-icon="smart_toy">smart_toy</span>
        </button>
      </div>

      {/* Status Transition Dialog */}
      {showTransitionDialog && (
        <StatusTransitionDialog
          order={order}
          onClose={() => setShowTransitionDialog(false)}
        />
      )}
    </div>
  );
}
