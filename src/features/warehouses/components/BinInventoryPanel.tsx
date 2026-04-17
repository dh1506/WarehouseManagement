import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { usePermission } from '@/hooks/usePermission';
import { useBinInventories, useCreateBinAdjustment } from '../hooks/useWarehouses';
import type { BinInventoryItem } from '../types/warehouseType';

const ADJUSTMENT_REASONS = [
  'Kiểm kê định kỳ',
  'Nhập sai số lượng',
  'Hàng hỏng / mất',
  'Điều chỉnh khác',
];

interface RowEditState {
  actualQty: string;
  reason: string;
}

interface Props {
  locationId: string;
  warehouseId: string;
  zoneId: string;
}

export function BinInventoryPanel({ locationId, warehouseId, zoneId }: Props) {
  const { toast } = useToast();
  const canAdjust = usePermission('inventory_adjust');
  const { data: rows = [], isLoading, isError } = useBinInventories(locationId);
  const adjustMutation = useCreateBinAdjustment(warehouseId, zoneId, locationId);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editState, setEditState] = useState<RowEditState>({ actualQty: '', reason: '' });

  const handleEditOpen = (row: BinInventoryItem) => {
    setEditingId(row.id);
    setEditState({ actualQty: String(row.available_quantity), reason: ADJUSTMENT_REASONS[0] });
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditState({ actualQty: '', reason: '' });
  };

  const handleSave = async (row: BinInventoryItem) => {
    const qty = Number(editState.actualQty);
    if (!Number.isFinite(qty) || qty < 0) {
      toast({ title: 'Số lượng không hợp lệ', variant: 'destructive' });
      return;
    }
    if (!editState.reason) {
      toast({ title: 'Vui lòng chọn lý do', variant: 'destructive' });
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        warehouse_location_id: Number(locationId),
        product_id: row.product_id,
        product_uom_id: row.product_uom_id,
        lot_id: row.lot_id ?? undefined,
        quantity: qty,
        note: editState.reason,
      });
      toast({ title: 'Điều chỉnh tồn kho thành công' });
      handleEditCancel();
    } catch (error) {
      toast({
        title: 'Không thể điều chỉnh tồn kho',
        description: error instanceof Error ? error.message : 'Đã có lỗi xảy ra.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xs font-extrabold text-slate-900">Tồn kho thực tế tại ô</h2>
          <p className="text-xs font-medium text-slate-500">Dữ liệu từ hệ thống kiểm kê</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
          <span className="material-symbols-outlined text-[20px]">inventory_2</span>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 py-4 text-xs text-slate-400">
          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
          Đang tải tồn kho...
        </div>
      )}

      {isError && (
        <p className="py-3 text-xs text-red-500">Không tải được dữ liệu tồn kho.</p>
      )}

      {!isLoading && !isError && rows.length === 0 && (
        <p className="py-4 text-center text-xs text-slate-400">Chưa có hàng hóa trong ô này.</p>
      )}

      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left">
                <th className="pb-2 font-semibold uppercase tracking-wide text-slate-500">Mã SP</th>
                <th className="pb-2 font-semibold uppercase tracking-wide text-slate-500">Lô hàng</th>
                <th className="pb-2 text-right font-semibold uppercase tracking-wide text-slate-500">Tồn kho HT</th>
                <th className="pb-2 font-semibold uppercase tracking-wide text-slate-500 pl-2">ĐVT</th>
                {canAdjust && <th className="pb-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((row) => (
                <tr key={row.id} className="group">
                  {editingId === row.id ? (
                    <td colSpan={canAdjust ? 5 : 4} className="py-3">
                      <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 space-y-2">
                        <p className="font-semibold text-slate-800">
                          {row.product_code}
                          {row.lot_code ? <span className="text-slate-400 font-normal"> · {row.lot_code}</span> : null}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Số lượng thực tế</span>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={editState.actualQty}
                              onChange={(e) => setEditState((s) => ({ ...s, actualQty: e.target.value }))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                              autoFocus
                            />
                          </label>
                          <label className="space-y-1">
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Lý do</span>
                            <select
                              value={editState.reason}
                              onChange={(e) => setEditState((s) => ({ ...s, reason: e.target.value }))}
                              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                            >
                              {ADJUSTMENT_REASONS.map((r) => (
                                <option key={r} value={r}>{r}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleSave(row)}
                            disabled={adjustMutation.isPending}
                            className="flex items-center gap-1.5 rounded-lg bg-blue-700 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-blue-800 disabled:opacity-60"
                          >
                            {adjustMutation.isPending ? (
                              <span className="h-3 w-3 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                            ) : null}
                            Lưu điều chỉnh
                          </button>
                          <button
                            type="button"
                            onClick={handleEditCancel}
                            disabled={adjustMutation.isPending}
                            className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                          >
                            Hủy
                          </button>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className="py-2.5 font-semibold text-slate-800">{row.product_code}</td>
                      <td className="py-2.5 text-slate-500">{row.lot_code ?? '—'}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">{row.available_quantity.toLocaleString()}</td>
                      <td className="py-2.5 pl-2 text-slate-500">{row.uom_name || '—'}</td>
                      {canAdjust && (
                        <td className="py-2.5 pl-2">
                          <button
                            type="button"
                            onClick={() => handleEditOpen(row)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md p-1 hover:bg-slate-100 text-slate-400 hover:text-blue-600"
                            title="Điều chỉnh tồn kho"
                          >
                            <span className="material-symbols-outlined text-[15px]">edit</span>
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
