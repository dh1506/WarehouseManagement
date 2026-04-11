import { PrismaClient, ProductType, ProductStatus, StorageType } from "../../src/generated";
import { generateProductSku, normalizeNameToCode } from "../../src/utils/generate-code.util";

export async function seedProduct(prisma: PrismaClient) {
  console.log("Seeding Product...");

  const brands = await prisma.brand.findMany();
  const uoms = await prisma.unitOfMeasure.findMany();
  const cats = await prisma.productCategory.findMany();
  const suppliers = await prisma.supplier.findMany();
  const warehouses = await prisma.warehouse.findMany();

  const products = [
    { name: "Sữa tươi TH True Milk 1L", brand: "TH_TRUE_MILK", cat: "SUA_VA_CAC_SAN_PHAM_TU_SUA", uom: "L", storage: StorageType.CHILLED, type: ProductType.GOODS },
    { name: "Thịt bò thăn Úc", brand: "CP_FOOD", cat: "THUC_PHAM_TUOI_SONG", uom: "KG", storage: StorageType.FROZEN, type: ProductType.GOODS },
    { name: "Cá hồi Nauy nguyên con", brand: "CP_FOOD", cat: "THUC_PHAM_TUOI_SONG", uom: "KG", storage: StorageType.FROZEN, type: ProductType.GOODS },
    { name: "Rau xà lách thủy canh", brand: "VINAMILK", cat: "RAU_CU_QUA", uom: "KG", storage: StorageType.CHILLED, type: ProductType.GOODS }, // Vinamilk cũng có rau sạch :))
    { name: "Bột mì đa năng Meizan 1kg", brand: "MEIZAN", cat: "LUONG_THUC_KHO", uom: "BAG", storage: StorageType.AMBIENT, type: ProductType.MATERIAL },
    { name: "Đường tinh luyện Biên Hòa", brand: "MASAN", cat: "GIA_VI_VA_DAU_AN", uom: "KG", storage: StorageType.AMBIENT, type: ProductType.MATERIAL },
    { name: "Nước mắm Nam Ngư 750ml", brand: "MASAN", cat: "GIA_VI_VA_DAU_AN", uom: "BOTTLE", storage: StorageType.AMBIENT, type: ProductType.GOODS },
    { name: "Nước ngọt Coca-Cola 330ml", brand: "COCA_COLA", cat: "DO_UONG", uom: "CAN", storage: StorageType.AMBIENT, type: ProductType.GOODS },
    { name: "Bia Heineken lon 330ml", brand: "HEINEKEN", cat: "DO_UONG_CO_CON", uom: "CAN", storage: StorageType.AMBIENT, type: ProductType.GOODS },
    { name: "Cà phê hạt Trung Nguyên 500g", brand: "TRUNG_NGUYEN", cat: "NGUYEN_LIEU_PHA_CHE", uom: "BAG", storage: StorageType.AMBIENT, type: ProductType.MATERIAL },
    { name: "Dầu ăn Meizan 1L", brand: "MEIZAN", cat: "GIA_VI_VA_DAU_AN", uom: "BOTTLE", storage: StorageType.AMBIENT, type: ProductType.GOODS },
    { name: "Mì tôm Hảo Hảo", brand: "ACECOOK", cat: "LUONG_THUC_KHO", uom: "PACK", storage: StorageType.AMBIENT, type: ProductType.GOODS },
  ];

  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    const brand = brands.find(b => b.code === p.brand) || brands[0];
    const uom = uoms.find(u => u.code === p.uom) || uoms[0];
    const cat = cats.find(c => c.code === p.cat) || cats[0];
    const supplier = suppliers[i % suppliers.length];
    const warehouse = warehouses[i % warehouses.length];

    const sku = generateProductSku(p.type, brand.id, i + 1);

    const createdProduct = await prisma.product.upsert({
      where: { code: sku },
      update: {},
      create: {
        code: sku,
        name: p.name,
        base_uom_id: uom.id,
        product_type: p.type,
        product_status: ProductStatus.ACTIVE,
        storage_conditions: p.storage,
        has_batch: true,
        min_stock: 10,
        max_stock: 1000,
      },
    });

    // Relationships
    await prisma.productCategoryMap.create({
      data: { product_id: createdProduct.id, category_id: cat.id },
    }).catch(() => {});

    await prisma.productUom.create({
      data: {
        product_id: createdProduct.id,
        uom_id: uom.id,
        conversion_factor: 1,
        is_default: true,
      },
    }).catch(() => {});

    await prisma.brandProduct.create({
      data: { brand_id: brand.id, product_id: createdProduct.id },
    }).catch(() => {});

    await prisma.productSupplier.create({
      data: {
        product_id: createdProduct.id,
        supplier_id: supplier.id,
        purchase_price: 15000 + (i * 1000),
        is_primary: true,
      },
    }).catch(() => {});

    await prisma.productWarehouse.create({
      data: { product_id: createdProduct.id, warehouse_id: warehouse.id },
    }).catch(() => {});
  }
}
