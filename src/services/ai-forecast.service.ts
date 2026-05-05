import axios from 'axios';
import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { genAI, GEMINI_MODEL, AI_MAX_RETRIES, AI_RETRY_DELAY_MS, AI_REQUEST_TIMEOUT_MS } from '../config/gemini.config';
import { sendMapeAlertEmail, type MapeAlertItem } from '../utils/email.util';
import type { Prisma } from '../generated';

// =============================================
// TYPES
// =============================================

interface WeatherData {
  city: string;
  temperature: number;
  condition: string; // Clear, Rain, Clouds, etc.
  humidity: number;
}

interface ForecastResultItem {
  product_id: number;
  forecast_qty: number;
  confidence?: number;
  note?: string;
}

interface GeminiAiResponse {
  results: ForecastResultItem[];
}

// =============================================
// CONSTANTS
// =============================================
const MAPE_WARNING_THRESHOLD = 10;
const MAPE_CRITICAL_THRESHOLD = 20;
const FALLBACK_DAYS = 30; // Số ngày lấy dữ liệu lịch sử khi fallback

// =============================================
// HELPERS
// =============================================

/**
 * Delay helper cho retry
 */
const delay = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms));

/**
 * Fetch thời tiết từ OpenWeatherMap
 */
const fetchWeather = async (city: string): Promise<WeatherData> => {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) throw new AppError('OPENWEATHER_API_KEY chưa được cấu hình', 500);

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=vi`;
  const res = await axios.get<{
    name: string;
    main: { temp: number; humidity: number };
    weather: { main: string }[];
  }>(url, { timeout: 10000 });

  return {
    city: res.data.name,
    temperature: res.data.main.temp,
    humidity: res.data.main.humidity,
    condition: res.data.weather[0]?.main ?? 'Unknown',
  };
};

/**
 * Masking thông tin nhạy cảm khỏi dữ liệu gửi AI
 * Xóa tên nhà cung cấp, email, số điện thoại, địa chỉ
 */
const maskSensitiveData = <T extends Record<string, unknown>>(data: T): T => {
  const sensitiveKeys = ['supplier_name', 'email', 'phone', 'address', 'tax_code', 'contact_name'];
  const masked = { ...data };
  for (const key of sensitiveKeys) {
    if (key in masked) {
      (masked as Record<string, unknown>)[key] = '***MASKED***';
    }
  }
  return masked;
};

/**
 * Tính suggested_order_qty theo business rule:
 * max(0, forecast_qty - current_stock - incoming_stock + safe_stock)
 */
const calcSuggestedOrderQty = (
  forecastQty: number,
  currentStock: number,
  incomingStock: number,
  safeStock: number
): number => Math.max(0, forecastQty - currentStock - incomingStock + safeStock);

/**
 * Tính MAPE (Mean Absolute Percentage Error)
 * Nếu actual = 0 trả về null (tránh chia 0)
 */
const calcMape = (forecast: number, actual: number): number | null => {
  if (actual === 0) return null;
  return Math.abs((forecast - actual) / actual) * 100;
};

/**
 * Gọi Gemini AI với retry tối đa AI_MAX_RETRIES lần
 */
const callGeminiWithRetry = async (prompt: string): Promise<GeminiAiResponse> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      clearTimeout(timer);

      const text = result.response.text() ?? '';
      // Trích xuất JSON từ response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Gemini không trả về JSON hợp lệ');

      return JSON.parse(jsonMatch[0]) as GeminiAiResponse;
    } catch (err) {
      lastError = err;
      console.warn(`[AI Forecast] Lần thử ${attempt}/${AI_MAX_RETRIES} thất bại:`, err);
      if (attempt < AI_MAX_RETRIES) await delay(AI_RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
};

/**
 * Fallback forecast: tính trung bình bán ra 30 ngày gần nhất
 */
const calcFallbackForecast = async (
  productIds: number[],
  warehouseLocationId: number
): Promise<ForecastResultItem[]> => {
  const since = new Date();
  since.setDate(since.getDate() - FALLBACK_DAYS);

  const summaries = await prisma.salesDailySummary.groupBy({
    by: ['product_id'],
    where: {
      product_id: { in: productIds },
      warehouse_location_id: warehouseLocationId,
      summary_date: { gte: since },
    },
    _avg: { net_sales_qty: true },
  });

  const avgMap = new Map(summaries.map((s) => [s.product_id, Number(s._avg.net_sales_qty ?? 0)]));

  // Ước lượng 30 ngày tới = avg/ngày * 30
  return productIds.map((pid) => ({
    product_id: pid,
    forecast_qty: (avgMap.get(pid) ?? 0) * 30,
  }));
};

// =============================================
// SERVICE FUNCTIONS
// =============================================

/**
 * Tạo mới sự kiện khuyến mãi tháng
 */
export const createForecastEvent = async (
  data: {
    event_month: string;
    program_name: string;
    promotion_types: string[];
    applicable_products?: string;
    start_date: string;
    end_date: string;
    channels: string[];
    expected_target?: string;
    estimated_budget?: number;
    notes?: string;
  },
  createdBy: number
) => {
  const eventMonthDate = new Date(`${data.event_month}-01`);

  return prisma.aiForecastEvent.create({
    data: {
      event_month: eventMonthDate,
      program_name: data.program_name,
      promotion_types: data.promotion_types as Prisma.InputJsonValue,
      applicable_products: data.applicable_products ?? null,
      start_date: new Date(data.start_date),
      end_date: new Date(data.end_date),
      channels: data.channels as Prisma.InputJsonValue,
      expected_target: data.expected_target ?? null,
      estimated_budget: data.estimated_budget ?? null,
      notes: data.notes ?? null,
      created_by: createdBy,
    },
  });
};

/**
 * Lấy danh sách sự kiện
 */
export const listForecastEvents = async () => {
  return prisma.aiForecastEvent.findMany({
    orderBy: { event_month: 'desc' },
    include: { creator: { select: { id: true, full_name: true } } },
  });
};

/**
 * Trigger dự báo AI thủ công
 */
export const triggerForecast = async (params: {
  forecast_month: string;
  event_id?: number;
  city?: string;
  triggeredBy: number;
}) => {
  const { forecast_month, event_id, city, triggeredBy } = params;
  const forecastMonthDate = new Date(`${forecast_month}-01`);
  const cityName = city ?? process.env.DEFAULT_CITY ?? 'Ho Chi Minh City';

  // 1. Lấy danh sách sản phẩm và tồn kho
  const inventories = await prisma.inventory.findMany({
    include: {
      product: { select: { id: true, code: true, name: true, safe_stock: true } },
      location: { select: { id: true, warehouse_id: true } },
    },
  });

  if (inventories.length === 0) throw new AppError('Không có dữ liệu tồn kho', 400);

  const warehouseLocationId = inventories[0]!.warehouse_location_id;
  const productIds = inventories.map((inv) => inv.product_id);

  // 2. Lấy doanh thu tháng trước
  const prevMonthStart = new Date(forecastMonthDate);
  prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
  const prevMonthEnd = new Date(forecastMonthDate);
  prevMonthEnd.setDate(prevMonthEnd.getDate() - 1);

  const salesHistory = await prisma.salesDailySummary.findMany({
    where: {
      summary_date: { gte: prevMonthStart, lte: prevMonthEnd },
      product_id: { in: productIds },
    },
    select: {
      product_id: true,
      net_sales_qty: true,
      total_revenue: true,
      summary_date: true,
    },
  });

  // 3. Hàng đang về (StockIn PENDING/IN_PROGRESS)
  const pendingStockIns = await prisma.stockInDetail.findMany({
    where: {
      product_id: { in: productIds },
      stock_in: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
    },
    select: { product_id: true, expected_quantity: true },
  });
  const incomingMap = new Map<number, number>();
  for (const si of pendingStockIns) {
    const cur = incomingMap.get(si.product_id) ?? 0;
    incomingMap.set(si.product_id, cur + Number(si.expected_quantity));
  }

  // 4. Fetch thời tiết
  let weatherData: WeatherData;
  try {
    weatherData = await fetchWeather(cityName);
  } catch {
    weatherData = { city: cityName, temperature: 30, condition: 'Unknown', humidity: 70 };
    console.warn('[AI Forecast] Không fetch được thời tiết, dùng giá trị mặc định');
  }

  // 5. Lấy thông tin sự kiện (nếu có)
  const event = event_id
    ? await prisma.aiForecastEvent.findUnique({ where: { id: event_id } })
    : null;

  // 6. Xây dựng input snapshot (masked)
  const inputPayload = {
    forecast_month,
    weather: weatherData,
    event: event
      ? {
          program_name: event.program_name,
          promotion_types: event.promotion_types,
          channels: event.channels,
          expected_target: event.expected_target,
          start_date: event.start_date,
          end_date: event.end_date,
        }
      : null,
    products: inventories.map((inv) =>
      maskSensitiveData({
        product_id: inv.product_id,
        product_code: inv.product.code,
        product_name: inv.product.name,
        current_stock: Number(inv.quantity),
        safe_stock: Number(inv.product.safe_stock ?? 0),
        incoming_stock: incomingMap.get(inv.product_id) ?? 0,
        prev_month_sales: salesHistory
          .filter((s) => s.product_id === inv.product_id)
          .reduce((sum, s) => sum + Number(s.net_sales_qty), 0),
      })
    ),
  };

  // 7. Tạo bản ghi AiForecast với status RUNNING
  const forecast = await prisma.aiForecast.create({
    data: {
      forecast_month: forecastMonthDate,
      status: 'RUNNING',
      input_snapshot: inputPayload as unknown as Prisma.InputJsonValue,
      weather_data: weatherData as unknown as Prisma.InputJsonValue,
      event_id: event_id ?? null,
      triggered_by: triggeredBy,
    },
  });

  // 8. Gọi Gemini AI (với retry và fallback)
  let forecastResults: ForecastResultItem[];
  let isFallback = false;
  let fallbackReason: string | null = null;
  let aiRawResponse: unknown = null;

  const prompt = buildGeminiPrompt(inputPayload);

  try {
    const aiResponse = await callGeminiWithRetry(prompt);
    aiRawResponse = aiResponse;
    forecastResults = aiResponse.results;
  } catch (err) {
    isFallback = true;
    fallbackReason = `AI thất bại sau ${AI_MAX_RETRIES} lần thử: ${String(err)}`;
    console.error('[AI Forecast] Dùng fallback forecast:', fallbackReason);
    forecastResults = await calcFallbackForecast(productIds, warehouseLocationId);
  }

  // 9. Lưu kết quả và tính suggested_order_qty
  const inventoryMap = new Map(inventories.map((inv) => [inv.product_id, inv]));

  const resultCreateData: Prisma.AiForecastResultCreateManyInput[] = forecastResults.map((r) => {
    const inv = inventoryMap.get(r.product_id);
    const currentStock = Number(inv?.quantity ?? 0);
    const safeStock = Number(inv?.product.safe_stock ?? 0);
    const incomingStock = incomingMap.get(r.product_id) ?? 0;
    const suggested = calcSuggestedOrderQty(r.forecast_qty, currentStock, incomingStock, safeStock);

    return {
      forecast_id: forecast.id,
      product_id: r.product_id,
      warehouse_location_id: inv?.warehouse_location_id ?? warehouseLocationId,
      forecast_qty: r.forecast_qty,
      current_stock: currentStock,
      safe_stock: safeStock,
      incoming_stock: incomingStock,
      suggested_order_qty: suggested,
    };
  });

  await prisma.aiForecastResult.createMany({ data: resultCreateData });

  // 10. Update AiForecast thành COMPLETED
  await prisma.aiForecast.update({
    where: { id: forecast.id },
    data: {
      status: 'COMPLETED',
      is_fallback: isFallback,
      fallback_reason: fallbackReason,
      ai_raw_response: aiRawResponse as Prisma.InputJsonValue,
      completed_at: new Date(),
    },
  });

  return prisma.aiForecast.findUnique({
    where: { id: forecast.id },
    include: { results: { include: { product: { select: { id: true, code: true, name: true } } } } },
  });
};

/**
 * Tạo prompt gửi Gemini AI
 */
const buildGeminiPrompt = (input: Record<string, unknown>): string => {
  return `
