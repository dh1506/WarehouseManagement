import { useState } from 'react';
import type { OutboundOrder, OutboundStatus } from '../types/outboundType';
import {
  OUTBOUND_STATUS_LABELS,
  OUTBOUND_STATUS_TRANSITIONS,
} from '../types/outboundType';
import { useTransitionOutboundStatus } from '../hooks/useOutbound';
import { OutboundStatusBadge } from './OutboundStatusBadge';

const STATUS_ACTION_LABELS: Partial<Record<OutboundStatus, string>> = {
  CONFIRMED: 'Confirm Order',
  PICKING: 'Start Picking',
  COMPLETED: 'Mark as Completed',
  CANCELLED: 'Cancel Order',
};

const STATUS_ACTION_COLORS: Partial<Record<OutboundStatus, string>> = {
  CONFIRMED: 'bg-blue-600 hover:bg-blue-700 text-white',
  PICKING: 'bg-amber-500 hover:bg-amber-600 text-white',
  COMPLETED: 'bg-emerald-600 hover:bg-emerald-700 text-white',
  CANCELLED: 'bg-red-600 hover:bg-red-700 text-white',
};

interface StatusTransitionDialogProps {
  order: OutboundOrder;
  onClose: () => void;
}

export function StatusTransitionDialog({ order, onClose }: StatusTransitionDialogProps) {
  const [note, setNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<OutboundStatus | null>(null);

  const transitions = OUTBOUND_STATUS_TRANSITIONS[order.status];
  const mutation = useTransitionOutboundStatus(order.id);

  const handleConfirm = async () => {
    if (!selectedStatus) return;
    await mutation.mutateAsync({ newStatus: selectedStatus, note });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-[20px]" data-icon="swap_horiz">
                swap_horiz
              </span>
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Change Status</h2>
              <p className="text-xs text-slate-500">{order.code}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Current status */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 w-20 shrink-0">Current:</span>
            <OutboundStatusBadge status={order.status} />
          </div>

          {/* Target status buttons */}
          {transitions.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-slate-400">
                Status <strong>{OUTBOUND_STATUS_LABELS[order.status]}</strong> has no further steps.
              </p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-semibold text-slate-700 mb-2">Change to:</p>
              <div className="flex flex-col gap-2">
                {transitions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setSelectedStatus(status === selectedStatus ? null : status)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all duration-150 ${
                      selectedStatus === status
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-100 hover:border-slate-200 bg-slate-50'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        selectedStatus === status
                          ? 'border-primary bg-primary'
                          : 'border-slate-300'
                      }`}
                    >
                      {selectedStatus === status && (
                        <span className="w-1.5 h-1.5 bg-white rounded-full" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {STATUS_ACTION_LABELS[status] ?? OUTBOUND_STATUS_LABELS[status]}
                      </p>
                      <p className="text-xs text-slate-400">{OUTBOUND_STATUS_LABELS[status]}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Note */}
          {selectedStatus && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">
                Note {selectedStatus === 'CANCELLED' && <span className="text-red-500"> *</span>}
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  selectedStatus === 'CANCELLED'
                    ? 'Reason for cancellation...'
                    : 'Additional notes (optional)...'
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Close
          </button>
          {selectedStatus && (
            <button
              type="button"
              onClick={handleConfirm}
              disabled={mutation.isPending}
              className={`px-5 py-2 text-sm font-bold rounded-lg transition-all active:scale-95 disabled:opacity-60 ${
                STATUS_ACTION_COLORS[selectedStatus] ?? 'bg-primary text-white hover:bg-primary/90'
              }`}
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                (STATUS_ACTION_LABELS[selectedStatus] ?? 'Confirm')
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
