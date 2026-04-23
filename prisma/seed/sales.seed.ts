import { PrismaClient, Prisma } from "../../src/generated";

export async function seedSales(prisma: PrismaClient) {
  console.log("Seeding Sales Management data...");

  // Get dependencies
  const user = await prisma.user.findFirst();
  const product = await prisma.product.findFirst();
  const location = await prisma.warehouseLocation.findFirst();

  if (!user || !product || !location) {
    console.warn("Skipping sales seed due to missing dependencies (User, Product, or Location).");
    return;
  }

  // Create a batch
  const batchCode = `POS_SYNC_SEED_${Date.now()}`;
  const batch = await prisma.salesImportBatch.create({
    data: {
      batch_code: batchCode,
      source: "POS_API",
      status: "COMPLETED",
      total_records: 2,
      success_records: 2,
      error_records: 0,
      created_by: user.id,
    },
  });

  // Create transactions
  const date = new Date();
  
  // Sale
  await prisma.salesTransaction.create({
    data: {
      batch_id: batch.id,
      warehouse_location_id: location.id,
      transaction_code: `INV-SEED-001`,
      transaction_type: "SALE",
      transaction_date: date,
      product_id: product.id,
      quantity: 5,
      unit_price: 15000,
      promo_discount_amount: 0,
      net_amount: 75000,
      is_valid: true,
      is_inventory_updated: true,
    },
  });

  // Return
  await prisma.salesTransaction.create({
    data: {
      batch_id: batch.id,
      warehouse_location_id: location.id,
      transaction_code: `RET-SEED-001`,
      transaction_type: "RETURN",
      transaction_date: date,
      product_id: product.id,
      quantity: 1,
      unit_price: 15000,
      promo_discount_amount: 0,
      net_amount: 15000,
      is_valid: true,
      is_inventory_updated: true,
    },
  });

  // Daily summary
  const summaryDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  await prisma.salesDailySummary.create({
    data: {
      summary_date: summaryDate,
      warehouse_location_id: location.id,
      product_id: product.id,
      total_sales_qty: 5,
      total_returned_qty: 1,
      net_sales_qty: 4,
      total_promo_amount: 0,
      total_revenue: 60000, // 75000 - 15000
    },
  });

  console.log("Sales data seeded successfully.");
}
