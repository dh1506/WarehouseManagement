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
  REVIEW_STATUS_LABELS,
  REVIEW_STATUS_STYLES,
  CHANNEL_LABELS,
  PROMOTION_TYPE_LABELS,
  type AiForecastDetail as AiForecastDetailType,
  type AiForecastResult,
  type AiForecastStatus,
  type ReviewStatus,
  type MapeAlertLevel,
  type GeminiResultItem,
} from '../types/aiForecastType';
import { useAiForecastDetail, useTriggerRetrain } from '../hooks/useAiForecast';
import { ReviewResultDialog } from './ReviewResultDialog';
import { UpdateActualDialog } from './UpdateActualDialog';

interface AiForecastDetailProps {
  id: number;
}

interface AiPredictionSummary {
  forecast_id: number;
  status: string;
  is_fallback: boolean;
  total_products: number;
  products_need_order: number;
  products_stable: number;
  total_suggested_qty: number;
  weather_context?: string;
  event_impact?: string;
}

interface AiPredictionProduct {
  product_id: number;
  product_code: string;
  product_name: string;
  product_categories: string[];
  current_stock: number;
  incoming_stock: number;
  safe_stock: number;
  forecast_demand: number;
  suggested_order: number;
  reasoning?: string;
  confidence_level?: string;
  priority?: string;
}

interface AiPredictionPayload {
  summary: AiPredictionSummary;
  urgent_orders: AiPredictionProduct[];
  stable_products: AiPredictionProduct[];
}

function parseAiPredictionPayload(raw: unknown): AiPredictionPayload | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as { data?: unknown };
  const data = (root.data ?? raw) as Partial<AiPredictionPayload>;
  if (!data.summary || typeof data.summary !== 'object') return null;
  const summary = data.summary as AiPredictionSummary;
  if (!Number.isFinite(summary.total_products ?? NaN)) return null;
  return {
    summary,
    urgent_orders: Array.isArray(data.urgent_orders) ? data.urgent_orders as AiPredictionProduct[] : [],
    stable_products: Array.isArray(data.stable_products) ? data.stable_products as AiPredictionProduct[] : [],
  };
}

function parseAverageTemperature(text: string | undefined): number | null {
  if (!text) return null;
  const matches = Array.from(text.matchAll(/(-?\d+(?:\.\d+)?)\s*°C/gi));
  if (matches.length === 0) return null;
  const values = matches.map((m) => Number(m[1])).filter((v) => Number.isFinite(v));
  if (values.length === 0) return null;
  const avg = values.reduce((s, v) => s + v, 0) / values.length;
  return Math.round(avg * 10) / 10;
}

// ── Sub-badges ────────────────────────────────────────────────────────────────

function ForecastStatusBadge({ status }: { status?: AiForecastStatus | null }) {
  const normalized = (status && status in FORECAST_STATUS_STYLES ? status : 'PENDING') as AiForecastStatus;
  const s = FORECAST_STATUS_STYLES[normalized];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {FORECAST_STATUS_LABELS[normalized]}
    </span>
  );
}

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const s = REVIEW_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      {REVIEW_STATUS_LABELS[status]}
    </span>
  );
}

function MapeCell({
  score,
  level,
}: {
  score: number | null;
  level: MapeAlertLevel | null;
}) {
  if (score === null) return <span className="text-slate-400">—</span>;

  const colorClass =
    level === 'CRITICAL'
      ? 'text-rose-700 font-semibold'
      : level === 'WARNING'
        ? 'text-amber-700 font-semibold'
        : 'text-emerald-700';

  return (
    <span className={colorClass}>
      {Number(score).toFixed(1)}%
      {level && (
        <span className="ml-1 text-xs opacity-70">{level === 'CRITICAL' ? '⚠' : '△'}</span>
      )}
    </span>
  );
}

// ── Weather Card ──────────────────────────────────────────────────────────────