Bạn là hệ thống AI dự báo nhu cầu hàng hóa cho chuỗi F&B tại Việt Nam.

Dữ liệu đầu vào:
${JSON.stringify(input, null, 2)}

Nhiệm vụ: Dự báo số lượng bán ra trong tháng ${input['forecast_month']} cho từng sản phẩm.

Hướng dẫn:
- Phân tích mối liên hệ giữa thời tiết và nhu cầu (VD: trời nóng tăng đồ uống lạnh 20-30%)
- Xét tác động của sự kiện khuyến mãi đến nhu cầu
- Dựa trên doanh số tháng trước (prev_month_sales) làm baseline
- Chỉ trả về JSON thuần, không giải thích thêm

Định dạng JSON phản hồi (BẮT BUỘC):
{
  "results": [
    {
      "product_id": <number>,
      "forecast_qty": <number - số lượng dự báo cho cả tháng>,
      "confidence": <number 0-1 - độ tin cậy>,
      "note": "<string - lý do ngắn>"
    }
  ]
}
`;
};

/**
 * Lấy lịch sử dự báo với phân trang
 */
export const listForecastHistory = async (query: {
  page: string;
  limit: string;
  forecast_month?: string;
  status?: string;
}) => {
  const page = Math.max(1, parseInt(query.page));
  const limit = Math.min(50, parseInt(query.limit));
  const skip = (page - 1) * limit;

  const where: Prisma.AiForecastWhereInput = {};
  if (query.forecast_month) {
    const d = new Date(`${query.forecast_month}-01`);
    where.forecast_month = d;
  }
  if (query.status) where.status = query.status as 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

  const [total, items] = await Promise.all([
    prisma.aiForecast.count({ where }),
    prisma.aiForecast.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        triggered_user: { select: { id: true, full_name: true } },
        event: { select: { id: true, program_name: true } },
        _count: { select: { results: true } },
      },
    }),
  ]);

  return { total, page, limit, items };
};

/**
 * Lấy chi tiết 1 forecast + kết quả từng sản phẩm
 */
export const getForecastDetail = async (id: number) => {
  const forecast = await prisma.aiForecast.findUnique({
    where: { id },
    include: {
      triggered_user: { select: { id: true, full_name: true } },
      event: true,
      results: {
        include: {
          product: { select: { id: true, code: true, name: true } },
          reviewer: { select: { id: true, full_name: true } },
        },
        orderBy: { product_id: 'asc' },
      },
    },
  });
  if (!forecast) throw new AppError('Không tìm thấy bản ghi dự báo', 404);
  return forecast;
};

/**
 * Approve hoặc Reject 1 kết quả dự báo
 */
export const reviewForecastResult = async (
  resultId: number,
  action: 'APPROVE' | 'REJECT',
  reviewedBy: number,
  rejectReason?: string
) => {
  const result = await prisma.aiForecastResult.findUnique({ where: { id: resultId } });
  if (!result) throw new AppError('Không tìm thấy kết quả dự báo', 404);
  if (result.review_status !== 'PENDING') {
    throw new AppError('Kết quả này đã được xét duyệt trước đó', 400);
  }
  if (action === 'REJECT' && !rejectReason) {
    throw new AppError('Vui lòng cung cấp lý do từ chối', 400);
  }

  return prisma.aiForecastResult.update({
    where: { id: resultId },
    data: {
      review_status: action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
      reject_reason: action === 'REJECT' ? (rejectReason ?? null) : null,
      reviewed_by: reviewedBy,
      reviewed_at: new Date(),
    },
  });
};

/**
 * Cập nhật actual_qty và tính MAPE sau khi có doanh số thực tế
 */
export const updateActualAndCalcMape = async (resultId: number, actualQty: number) => {
  const result = await prisma.aiForecastResult.findUnique({
    where: { id: resultId },
    include: { product: { select: { id: true, code: true, name: true } }, forecast: true },
  });
  if (!result) throw new AppError('Không tìm thấy kết quả dự báo', 404);

  const mape = calcMape(Number(result.forecast_qty), actualQty);
  let alertLevel: 'WARNING' | 'CRITICAL' | null = null;
  if (mape !== null) {
    if (mape > MAPE_CRITICAL_THRESHOLD) alertLevel = 'CRITICAL';
    else if (mape > MAPE_WARNING_THRESHOLD) alertLevel = 'WARNING';
  }

  const updated = await prisma.aiForecastResult.update({
    where: { id: resultId },
    data: {
      actual_qty: actualQty,
      mape_score: mape,
      mape_alert_level: alertLevel,
    },
  });

  // Gửi email cảnh báo nếu vượt threshold
  if (alertLevel) {
    const forecastMonthStr = result.forecast.forecast_month.toLocaleDateString('vi-VN', {
      month: '2-digit',
      year: 'numeric',
    });
    const alertItem: MapeAlertItem = {
      productId: result.product_id,
      productCode: result.product.code,
      productName: result.product.name,
      forecastQty: Number(result.forecast_qty),
      actualQty,
      mapeScore: mape!,
      alertLevel,
    };
    const dashboardUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/ai-forecasts/${result.forecast_id}`;

    // Gửi async, không block response
    void sendMapeAlertEmail({
      forecastMonth: `Tháng ${forecastMonthStr}`,
      forecastId: result.forecast_id,
      warningItems: alertLevel === 'WARNING' ? [alertItem] : [],
      criticalItems: alertLevel === 'CRITICAL' ? [alertItem] : [],
      dashboardUrl,
    }).catch((e) => console.error('[Email] Lỗi gửi MAPE alert:', e));
  }

  return updated;
};

