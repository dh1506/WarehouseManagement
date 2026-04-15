import { PrismaClient } from "../src/generated";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";
import { seedAuth } from "./seed/auth.seed";
import { seedCatalog } from "./seed/catalog.seed";
import { seedWarehouse } from "./seed/warehouse.seed";
import { seedProduct } from "./seed/product.seed";
import { seedInventory } from "./seed/inventory.seed";
import { seedOperation } from "./seed/operation.seed";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("--- Bắt đầu Seeding dữ liệu F&B ---");

  // Xóa dữ liệu cũ theo thứ tự phụ thuộc
  console.log("Đang dọn dẹp dữ liệu cũ...");
  await prisma.auditLog.deleteMany({});
  await prisma.inventoryClosing.deleteMany({});
  await prisma.inventoryTransaction.deleteMany({});
  await prisma.stockInDetailLot.deleteMany({});
  await prisma.stockOutDetailLot.deleteMany({});
  await prisma.stockInDetail.deleteMany({});
  await prisma.stockOutDetail.deleteMany({});
  await prisma.stockInDiscrepancy.deleteMany({});
  await prisma.stockIn.deleteMany({});
  await prisma.stockOut.deleteMany({});
  await prisma.productLot.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.locationAllowedCategory.deleteMany({});
  await prisma.warehouseLocation.deleteMany({});
  await prisma.productWarehouse.deleteMany({});
  await prisma.brandProduct.deleteMany({});
  await prisma.productSupplier.deleteMany({});
  await prisma.productCategoryMap.deleteMany({});
  await prisma.productUom.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  await prisma.brand.deleteMany({});
  await prisma.supplier.deleteMany({});
  await prisma.unitOfMeasure.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.role.deleteMany({});
  await prisma.permission.deleteMany({});
  await prisma.warehouse.deleteMany({});

  // Chạy các module seed theo thứ tự logic
  await seedAuth(prisma);
  await seedCatalog(prisma);
  await seedWarehouse(prisma);
  await seedProduct(prisma);
  await seedInventory(prisma);
  await seedOperation(prisma);

  console.log("--- Hoàn thành Seeding thành công! ---");
}

main()
  .catch((e) => {
    console.error("Lỗi Seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
