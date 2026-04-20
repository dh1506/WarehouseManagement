import {
  PrismaClient,
  StockCountType,
  StockCountScope,
  StockCountStatus,
  AdjustmentType,
  TransactionType,
} from "../../src/generated";
import { generateStockCountCode } from "../../src/utils/generate-code.util";

export async function seedStockCount(prisma: PrismaClient) {
  console.log("🔍 Seeding Stock Count...");

  const users = await prisma.user.findMany();
  const admin = users.find((u) => u.username === "admin") || users[0];
  const manager = users.find((u) => u.username === "hung.manager") || users[1];
  const staff = users.find((u) => u.username === "vy.staff") || users[3];

  const locations = await prisma.warehouseLocation.findMany();
  const products = await prisma.product.findMany();
  const lots = await prisma.productLot.findMany();
  const inventories = await prisma.inventory.findMany();

  // ==================== 1. Kiểm kê APPROVED (Đã duyệt - có phiếu điều chỉnh) ====================
  const sc1 = await prisma.stockCount.create({
    data: {
      code: generateStockCountCode(1),
      type: StockCountType.PERIODIC,
      scope_type: StockCountScope.FULL,
      description: "Kiểm kê định kỳ tháng 3 - toàn bộ kho chính",
      status: StockCountStatus.APPROVED,
      created_by: manager.id,
      approved_by: admin.id,
      details: {
        create: products.slice(0, 3).map((p, i) => ({
          warehouse_location_id: locations[i % locations.length].id,
          product_id: p.id,
          lot_id: lots[i % lots.length]?.id ?? null,
          system_quantity: 100,
          counted_quantity: i === 0 ? 98 : i === 1 ? 102 : 100,
          variance_quantity: i === 0 ? -2 : i === 1 ? 2 : 0,
          unit_price: 15000,
          variance_reason:
            i === 0
              ? "Phát hiện thiếu 2 sản phẩm do hư hỏng trong quá trình lưu kho"
              : i === 1
                ? "Phát hiện dôi 2 sản phẩm chưa được ghi nhận trước đó"
                : null,
          is_confirmed: true,
          counted_by: staff.id,
          counted_at: new Date(),
        })),
      },
    },
  });

  // Tạo adjustments cho sc1
  const sc1Details = await prisma.stockCountDetail.findMany({
    where: { stock_count_id: sc1.id },
  });

  for (const detail of sc1Details) {
    const variance = Number(detail.variance_quantity ?? 0);
    if (variance === 0) continue;

    await prisma.stockCountAdjustment.create({
      data: {
        stock_count_id: sc1.id,
        stock_count_detail_id: detail.id,
        warehouse_location_id: detail.warehouse_location_id,
        product_id: detail.product_id,
        lot_id: detail.lot_id,
        adjustment_type: variance > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE,
        adjustment_quantity: Math.abs(variance),
        note: `Điều chỉnh từ kiểm kê ${sc1.code}`,
        created_by: admin.id,
      },
    });
  }

  // ==================== 2. Kiểm kê COMPLETED (Chờ duyệt) ====================
  await prisma.stockCount.create({
    data: {
      code: generateStockCountCode(2),
      type: StockCountType.AD_HOC,
      scope_type: StockCountScope.ZONE,
      description: "Kiểm kê đột xuất khu vực lạnh - phát hiện mất hàng",
      status: StockCountStatus.COMPLETED,
      created_by: manager.id,
      details: {
        create: products.slice(3, 6).map((p, i) => ({
          warehouse_location_id: locations[(i + 3) % locations.length].id,
          product_id: p.id,
          lot_id: lots[(i + 3) % lots.length]?.id ?? null,
          system_quantity: 50,
          counted_quantity: 50 - (i + 1),
          variance_quantity: -(i + 1),
          unit_price: 20000,
          variance_reason: `Thiếu ${i + 1} sản phẩm, nghi ngờ thất thoát`,
          is_confirmed: true,
          counted_by: staff.id,
          counted_at: new Date(),
        })),
      },
    },
  });

  // ==================== 3. Kiểm kê COUNTING (Đang đếm) ====================
  await prisma.stockCount.create({
    data: {
      code: generateStockCountCode(3),
      type: StockCountType.PERIODIC,
      scope_type: StockCountScope.PRODUCT,
      description: "Kiểm kê định kỳ sản phẩm nhóm thực phẩm khô",
      status: StockCountStatus.COUNTING,
      created_by: staff.id,
      details: {
        create: products.slice(0, 4).map((p, i) => ({
          warehouse_location_id: locations[i % locations.length].id,
          product_id: p.id,
          system_quantity: inventories.find(
            (inv) => inv.product_id === p.id
          )
            ? Number(
                inventories.find((inv) => inv.product_id === p.id)!.quantity
              )
            : 100,
          counted_quantity: i < 2 ? 95 + i : null,
          variance_quantity: i < 2 ? -5 + i : null,
          unit_price: 12000,
          counted_by: i < 2 ? staff.id : null,
          counted_at: i < 2 ? new Date() : null,
        })),
      },
    },
  });

  // ==================== 4. Kiểm kê DRAFT (Nháp) ====================
  await prisma.stockCount.create({
    data: {
      code: generateStockCountCode(4),
      type: StockCountType.AD_HOC,
      scope_type: StockCountScope.LOT,
      description: "Kiểm kê đột xuất theo lô hàng sắp hết hạn",
      status: StockCountStatus.DRAFT,
      created_by: manager.id,
      details: {
        create: products.slice(5, 8).map((p, i) => ({
          warehouse_location_id: locations[(i + 5) % locations.length].id,
          product_id: p.id,
          lot_id: lots[(i + 5) % lots.length]?.id ?? null,
          system_quantity: 75,
          unit_price: 18000,
        })),
      },
    },
  });

  // ==================== 5. Kiểm kê CANCELLED (Đã hủy) ====================
  await prisma.stockCount.create({
    data: {
      code: generateStockCountCode(5),
      type: StockCountType.PERIODIC,
      scope_type: StockCountScope.ZONE,
      description: "Kiểm kê bị hủy do sự cố hệ thống",
      status: StockCountStatus.CANCELLED,
      created_by: staff.id,
      details: {
        create: products.slice(2, 5).map((p, i) => ({
          warehouse_location_id: locations[(i + 2) % locations.length].id,
          product_id: p.id,
          system_quantity: 60,
          unit_price: 25000,
        })),
      },
    },
  });

  // ==================== 6-10. Thêm các đợt kiểm kê để đủ 10 bản ghi ====================
  const additionalStatuses = [
    StockCountStatus.APPROVED,
    StockCountStatus.COMPLETED,
    StockCountStatus.APPROVED,
    StockCountStatus.COUNTING,
    StockCountStatus.DRAFT,
  ];

  const additionalTypes = [
    StockCountType.PERIODIC,
    StockCountType.AD_HOC,
    StockCountType.PERIODIC,
    StockCountType.AD_HOC,
    StockCountType.PERIODIC,
  ];

  const additionalScopes = [
    StockCountScope.FULL,
    StockCountScope.PRODUCT,
    StockCountScope.ZONE,
    StockCountScope.LOT,
    StockCountScope.FULL,
  ];

  for (let i = 0; i < 5; i++) {
    const sc = await prisma.stockCount.create({
      data: {
        code: generateStockCountCode(6 + i),
        type: additionalTypes[i],
        scope_type: additionalScopes[i],
        description: `Kiểm kê ${additionalTypes[i] === "PERIODIC" ? "định kỳ" : "đột xuất"} bổ sung #${i + 6}`,
        status: additionalStatuses[i],
        created_by: i % 2 === 0 ? manager.id : staff.id,
        approved_by:
          additionalStatuses[i] === StockCountStatus.APPROVED
            ? admin.id
            : null,
        details: {
          create: products.slice(i, i + 3).map((p, j) => ({
            warehouse_location_id: locations[(i + j) % locations.length].id,
            product_id: p.id,
            lot_id: lots[(i + j) % lots.length]?.id ?? null,
            system_quantity: 80 + i * 5,
            counted_quantity:
              additionalStatuses[i] !== StockCountStatus.DRAFT
                ? 78 + i * 5 + j
                : null,
            variance_quantity:
              additionalStatuses[i] !== StockCountStatus.DRAFT
                ? -2 + j
                : null,
            unit_price: 10000 + i * 2000,
            variance_reason:
              additionalStatuses[i] !== StockCountStatus.DRAFT &&
              -2 + j !== 0
                ? `Chênh lệch ${-2 + j > 0 ? "dôi dư" : "thất thoát"} ${Math.abs(-2 + j)} SP`
                : null,
            is_confirmed:
              additionalStatuses[i] === StockCountStatus.APPROVED ||
              additionalStatuses[i] === StockCountStatus.COMPLETED,
            counted_by:
              additionalStatuses[i] !== StockCountStatus.DRAFT
                ? staff.id
                : null,
            counted_at:
              additionalStatuses[i] !== StockCountStatus.DRAFT
                ? new Date()
                : null,
          })),
        },
      },
    });

    // Tạo adjustments cho các đợt đã APPROVED
    if (additionalStatuses[i] === StockCountStatus.APPROVED) {
      const scDetails = await prisma.stockCountDetail.findMany({
        where: { stock_count_id: sc.id },
      });

      for (const detail of scDetails) {
        const variance = Number(detail.variance_quantity ?? 0);
        if (variance === 0) continue;

        await prisma.stockCountAdjustment.create({
          data: {
            stock_count_id: sc.id,
            stock_count_detail_id: detail.id,
            warehouse_location_id: detail.warehouse_location_id,
            product_id: detail.product_id,
            lot_id: detail.lot_id,
            adjustment_type:
              variance > 0 ? AdjustmentType.INCREASE : AdjustmentType.DECREASE,
            adjustment_quantity: Math.abs(variance),
            note: `Điều chỉnh ${variance > 0 ? "tăng" : "giảm"} từ kiểm kê ${sc.code}`,
            created_by: admin.id,
          },
        });
      }
    }
  }

  console.log("✅ Seed Stock Count completed!");
}
