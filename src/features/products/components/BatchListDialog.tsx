import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { StatePanel } from '@/components/StatePanel';
import { useProductInventoryData } from '../hooks/useProducts';
import type { ProductLotItem } from '../types/productType';

const EXPIRY_CRITICAL_DAYS = 7;
const EXPIRY_NEAR_DAYS = 30;

type ExpiryLevel = 'critical' | 'near' | 'ok' | 'none';

function getExpiryLevel(lot: ProductLotItem): ExpiryLevel {
  if (lot.status === 'EXPIRED') return 'critical';
  if (!lot.expiredDate) return 'none';
  const nowMs = Date.now();
  const expiryMs = new Date(lot.expiredDate).getTime();
  if (expiryMs <= nowMs + EXPIRY_CRITICAL_DAYS * 24 * 60 * 60 * 1000) return 'critical';
  if (expiryMs <= nowMs + EXPIRY_NEAR_DAYS * 24 * 60 * 60 * 1000) return 'near';
  return 'ok';
}

interface BatchListDialogProps {
  open: boolean;
  onClose: () => void;
  productName: string;
  productId: string;
}

export function BatchListDialog({ open, onClose, productName, productId }: BatchListDialogProps) {
  // Tải lazy — chỉ fetch khi dialog mở; React Query tái sử dụng cache từ table cells
  const { data, isLoading, isError, refetch } = useProductInventoryData(productId, open);

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-2xl overflow-hidden rounded-[28px] border border-slate-200 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)]">
        <DialogHeader className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
              <span className="material-symbols-outlined text-[20px] text-slate-600">package_2</span>
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">Danh sách lô hàng</DialogTitle>
              <p className="mt-0.5 text-xs text-slate-500">{productName}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto p-6">
          {isLoading ? (
            <StatePanel
              title="Đang tải lô hàng..."
              description="Đang lấy dữ liệu lô từ tồn kho."
              icon="hourglass_top"
            />
          ) : isError ? (
            <StatePanel
              title="Không thể tải lô hàng"
              description="Không thể tải dữ liệu lô. Vui lòng thử lại."
              icon="error"
              tone="error"
              action={(
                <button
                  type="button"
                  onClick={() => void refetch()}
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  Thử lại
                </button>
              )}
            />
          ) : !data || data.lots.length === 0 ? (
            <StatePanel
              title="Không tìm thấy lô hàng"
              description="Chưa có lô nào được liên kết với sản phẩm này."
              icon="inventory_2"
            />
          ) : (
            <>
              {/* Chú thích màu */}
              <div className="mb-4 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                  Bình thường
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                  HSD ≤ {EXPIRY_NEAR_DAYS} ngày
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
                  Nguy cấp ≤ {EXPIRY_CRITICAL_DAYS} ngày / Đã hết hạn
                </div>
                <span className="ml-auto text-xs text-slate-400">
                  Tổng {data.lots.length} lô
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      <th className="px-4 py-3">Mã lô</th>
                      <th className="px-4 py-3">Vị trí</th>
                      <th className="px-4 py-3">Ngày nhận</th>
                      <th className="px-4 py-3">Hạn dùng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {data.lots.map((lot) => {
                      const level = getExpiryLevel(lot);
                      const rowBg = level === 'critical'
                        ? 'bg-red-50/70'
                        : level === 'near'
                          ? 'bg-amber-50/70'
                          : '';

                      return (
                        <tr key={lot.id} className={`${rowBg} align-middle transition-colors`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {level === 'critical' && (
                                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500" />
                              )}
                              {level === 'near' && (
                                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                              )}
                              <span className="font-mono text-sm font-semibold text-slate-800">
                                {lot.lotNo}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            <div>{lot.locationCode ?? '—'}</div>
                            {lot.warehouseName ? (
                              <div className="mt-0.5 text-xs text-slate-400">{lot.warehouseName}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {lot.receivedAt
                              ? new Date(lot.receivedAt).toLocaleDateString('vi-VN')
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span className={
                              level === 'critical'
                                ? 'font-semibold text-red-600'
                                : level === 'near'
                                  ? 'font-semibold text-amber-600'
                                  : 'text-slate-600'
                            }>
                              {lot.expiredDate
                                ? new Date(lot.expiredDate).toLocaleDateString('vi-VN')
                                : '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <LotStatusBadge status={lot.status} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LotStatusBadge({ status }: { status: ProductLotItem['status'] }) {
  if (status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
        Hoạt động
      </span>
    );
  }
  if (status === 'EXPIRED') {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">
        Đã hết hạn
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
      Không hoạt động
    </span>
  );
}
