import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { bulkReviewForecastResults } from '@/services/aiForecastService';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FORECAST_STATUS_LABELS,
  FORECAST_STATUS_STYLES,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  type AiForecastStatus,
  type BulkReviewItem,
  type ForecastRecommendation,
  type StockPriority,
  type TriggerForecastResponse,
} from '../types/aiForecastType';
import { useAiForecastDetail, useTriggerRetrain, AI_FORECAST_KEYS } from '../hooks/useAiForecast';
import { ReviewResultDialog, type ReviewTarget } from './ReviewResultDialog';
import { UpdateActualDialog, type ActualTarget } from './UpdateActualDialog';
import { BulkActualDialog } from './BulkActualDialog';

interface AiForecastDetailProps {
  id: number;
}

// Local review state tracked within the session (refreshed on page reload)
type LocalReviewStatus = 'APPROVED' | 'REJECTED';

// ── Helpers ───────────────────────────────────────────────────────────────────

// Muc dich: Tach phan tram do tin cay tu chuoi.
function parseConfidencePct(label: string): number | null {
  const m = label.match(/\((\d+)%\)/);
  return m ? parseInt(m[1], 10) : null;
}

// Muc dich: Phan tich chuoi mo ta thoi tiet.
function parseWeatherContext(text: string): {
  temp: number | null;
  humidity: number | null;
  condition: string;
  note: string;
} {
  const tempMatch = text.match(/\((-?\d+(?:\.\d+)?)°C\)/);
  const temp = tempMatch ? Number(tempMatch[1]) : null;
  const humidityMatch = text.match(/độ ẩm (\d+)%/);
  const humidity = humidityMatch ? parseInt(humidityMatch[1], 10) : null;
  const condMatch = text.match(/Dự báo\s+([^(]+)\(/);
  const condition = condMatch ? condMatch[1].trim() : '';
  const noteParts = text.split(' - ');
  const note = noteParts.length > 1 ? noteParts.slice(1).join(' - ') : '';
  return { temp, humidity, condition, note };
}

// Muc dich: Map du lieu de mo dialog duyet.
function toReviewTarget(item: ForecastRecommendation): ReviewTarget | null {
  if (item.result_id === undefined) return null;
  return {
    result_id: item.result_id,
    product_code: item.product_code,
    product_name: item.product_name,
    forecast_demand: item.forecast_demand,
    suggested_order: item.suggested_order,
  };
}

// Muc dich: Map du lieu de mo dialog cap nhat thuc te.
function toActualTarget(item: ForecastRecommendation): ActualTarget | null {
  if (item.result_id === undefined) return null;
  return {
    result_id: item.result_id,
    product_code: item.product_code,
    product_name: item.product_name,
    forecast_demand: item.forecast_demand,
    current_actual_qty: item.actual_qty ?? undefined,
  };
}

// Muc dich: Uu tien trang thai review local neu co.
function effectiveReviewStatus(
  item: ForecastRecommendation,
  localReviews: Map<number, LocalReviewStatus>,
): LocalReviewStatus | undefined {
  if (item.result_id === undefined) return undefined;
  const local = localReviews.get(item.result_id);
  if (local !== undefined) return local;
  if (item.review_status === 'APPROVED') return 'APPROVED';
  if (item.review_status === 'REJECTED') return 'REJECTED';
  return undefined;
}

// Muc dich: Uu tien so luong thuc te local neu co.
function effectiveActualQty(
  item: ForecastRecommendation,
  localActuals: Map<number, number>,
): number | undefined {
  if (item.result_id === undefined) return undefined;
  const local = localActuals.get(item.result_id);
  if (local !== undefined) return local;
  if (item.actual_qty != null) return item.actual_qty;
  return undefined;
}

// ── Badges ────────────────────────────────────────────────────────────────────

// Muc dich: Badge trang thai du bao.
function ForecastStatusBadge({ status }: { status?: string | null }) {
  const key = (status && status in FORECAST_STATUS_STYLES ? status : 'PENDING') as AiForecastStatus;
  const s = FORECAST_STATUS_STYLES[key];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {FORECAST_STATUS_LABELS[key]}
    </span>
  );
}

// Muc dich: Badge muc do uu tien ton kho.
function PriorityBadge({ priority }: { priority: StockPriority }) {
  const s = PRIORITY_STYLES[priority];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}>
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// Muc dich: Badge trang thai duyet tam thoi.
function LocalReviewBadge({ status }: { status: LocalReviewStatus }) {
  if (status === 'APPROVED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
        <span className="material-symbols-outlined text-[11px]">check_circle</span>
        Đã duyệt
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
      <span className="material-symbols-outlined text-[11px]">cancel</span>
      Từ chối
    </span>
  );
}

// ── Context Cards ─────────────────────────────────────────────────────────────

// Muc dich: The thong tin thoi tiet.
function WeatherContextCard({ weatherContext }: { weatherContext: string }) {
  const { temp, humidity, condition, note } = parseWeatherContext(weatherContext);
  const conditionIcon: Record<string, string> = {
    'trời nắng': 'wb_sunny', 'trời mưa': 'rainy', 'trời nhiều mây': 'cloud',
    'mưa phùn': 'grain', 'giông bão': 'thunderstorm', 'tuyết': 'ac_unit',
    'sương mù': 'foggy', 'sương mù nhẹ': 'foggy',
  };
  const icon = conditionIcon[condition] ?? 'thermostat';

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời tiết</p>
      <div className="flex items-start gap-3 mt-1">
        <span className="material-symbols-outlined text-[28px] text-slate-500 shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          {temp !== null && (
            <div className="mb-1">
              <p className="text-2xl font-bold text-slate-900">{temp}°C</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Nhiệt độ trung bình tháng</p>
            </div>
          )}
          <p className="text-xs text-slate-600">
            {condition}{humidity !== null ? ` · ${humidity}% độ ẩm` : ''}
          </p>
          {note && <p className="mt-1 text-xs text-slate-500 leading-relaxed">{note}</p>}
        </div>
      </div>
    </div>
  );
}

