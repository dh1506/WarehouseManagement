import axios from 'axios';
import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import {
  getGeminiClient,
  GEMINI_TOTAL_KEYS,
  GEMINI_MODEL,
  AI_MAX_RETRIES,
  AI_RETRY_DELAY_MS,
  AI_REQUEST_TIMEOUT_MS,
} from '../config/gemini.config';
import { sendMapeAlertEmail, type MapeAlertItem } from '../utils/email.util';
import { createStockIn } from './stock-in.service';
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

/** Mức ưu tiên nhập hàng dựa trên stock-out risk */
type StockPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'STABLE';

/** Đề xuất nhập hàng cho 1 sản phẩm (response trả về client) */
interface ForecastRecommendation {
  result_id: number;
  product_id: number;
  product_code: string;
  product_name: string;
  product_categories: string[];
  current_stock: number;
  incoming_stock: number;
  safe_stock: number;
  forecast_demand: number;
  suggested_order: number;
  reasoning: string;
  confidence_level: string;
  priority: StockPriority;
}

/** Tóm tắt tổng quan 1 lần dự báo */
interface ForecastSummary {
  forecast_id: number;
  status: string;
  is_fallback: boolean;
  total_products: number;
  products_need_order: number;
  products_stable: number;
  total_suggested_qty: number;
  weather_context: string;
  event_impact: string | null;
}

/** Response hoàn chỉnh cho triggerForecast và getForecastDetail */
export interface TriggerForecastResponse {
  summary: ForecastSummary;
  urgent_orders: ForecastRecommendation[];
  stable_products: ForecastRecommendation[];
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
 * Gọi Gemini AI với cơ chế auto-swap API key.
 * Luồng: retry AI_MAX_RETRIES lần trên key hiện tại → nếu fail → swap sang key tiếp theo.
 * Chỉ throw khi TẤT CẢ key đều fail.
 */
const callGeminiWithRetry = async (prompt: string): Promise<GeminiAiResponse> => {
  let lastError: unknown;

  for (let keyIndex = 0; keyIndex < GEMINI_TOTAL_KEYS; keyIndex++) {
    const client = getGeminiClient(keyIndex);
    console.log(`[AI Forecast] Sử dụng API key #${keyIndex + 1}/${GEMINI_TOTAL_KEYS}`);

    for (let attempt = 1; attempt <= AI_MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), AI_REQUEST_TIMEOUT_MS);

        const model = client.getGenerativeModel({ model: GEMINI_MODEL });
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
        console.warn(
          `[AI Forecast] Key #${keyIndex + 1} - Lần thử ${attempt}/${AI_MAX_RETRIES} thất bại:`,
          err
        );
        if (attempt < AI_MAX_RETRIES) await delay(AI_RETRY_DELAY_MS * attempt);
      }
    }

    // Key hiện tại fail hết → log và chuyển sang key tiếp theo
    if (keyIndex < GEMINI_TOTAL_KEYS - 1) {
      console.warn(`[AI Forecast] Key #${keyIndex + 1} fail sau ${AI_MAX_RETRIES} lần. Tự động swap sang key #${keyIndex + 2}...`);
    }
  }

  throw lastError;
};

/**
 * Tính mức ưu tiên nhập hàng dựa trên stock-out risk.
 * So sánh lượng hàng khả dụng (tồn kho + đang về) với nhu cầu dự báo.
 */
const calcPriority = (
  currentStock: number,
  incomingStock: number,
  forecastQty: number,
  suggestedOrder: number
): StockPriority => {
  if (suggestedOrder === 0) return 'STABLE';
  const available = currentStock + incomingStock;
  const coverage = forecastQty > 0 ? available / forecastQty : 1;
  if (coverage < 0.25) return 'CRITICAL'; // Đủ dùng < 1 tuần
  if (coverage < 0.5) return 'HIGH';      // Đủ dùng < 2 tuần
  if (coverage < 0.75) return 'MEDIUM';   // Đủ dùng < 3 tuần
  return 'LOW';
};

