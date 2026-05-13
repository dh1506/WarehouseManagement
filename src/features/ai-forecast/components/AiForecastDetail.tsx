import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { StatePanel } from '@/components/StatePanel';
import { Button } from '@/components/ui/button';
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
  type ForecastRecommendation,
  type StockPriority,
  type TriggerForecastResponse,
} from '../types/aiForecastType';
import { useAiForecastDetail } from '../hooks/useAiForecast';

interface AiForecastDetailProps {
  id: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parses "(85%)" from strings like "High (85%)" produced by BE formatConfidence().
 * Returns null for "N/A" (fallback runs have no Gemini confidence).
 */
function parseConfidencePct(label: string): number | null {
  const m = label.match(/\((\d+)%\)/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Extracts temperature value from BE weather_context string.
 * Format: "Dự báo trời nắng (30°C), độ ẩm 70% - ..."
 */
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

  // Condition is the text between "Dự báo " and "("
  const condMatch = text.match(/Dự báo\s+([^(]+)\(/);
  const condition = condMatch ? condMatch[1].trim() : '';

  // Note is the part after " - "
  const noteParts = text.split(' - ');
  const note = noteParts.length > 1 ? noteParts.slice(1).join(' - ') : '';

  return { temp, humidity, condition, note };
}

// ── Sub-badges ────────────────────────────────────────────────────────────────

function ForecastStatusBadge({ status }: { status?: string | null }) {
  const key = (status && status in FORECAST_STATUS_STYLES ? status : 'PENDING') as AiForecastStatus;
  const s = FORECAST_STATUS_STYLES[key];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {FORECAST_STATUS_LABELS[key]}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: StockPriority }) {
  const s = PRIORITY_STYLES[priority];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

// ── Weather Context Card ──────────────────────────────────────────────────────

function WeatherContextCard({ weatherContext }: { weatherContext: string }) {
  const { temp, humidity, condition, note } = parseWeatherContext(weatherContext);

  const conditionIcon: Record<string, string> = {
    'trời nắng': 'wb_sunny',
    'trời mưa': 'rainy',
    'trời nhiều mây': 'cloud',
    'mưa phùn': 'grain',
    'giông bão': 'thunderstorm',
    'tuyết': 'ac_unit',
    'sương mù': 'foggy',
    'sương mù nhẹ': 'foggy',
  };
  const icon = conditionIcon[condition] ?? 'thermostat';

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời tiết</p>
      <div className="flex items-start gap-3 mt-1">
        <span className="material-symbols-outlined text-[28px] text-slate-500 shrink-0">
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          {temp !== null && (
            <div className="mb-1">
              <p className="text-2xl font-bold text-slate-900">{temp}°C</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Nhiệt độ trung bình tháng</p>
            </div>
          )}
          <p className="text-xs text-slate-600">
            {condition}
            {humidity !== null ? ` · ${humidity}% độ ẩm` : ''}
          </p>
          {note && <p className="mt-1 text-xs text-slate-500 leading-relaxed">{note}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Event Impact Card ─────────────────────────────────────────────────────────

function EventImpactCard({ eventImpact }: { eventImpact: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        Sự kiện khuyến mãi
      </p>
      <div className="mt-1 flex items-start gap-2">
        <span className="material-symbols-outlined text-[18px] text-indigo-500 shrink-0 mt-0.5">
          campaign
        </span>
        <p className="text-sm text-indigo-900 leading-relaxed">{eventImpact}</p>
      </div>
    </div>
  );
}

// ── AI Prediction Summary Panel ───────────────────────────────────────────────

function ProductCard({ item }: { item: ForecastRecommendation }) {
  const isUrgent = item.suggested_order > 0;
  const stockTone =
    item.current_stock === 0
      ? 'text-slate-400'
      : item.current_stock < item.safe_stock
        ? 'text-rose-700'
        : 'text-slate-800';

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-900 truncate">
            {item.product_code} · {item.product_name}
          </p>
          {item.product_categories.length > 0 && (
            <p className="mt-0.5 text-[11px] text-slate-500">
              {item.product_categories.join(', ')}
            </p>
          )}
        </div>
        <PriorityBadge priority={item.priority} />
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Tồn kho</p>
          <p className={`font-semibold ${stockTone}`}>{item.current_stock.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Tồn an toàn</p>
          <p className="font-semibold text-slate-800">{item.safe_stock.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Dự báo nhu cầu</p>
          <p className="font-semibold text-slate-800">{item.forecast_demand.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wide text-slate-400">Đề xuất nhập</p>
          <p
            className={`font-bold ${isUrgent ? 'text-slate-900' : 'text-slate-400'}`}
          >
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
      {/* Stats header */}
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Tổng quan dự báo AI</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              ID #{summary.forecast_id} · {summary.status}
            </p>
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
            <div
              key={item.label}
              className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2"
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {item.label}
              </p>
              <p className={`mt-1 text-lg font-bold ${item.color}`}>
                {item.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>

        {summary.event_impact && (
          <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">
              Tác động sự kiện
            </p>
            <p className="mt-1 text-xs text-indigo-700 leading-relaxed">{summary.event_impact}</p>
          </div>
        )}
      </div>

      {/* Product groups */}
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-rose-500">priority_high</span>
            <h4 className="text-sm font-semibold text-slate-900">Cần nhập gấp</h4>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {urgent_orders.length}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {urgent_orders.length === 0 ? (
              <p className="text-xs text-slate-500">Không có sản phẩm cần nhập gấp.</p>
            ) : (
              urgent_orders.map((item) => <ProductCard key={item.product_id} item={item} />)
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-emerald-500">check_circle</span>
            <h4 className="text-sm font-semibold text-slate-900">Ổn định</h4>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {stable_products.length}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {stable_products.length === 0 ? (
              <p className="text-xs text-slate-500">Tất cả sản phẩm đều cần nhập hàng.</p>
            ) : (
              stable_products.map((item) => <ProductCard key={item.product_id} item={item} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────

function AiInsightsPanel({
  allProducts,
  isFallback,
}: {
  allProducts: ForecastRecommendation[];
  isFallback: boolean;
}) {
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
          <p className="text-sm font-semibold text-slate-900">Phân tích AI</p>
          <p className="text-xs text-slate-500">
            {isFallback
              ? 'Gemini không khả dụng — đã dùng trung bình động 30 ngày'
              : `Phân tích Gemini · ${allProducts.length} sản phẩm đã đánh giá`}
          </p>
        </div>
        <span
          className={`material-symbols-outlined text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          expand_more
        </span>
      </button>

      {expanded && (
        <div className="border-t p-4">
          {isFallback ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Đã dùng chế độ dự phòng</p>
              <p className="mt-1 text-xs text-amber-700 leading-relaxed">
                Gemini AI không thể kết nối. Dự báo được tính theo trung bình động 30 ngày dựa
                trên lịch sử bán hàng thực tế. Không có điểm tin cậy hoặc ghi chú AI cho lần
                chạy này.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
              {allProducts.map((product) => {
                const confidence = parseConfidencePct(product.confidence_level);
                return (
                  <div
                    key={product.product_id}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mt-0.5">
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
                              className={`h-full rounded-full ${
                                confidence >= 70
                                  ? 'bg-emerald-500'
                                  : confidence >= 45
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold w-10 text-right ${
                              confidence >= 70
                                ? 'text-emerald-700'
                                : confidence >= 45
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                            }`}
                          >
                            {confidence}%
                          </span>
                        </div>
                      )}

                      {product.reasoning ? (
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          {product.reasoning}
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400 italic">Không có ghi chú.</p>
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

// ── Recommendation Table ──────────────────────────────────────────────────────

function RecommendationRow({ item }: { item: ForecastRecommendation }) {
  const confidence = parseConfidencePct(item.confidence_level);

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>
        <p className="font-medium text-slate-900">{item.product_code}</p>
        <p className="text-xs text-slate-500 truncate max-w-[160px]">{item.product_name}</p>
        {item.product_categories.length > 0 && (
          <p className="text-[11px] text-slate-400">{item.product_categories.join(', ')}</p>
        )}
      </TableCell>
      <TableCell className="text-right font-semibold text-slate-900">
        {item.forecast_demand.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {item.current_stock.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {item.incoming_stock.toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {item.safe_stock.toLocaleString()}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={`font-bold ${item.suggested_order > 0 ? 'text-slate-900' : 'text-slate-400'}`}
        >
          {item.suggested_order.toLocaleString()}
        </span>
      </TableCell>
      <TableCell>
        <PriorityBadge priority={item.priority} />
      </TableCell>
      <TableCell>
        {confidence !== null ? (
          <div className="flex items-center gap-1.5">
            <div className="w-12 h-1.5 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  confidence >= 70 ? 'bg-emerald-500' : confidence >= 45 ? 'bg-amber-500' : 'bg-rose-500'
                }`}
                style={{ width: `${confidence}%` }}
              />
            </div>
            <span
              className={`text-xs font-semibold ${
                confidence >= 70 ? 'text-emerald-700' : confidence >= 45 ? 'text-amber-700' : 'text-rose-700'
              }`}
            >
              {confidence}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </TableCell>
      <TableCell className="max-w-50">
        <p className="text-xs text-slate-600 leading-relaxed">{item.reasoning}</p>
      </TableCell>
    </TableRow>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AiForecastDetail({ id }: AiForecastDetailProps) {
  const navigate = useNavigate();
  const query = useAiForecastDetail(id);

  const forecast = query.data;

  const allProducts = useMemo<ForecastRecommendation[]>(() => {
    if (!forecast) return [];
    return [...forecast.urgent_orders, ...forecast.stable_products];
  }, [forecast]);

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfe]">
        <StatePanel
          title="Đang tải dự báo"
          description="Đang lấy chi tiết dự báo và kết quả theo từng sản phẩm."
          icon="hourglass_top"
        />
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
          action={
            <Button variant="outline" onClick={() => navigate('/ai-forecast')}>
              Quay lại danh sách
            </Button>
          }
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
          description={`${summary.total_products} sản phẩm · ${summary.products_need_order} cần nhập · ${summary.products_stable} ổn định`}
        />

        {/* Fallback warning banner */}
        {summary.is_fallback && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0 mt-0.5">
              warning
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Đã dùng chế độ dự phòng</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Gemini AI không thể kết nối. Dự báo được tính theo trung bình động 30 ngày dựa
                trên lịch sử bán hàng. Không có điểm tin cậy hoặc ghi chú AI cho lần chạy này.
              </p>
            </div>
          </div>
        )}

        {/* Weather + Event cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <WeatherContextCard weatherContext={summary.weather_context} />
          {summary.event_impact && <EventImpactCard eventImpact={summary.event_impact} />}
        </div>

        {/* AI Prediction Summary */}
        <AiPredictionSummaryPanel data={forecast} />

        {/* AI Insights (expandable, collapsed by default) */}
        <AiInsightsPanel allProducts={allProducts} isFallback={summary.is_fallback} />

        {/* Full results table */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              Chi tiết dự báo
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {allProducts.length}
              </span>
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Toàn bộ sản phẩm — tồn kho, nhu cầu dự báo, số lượng đề xuất và mức độ ưu tiên.
            </p>
          </div>

          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead className="text-right">Dự báo</TableHead>
                  <TableHead className="text-right">Tồn kho</TableHead>
                  <TableHead className="text-right">Đang về</TableHead>
                  <TableHead className="text-right">Tồn an toàn</TableHead>
                  <TableHead className="text-right">Đề xuất nhập</TableHead>
                  <TableHead>Ưu tiên</TableHead>
                  <TableHead>Độ tin cậy</TableHead>
                  <TableHead>Ghi chú AI</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center text-slate-500">
                      Không có dữ liệu dự báo.
                    </TableCell>
                  </TableRow>
                ) : (
                  allProducts.map((item) => (
                    <RecommendationRow key={item.product_id} item={item} />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