/**
 * Gom toàn bộ feedback (APPROVED/REJECTED) chưa submit và gọi AI retrain
 */
export const triggerRetrain = async (triggeredBy: number) => {
  // Lấy tất cả kết quả chưa submit retrain và đã được review
  const feedbacks = await prisma.aiForecastResult.findMany({
    where: {
      is_retrain_submitted: false,
      review_status: { in: ['APPROVED', 'REJECTED'] },
      actual_qty: { not: null },
    },
    include: {
      product: { select: { id: true, code: true, name: true } },
    },
  });

  if (feedbacks.length === 0) throw new AppError('Không có feedback nào để retrain', 400);

  // Tạo batch retrain
  const batch = await prisma.aiRetrainBatch.create({
    data: {
      batch_date: new Date(),
      status: 'RUNNING',
      total_feedbacks: feedbacks.length,
      triggered_by: triggeredBy,
    },
  });

  // Chuẩn bị payload retrain (masked)
  const retrainPayload = feedbacks.map((f) =>
    maskSensitiveData({
      product_id: f.product_id,
      product_code: f.product.code,
      forecast_qty: Number(f.forecast_qty),
      actual_qty: Number(f.actual_qty),
      mape_score: f.mape_score ? Number(f.mape_score) : null,
      review_status: f.review_status,
      reject_reason: f.reject_reason,
    })
  );

  try {
    // Gọi Gemini để ghi nhận feedback (retrain instruction)
    const prompt = `
Đây là dữ liệu feedback từ hệ thống WMS để cải thiện mô hình dự báo:
${JSON.stringify(retrainPayload, null, 2)}

Hãy phân tích các trường hợp sai lệch và trả về JSON tóm tắt bài học:
{"lessons": [{"pattern": "...", "recommendation": "..."}]}
`;
    const aiResponse = await callGeminiWithRetry(prompt);

    // Đánh dấu đã submit
    await prisma.aiForecastResult.updateMany({
      where: { id: { in: feedbacks.map((f) => f.id) } },
      data: { is_retrain_submitted: true },
    });

    await prisma.aiRetrainBatch.update({
      where: { id: batch.id },
      data: {
        status: 'COMPLETED',
        ai_raw_response: aiResponse as unknown as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    await prisma.aiRetrainBatch.update({
      where: { id: batch.id },
      data: { status: 'FAILED', error_message: String(err) },
    });
    throw new AppError(`Retrain thất bại: ${String(err)}`, 500);
  }

  return batch;
};
