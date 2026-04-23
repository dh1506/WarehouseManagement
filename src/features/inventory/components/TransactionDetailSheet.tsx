import { motion } from 'motion/react';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { useTransactionDetail } from '../hooks/useTransactions';
import type { TransactionType } from '../types/transactionType';
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  ArrowLeftRight,
  Loader2,
  Package,
  MapPin,
  User,
  Calendar,
  FileText,
  Hash,
  Layers,
} from 'lucide-react';

// ── Helpers ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TransactionType, { label: string; color: string; icon: typeof ArrowDownLeft }> = {
  IN: { label: 'Nhập kho', color: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: ArrowDownLeft },
  OUT: { label: 'Xuất kho', color: 'bg-rose-50 text-rose-700 ring-rose-200', icon: ArrowUpRight },
  ADJUSTMENT: { label: 'Điều chỉnh', color: 'bg-amber-50 text-amber-700 ring-amber-200', icon: RefreshCw },
  TRANSFER: { label: 'Chuyển kho', color: 'bg-blue-50 text-blue-700 ring-blue-200', icon: ArrowLeftRight },
};

function formatDate(value: string): string {
  return new Date(value).toLocaleString('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof Package; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <div className="mt-0.5 text-sm font-medium text-slate-800">{value}</div>
      </div>
    </div>
  );
}

// ── Component ───────────────────────────────────────────────────────────────

interface TransactionDetailSheetProps {
  transactionId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionDetailSheet({ transactionId, open, onOpenChange }: TransactionDetailSheetProps) {
  const { data, isLoading, isError } = useTransactionDetail(transactionId ?? 0);

  const typeCfg = data ? TYPE_CONFIG[data.transaction_type] : null;
  const TypeIcon = typeCfg?.icon ?? Package;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b border-slate-100">
          <SheetTitle className="text-lg font-bold text-slate-900">Chi tiết giao dịch</SheetTitle>
          <SheetDescription>
            {data ? `Mã giao dịch #${data.id}` : 'Đang tải...'}
          </SheetDescription>
        </SheetHeader>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm font-medium">Đang tải chi tiết…</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-rose-500">
            <span className="text-sm font-medium">Không thể tải chi tiết giao dịch.</span>
          </div>
        )}

        {data && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="pt-4 space-y-1"
          >
            {/* Type badge + quantity highlight */}
            <div className="rounded-2xl bg-slate-50 border border-slate-100 p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset',
                  typeCfg?.color,
                )}>
                  <TypeIcon className="h-3.5 w-3.5" />
                  {typeCfg?.label}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {data.reference_type ?? '—'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tồn trước</p>
                  <p className="text-xl font-extrabold tabular-nums text-slate-600">
                    {data.balance_before.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Số lượng</p>
                  <p className={cn(
                    'text-xl font-extrabold tabular-nums',
                    Number(data.base_quantity) >= 0 ? 'text-emerald-600' : 'text-rose-600',
                  )}>
                    {Number(data.base_quantity) > 0 ? '+' : ''}{Number(data.base_quantity).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Tồn sau</p>
                  <p className="text-xl font-extrabold tabular-nums text-slate-900">
                    {Number(data.balance_after).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Detail rows */}
            <div className="divide-y divide-slate-100">
              <InfoRow
                icon={Calendar}
                label="Thời gian giao dịch"
                value={formatDate(data.transaction_date)}
              />
              <InfoRow
                icon={Package}
                label="Sản phẩm"
                value={
                  <div>
                    <span className="font-semibold">{data.product.name}</span>
                    <span className="ml-2 text-xs text-slate-400 font-mono">{data.product.code}</span>
                  </div>
                }
              />
              <InfoRow
                icon={Layers}
                label="Đơn vị tính"
                value={data.uom?.uom.name ?? data.product.base_uom.name}
              />
              <InfoRow
                icon={MapPin}
                label="Vị trí kho"
                value={
                  <div>
                    <span>{data.location.full_path}</span>
                    {data.location.warehouse && (
                      <span className="ml-2 text-xs text-slate-400">({data.location.warehouse.name})</span>
                    )}
                  </div>
                }
              />
              {data.lot && (
                <InfoRow
                  icon={Hash}
                  label="Lô hàng"
                  value={
                    <div>
                      <span className="font-mono">{data.lot.lot_no}</span>
                      {data.lot.expired_date && (
                        <span className="ml-2 text-xs text-slate-400">
                          HSD: {new Date(data.lot.expired_date).toLocaleDateString('vi-VN')}
                        </span>
                      )}
                    </div>
                  }
                />
              )}
              <InfoRow
                icon={User}
                label="Người thực hiện"
                value={data.creator?.full_name ?? 'Hệ thống'}
              />
              <InfoRow
                icon={FileText}
                label="Chứng từ tham chiếu"
                value={data.reference_id ?? '—'}
              />
              {data.note && (
                <InfoRow
                  icon={FileText}
                  label="Ghi chú"
                  value={<span className="text-slate-600 italic">{data.note}</span>}
                />
              )}
              <InfoRow
                icon={Calendar}
                label="Ngày tạo bản ghi"
                value={formatDate(data.created_at)}
              />
            </div>
          </motion.div>
        )}
      </SheetContent>
    </Sheet>
  );
}