/**
 * Format confidence từ số (0-1) sang chuỗi dễ đọc
 */
const formatConfidence = (confidence: number | undefined): string => {
  if (confidence === undefined || confidence === null) return 'N/A';
  const pct = Math.round(confidence * 100);
  if (pct >= 80) return `High (${pct}%)`;
  if (pct >= 50) return `Medium (${pct}%)`;
  return `Low (${pct}%)`;
};

/**
 * Tạo weather context string từ WeatherData
 */
const buildWeatherContext = (w: WeatherData): string => {
  const conditionMap: Record<string, string> = {
    Clear: 'trời nắng', Rain: 'trời mưa', Clouds: 'trời nhiều mây',
    Drizzle: 'mưa phùn', Thunderstorm: 'giông bão', Snow: 'tuyết',
    Mist: 'sương mù', Haze: 'sương mù nhẹ', Unknown: 'không xác định',
  };
  const condText = conditionMap[w.condition] ?? w.condition;
  const tempNote = w.temperature >= 33 ? 'Ưu tiên đồ uống giải nhiệt'
    : w.temperature >= 28 ? 'Thời tiết nóng, nhu cầu đồ uống tăng nhẹ'
    : w.temperature <= 20 ? 'Thời tiết lạnh, nhu cầu đồ ấm tăng'
    : 'Thời tiết ôn hòa';
  return `Dự báo ${condText} (${w.temperature}°C), độ ẩm ${w.humidity}% - ${tempNote}`;
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
 * Trigger dự báo AI thủ công.
 * Trả về TriggerForecastResponse với summary + recommendations phân nhóm.
 */
export const triggerForecast = async (params: {
  forecast_month: string;
  event_id?: number;
  city?: string;
  triggeredBy: number;
}): Promise<TriggerForecastResponse> => {
  const { forecast_month, event_id, city, triggeredBy } = params;
  const forecastMonthDate = new Date(`${forecast_month}-01`);
  const cityName = city ?? process.env.DEFAULT_CITY ?? 'Ho Chi Minh City';

  // 1. Lấy danh sách sản phẩm, tồn kho, và thông tin danh mục
  const inventories = await prisma.inventory.findMany({
    include: {
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          safe_stock: true,
          product_type: true,
          description: true,
          categories: {
            select: { category: { select: { name: true } } },
          },
        },
      },
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

  // 6. Xây dựng input snapshot (masked) - bổ sung category, type, description
  const inputPayload = {
    forecast_month,
    weather: weatherData,
    event: event
      ? {
          program_name: event.program_name,
          promotion_types: event.promotion_types,
          applicable_products: event.applicable_products,
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
        product_type: inv.product.product_type,
        product_description: inv.product.description ?? '',
        product_categories: inv.product.categories.map((c) => c.category.name),
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

  // 8. Gọi Gemini AI (auto-swap key + fallback)
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
    fallbackReason = `AI thất bại sau ${AI_MAX_RETRIES} lần thử x ${GEMINI_TOTAL_KEYS} key: ${String(err)}`;
    console.error('[AI Forecast] Tất cả API key đều fail. Dùng fallback forecast:', fallbackReason);
    forecastResults = await calcFallbackForecast(productIds, warehouseLocationId);
  }

  // 9. Lưu kết quả vào DB và build response
  const inventoryMap = new Map(inventories.map((inv) => [inv.product_id, inv]));
  const aiResultMap = new Map(forecastResults.map((r) => [r.product_id, r]));

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

  // Lấy lại kết quả đã lưu để lấy ID
  const savedResults = await prisma.aiForecastResult.findMany({
    where: { forecast_id: forecast.id },
    select: { id: true, product_id: true }
  });
  const savedResultMap = new Map(savedResults.map(r => [r.product_id, r.id]));

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

  // 11. Build response tập trung vào quyết định nhập hàng
  const recommendations: ForecastRecommendation[] = resultCreateData.map((r) => {
    const inv = inventoryMap.get(r.product_id);
    const aiDetail = aiResultMap.get(r.product_id);
    const suggested = Number(r.suggested_order_qty);

    return {
      result_id: savedResultMap.get(r.product_id) ?? 0,
      product_id: r.product_id,
      product_code: inv?.product.code ?? '',
      product_name: inv?.product.name ?? '',
      product_categories: inv?.product.categories.map((c) => c.category.name) ?? [],
      current_stock: Number(r.current_stock),
      incoming_stock: Number(r.incoming_stock),
      safe_stock: Number(r.safe_stock),
      forecast_demand: Number(r.forecast_qty),
      suggested_order: suggested,
      reasoning: aiDetail?.note ?? 'Tính toán dựa trên lịch sử bán hàng',
      confidence_level: formatConfidence(aiDetail?.confidence),
      priority: calcPriority(
        Number(r.current_stock),
        Number(r.incoming_stock),
        Number(r.forecast_qty),
        suggested
      ),
    };
  });

  // Phân nhóm: cần nhập gấp vs ổn định
  const urgentOrders = recommendations.filter((r) => r.suggested_order > 0);
  const stableProducts = recommendations.filter((r) => r.suggested_order === 0);

  // Sắp xếp urgent theo priority: CRITICAL > HIGH > MEDIUM > LOW
  const priorityOrder: Record<StockPriority, number> = {
    CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, STABLE: 4,
  };
  urgentOrders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Build event impact string
  let eventImpact: string | null = null;
  if (event) {
    const promoTypes = Array.isArray(event.promotion_types)
      ? (event.promotion_types as string[]).join(', ')
      : String(event.promotion_types);
    eventImpact = `Chương trình "${event.program_name}" (${promoTypes}) - Dự kiến ảnh hưởng nhu cầu`;
    if (event.expected_target) {
      eventImpact += ` | Mục tiêu: ${event.expected_target}`;
    }
  }

  return {
    summary: {
      forecast_id: forecast.id,
      status: 'COMPLETED',
      is_fallback: isFallback,
      total_products: recommendations.length,
      products_need_order: urgentOrders.length,
      products_stable: stableProducts.length,
      total_suggested_qty: urgentOrders.reduce((sum, r) => sum + r.suggested_order, 0),
      weather_context: buildWeatherContext(weatherData),
      event_impact: eventImpact,
    },
    urgent_orders: urgentOrders,
    stable_products: stableProducts,
  };
};

/**
 * Tạo prompt gửi Gemini AI.
 * Prompt được thiết kế để AI hiểu ngữ cảnh sự kiện, danh mục sản phẩm,
 * và trả về giải thích bằng ngôn ngữ "người bán hàng".
 */
const buildGeminiPrompt = (input: Record<string, unknown>): string => {
  return `
Bạn là trợ lý AI tư vấn nhập hàng cho chuỗi F&B tại Việt Nam.
Vai trò: Giúp người quản lý kho quyết định nhập bao nhiêu hàng cho tháng tới.

Dữ liệu đầu vào:
${JSON.stringify(input, null, 2)}

Nhiệm vụ: Dự báo số lượng bán ra trong tháng ${input['forecast_month']} cho từng sản phẩm.

Hướng dẫn QUAN TRỌNG:
1. Dựa trên doanh số tháng trước (prev_month_sales) làm baseline chính.
2. Phân tích thời tiết: Trời nóng (>30°C) → tăng đồ uống lạnh 20-30%, trời lạnh (<22°C) → tăng đồ nóng.
3. Sự kiện khuyến mãi:
   - Nếu có sự kiện (event != null), XEM KỸ trường "applicable_products" và "promotion_types".
   - CHỈ TĂNG dự báo cho sản phẩm LIÊN QUAN đến chương trình. Xác định bằng cách đối chiếu product_categories và product_type với mô tả applicable_products.
   - VÍ DỤ: Nếu chương trình "Combo nước giải khát" → chỉ tăng forecast cho SP có danh mục đồ uống.
   - Sản phẩm KHÔNG liên quan đến chương trình → giữ nguyên hoặc chỉ điều chỉnh theo thời tiết.
4. Nếu prev_month_sales = 0, dự báo dựa trên sản phẩm tương tự cùng danh mục.

Quy tắc cho kết quả:
- forecast_qty: Phải là SỐ NGUYÊN DƯƠNG (làm tròn lên).
- confidence: Số từ 0 đến 1, thể hiện độ tin cậy.
- note: Giải thích ngắn gọn bằng TIẾNG VIỆT, dùng ngôn ngữ người bán hàng.
  VD tốt: "Tăng 25% do nắng nóng + KM combo", "Giữ nguyên, không bị ảnh hưởng KM".
  VD xấu: "Forecast increased by weather factor 1.25 multiplied by promotion factor".

Định dạng JSON phản hồi (BẮT BUỘC):
{
  "results": [
    {
      "product_id": <number>,
      "forecast_qty": <number - số lượng dự báo cho CẢ THÁNG, số nguyên dương>,
      "confidence": <number 0-1 - độ tin cậy>,
      "note": "<string - lý do ngắn gọn bằng tiếng Việt>"
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
 * Lấy chi tiết 1 forecast + kết quả từng sản phẩm.
 * Trả về TriggerForecastResponse với summary + recommendations phân nhóm.
 */
export const getForecastDetail = async (id: number): Promise<TriggerForecastResponse> => {
  const forecast = await prisma.aiForecast.findUnique({
    where: { id },
    include: {
      triggered_user: { select: { id: true, full_name: true } },
      event: true,
      results: {
        include: {
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              categories: {
                select: { category: { select: { name: true } } },
              },
            },
          },
          reviewer: { select: { id: true, full_name: true } },
        },
        orderBy: { product_id: 'asc' },
      },
    },
  });
  if (!forecast) throw new AppError('Không tìm thấy bản ghi dự báo', 404);

  // Trích xuất AI raw response để lấy note/confidence
  const aiRaw = forecast.ai_raw_response as { results?: ForecastResultItem[] } | null;
  const aiResultMap = new Map(
    (aiRaw?.results ?? []).map((r) => [r.product_id, r])
  );

  // Đọc weather data
  const weatherData = (forecast.weather_data as WeatherData | null) ?? {
    city: 'Unknown', temperature: 30, condition: 'Unknown', humidity: 70,
  };

  // Build recommendations từ kết quả đã lưu
  const recommendations: ForecastRecommendation[] = forecast.results.map((r) => {
    const aiDetail = aiResultMap.get(r.product_id);
    const suggested = Number(r.suggested_order_qty);

    return {
      result_id: r.id,
      product_id: r.product_id,
      product_code: r.product.code,
      product_name: r.product.name,
      product_categories: r.product.categories.map((c) => c.category.name),
      current_stock: Number(r.current_stock),
      incoming_stock: Number(r.incoming_stock),
      safe_stock: Number(r.safe_stock),
      forecast_demand: Number(r.forecast_qty),
      suggested_order: suggested,
      reasoning: aiDetail?.note ?? 'Tính toán dựa trên lịch sử bán hàng',
      confidence_level: formatConfidence(aiDetail?.confidence),
      priority: calcPriority(
        Number(r.current_stock),
        Number(r.incoming_stock),
        Number(r.forecast_qty),
        suggested
      ),
    };
  });

  const urgentOrders = recommendations.filter((r) => r.suggested_order > 0);
  const stableProducts = recommendations.filter((r) => r.suggested_order === 0);

  const priorityOrder: Record<StockPriority, number> = {
    CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, STABLE: 4,
  };
  urgentOrders.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  // Build event impact
  let eventImpact: string | null = null;
  if (forecast.event) {
    const promoTypes = Array.isArray(forecast.event.promotion_types)
      ? (forecast.event.promotion_types as string[]).join(', ')
      : String(forecast.event.promotion_types);
    eventImpact = `Chương trình "${forecast.event.program_name}" (${promoTypes})`;
    if (forecast.event.expected_target) {
      eventImpact += ` | Mục tiêu: ${forecast.event.expected_target}`;
    }
  }

  return {
    summary: {
      forecast_id: forecast.id,
      status: forecast.status,
      is_fallback: forecast.is_fallback,
      total_products: recommendations.length,
      products_need_order: urgentOrders.length,
      products_stable: stableProducts.length,
      total_suggested_qty: urgentOrders.reduce((sum, r) => sum + r.suggested_order, 0),
      weather_context: buildWeatherContext(weatherData),
      event_impact: eventImpact,
    },
    urgent_orders: urgentOrders,
    stable_products: stableProducts,
  };
};

/**
 * Phê duyệt / Từ chối nhiều kết quả dự báo (Bulk Review)
 */
export const bulkReviewForecastResults = async (
  items: { result_id: number; action: 'APPROVE' | 'REJECT'; reject_reason?: string }[],
  reviewedBy: number
) => {
  const results = await prisma.aiForecastResult.findMany({
    where: { id: { in: items.map((i) => i.result_id) } },
    include: { product: { include: { productSuppliers: true } } },
  });

  if (results.length !== items.length) {
    throw new AppError('Một số kết quả dự báo không tồn tại', 404);
  }

  const resultStatusMap = new Map(results.map((r) => [r.id, r.review_status]));
  if (Array.from(resultStatusMap.values()).some((status) => status !== 'PENDING')) {
    throw new AppError('Một số kết quả đã được xét duyệt trước đó', 400);
  }

  const approvedResults: typeof results = [];

  // Validate items & gather approved ones
  for (const item of items) {
    if (item.action === 'REJECT' && !item.reject_reason) {
      throw new AppError(`Vui lòng cung cấp lý do từ chối cho kết quả ID ${item.result_id}`, 400);
    }
    if (item.action === 'APPROVE') {
      const dbResult = results.find((r) => r.id === item.result_id);
      if (dbResult) approvedResults.push(dbResult);
    }
  }

  // Nếu có sản phẩm được duyệt, kiểm tra supplier và chuẩn bị tạo phiếu nhập
  const stockInPayloads = new Map<number, {
    warehouse_location_id: number;
    details: { product_id: number; expected_quantity: number }[];
  }>();

  if (approvedResults.length > 0) {
    for (const res of approvedResults) {
      const suppliers = res.product.productSuppliers;
      if (suppliers.length === 0) {
        throw new AppError(
          `Sản phẩm ${res.product.code} chưa được gán nhà cung cấp nào. Vui lòng cập nhật nhà cung cấp trước khi duyệt.`,
          400
        );
      }

      // Ưu tiên nhà cung cấp chính (is_primary = true), nếu không lấy nhà cung cấp đầu tiên
      const primarySupplier = suppliers.find((s) => s.is_primary) || suppliers[0];
      const supplierId = primarySupplier!.supplier_id;

      if (!stockInPayloads.has(supplierId)) {
        stockInPayloads.set(supplierId, {
          warehouse_location_id: res.warehouse_location_id,
          details: [],
        });
      }

      stockInPayloads.get(supplierId)!.details.push({
        product_id: res.product_id,
        expected_quantity: Number(res.suggested_order_qty),
      });
    }
  }

  // Thực hiện update status trong transaction
  await prisma.$transaction(
    items.map((item) =>
      prisma.aiForecastResult.update({
        where: { id: item.result_id },
        data: {
          review_status: item.action === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          reject_reason: item.action === 'REJECT' ? (item.reject_reason ?? null) : null,
          reviewed_by: reviewedBy,
          reviewed_at: new Date(),
        },
      })
    )
  );

  // Tạo phiếu nhập cho các sản phẩm được approve
  const createdStockIns = [];
  for (const [supplierId, payload] of stockInPayloads.entries()) {
    const stockIn = await createStockIn(reviewedBy, {
      warehouse_location_id: payload.warehouse_location_id,
      supplier_id: supplierId,
      description: 'Hệ thống tự động tạo phiếu nhập từ đề xuất AI Forecast',
      details: payload.details,
    });
    createdStockIns.push(stockIn.code);
  }

  return {
    updated_count: items.length,
    created_stock_ins: createdStockIns,
  };
};

/**
 * Cập nhật actual_qty và tính MAPE cho nhiều kết quả cùng lúc
 */
export const bulkUpdateActualAndCalcMape = async (
  items: { result_id: number; actual_qty: number }[]
) => {
  const resultIds = items.map((i) => i.result_id);
  const results = await prisma.aiForecastResult.findMany({
    where: { id: { in: resultIds } },
    include: { product: { select: { id: true, code: true, name: true } }, forecast: true },
  });

  if (results.length !== items.length) {
    throw new AppError('Một số kết quả dự báo không tồn tại', 404);
  }

  const warningItems: MapeAlertItem[] = [];
  const criticalItems: MapeAlertItem[] = [];
  const normalItems: MapeAlertItem[] = [];
  let forecastId: number | null = null;
  let forecastMonthStr: string = '';

  const updatePromises = items.map((item) => {
    const result = results.find((r) => r.id === item.result_id)!;
    forecastId = result.forecast_id;
    forecastMonthStr = result.forecast.forecast_month.toLocaleDateString('vi-VN', {
      month: '2-digit',
      year: 'numeric',
    });

    const mape = calcMape(Number(result.forecast_qty), item.actual_qty);
    let alertLevel: 'WARNING' | 'CRITICAL' | null = null;

    if (mape !== null) {
      if (mape > MAPE_CRITICAL_THRESHOLD) alertLevel = 'CRITICAL';
      else if (mape > MAPE_WARNING_THRESHOLD) alertLevel = 'WARNING';
    }

    const alertItem: MapeAlertItem = {
      productId: result.product_id,
      productCode: result.product.code,
      productName: result.product.name,
      forecastQty: Number(result.forecast_qty),
      actualQty: item.actual_qty,
      mapeScore: mape ?? 0,
      alertLevel: alertLevel || 'WARNING', // Placeholder for normal items which don't have level
    };

    if (alertLevel === 'CRITICAL') criticalItems.push(alertItem);
    else if (alertLevel === 'WARNING') warningItems.push(alertItem);
    else if (mape !== null) normalItems.push(alertItem);

    return prisma.aiForecastResult.update({
      where: { id: item.result_id },
      data: {
        actual_qty: item.actual_qty,
        mape_score: mape,
        mape_alert_level: alertLevel,
      },
    });
  });

  const updatedResults = await prisma.$transaction(updatePromises);

  // Gửi 1 email duy nhất tổng hợp tất cả
  if (forecastId !== null && (warningItems.length > 0 || criticalItems.length > 0 || normalItems.length > 0)) {
    const dashboardUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:5173'}/ai-forecasts/${forecastId}`;

    // Truyền thêm normalItems qua tham số tuỳ chỉnh
    void sendMapeAlertEmail({
      forecastMonth: `Tháng ${forecastMonthStr}`,
      forecastId,
      warningItems,
      criticalItems,
      dashboardUrl,
      // @ts-ignore - ta sẽ update sendMapeAlertEmail payload type sau
      normalItems, 
    }).catch((e) => console.error('[Email] Lỗi gửi bulk MAPE alert:', e));
  }

  return updatedResults;
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
