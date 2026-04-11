import { PrismaClient, StockInStatus, StockOutStatus, DiscrepancyStatus, TransactionType, AuditAction } from "../../src/generated";
import { generateStockInCode } from "../../src/utils/generate-code.util";

export async function seedOperation(prisma: PrismaClient) {
  console.log("Seeding Operations...");

  const users = await prisma.user.findMany();
  const admin = users.find(u => u.username === "admin") || users[0];
  const locations = await prisma.warehouseLocation.findMany();
  const products = await prisma.product.findMany();
  const suppliers = await prisma.supplier.findMany();
  const lots = await prisma.productLot.findMany();
  const uoms = await prisma.unitOfMeasure.findMany();

  // Create 10 Stock Ins
  for (let i = 0; i < 10; i++) {
    const stockIn = await prisma.stockIn.create({
      data: {
        code: generateStockInCode(i + 1),
        warehouse_location_id: locations[i % locations.length].id,
        supplier_id: suppliers[i % suppliers.length].id,
        created_by: admin.id,
        status: StockInStatus.COMPLETED,
        description: `Nhập hàng định kỳ số ${i + 1}`,
        details: {
          create: {
            product_id: products[i % products.length].id,
            expected_quantity: 50,
            received_quantity: 50,
            unit_price: 15000,
          }
        }
      }
    });

    const detail = await prisma.stockInDetail.findFirst({ where: { stock_in_id: stockIn.id } });
    if (detail) {
      await prisma.stockInDetailLot.create({
        data: {
          stock_in_detail_id: detail.id,
          product_lot_id: lots[i % lots.length].id,
          quantity: 50,
        }
      });
    }

    // Discrepancy for all 10
    if (i < 10) {
      await prisma.stockInDiscrepancy.create({
        data: {
          stock_in_id: stockIn.id,
          reported_by: admin.id,
          expected_qty: 50,
          actual_qty: 48,
          reason: "Hàng bị móp méo khi vận chuyển",
          status: DiscrepancyStatus.PENDING,
        }
      });
    }
  }

  // Create 10 Stock Outs
  for (let i = 0; i < 10; i++) {
    const stockOut = await prisma.stockOut.create({
      data: {
        code: `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${(i + 1).toString().padStart(4, "0")}`,
        warehouse_location_id: locations[i % locations.length].id,
        created_by: admin.id,
        status: StockOutStatus.SHIPPED,
        description: `Xuất hàng cho bếp chi nhánh ${i + 1}`,
        details: {
          create: {
            product_id: products[i % products.length].id,
            quantity: 10,
            unit_price: 20000,
          }
        }
      }
    });

    const detail = await prisma.stockOutDetail.findFirst({ where: { stock_out_id: stockOut.id } });
    if (detail) {
      await prisma.stockOutDetailLot.create({
        data: {
          stock_out_detail_id: detail.id,
          product_lot_id: lots[i % lots.length].id,
          quantity: 10,
        }
      });
    }
  }

  // Audit Logs (10+)
  for (let i = 0; i < 10; i++) {
    await prisma.auditLog.create({
      data: {
        module: "PRODUCT",
        entity_type: "PRODUCT",
        entity_id: products[i % products.length].id,
        action: AuditAction.UPDATE,
        note: `Cập nhật thông tin sản phẩm ${products[i % products.length].name}`,
        created_by: admin.id,
      }
    });
  }

  // Inventory Transactions (10+)
  for (let i = 0; i < 10; i++) {
    const product = products[i % products.length];
    const uom = await prisma.productUom.findFirst({ where: { product_id: product.id } });

    await prisma.inventoryTransaction.create({
      data: {
        warehouse_location_id: locations[i % locations.length].id,
        product_id: product.id,
        product_uom_id: uom?.id || 1, // Fallback if not found
        transaction_type: TransactionType.ADJUSTMENT,
        quantity: 5,
        base_quantity: 5,
        balance_after: 105,
        note: `Điều chỉnh tồn kho kiểm kê định kỳ`,
        created_by: admin.id,
      }
    });
  }
}
