import { PrismaClient, LocationStatus, StorageType, RuleSource } from "../../src/generated";
import { generateLocationCode, normalizeNameToCode } from "../../src/utils/generate-code.util";

export async function seedWarehouse(prisma: PrismaClient) {
  console.log("Seeding Warehouse...");

  const warehouses = [
    { code: "WH-FROZEN", name: "Kho Đông Lạnh (-18°C)" },
    { code: "WH-CHILLED", name: "Kho Mát (2-5°C)" },
    { code: "WH-DRY", name: "Kho Khô (Nhiệt độ phòng)" },
    { code: "WH-CENTRAL-KIT", name: "Bếp Trung Tâm" },
    { code: "WH-BAR", name: "Kho Quầy Bar" },
    { code: "WH-WINE-CELLAR", name: "Hầm Rượu" },
    { code: "WH-PACK-CLEAN", name: "Kho Bao Bì & Hóa Chất" },
    { code: "WH-BUFFET", name: "Khu vực Lưu trữ Buffet" },
    { code: "WH-TRANSIT", name: "Khu vực Trung chuyển" },
    { code: "WH-WASTE", name: "Khu vực Hàng hủy/Hết hạn" },
  ];

  const warehouseRecords = await Promise.all(
    warehouses.map((w) =>
      prisma.warehouse.upsert({
        where: { code: w.code },
        update: {},
        create: w,
      })
    )
  );

  const categories = await prisma.productCategory.findMany();

  for (const wh of warehouseRecords) {
    // Mỗi kho tạo 10 location
    const locations = Array.from({ length: 10 }, (_, i) => {
      const zone = "Z1";
      const rack = "R1";
      const level = `L${i + 1}`;
      const bin = `B${i + 1}`;
      const location_code = generateLocationCode(wh.code, zone, rack, level, bin);
      
      return {
        warehouse_id: wh.id,
        location_code,
        zone_code: zone,
        rack_code: rack,
        level_code: level,
        bin_code: bin,
        full_path: location_code,
        location_status: LocationStatus.AVAILABLE,
        storage_condition: wh.code === "WH-FROZEN" ? StorageType.FROZEN : 
                           wh.code === "WH-CHILLED" ? StorageType.CHILLED : 
                           StorageType.AMBIENT,
        max_weight: 500,
        max_volume: 5,
        is_active: true,
      };
    });

    for (const loc of locations) {
      const createdLoc = await prisma.warehouseLocation.upsert({
        where: { location_code: loc.location_code },
        update: {},
        create: loc,
      });

      // Gán category được phép cho mỗi location (tối thiểu 1 cái)
      await prisma.locationAllowedCategory.upsert({
        where: {
          location_id_category_id: {
            location_id: createdLoc.id,
            category_id: categories[Math.floor(Math.random() * categories.length)].id,
          },
        },
        update: {},
        create: {
          location_id: createdLoc.id,
          category_id: categories[Math.floor(Math.random() * categories.length)].id,
          is_allowed: true,
          rule_source: RuleSource.DIRECT,
        },
      });
    }
  }
}
