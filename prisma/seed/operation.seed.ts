import {
  PrismaClient,
  StockInStatus,
  StockOutStatus,
  DiscrepancyStatus,
  TransactionType,
  AuditAction,
  StockOutType,
} from "../../src/generated";
import {
  generateStockInCode,
  generateStockOutCode,
} from "../../src/utils/generate-code.util";

export async function seedOperation(prisma: PrismaClient) {
  console.log("Seeding Operations...");

  const users = await prisma.user.findMany();
  const admin = users.find((u) => u.username === "admin") || users[0];
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
          },
        },
      },
    });

    const detail = await prisma.stockInDetail.findFirst({
      where: { stock_in_id: stockIn.id },
    });
    if (detail) {
      await prisma.stockInDetailLot.create({
        data: {
          stock_in_detail_id: detail.id,
          product_lot_id: lots[i % lots.length].id,
          quantity: 50,
        },
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
        },
      });
    }
  }

  // Create 10 Stock Outs với các trạng thái khác nhau
  const statusSequence = [
    StockOutStatus.DRAFT,
    StockOutStatus.DRAFT,
    StockOutStatus.PENDING,
    StockOutStatus.PENDING,
    StockOutStatus.APPROVED,
    StockOutStatus.APPROVED,
    StockOutStatus.PICKING,
    StockOutStatus.COMPLETED,
    StockOutStatus.COMPLETED,
    StockOutStatus.CANCELLED,
  ];

  for (let i = 0; i < 10; i++) {
    const manager = users.find((u) => u.username === "hung.manager");
    const approver = i % 2 === 0 ? manager : admin;

    const stockOut = await prisma.stockOut.create({
      data: {
        code: generateStockOutCode(i + 1),
        warehouse_location_id: locations[i % locations.length].id,
        type:
          i % 3 === 0 ? StockOutType.RETURN_TO_SUPPLIER : StockOutType.SALES,
        reference_number: i % 3 === 0 ? `RM-${i + 1}` : `SO-${i + 1}`,
        supplier_id: i % 3 === 0 ? suppliers[i % suppliers.length].id : null,
        created_by: admin.id,
        approved_by:
          statusSequence[i] !== StockOutStatus.DRAFT &&
          statusSequence[i] !== StockOutStatus.PENDING
            ? approver?.id
            : null,
        status: statusSequence[i],
        description:
          i % 3 === 0
            ? `Trả hàng cho nhà cung cấp ${i + 1}`
            : `Xuất bán cho chi nhánh ${i + 1}`,

        details: {
          create: {
            product_id: products[i % products.length].id,
            quantity: 10 + i * 2,
            unit_price: 20000,
          },
        },
      },
    });

    const detail = await prisma.stockOutDetail.findFirst({
      where: { stock_out_id: stockOut.id },
    });
    if (detail && Number(detail.quantity) > 0) {
      await prisma.stockOutDetailLot.create({
        data: {
          stock_out_detail_id: detail.id,
          product_lot_id: lots[i % lots.length].id,
          quantity: detail.quantity,
        },
      });
    }
  }



  // Audit Logs (15+)
  for (let i = 0; i < 15; i++) {
    await prisma.auditLog.create({
      data: {
        module:
          i % 3 === 0 ? "STOCK_OUT" : i % 3 === 1 ? "STOCK_IN" : "PRODUCT",
        entity_type:
          i % 3 === 0 ? "STOCK_OUT" : i % 3 === 1 ? "STOCK_IN" : "PRODUCT",
        entity_id: i % 3 === 0 ? 1 : products[i % products.length].id,
        action: i % 2 === 0 ? AuditAction.UPDATE : AuditAction.CREATE,
        note: `Audit log số ${i + 1}`,
        created_by: admin.id,
      },
    });
  }

  // Inventory Transactions (15+)
  for (let i = 0; i < 15; i++) {
    const product = products[i % products.length];
    const uom = await prisma.productUom.findFirst({
      where: { product_id: product.id },
    });

    await prisma.inventoryTransaction.create({
      data: {
        warehouse_location_id: locations[i % locations.length].id,
        product_id: product.id,
        product_uom_id: uom?.id || 1,
        transaction_type:
          i % 2 === 0 ? TransactionType.ADJUSTMENT : TransactionType.IN,
        quantity: 5 + i,
        base_quantity: 5 + i,
        balance_after: 105 + i * 2,
        note: `Giao dịch ${i + 1} - kiểm kê định kỳ`,
        created_by: admin.id,
      },
    });
  }
}
