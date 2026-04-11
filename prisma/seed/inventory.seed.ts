import { PrismaClient, LotStatus } from "../../src/generated";

export async function seedInventory(prisma: PrismaClient) {
  console.log("Seeding Inventory...");

  const products = await prisma.product.findMany();
  const locations = await prisma.warehouseLocation.findMany();

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const loc = locations[i % locations.length];

    const inventory = await prisma.inventory.upsert({
      where: {
        product_id_warehouse_location_id: {
          product_id: p.id,
          warehouse_location_id: loc.id,
        },
      },
      update: {},
      create: {
        product_id: p.id,
        warehouse_location_id: loc.id,
        quantity: 100,
        available_quantity: 100,
      },
    });

    // Tạo ít nhất 10 lot tổng cộng (mỗi sản phẩm 1 lot trong vòng lặp này)
    await prisma.productLot.upsert({
      where: { lot_no: `LOT-${p.code}-001` },
      update: {},
      create: {
        lot_no: `LOT-${p.code}-001`,
        product_id: p.id,
        inventories_id: inventory.id,
        status: LotStatus.ACTIVE,
        received_at: new Date(),
        production_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 ngày trước
        expired_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 ngày sau
      },
    });
  }
}