function WeatherCard({ data }: { data: AiForecastDetailType['weather_data'] }) {
  if (!data) return null;

  const conditionIcon: Record<string, string> = {
    Clear: 'wb_sunny',
    Rain: 'rainy',
    Clouds: 'cloud',
    Snow: 'ac_unit',
    Thunderstorm: 'thunderstorm',
    Drizzle: 'grain',
  };

  const icon = conditionIcon[data.condition] ?? 'thermostat';

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời tiết</p>
      <div className="flex items-center gap-2 mt-1">
        <span className="material-symbols-outlined text-[28px] text-slate-600">{icon}</span>
        <div>
          <p className="text-lg font-bold text-slate-900">{data.temperature}°C</p>
          <p className="text-xs text-slate-500">
            {data.condition} · {data.humidity}% humidity · {data.city}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Event Card ────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: AiForecastDetailType['event'] }) {
  if (!event) return null;

  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">
        Sự kiện khuyến mãi
      </p>
      <p className="mt-1 font-semibold text-indigo-900">{event.program_name}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {event.channels.map((ch) => (
          <span
            key={ch}
            className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700"
          >
            {CHANNEL_LABELS[ch]}
          </span>
        ))}
        {event.promotion_types.map((pt) => (
          <span
            key={pt}
            className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-indigo-600 ring-1 ring-indigo-200"
          >
            {PROMOTION_TYPE_LABELS[pt]}
          </span>
        ))}
      </div>
      <p className="mt-1 text-xs text-indigo-600">
        {new Date(event.start_date).toLocaleDateString('vi-VN', {
          month: 'short',
          day: 'numeric',
        })}
        {' → '}
        {new Date(event.end_date).toLocaleDateString('vi-VN', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
    </div>
  );
}

// ── AI Prediction Summary ───────────────────────────────────────────────────

function AiPredictionSummaryPanel({ raw }: { raw: unknown }) {
  const payload = useMemo(() => parseAiPredictionPayload(raw), [raw]);

  if (!payload) return null;

  const avgTemp = parseAverageTemperature(payload.summary.weather_context);

  const statItems = [
    { label: 'Tổng sản phẩm', value: payload.summary.total_products, color: 'text-slate-900' },
    { label: 'Cần nhập', value: payload.summary.products_need_order, color: 'text-rose-700' },
    { label: 'Ổn định', value: payload.summary.products_stable, color: 'text-emerald-700' },
    { label: 'SL đề xuất', value: payload.summary.total_suggested_qty, color: 'text-indigo-700' },
  ];

  const renderProductRow = (item: AiPredictionProduct, tone: 'urgent' | 'stable') => {
    const stockTone = item.current_stock < 0 ? 'text-rose-700' : item.current_stock === 0 ? 'text-slate-500' : 'text-slate-800';
    const badgeTone = tone === 'urgent'
      ? 'bg-rose-50 text-rose-700 ring-rose-200'
      : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    return (
      <div key={item.product_id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {item.product_code} · {item.product_name}
            </p>
            {item.product_categories.length > 0 && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                {item.product_categories.join(', ')}
              </p>
            )}
          </div>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeTone}`}>
            {item.priority ?? (tone === 'urgent' ? 'URGENT' : 'STABLE')}
          </span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600 sm:grid-cols-4">
          <div>
            <p className="text-[10px] uppercase text-slate-400">Tồn hiện tại</p>
            <p className={`font-semibold ${stockTone}`}>{item.current_stock.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Tồn an toàn</p>
            <p className="font-semibold text-slate-800">{item.safe_stock.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Dự báo</p>
            <p className="font-semibold text-slate-800">{item.forecast_demand.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase text-slate-400">Đề xuất nhập</p>
            <p className="font-semibold text-slate-900">{item.suggested_order.toLocaleString()}</p>
          </div>
        </div>
        {(item.reasoning || item.confidence_level) && (
          <div className="mt-2 text-xs text-slate-600">
            {item.confidence_level && (
              <span className="font-semibold text-slate-700">{item.confidence_level}</span>
            )}
            {item.confidence_level && item.reasoning ? <span className="text-slate-400"> · </span> : null}
            {item.reasoning && <span>{item.reasoning}</span>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Tổng quan dự báo AI</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Trạng thái: {payload.summary.status} · ID #{payload.summary.forecast_id}
            </p>
          </div>
          {payload.summary.is_fallback && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <span className="material-symbols-outlined text-[12px]">warning</span>
              Fallback
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
        {(payload.summary.weather_context || payload.summary.event_impact) && (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {payload.summary.weather_context && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Bối cảnh thời tiết</p>
                <p className="mt-1 text-xs text-slate-700 leading-relaxed">{payload.summary.weather_context}</p>
                {avgTemp !== null && (
                  <p className="mt-1 text-xs font-semibold text-slate-800">Nhiệt độ trung bình: {avgTemp}°C</p>
                )}
              </div>
            )}
            {payload.summary.event_impact && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-500">Tác động sự kiện</p>
                <p className="mt-1 text-xs text-indigo-700 leading-relaxed">{payload.summary.event_impact}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-rose-500 text-[18px]">priority_high</span>
            <h4 className="text-sm font-semibold text-slate-900">Cần nhập gấp</h4>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              {payload.urgent_orders.length}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {payload.urgent_orders.length === 0 ? (
              <p className="text-xs text-slate-500">Không có sản phẩm cần nhập gấp.</p>
            ) : (
              payload.urgent_orders.map((item) => renderProductRow(item, 'urgent'))
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-emerald-500 text-[18px]">check_circle</span>
            <h4 className="text-sm font-semibold text-slate-900">Ổn định</h4>
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              {payload.stable_products.length}
            </span>
          </div>
          <div className="mt-3 flex flex-col gap-3">
            {payload.stable_products.length === 0 ? (
              <p className="text-xs text-slate-500">Chưa có sản phẩm ổn định.</p>
            ) : (
              payload.stable_products.map((item) => renderProductRow(item, 'stable'))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────

function AiInsightsPanel({
  aiResponse,
  results,
  isFallback,
}: {
  aiResponse: AiForecastDetailType['ai_raw_response'];
  results: AiForecastResult[];
  isFallback: boolean;
}) {
  const [expanded, setExpanded] = useState(true);

  const geminiMap = useMemo(() => {
    const map = new Map<number, GeminiResultItem>();
    aiResponse?.results.forEach((r) => map.set(r.product_id, r));
    return map;
  }, [aiResponse]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Panel header */}
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
              ? 'Gemini không khả dụng — đã dùng trung bình dự phòng'
              : `Phân tích Gemini · ${aiResponse?.results.length ?? 0} sản phẩm đã đánh giá`}
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
          {isFallback || !aiResponse ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-semibold text-amber-800">Đã dùng chế độ dự phòng</p>
              <p className="mt-1 text-xs text-amber-700">
                Gemini AI không thể kết nối. Dự báo được tính theo trung bình động 30 ngày.
                Không có điểm tin cậy hoặc ghi chú nào cho lần chạy này.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3 max-h-80 overflow-y-auto pr-1">
              {results.map((result) => {
                const gemini = geminiMap.get(result.product_id);
                const confidence = gemini?.confidence != null ? gemini.confidence * 100 : null;
                const note = gemini?.note;

                return (
                  <div
                    key={result.id}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3"
                  >
                    {/* AI bubble icon */}
                    <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 mt-0.5">
                      <span className="material-symbols-outlined text-[14px]">psychology</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {result.product.code}{' '}
                        <span className="font-normal text-slate-500">— {result.product.name}</span>
                      </p>

                      {/* Confidence bar */}
                      {confidence !== null && (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${confidence >= 70
                                  ? 'bg-emerald-500'
                                  : confidence >= 45
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              style={{ width: `${confidence}%` }}
                            />
                          </div>
                          <span
                            className={`text-xs font-semibold w-10 text-right ${confidence >= 70
                                ? 'text-emerald-700'
                                : confidence >= 45
                                  ? 'text-amber-700'
                                  : 'text-rose-700'
                              }`}
                          >
                            {confidence.toFixed(0)}%
                          </span>
                        </div>
                      )}

                      {/* AI note */}
                      {note ? (
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{note}</p>
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

// ── Results Table ─────────────────────────────────────────────────────────────

interface ResultRowProps {
  result: AiForecastResult;
  onApprove: (r: AiForecastResult) => void;
  onReject: (r: AiForecastResult) => void;
  onSetActual: (r: AiForecastResult) => void;
}

function ResultRow({ result, onApprove, onReject, onSetActual }: ResultRowProps) {
  const isPending = result.review_status === 'PENDING';

  return (
    <TableRow className="hover:bg-slate-50">
      <TableCell>
        <p className="font-medium text-slate-900">{result.product.code}</p>
        <p className="text-xs text-slate-500 truncate max-w-[160px]">{result.product.name}</p>
      </TableCell>
      <TableCell className="text-right font-medium">
        {Number(result.forecast_qty).toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {Number(result.current_stock).toLocaleString()}
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {Number(result.incoming_stock).toLocaleString()}
      </TableCell>
      <TableCell className="text-right">
        <span
          className={`font-semibold ${Number(result.suggested_order_qty) > 0 ? 'text-slate-900' : 'text-slate-400'
            }`}
        >
          {Number(result.suggested_order_qty).toLocaleString()}
        </span>
      </TableCell>
      <TableCell>
        <ReviewBadge status={result.review_status} />
        {result.reject_reason && (
          <p className="mt-0.5 text-xs text-slate-500 max-w-[120px] truncate" title={result.reject_reason}>
            {result.reject_reason}
          </p>
        )}
      </TableCell>
      <TableCell>
        <MapeCell score={result.mape_score} level={result.mape_alert_level} />
      </TableCell>
      <TableCell className="text-right text-slate-600">
        {result.actual_qty !== null ? Number(result.actual_qty).toLocaleString() : '—'}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1.5">
          {isPending && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2"
                onClick={() => onApprove(result)}
              >
                Duyệt
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50 px-2"
                onClick={() => onReject(result)}
              >
                Từ chối
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-slate-600 px-2"
            onClick={() => onSetActual(result)}
          >
            {result.actual_qty !== null ? 'Cập nhật thực tế' : 'Nhập thực tế'}
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function AiForecastDetail({ id }: AiForecastDetailProps) {
  const navigate = useNavigate();
  const query = useAiForecastDetail(id);
  const retrainMutation = useTriggerRetrain();

  const [reviewTarget, setReviewTarget] = useState<AiForecastResult | null>(null);
  const [reviewAction, setReviewAction] = useState<'APPROVE' | 'REJECT'>('APPROVE');
  const [actualTarget, setActualTarget] = useState<AiForecastResult | null>(null);

  const openApprove = (r: AiForecastResult) => {
    setReviewAction('APPROVE');
    setReviewTarget(r);
  };
  const openReject = (r: AiForecastResult) => {
    setReviewAction('REJECT');
    setReviewTarget(r);
  };

  const forecast = query.data;

  const results = forecast?.results ?? [];

  const canRetrain = useMemo(() => {
    if (results.length === 0) return false;
    return results.some(
      (r) =>
        r.review_status !== 'PENDING' &&
        r.actual_qty !== null &&
        !r.is_retrain_submitted,
    );
  }, [results]);

  const pendingCount = results.filter((r) => r.review_status === 'PENDING').length;

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

  const forecastMonthLabel = new Date(forecast.forecast_month).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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
          Back to forecasts
        </button>

        {/* Header */}
        <PageHeader
          eyebrow={`Forecast · ${forecastMonthLabel}`}
          title={
            <span className="flex items-center gap-3">
              {forecastMonthLabel}
              <ForecastStatusBadge status={forecast.status} />
            </span>
          }
          description={`Triggered by ${forecast.triggered_user?.full_name ?? 'Hệ thống'} · ${results.length} products · ${pendingCount} pending review`}
          actions={
            <div className="flex gap-2">
              {canRetrain && (
                <Button
                  variant="outline"
                  disabled={retrainMutation.isPending}
                  onClick={() => retrainMutation.mutate()}
                >
                  {retrainMutation.isPending ? (
                    <>
                      <span className="material-symbols-outlined mr-1.5 text-[16px] animate-spin">
                        refresh
                      </span>
                      Retraining…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined mr-1.5 text-[16px]">
                        model_training
                      </span>
                      Retrain AI
                    </>
                  )}
                </Button>
              )}
            </div>
          }
        />

        {/* Fallback warning */}
        {forecast.is_fallback && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
            <span className="material-symbols-outlined text-[20px] text-amber-600 flex-shrink-0 mt-0.5">
              warning
            </span>
            <div>
              <p className="text-sm font-semibold text-amber-800">Fallback mode was used</p>
              <p className="text-xs text-amber-700 mt-0.5">
                {forecast.fallback_reason ??
                  'Gemini AI was unavailable. Forecasts are based on 30-day rolling sales averages.'}
              </p>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <WeatherCard data={forecast.weather_data} />
          <EventCard event={forecast.event} />
        </div>

        {/* AI Prediction Summary */}
        <AiPredictionSummaryPanel raw={forecast.ai_raw_response as unknown} />

        {/* AI Insights Panel */}
        <AiInsightsPanel
          aiResponse={forecast.ai_raw_response}
          results={results}
          isFallback={forecast.is_fallback}
        />

        {/* Results table */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Forecast Results
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {results.length}
                </span>
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Review each result and set actual quantities to improve future AI accuracy.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto border-t">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Forecast Qty</TableHead>
                  <TableHead className="text-right">Current Stock</TableHead>
                  <TableHead className="text-right">Incoming</TableHead>
                  <TableHead className="text-right">Suggested Order</TableHead>
                  <TableHead>Review</TableHead>
                  <TableHead>MAPE</TableHead>
                  <TableHead className="text-right">Actual Qty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center text-slate-500">
                      No results for this forecast run.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((result) => (
                    <ResultRow
                      key={result.id}
                      result={result}
                      onApprove={openApprove}
                      onReject={openReject}
                      onSetActual={(r) => setActualTarget(r)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Completed time */}
        {forecast.completed_at && (
          <p className="text-xs text-slate-400 text-center pb-2">
            Completed{' '}
            {new Date(forecast.completed_at).toLocaleString('en-US', {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        )}
      </div>

      {/* Dialogs */}
      <ReviewResultDialog
        forecastId={id}
        result={reviewTarget}
        defaultAction={reviewAction}
        onClose={() => setReviewTarget(null)}
      />
      <UpdateActualDialog
        forecastId={id}
        result={actualTarget}
        onClose={() => setActualTarget(null)}
      />
    </div>
  );
}
