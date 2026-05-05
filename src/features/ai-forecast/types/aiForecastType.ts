// ── Enums ─────────────────────────────────────────────────────────────────────

export type AiForecastStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type MapeAlertLevel = 'WARNING' | 'CRITICAL';
export type PromotionType = 'DISCOUNT' | 'BOGO' | 'COMBO' | 'GIFT';
export type ForecastChannel = 'STORE' | 'SHOPEE' | 'GRABFOOD' | 'FACEBOOK' | 'ZALO' | 'OTHER';

// ── Label / Style Maps ────────────────────────────────────────────────────────

export const FORECAST_STATUS_LABELS: Record<AiForecastStatus, string> = {
  PENDING: 'Pending',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

export const FORECAST_STATUS_STYLES: Record<
  AiForecastStatus,
  { bg: string; text: string; ring: string; dot: string }
> = {
  PENDING:   { bg: 'bg-slate-100',   text: 'text-slate-700',   ring: 'ring-slate-300',   dot: 'bg-slate-400' },
  RUNNING:   { bg: 'bg-blue-50',     text: 'text-blue-700',    ring: 'ring-blue-300',    dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-300', dot: 'bg-emerald-500' },
  FAILED:    { bg: 'bg-rose-50',     text: 'text-rose-700',    ring: 'ring-rose-300',    dot: 'bg-rose-500' },
};

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

export const REVIEW_STATUS_STYLES: Record<ReviewStatus, { bg: string; text: string; ring: string }> = {
  PENDING:  { bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-300' },
  APPROVED: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-300' },
  REJECTED: { bg: 'bg-rose-50',    text: 'text-rose-700',    ring: 'ring-rose-300' },
};

export const PROMOTION_TYPE_LABELS: Record<PromotionType, string> = {
  DISCOUNT: 'Discount',
  BOGO:     'Buy One Get One',
  COMBO:    'Combo',
  GIFT:     'Gift',
};

export const CHANNEL_LABELS: Record<ForecastChannel, string> = {
  STORE:    'In-Store',
  SHOPEE:   'Shopee',
  GRABFOOD: 'GrabFood',
  FACEBOOK: 'Facebook',
  ZALO:     'Zalo',
  OTHER:    'Other',
};

// ── Nested Entity Types ───────────────────────────────────────────────────────

export interface ForecastUser {
  id: number;
  full_name: string;
}

export interface ForecastResultProduct {
  id: number;
  code: string;
  name: string;
}

export interface WeatherData {
  city: string;
  temperature: number;
  condition: string;
  humidity: number;
}

export interface GeminiResultItem {
  product_id: number;
  forecast_qty: number;
  confidence?: number; // 0–1 scale
  note?: string;
}

export interface GeminiAiResponse {
  results: GeminiResultItem[];
}

export interface AiRetrainLesson {
  pattern: string;
  recommendation: string;
}

// ── Core Entities ─────────────────────────────────────────────────────────────

export interface AiForecastEvent {
  id: number;
  event_month: string;
  program_name: string;
  promotion_types: PromotionType[];
  applicable_products: string | null;
  start_date: string;
  end_date: string;
  channels: ForecastChannel[];
  expected_target: string | null;
  estimated_budget: number | null;
  notes: string | null;
  created_by: number;
  creator: ForecastUser;
}

export interface AiForecastResult {
  id: number;
  forecast_id: number;
  product_id: number;
  warehouse_location_id: number;
  forecast_qty: number;
  current_stock: number;
  safe_stock: number;
  incoming_stock: number;
  suggested_order_qty: number;
  review_status: ReviewStatus;
  reject_reason: string | null;
  reviewed_by: number | null;
  reviewed_at: string | null;
  actual_qty: number | null;
  mape_score: number | null;
  mape_alert_level: MapeAlertLevel | null;
  is_retrain_submitted: boolean;
  product: ForecastResultProduct;
  reviewer: ForecastUser | null;
}

export interface AiForecast {
  id: number;
  forecast_month: string;
  status: AiForecastStatus;
  is_fallback: boolean;
  fallback_reason: string | null;
  ai_raw_response: GeminiAiResponse | null;
  weather_data: WeatherData | null;
  input_snapshot: unknown;
  event_id: number | null;
  triggered_by: number;
  created_at: string;
  completed_at: string | null;
  triggered_user: ForecastUser;
  event: { id: number; program_name: string } | null;
  _count: { results: number };
}

export interface AiForecastDetail extends Omit<AiForecast, '_count' | 'event'> {
  event: AiForecastEvent | null;
  results: AiForecastResult[];
}

export interface AiRetrainBatch {
  id: number;
  batch_date: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED';
  total_feedbacks: number;
  triggered_by: number;
  ai_raw_response: { lessons: AiRetrainLesson[] } | null;
  error_message: string | null;
}

// ── API Response / Query Types ────────────────────────────────────────────────

export interface AiForecastListResponse {
  total: number;
  page: number;
  limit: number;
  items: AiForecast[];
}

export interface AiForecastQueryParams {
  page: number;
  limit: number;
  forecast_month?: string;
  status?: AiForecastStatus;
}

export interface AiForecastFilterState {
  forecast_month: string;
  status: AiForecastStatus | '';
}

// ── Form Value Types ──────────────────────────────────────────────────────────

export interface TriggerForecastFormValues {
  forecast_month: string;
  event_id: string;
  city: string;
}

export interface CreateEventFormValues {
  event_month: string;
  program_name: string;
  promotion_types: PromotionType[];
  applicable_products: string;
  start_date: string;
  end_date: string;
  channels: ForecastChannel[];
  expected_target: string;
  estimated_budget: string;
  notes: string;
}
