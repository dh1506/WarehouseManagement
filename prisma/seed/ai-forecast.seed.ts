import type { PrismaClient } from "../../src/generated";

export async function seedAiForecast(prisma: PrismaClient) {
  console.log("Seeding AI Forecast data...");

  // Lấy dependencies
  const user = await prisma.user.findFirst();
  const product = await prisma.product.findFirst();
  const location = await prisma.warehouseLocation.findFirst();

  if (!user || !product || !location) {
    console.warn("Skipping AI Forecast seed due to missing dependencies (User, Product, or Location).");
    return;
  }

  // 1. Tạo sự kiện khuyến mãi (Event)
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  nextMonth.setDate(1); // Mùng 1 tháng sau

  const eventStart = new Date(nextMonth);
  const eventEnd = new Date(nextMonth);
  eventEnd.setDate(15);

  const event = await prisma.aiForecastEvent.create({
    data: {
      event_month: nextMonth,
      program_name: "Siêu Sale Giữa Tháng",
      promotion_types: ["DISCOUNT", "BOGO"],
      applicable_products: "Tất cả sản phẩm đồ uống lạnh",
      start_date: eventStart,
      end_date: eventEnd,
      channels: ["STORE", "SHOPEE"],
      expected_target: "Tăng 20% doanh thu",
      estimated_budget: 15000000,
      created_by: user.id,
    },
  });

  // 2. Tạo bản ghi AiForecast (Mock history)
  const currentMonth = new Date();
  currentMonth.setDate(1);

  const forecast = await prisma.aiForecast.create({
    data: {
      forecast_month: currentMonth,
      status: "COMPLETED",
      is_fallback: false,
      input_snapshot: { note: "Mock input snapshot" },
      ai_raw_response: { results: [{ product_id: product.id, forecast_qty: 150 }] },
      weather_data: { city: "Ho Chi Minh City", temperature: 32, condition: "Clear" },
      triggered_by: user.id,
      completed_at: new Date(),
    },
  });

  // 3. Tạo kết quả dự báo (AiForecastResult)
  await prisma.aiForecastResult.create({
    data: {
      forecast_id: forecast.id,
      product_id: product.id,
      warehouse_location_id: location.id,
      forecast_qty: 150,
      current_stock: 50,
      safe_stock: 20,
      incoming_stock: 10,
      suggested_order_qty: 110, // 150 - 50 - 10 + 20
      review_status: "PENDING",
    },
  });

  console.log("AI Forecast data seeded successfully.");
}
