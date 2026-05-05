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

// ── Sub-badges ────────────────────────────────────────────────────────────────

function ForecastStatusBadge({ status }: { status: AiForecastStatus }) {
  const s = FORECAST_STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
    >
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {FORECAST_STATUS_LABELS[status]}
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
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Weather Snapshot</p>
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
        Promotion Event
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
        {new Date(event.start_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        })}
        {' → '}
        {new Date(event.end_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      </p>
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
          <p className="text-sm font-semibold text-slate-900">AI Insights</p>
          <p className="text-xs text-slate-500">
            {isFallback
              ? 'Gemini was unavailable — fallback averages were used'
              : `Gemini analysis · ${aiResponse?.results.length ?? 0} products evaluated`}
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
              <p className="text-sm font-semibold text-amber-800">Fallback mode was used</p>
              <p className="mt-1 text-xs text-amber-700">
                Gemini AI was unreachable. Forecasts were calculated as a 30-day rolling average.
                No confidence scores or notes are available for this run.
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
                            {confidence.toFixed(0)}%
                          </span>
                        </div>
                      )}

                      {/* AI note */}
                      {note ? (
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">{note}</p>
                      ) : (
                        <p className="mt-1 text-xs text-slate-400 italic">No note provided.</p>
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
          className={`font-semibold ${
            Number(result.suggested_order_qty) > 0 ? 'text-slate-900' : 'text-slate-400'
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
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-rose-300 text-rose-700 hover:bg-rose-50 px-2"
                onClick={() => onReject(result)}
              >
                Reject
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-slate-600 px-2"
            onClick={() => onSetActual(result)}
          >
            {result.actual_qty !== null ? 'Update Actual' : 'Set Actual'}
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

  const canRetrain = useMemo(() => {
    if (!forecast?.results) return false;
    return forecast.results.some(
      (r) =>
        r.review_status !== 'PENDING' &&
        r.actual_qty !== null &&
        !r.is_retrain_submitted,
    );
  }, [forecast?.results]);

  const pendingCount = forecast?.results.filter((r) => r.review_status === 'PENDING').length ?? 0;

  if (query.isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfe]">
        <StatePanel
          title="Loading forecast"
          description="Fetching forecast details and per-product results."
          icon="hourglass_top"
        />
      </div>
    );
  }

  if (query.isError || !forecast) {
    return (
      <div className="flex h-full items-center justify-center bg-[#fbfbfe]">
        <StatePanel
          title="Forecast not found"
          description="This forecast may have been removed or the ID is invalid."
          icon="error"
          tone="error"
          action={
            <Button variant="outline" onClick={() => navigate('/ai-forecast')}>
              Back to list
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
          description={`Triggered by ${forecast.triggered_user.full_name} · ${forecast.results.length} products · ${pendingCount} pending review`}
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

        {/* AI Insights Panel */}
        <AiInsightsPanel
          aiResponse={forecast.ai_raw_response}
          results={forecast.results}
          isFallback={forecast.is_fallback}
        />

        {/* Results table */}
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Forecast Results
                <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                  {forecast.results.length}
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
                {forecast.results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-20 text-center text-slate-500">
                      No results for this forecast run.
                    </TableCell>
                  </TableRow>
                ) : (
                  forecast.results.map((result) => (
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