// Muc dich: The tom tat tac dong su kien.
function EventImpactCard({ eventImpact }: { eventImpact: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Sự kiện khuyến mãi</p>
      <div className="mt-1 flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-indigo-500 shrink-0 mt-0.5">campaign</span>
        <p className="text-sm text-indigo-900 leading-relaxed">{eventImpact}</p>
      </div>
    </div>
  );
}

// ── AI Prediction Summary ─────────────────────────────────────────────────────

// Muc dich: The tong quan san pham.
function ProductSummaryCard({ item }: { item: ForecastRecommendation }) {
  const isUrgent = item.suggested_order > 0;
  const stockTone = item.current_stock === 0 ? 'text-slate-400' : item.current_stock < item.safe_stock ? 'text-rose-700' : 'text-slate-800';

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {item.product_code} · {item.product_name}
          </p>
          {item.product_categories.length > 0 && (
            <p className="mt-0.5 text-[11px] text-slate-500">{item.product_categories.join(', ')}</p>
          )}
        </div>
        <PriorityBadge priority={item.priority} />
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase text-slate-400">Tồn kho</p>
          <p className={`font-semibold ${stockTone}`}>{item.current_stock.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Tồn an toàn</p>
          <p className="font-semibold text-slate-800">{item.safe_stock.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Dự báo nhu cầu</p>
          <p className="font-semibold text-slate-800">{item.forecast_demand.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase text-slate-400">Đề xuất nhập</p>
          <p className={`font-bold ${isUrgent ? 'text-slate-900' : 'text-slate-400'}`}>
            {item.suggested_order.toLocaleString()}
          </p>
        </div>
      </div>
      {item.reasoning && (
        <p className="mt-2 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-2">
          {item.reasoning}
        </p>
      )}
    </div>
  );
}

// Muc dich: Panel tong quan ket qua du bao.
function AiPredictionSummaryPanel({ data }: { data: TriggerForecastResponse }) {
  const { summary, urgent_orders, stable_products } = data;

  const statItems = [
    { label: 'Tổng sản phẩm',  value: summary.total_products,      color: 'text-slate-900' },
    { label: 'Cần nhập',       value: summary.products_need_order,  color: 'text-rose-700' },
    { label: 'Ổn định',        value: summary.products_stable,      color: 'text-emerald-700' },
    { label: 'SL đề xuất',     value: summary.total_suggested_qty,  color: 'text-indigo-700' },
  ];

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Tổng quan dự báo AI</h3>
            <p className="mt-0.5 text-xs text-slate-500">ID #{summary.forecast_id} · {summary.status}</p>
          </div>
          {summary.is_fallback && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <span className="material-symbols-outlined text-[12px]">warning</span>
              Dự phòng
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {statItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
              <p className={`mt-1 text-lg font-bold ${item.color}`}>{item.value.toLocaleString()}</p>
            </div>
          ))}
        </div>

        {summary.event_impact && (
          <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Tác động sự kiện</p>
            <p className="mt-1 text-xs text-indigo-700 leading-relaxed">{summary.event_impact}</p>
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-500">priority_high</span>
            <h4 className="text-sm font-semibold text-slate-900">Cần nhập gấp</h4>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">{urgent_orders.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {urgent_orders.length === 0 ? (
              <p className="text-xs text-slate-500">Không có sản phẩm cần nhập gấp.</p>
            ) : (
              urgent_orders.map((item) => <ProductSummaryCard key={item.product_id} item={item} />)
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-500">check_circle</span>
            <h4 className="text-sm font-semibold text-slate-900">Ổn định</h4>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">{stable_products.length}</span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {stable_products.length === 0 ? (
              <p className="text-xs text-slate-500">Tất cả sản phẩm đều cần nhập hàng.</p>
            ) : (
              stable_products.map((item) => <ProductSummaryCard key={item.product_id} item={item} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────

// Muc dich: Panel phan tich AI chi tiet.
function AiInsightsPanel({ allProducts, isFallback }: { allProducts: ForecastRecommendation[]; isFallback: boolean }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50 rounded-3xl transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-sm">
          <span className="material-symbols-outlined text-[18px]">smart_toy</span>
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-slate-900">Phân tích AI chi tiết</p>
          <p className="text-xs text-slate-500">
            {isFallback
              ? 'Gemini không khả dụng — đã dùng trung bình động 30 ngày'
              : `Phân tích Gemini · ${allProducts.length} sản phẩm · Độ tin cậy & ghi chú`}
          </p>
        </div>
        <span className={`material-symbols-outlined text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="border-t p-4">
          {isFallback ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Đã dùng chế độ dự phòng</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                Gemini AI không thể kết nối. Dự báo được tính theo trung bình động 30 ngày dựa trên
                lịch sử bán hàng thực tế. Không có điểm tin cậy hoặc ghi chú AI cho lần chạy này.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {allProducts.map((product) => {
                const confidence = parseConfidencePct(product.confidence_level);
                return (
                  <div key={product.product_id} className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {product.product_code}{' '}
                        <span className="font-normal text-slate-500">— {product.product_name}</span>
                      </p>
                      {confidence !== null && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confidence >= 70 ? 'bg-emerald-500' : confidence >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold w-10 text-right ${confidence >= 70 ? 'text-emerald-700' : confidence >= 45 ? 'text-amber-700' : 'text-rose-700'}`}>
                            {confidence}%
                          </span>
                        </div>
                      )}
                      {product.reasoning ? (
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{product.reasoning}</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400 italic">Không có ghi chú AI.</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Bulk Action Bar ───────────────────────────────────────────────────────────

interface BulkActionBarProps {
  selectedCount: number;
  isPending: boolean;
  onApproveAll: () => void;
  onRejectAll: () => void;
  onSetActualAll: () => void;
  onClear: () => void;
}

function BulkActionBar({ selectedCount, isPending, onApproveAll, onRejectAll, onSetActualAll, onClear }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-2.5">
      <span className="material-symbols-outlined text-[18px] text-indigo-600">checklist</span>
      <p className="text-sm font-semibold text-indigo-800 flex-1">
        {selectedCount} sản phẩm đã chọn
      </p>
      <Button
        size="sm"
        className="h-7 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3"
        variant="outline"
        disabled={isPending}
        onClick={onApproveAll}
      >
        <span className="material-symbols-outlined text-[14px] mr-1">check_circle</span>
        Duyệt tất cả
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100 px-3"
        disabled={isPending}
        onClick={onRejectAll}
      >
        <span className="material-symbols-outlined text-[14px] mr-1">cancel</span>
        Từ chối tất cả
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 px-3"
        disabled={isPending}
        onClick={onSetActualAll}
      >
        <span className="material-symbols-outlined text-[14px] mr-1">data_usage</span>
        Nhập thực tế
      </Button>
      <button
        type="button"
        className="text-indigo-400 hover:text-indigo-700 transition-colors"
        onClick={onClear}
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}

// ── Review Table Row ──────────────────────────────────────────────────────────

interface ReviewRowProps {
  item: ForecastRecommendation;
  checked: boolean;
  reviewStatus: LocalReviewStatus | undefined;
  actualQty: number | undefined;
  onCheck: (checked: boolean) => void;
  onApprove: () => void;
  onReject: () => void;
  onSetActual: () => void;
  actionsDisabled: boolean;
}

function ReviewRow({
  item,
  checked,
  reviewStatus,
  actualQty,
  onCheck,
  onApprove,
  onReject,
  onSetActual,
  actionsDisabled,
}: ReviewRowProps) {
  const confidence = parseConfidencePct(item.confidence_level);
  const hasId = item.result_id !== undefined;

  return (
    <TableRow className={`hover:bg-slate-50 ${reviewStatus === 'APPROVED' ? 'bg-emerald-50/40' : reviewStatus === 'REJECTED' ? 'bg-rose-50/40' : ''}`}>
      <TableCell className="w-10">
        <input
          type="checkbox"
          checked={checked}
          disabled={!hasId}
          onChange={(e) => onCheck(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
        />
      </TableCell>

      {/* Product */}
      <TableCell>
        <p className="font-medium text-slate-900">{item.product_code}</p>
        <p className="text-xs text-slate-500 truncate max-w-40">{item.product_name}</p>
        {item.product_categories.length > 0 && (
          <p className="text-[11px] text-slate-400">{item.product_categories.join(', ')}</p>
        )}
      </TableCell>

      {/* Forecast → Suggested (stacked) */}
      <TableCell>
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span className="material-symbols-outlined text-[12px]">trending_up</span>
            <span>Dự báo: <span className="font-semibold text-slate-900">{item.forecast_demand.toLocaleString()}</span></span>
          </div>
          <div className="flex items-center gap-1 text-xs">
            <span className="material-symbols-outlined text-[12px] text-indigo-500">shopping_cart</span>
            <span className={`font-bold ${item.suggested_order > 0 ? 'text-indigo-700' : 'text-slate-400'}`}>
              Nhập: {item.suggested_order.toLocaleString()}
            </span>
          </div>
        </div>
      </TableCell>

      {/* Stock context (stacked mini grid) */}
      <TableCell>
        <div className="flex flex-col gap-0.5 text-xs">
          <span className="text-slate-600">Tồn: <span className="font-semibold text-slate-800">{item.current_stock.toLocaleString()}</span></span>
          <span className="text-slate-500">Về: {item.incoming_stock.toLocaleString()}</span>
          <span className="text-slate-500">AT: {item.safe_stock.toLocaleString()}</span>
        </div>
      </TableCell>

      {/* Priority + Confidence */}
      <TableCell>
        <div className="flex flex-col gap-1">
          <PriorityBadge priority={item.priority} />
          {confidence !== null ? (
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-10 h-1 rounded-full bg-slate-200 overflow-hidden">
                <div
                  className={`h-full rounded-full ${confidence >= 70 ? 'bg-emerald-500' : confidence >= 45 ? 'bg-amber-500' : 'bg-rose-500'}`}
                  style={{ width: `${confidence}%` }}
                />
              </div>
              <span className={`text-[11px] font-semibold ${confidence >= 70 ? 'text-emerald-700' : confidence >= 45 ? 'text-amber-700' : 'text-rose-700'}`}>
                {confidence}%
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-slate-400">N/A</span>
          )}
        </div>
      </TableCell>

      {/* AI Note */}
      <TableCell className="max-w-44">
        <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{item.reasoning}</p>
      </TableCell>

      {/* Decision + Actual + MAPE */}
      <TableCell>
        <div className="flex flex-col gap-1">
          {reviewStatus ? (
            <LocalReviewBadge status={reviewStatus} />
          ) : (
            <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
              Chờ duyệt
            </span>
          )}
          {actualQty !== undefined && (
            <span className="text-[11px] text-slate-600">
              Thực tế: <span className="font-semibold">{actualQty.toLocaleString()}</span>
            </span>
          )}
          {item.mape_score != null && (
            <span className={`inline-flex items-center gap-0.5 text-[11px] font-semibold ${
              item.mape_alert_level === 'CRITICAL'
                ? 'text-rose-600'
                : item.mape_alert_level === 'WARNING'
                  ? 'text-amber-600'
                  : 'text-emerald-600'
            }`}>
              MAPE {item.mape_score.toFixed(1)}%
              {item.mape_alert_level === 'CRITICAL' && (
                <span className="material-symbols-outlined text-[12px]">error</span>
              )}
              {item.mape_alert_level === 'WARNING' && (
                <span className="material-symbols-outlined text-[12px]">warning</span>
              )}
            </span>
          )}
        </div>
      </TableCell>

      {/* Actions — hidden while row is checked (bulk mode) */}
      <TableCell>
        {!checked && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Duyệt kết quả này"
              disabled={actionsDisabled}
              onClick={onApprove}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">check</span>
            </button>
            <button
              type="button"
              title="Từ chối kết quả này"
              disabled={actionsDisabled}
              onClick={onReject}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">close</span>
            </button>
            <button
              type="button"
              title="Nhập số lượng bán thực tế"
              disabled={actionsDisabled}
              onClick={onSetActual}
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">data_usage</span>
            </button>
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

// Muc dich: Man hinh chi tiet du bao AI.
export function AiForecastDetail({ id }: AiForecastDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const query = useAiForecastDetail(id);
  const retrainMutation = useTriggerRetrain();

  // Selection state (keyed by result_id)
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Local review tracking (session-scoped, lost on reload)
  const [localReviews, setLocalReviews] = useState<Map<number, LocalReviewStatus>>(new Map());
  const [localActuals, setLocalActuals] = useState<Map<number, number>>(new Map());

  // Dialog targets
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [actualTarget, setActualTarget] = useState<ActualTarget | null>(null);

  // Bulk actual dialog
  const [bulkActualOpen, setBulkActualOpen] = useState(false);

  // Bulk reject dialog
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkRejectReason, setBulkRejectReason] = useState('');
  const [bulkRejectError, setBulkRejectError] = useState('');
  const [bulkPending, setBulkPending] = useState(false);

  const forecast = query.data;

  const allProducts = useMemo<ForecastRecommendation[]>(() => {
    if (!forecast) return [];
    return [...forecast.urgent_orders, ...forecast.stable_products];
  }, [forecast]);

  const selectedItems = useMemo(
    () => allProducts.filter((p) => p.result_id !== undefined && selected.has(p.result_id)),
    [allProducts, selected],
  );

  const handleBulkActualSuccess = useCallback((updated: Map<number, number>) => {
    setLocalActuals((prev) => {
      const next = new Map(prev);
      updated.forEach((qty, resultId) => next.set(resultId, qty));
      return next;
    });
  }, []);

  const pendingReviewCount = useMemo(() => {
    return allProducts.filter((p) => {
      if (p.result_id === undefined) return false;
      if (localReviews.has(p.result_id)) return false;
      if (p.review_status === 'APPROVED' || p.review_status === 'REJECTED') return false;
      return true;
    }).length;
  }, [allProducts, localReviews]);

  const reviewedCount = useMemo(() => {
    let count = 0;
    for (const p of allProducts) {
      if (p.result_id === undefined) continue;
      if (localReviews.has(p.result_id)) { count++; continue; }
      if (p.review_status === 'APPROVED' || p.review_status === 'REJECTED') count++;
    }
    return count;
  }, [allProducts, localReviews]);

  // Checkbox helpers
  const toggleItem = useCallback((resultId: number, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(resultId);
      else next.delete(resultId);
      return next;
    });
  }, []);

  const toggleAll = useCallback(
    (checked: boolean) => {
      if (checked) {
        const ids = new Set(
          allProducts
            .filter((p) => p.result_id !== undefined)
            .map((p) => p.result_id as number),
        );
        setSelected(ids);
      } else {
        setSelected(new Set());
      }
    },
    [allProducts],
  );

  const allSelectableIds = allProducts
    .filter((p) => p.result_id !== undefined)
    .map((p) => p.result_id as number);
  const allChecked = allSelectableIds.length > 0 && allSelectableIds.every((id) => selected.has(id));
  const someChecked = allSelectableIds.some((id) => selected.has(id));

  const handleBulkApprove = useCallback(async () => {
    const bulkItems: BulkReviewItem[] = allProducts
      .filter((p) => p.result_id !== undefined && selected.has(p.result_id))
      .map((p) => ({ result_id: p.result_id!, action: 'APPROVE' as const }));
    if (bulkItems.length === 0) return;
    setBulkPending(true);
    try {
      const response = await bulkReviewForecastResults(bulkItems);
      bulkItems.forEach((item) => setLocalReviews((prev) => new Map(prev).set(item.result_id, 'APPROVED')));
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.detail(id) });
      const description = response.created_stock_ins.length > 0
        ? `Phiếu nhập đã tạo tự động: ${response.created_stock_ins.join(', ')}`
        : undefined;
      toast({ title: `Đã duyệt ${response.updated_count} kết quả`, description });
      setSelected(new Set());
    } catch (err) {
      toast({ title: 'Xét duyệt thất bại', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBulkPending(false);
    }
  }, [allProducts, selected, queryClient, id, toast]);

  const handleBulkRejectSubmit = useCallback(async () => {
    if (bulkRejectReason.trim().length < 10) {
      setBulkRejectError('Lý do tối thiểu 10 ký tự.');
      return;
    }
    const bulkItems: BulkReviewItem[] = allProducts
      .filter((p) => p.result_id !== undefined && selected.has(p.result_id))
      .map((p) => ({ result_id: p.result_id!, action: 'REJECT' as const, reject_reason: bulkRejectReason.trim() }));
    if (bulkItems.length === 0) return;
    setBulkPending(true);
    try {
      const response = await bulkReviewForecastResults(bulkItems);
      bulkItems.forEach((item) => setLocalReviews((prev) => new Map(prev).set(item.result_id, 'REJECTED')));
      void queryClient.invalidateQueries({ queryKey: AI_FORECAST_KEYS.detail(id) });
      toast({ title: `Đã từ chối ${response.updated_count} kết quả` });
      setBulkRejectOpen(false);
      setBulkRejectReason('');
      setBulkRejectError('');
      setSelected(new Set());
    } catch (err) {
      toast({ title: 'Xét duyệt thất bại', description: (err as Error).message, variant: 'destructive' });
    } finally {
      setBulkPending(false);
    }
  }, [allProducts, selected, bulkRejectReason, queryClient, id, toast]);

  // ── Render guards ──

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfe]">
        <StatePanel title="Đang tải dự báo" description="Đang lấy chi tiết dự báo và kết quả." icon="hourglass_top" />
      </div>
    );
  }

  if (query.isError || !forecast) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfe]">
        <StatePanel
          title="Không tìm thấy dự báo"
          description="Dự báo này có thể đã bị xoá hoặc ID không hợp lệ."
          icon="error"
          tone="error"
          action={<Button variant="outline" onClick={() => navigate('/ai-forecast')}>Quay lại danh sách</Button>}
        />
      </div>
    );
  }

  const { summary } = forecast;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-[#fbfbfe] px-3 py-3 sm:px-4 lg:px-5">
      <div className="flex w-full flex-col gap-3">

        {/* Back */}
        <button
          type="button"
          className="flex w-fit items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors"
          onClick={() => navigate('/ai-forecast')}
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Quay lại danh sách
        </button>

        {/* Header */}
        <PageHeader
          eyebrow={`Dự báo AI · #${summary.forecast_id}`}
          title={
            <span className="flex items-center gap-3">
              {`Dự báo #${summary.forecast_id}`}
              <ForecastStatusBadge status={summary.status} />
            </span>
          }
          description={`${summary.total_products} sản phẩm · ${pendingReviewCount} chờ duyệt · ${reviewedCount} đã xét duyệt`}
          actions={
            <Button
              variant="outline"
              disabled={retrainMutation.isPending}
              onClick={() => retrainMutation.mutate()}
            >
              {retrainMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Đang retrain…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-1.5 text-[16px]">model_training</span>
                  Retrain AI
                </>
              )}
            </Button>
          }
        />

        {/* Fallback banner */}
        {summary.is_fallback && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-amber-600 shrink-0 mt-0.5">warning</span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Đã dùng chế độ dự phòng</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Gemini AI không thể kết nối. Dự báo được tính theo trung bình động 30 ngày. Không có điểm tin cậy hoặc ghi chú AI.
              </p>
            </div>
          </div>
        )}

        {/* Context cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <WeatherContextCard weatherContext={summary.weather_context} />
          {summary.event_impact && <EventImpactCard eventImpact={summary.event_impact} />}
        </div>

        {/* AI Summary */}
        <AiPredictionSummaryPanel data={forecast} />

        {/* ── Review Table ── */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3 p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Xét duyệt kết quả
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {allProducts.length}
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Duyệt từng dòng hoặc chọn nhiều để xử lý hàng loạt. Nhập thực tế để tính MAPE.
              </p>
            </div>

          </div>

          {/* Bulk action bar */}
          <div className="px-4 pb-2">
            <BulkActionBar
              selectedCount={selected.size}
              isPending={bulkPending}
              onApproveAll={handleBulkApprove}
              onRejectAll={() => { setBulkRejectReason(''); setBulkRejectError(''); setBulkRejectOpen(true); }}
              onSetActualAll={() => setBulkActualOpen(true)}
              onClear={() => setSelected(new Set())}
            />
          </div>

          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
                      disabled={allSelectableIds.length === 0}
                      onChange={(e) => toggleAll(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 accent-indigo-600 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    />
                  </TableHead>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Dự báo / Đề xuất</TableHead>
                  <TableHead>Tồn kho</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Ghi chú AI</TableHead>
                  <TableHead>Quyết định</TableHead>
                  <TableHead>Thao tác</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-20 text-center text-slate-500">
                      Không có dữ liệu dự báo.
                    </TableCell>
                  </TableRow>
                ) : (
                  allProducts.map((item) => {
                    const effStatus = effectiveReviewStatus(item, localReviews);
                    const effActual = effectiveActualQty(item, localActuals);
                    return (
                      <ReviewRow
                        key={item.product_id}
                        item={item}
                        checked={item.result_id !== undefined && selected.has(item.result_id)}
                        reviewStatus={effStatus}
                        actualQty={effActual}
                        onCheck={(chk) => { if (item.result_id !== undefined) toggleItem(item.result_id, chk); }}
                        onApprove={() => {
                          const t = toReviewTarget(item);
                          if (t) { setReviewAction('APPROVE'); setReviewTarget(t); }
                        }}
                        onReject={() => {
                          const t = toReviewTarget(item);
                          if (t) { setReviewAction('REJECT'); setReviewTarget(t); }
                        }}
                        onSetActual={() => { const t = toActualTarget(item); if (t) setActualTarget(t); }}
                        actionsDisabled={item.result_id === undefined}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* AI Insights (expandable) */}
        <AiInsightsPanel allProducts={allProducts} isFallback={summary.is_fallback} />

        {/* Retrain Card */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-start gap-4 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-sm shrink-0">
              <span className="material-symbols-outlined text-[20px]">model_training</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">Retrain AI</h3>
              <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                Gửi toàn bộ kết quả đã xét duyệt (Duyệt / Từ chối) kèm số liệu thực tế lên Gemini
                để cải thiện độ chính xác dự báo cho lần sau.
              </p>
              {(localReviews.size > 0 || localActuals.size > 0) && (
                <p className="mt-1.5 text-xs font-semibold text-indigo-700">
                  Phiên này: {localReviews.size} đã xét duyệt
                  {localActuals.size > 0 ? ` · ${localActuals.size} đã nhập thực tế` : ''}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              disabled={retrainMutation.isPending}
              onClick={() => retrainMutation.mutate()}
              className="shrink-0"
            >
              {retrainMutation.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Đang retrain…
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-1.5 text-[16px]">model_training</span>
                  Retrain AI
                </>
              )}
            </Button>
          </div>
        </div>

      </div>

      {/* ── Dialogs ── */}
      <BulkActualDialog
        forecastId={summary.forecast_id}
        open={bulkActualOpen}
        items={selectedItems}
        onClose={() => setBulkActualOpen(false)}
        onSuccess={handleBulkActualSuccess}
      />

      <ReviewResultDialog
        forecastId={summary.forecast_id}
        target={reviewTarget}
        defaultAction={reviewAction}
        onClose={() => setReviewTarget(null)}
        onSuccess={(resultId, action, _response) => {
          setLocalReviews((prev) => new Map(prev).set(resultId, action === 'APPROVE' ? 'APPROVED' : 'REJECTED'));
          setSelected((prev) => { const next = new Set(prev); next.delete(resultId); return next; });
        }}
      />

      <UpdateActualDialog
        forecastId={summary.forecast_id}
        target={actualTarget}
        onClose={() => setActualTarget(null)}
        onSuccess={(resultId, qty) => {
          setLocalActuals((prev) => new Map(prev).set(resultId, qty));
        }}
      />

      {/* Bulk Reject Dialog */}
      <Dialog open={bulkRejectOpen} onOpenChange={(v) => { if (!v) setBulkRejectOpen(false); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Từ chối {selected.size} sản phẩm đã chọn</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <p className="text-xs text-slate-500">
              Lý do này sẽ được áp dụng cho tất cả sản phẩm đã chọn và dùng khi retrain AI.
            </p>
            <Textarea
              placeholder="Mô tả lý do từ chối (tối thiểu 10 ký tự)…"
              rows={4}
              value={bulkRejectReason}
              onChange={(e) => { setBulkRejectReason(e.target.value); setBulkRejectError(''); }}
            />
            {bulkRejectError && <p className="text-xs text-rose-500">{bulkRejectError}</p>}
          </div>
          <DialogFooter showCloseButton={false}>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)} disabled={bulkPending}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={handleBulkRejectSubmit} disabled={bulkPending} className="min-w-24">
              {bulkPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Từ chối tất cả'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
