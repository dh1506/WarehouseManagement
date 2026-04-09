import {
  PrismaClient,
  ProductType,
  ProductStatus,
  UomType,
  LocationStatus,
  StorageType,
  RuleSource,
  LotStatus,
  TransactionType,
} from "../src/generated";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";
import {
  generateLocationCode,
  generateProductSku,
  generateStockInCode,
  normalizeNameToCode,
} from "../src/utils/generate-code.util";

const generateStockOutCode = (sequenceId: number): string => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SO-${dateStr}-${sequenceId.toString().padStart(4, "0")}`;
};

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data in dependency order
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

  const permissions = [
    {
      name: "users:read",
      description: "Read users",
      module: "users",
      action: "read",
    },
    {
      name: "users:create",
      description: "Create users",
      module: "users",
      action: "create",
    },
    {
      name: "users:update",
      description: "Update users",
      module: "users",
      action: "update",
    },
    {
      name: "users:delete",
      description: "Delete users",
      module: "users",
      action: "delete",
    },
    {
      name: "roles:read",
      description: "Read roles",
      module: "roles",
      action: "read",
    },
    {
      name: "roles:create",
      description: "Create roles",
      module: "roles",
      action: "create",
    },
    {
      name: "roles:update",
      description: "Update roles",
      module: "roles",
      action: "update",
    },
    {
      name: "roles:delete",
      description: "Delete roles",
      module: "roles",
      action: "delete",
    },
    {
      name: "permissions:read",
      description: "Read permissions",
      module: "permissions",
      action: "read",
    },
    {
      name: "products:read",
      description: "Read products",
      module: "products",
      action: "read",
    },
    {
      name: "products:create",
      description: "Create products",
      module: "products",
      action: "create",
    },
    {
      name: "products:update",
      description: "Update products",
      module: "products",
      action: "update",
    },
    {
      name: "products:delete",
      description: "Delete products",
      module: "products",
      action: "delete",
    },
    {
      name: "brands:read",
      description: "Read brands",
      module: "brands",
      action: "read",
    },
    {
      name: "brands:create",
      description: "Create brands",
      module: "brands",
      action: "create",
    },
    {
      name: "brands:update",
      description: "Update brands",
      module: "brands",
      action: "update",
    },
    {
      name: "brands:delete",
      description: "Delete brands",
      module: "brands",
      action: "delete",
    },
    {
      name: "suppliers:read",
      description: "Read suppliers",
      module: "suppliers",
      action: "read",
    },
    {
      name: "suppliers:create",
      description: "Create suppliers",
      module: "suppliers",
      action: "create",
    },
    {
      name: "suppliers:update",
      description: "Update suppliers",
      module: "suppliers",
      action: "update",
    },
    {
      name: "suppliers:delete",
      description: "Delete suppliers",
      module: "suppliers",
      action: "delete",
    },
    {
      name: "categories:read",
      description: "Read product categories",
      module: "categories",
      action: "read",
    },
    {
      name: "categories:create",
      description: "Create product categories",
      module: "categories",
      action: "create",
    },
    {
      name: "categories:update",
      description: "Update product categories",
      module: "categories",
      action: "update",
    },
    {
      name: "categories:delete",
      description: "Delete product categories",
      module: "categories",
      action: "delete",
    },
    {
      name: "uoms:read",
      description: "Read units of measure",
      module: "uoms",
      action: "read",
    },
    {
      name: "uoms:create",
      description: "Create units of measure",
      module: "uoms",
      action: "create",
    },
    {
      name: "uoms:update",
      description: "Update units of measure",
      module: "uoms",
      action: "update",
    },
    {
      name: "uoms:delete",
      description: "Delete units of measure",
      module: "uoms",
      action: "delete",
    },
    {
      name: "inventory_transactions:read",
      description: "Read inventory transactions",
      module: "inventory_transactions",
      action: "read",
    },
    {
      name: "inventory_transactions:create",
      description: "Create inventory transactions",
      module: "inventory_transactions",
      action: "create",
    },
    {
      name: "stock_ins:read",
      description: "Read stock in requests",
      module: "stock_ins",
      action: "read",
    },
    {
      name: "stock_ins:create",
      description: "Create stock in requests",
      module: "stock_ins",
      action: "create",
    },
    {
      name: "stock_ins:update",
      description: "Update stock in requests",
      module: "stock_ins",
      action: "update",
    },
    {
      name: "stock_ins:approve",
      description: "Approve stock in requests",
      module: "stock_ins",
      action: "approve",
    },
    {
      name: "stock_ins_discrepancies:create",
      description: "Create stock in discrepancy records",
      module: "stock_ins_discrepancies",
      action: "create",
    },
    {
      name: "stock_ins_discrepancies:resolve",
      description: "Resolve stock in discrepancy records",
      module: "stock_ins_discrepancies",
      action: "resolve",
    },
    {
      name: "warehouses:read",
      description: "Read warehouses",
      module: "warehouses",
      action: "read",
    },
    {
      name: "warehouses:create",
      description: "Create warehouses",
      module: "warehouses",
      action: "create",
    },
    {
      name: "warehouses:update",
      description: "Update warehouses",
      module: "warehouses",
      action: "update",
    },
    {
      name: "warehouses:delete",
      description: "Delete warehouses",
      module: "warehouses",
      action: "delete",
    },
  ];

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { name: permission.name },
      update: {},
      create: permission,
    });
  }

  const warehouses = [
    { code: "WH001", name: "Main Warehouse" },
    { code: "WH002", name: "Secondary Warehouse" },
    { code: "WH003", name: "North Warehouse" },
    { code: "WH004", name: "South Warehouse" },
    { code: "WH005", name: "East Warehouse" },
    { code: "WH006", name: "West Warehouse" },
    { code: "WH007", name: "Cold Storage" },
    { code: "WH008", name: "Dry Storage" },
    { code: "WH009", name: "Overflow Warehouse" },
    { code: "WH010", name: "Returns Warehouse" },
  ];

  const warehouseRecords = await Promise.all(
    warehouses.map((warehouse) =>
      prisma.warehouse.upsert({
        where: { code: warehouse.code },
        update: {},
        create: { ...warehouse, is_active: true },
      }),
    ),
  );

  const mainWarehouse = warehouseRecords[0];

  const roles = [
    { name: "STAFF", description: "Staff with basic access" },
    { name: "MANAGER", description: "Manager with elevated permissions" },
    { name: "CEO", description: "Full access administrator" },
    { name: "OPERATIONS", description: "Operations team role" },
    { name: "INVENTORY", description: "Inventory management role" },
    { name: "LOGISTICS", description: "Logistics and transport role" },
    { name: "PURCHASING", description: "Purchasing and procurement role" },
    { name: "SALES", description: "Sales and order processing role" },
    { name: "QUALITY", description: "Quality assurance role" },
    { name: "ACCOUNTING", description: "Accounting and finance role" },
  ];

  const roleRecords = await Promise.all(
    roles.map((role) =>
      prisma.role.upsert({
        where: { name: role.name },
        update: {},
        create: role,
      }),
    ),
  );

  const roleMap = Object.fromEntries(
    roleRecords.map((role) => [role.name, role.id]),
  );

  const allPermissions = await prisma.permission.findMany();

  await prisma.rolePermission.createMany({
    data: allPermissions.flatMap((permission) =>
      roleRecords.map((role) => ({
        role_id: role.id,
        permission_id: permission.id,
      })),
    ),
    skipDuplicates: true,
  });

  const users = [
    {
      username: "admin",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Admin User",
      email: "admin@example.com",
      role_id: roleMap.CEO,
      warehouse_id: mainWarehouse.id,
    },
    {
      username: "staff1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Staff One",
      email: "staff1@example.com",
      role_id: roleMap.STAFF,
      warehouse_id: warehouseRecords[1].id,
    },
    {
      username: "manager1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Manager One",
      email: "manager1@example.com",
      role_id: roleMap.MANAGER,
      warehouse_id: warehouseRecords[2].id,
    },
    {
      username: "operations1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Operations One",
      email: "operations1@example.com",
      role_id: roleMap.OPERATIONS,
      warehouse_id: warehouseRecords[3].id,
    },
    {
      username: "inventory1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Inventory One",
      email: "inventory1@example.com",
      role_id: roleMap.INVENTORY,
      warehouse_id: warehouseRecords[4].id,
    },
    {
      username: "logistics1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Logistics One",
      email: "logistics1@example.com",
      role_id: roleMap.LOGISTICS,
      warehouse_id: warehouseRecords[5].id,
    },
    {
      username: "purchasing1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Purchasing One",
      email: "purchasing1@example.com",
      role_id: roleMap.PURCHASING,
      warehouse_id: warehouseRecords[6].id,
    },
    {
      username: "sales1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Sales One",
      email: "sales1@example.com",
      role_id: roleMap.SALES,
      warehouse_id: warehouseRecords[7].id,
    },
    {
      username: "quality1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Quality One",
      email: "quality1@example.com",
      role_id: roleMap.QUALITY,
      warehouse_id: warehouseRecords[8].id,
    },
    {
      username: "accounting1",
      password_hash:
        "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW",
      full_name: "Accounting One",
      email: "accounting1@example.com",
      role_id: roleMap.ACCOUNTING,
      warehouse_id: warehouseRecords[9].id,
    },
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { username: user.username },
      update: {},
      create: user,
    });
  }

  const uomData = [
    { code: "KG", name: "Kilogram", uom_type: UomType.WEIGHT },
    { code: "L", name: "Liter", uom_type: UomType.VOLUME },
    { code: "PC", name: "Piece", uom_type: UomType.QUANTITY },
    { code: "PACK", name: "Pack", uom_type: UomType.PACK },
    { code: "BOX", name: "Box", uom_type: UomType.PACK },
    { code: "G", name: "Gram", uom_type: UomType.WEIGHT },
    { code: "TON", name: "Ton", uom_type: UomType.WEIGHT },
    { code: "M", name: "Meter", uom_type: UomType.LENGTH },
    { code: "DOZEN", name: "Dozen", uom_type: UomType.QUANTITY },
    { code: "PALLET", name: "Pallet", uom_type: UomType.PACK },
  ];

  const uomRecords = await Promise.all(
    uomData.map((uom) =>
      prisma.unitOfMeasure.upsert({
        where: { code: uom.code },
        update: {},
        create: uom,
      }),
    ),
  );

  const categories = [
    {
      code: normalizeNameToCode("Beverages"),
      name: "Beverages",
      description: "Drinks and beverages",
    },
    {
      code: normalizeNameToCode("Food"),
      name: "Food",
      description: "Food products",
    },
    {
      code: normalizeNameToCode("Dairy Products"),
      name: "Dairy Products",
      description: "Milk and dairy products",
      parent_name: "Food",
    },
    {
      code: normalizeNameToCode("Snacks"),
      name: "Snacks",
      description: "Snack foods and treats",
      parent_name: "Food",
    },
    {
      code: normalizeNameToCode("Soft Drinks"),
      name: "Soft Drinks",
      description: "Carbonated beverages",
      parent_name: "Beverages",
    },
    {
      code: normalizeNameToCode("Bakery"),
      name: "Bakery",
      description: "Baked goods",
      parent_name: "Food",
    },
    {
      code: normalizeNameToCode("Frozen Foods"),
      name: "Frozen Foods",
      description: "Frozen food products",
      parent_name: "Food",
    },
    {
      code: normalizeNameToCode("Canned Goods"),
      name: "Canned Goods",
      description: "Canned and preserved foods",
      parent_name: "Food",
    },
    {
      code: normalizeNameToCode("Condiments"),
      name: "Condiments",
      description: "Sauces and seasonings",
      parent_name: "Food",
    },
    {
      code: normalizeNameToCode("Juices"),
      name: "Juices",
      description: "Fruit and vegetable juices",
      parent_name: "Beverages",
    },
  ];

  const categoryRecords: Array<{ id: number; name: string; code: string }> = [];
  for (const category of categories) {
    const parentCategory = category.parent_name
      ? categoryRecords.find((record) => record.name === category.parent_name)
      : undefined;

    const record = await prisma.productCategory.upsert({
      where: { code: category.code },
      update: {},
      create: {
        code: category.code,
        name: category.name,
        description: category.description,
        parent_id: parentCategory?.id,
      },
    });

    categoryRecords.push({
      id: record.id,
      name: record.name,
      code: record.code,
    });
  }

  const brandData = [
    { code: normalizeNameToCode("Coca-Cola"), name: "Coca-Cola" },
    { code: normalizeNameToCode("Nestle"), name: "Nestlé" },
    { code: normalizeNameToCode("Pepsi"), name: "Pepsi" },
    { code: normalizeNameToCode("Tropicana"), name: "Tropicana" },
    { code: normalizeNameToCode("Wonder Bread"), name: "Wonder Bread" },
    { code: normalizeNameToCode("Kraft"), name: "Kraft" },
    { code: normalizeNameToCode("Heinz"), name: "Heinz" },
    { code: normalizeNameToCode("Lays"), name: "Lays" },
    { code: normalizeNameToCode("Campbell"), name: "Campbell" },
    { code: normalizeNameToCode("Dole"), name: "Dole" },
  ];

  const brandRecords = await Promise.all(
    brandData.map((brand) =>
      prisma.brand.upsert({
        where: { code: brand.code },
        update: {},
        create: brand,
      }),
    ),
  );

  const supplierData = [
    {
      code: "SUP001",
      name: "Global Food Supplier",
      contact_person: "Linh Nguyen",
      phone: "+84 913 000 001",
      email: "linh.nguyen@example.com",
      address: "123 Nguyen Trai, Hanoi",
    },
    {
      code: "SUP002",
      name: "Fresh Beverage Co.",
      contact_person: "Hanh Tran",
      phone: "+84 913 000 002",
      email: "hanh.tran@example.com",
      address: "45 Le Loi, Ho Chi Minh City",
    },
    {
      code: "SUP003",
      name: "Dairy Supply Ltd.",
      contact_person: "Minh Truong",
      phone: "+84 913 000 003",
      email: "minh.truong@example.com",
      address: "88 Tran Hung Dao, Da Nang",
    },
    {
      code: "SUP004",
      name: "Bakery Ingredients",
      contact_person: "Hong Pham",
      phone: "+84 913 000 004",
      email: "hong.pham@example.com",
      address: "21 Hai Ba Trung, Hue",
    },
    {
      code: "SUP005",
      name: "Frozen Foods Hub",
      contact_person: "Nam Le",
      phone: "+84 913 000 005",
      email: "nam.le@example.com",
      address: "9 Ben Thanh, Ho Chi Minh City",
    },
    {
      code: "SUP006",
      name: "Condiments Co.",
      contact_person: "Linh Pham",
      phone: "+84 913 000 006",
      email: "linh.pham@example.com",
      address: "14 Nguyen Hue, Ho Chi Minh City",
    },
    {
      code: "SUP007",
      name: "Juice Essentials",
      contact_person: "An Dao",
      phone: "+84 913 000 007",
      email: "an.dao@example.com",
      address: "40 Ngo Quyen, Hanoi",
    },
    {
      code: "SUP008",
      name: "Snack Warehouse",
      contact_person: "Ha Vu",
      phone: "+84 913 000 008",
      email: "ha.vu@example.com",
      address: "12 Tran Phu, Hai Phong",
    },
    {
      code: "SUP009",
      name: "Office Foods",
      contact_person: "Quang Bui",
      phone: "+84 913 000 009",
      email: "quang.bui@example.com",
      address: "77 Phan Chu Trinh, Hanoi",
    },
    {
      code: "SUP010",
      name: "Retail Supplies",
      contact_person: "Mai Nguyen",
      phone: "+84 913 000 010",
      email: "mai.nguyen@example.com",
      address: "3 Ho Tung Mau, Ho Chi Minh City",
    },
  ];

  const supplierRecords = await Promise.all(
    supplierData.map((supplier) =>
      prisma.supplier.upsert({
        where: { code: supplier.code },
        update: {},
        create: supplier,
      }),
    ),
  );

  const products = [
    {
      name: "Coca-Cola Classic",
      description: "Original Coca-Cola in 330ml cans",
      brand: brandRecords[0],
      supplier: supplierRecords[1],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Soft Drinks"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "L")!,
      has_batch: false,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/coca-cola-classic.jpg",
      min_stock: "50.000",
      max_stock: "2000.000",
    },
    {
      name: "Nestlé Fresh Milk",
      description: "Fresh milk in 1L cartons",
      brand: brandRecords[1],
      supplier: supplierRecords[2],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Dairy Products"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "L")!,
      has_batch: true,
      storage_conditions: StorageType.CHILLED,
      image_url: "https://example.com/images/nestle-milk.jpg",
      expiry_date: new Date("2026-12-31T00:00:00.000Z"),
      production_date: new Date("2026-06-01T00:00:00.000Z"),
      min_stock: "20.000",
      max_stock: "500.000",
    },
    {
      name: "Wonder Sandwich Bread",
      description: "Soft sliced sandwich bread",
      brand: brandRecords[4],
      supplier: supplierRecords[3],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Bakery"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "PC")!,
      has_batch: true,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/wonder-bread.jpg",
      min_stock: "10.000",
      max_stock: "300.000",
    },
    {
      name: "Pepsi Cola",
      description: "Pepsi soda in 330ml cans",
      brand: brandRecords[2],
      supplier: supplierRecords[1],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Soft Drinks"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "L")!,
      has_batch: false,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/pepsi.jpg",
      min_stock: "50.000",
      max_stock: "1800.000",
    },
    {
      name: "Tropicana Orange Juice",
      description: "Fresh orange juice 1L",
      brand: brandRecords[3],
      supplier: supplierRecords[6],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Juices"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "L")!,
      has_batch: true,
      storage_conditions: StorageType.CHILLED,
      image_url: "https://example.com/images/tropicana-orange.jpg",
      expiry_date: new Date("2026-11-01T00:00:00.000Z"),
      production_date: new Date("2026-05-01T00:00:00.000Z"),
      min_stock: "30.000",
      max_stock: "800.000",
    },
    {
      name: "Heinz Ketchup",
      description: "Tomato ketchup 500ml",
      brand: brandRecords[6],
      supplier: supplierRecords[5],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Condiments"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "L")!,
      has_batch: false,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/heinz-ketchup.jpg",
      min_stock: "40.000",
      max_stock: "1200.000",
    },
    {
      name: "Lays Potato Chips",
      description: "Classic salted potato chips",
      brand: brandRecords[7],
      supplier: supplierRecords[7],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Snacks"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "PC")!,
      has_batch: false,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/lays-chips.jpg",
      min_stock: "60.000",
      max_stock: "1500.000",
    },
    {
      name: "Campbell Soup",
      description: "Chicken noodle soup 400g",
      brand: brandRecords[8],
      supplier: supplierRecords[3],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Canned Goods"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "PC")!,
      has_batch: true,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/campbell-soup.jpg",
      expiry_date: new Date("2027-04-01T00:00:00.000Z"),
      production_date: new Date("2026-09-01T00:00:00.000Z"),
      min_stock: "25.000",
      max_stock: "600.000",
    },
    {
      name: "Dole Pineapple Juice",
      description: "Pineapple juice 1L",
      brand: brandRecords[9],
      supplier: supplierRecords[6],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Juices"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "L")!,
      has_batch: false,
      storage_conditions: StorageType.AMBIENT,
      image_url: "https://example.com/images/dole-pineapple.jpg",
      min_stock: "30.000",
      max_stock: "700.000",
    },
    {
      name: "Kraft Cheddar Cheese",
      description: "Sliced cheddar cheese 200g",
      brand: brandRecords[5],
      supplier: supplierRecords[2],
      category: categoryRecords.find(
        (item) => item.code === normalizeNameToCode("Dairy Products"),
      )!,
      baseUom: uomRecords.find((item) => item.code === "KG")!,
      has_batch: true,
      storage_conditions: StorageType.CHILLED,
      image_url: "https://example.com/images/kraft-cheese.jpg",
      expiry_date: new Date("2026-10-15T00:00:00.000Z"),
      production_date: new Date("2026-05-20T00:00:00.000Z"),
      min_stock: "15.000",
      max_stock: "400.000",
    },
  ];

  const productRecords = await Promise.all(
    products.map((product, index) => {
      const productCode = generateProductSku(
        ProductType.GOODS,
        product.brand.id,
        index + 1,
      );

      return prisma.product.upsert({
        where: {
          code: productCode,
        },
        update: {},
        create: {
          code: productCode,
          name: product.name,
          description: product.description,
          product_type: ProductType.GOODS,
          product_status: ProductStatus.ACTIVE,
          base_uom_id: product.baseUom.id,
          has_batch: product.has_batch,
          storage_conditions: product.storage_conditions,
          image_url: product.image_url,
          expiry_date: product.expiry_date,
          production_date: product.production_date,
          min_stock: product.min_stock,
          max_stock: product.max_stock,
        },
      });
    }),
  );

  await prisma.productCategoryMap.createMany({
    data: productRecords.flatMap((product, index) => {
      const category = products[index].category;
      const extraCategory =
        index % 2 === 0
          ? categoryRecords.find(
              (item) => item.code === normalizeNameToCode("Food"),
            )
          : categoryRecords.find(
              (item) => item.code === normalizeNameToCode("Beverages"),
            );
      return [
        { product_id: product.id, category_id: category.id },
        extraCategory
          ? { product_id: product.id, category_id: extraCategory.id }
          : null,
      ].filter(Boolean) as { product_id: number; category_id: number }[];
    }),
    skipDuplicates: true,
  });

  await prisma.productUom.createMany({
    data: productRecords.flatMap((product, index) => [
      {
        product_id: product.id,
        uom_id: products[index].baseUom.id,
        conversion_factor: "1.000",
        is_default: true,
      },
      {
        product_id: product.id,
        uom_id: uomRecords.find((uom) => uom.code === "PACK")!.id,
        conversion_factor: "6.000",
        is_default: false,
      },
    ]),
    skipDuplicates: true,
  });

  await prisma.productSupplier.createMany({
    data: products.map((product, index) => ({
      product_id: productRecords[index].id,
      supplier_id: product.supplier.id,
      supplier_sku: `${product.brand.code}-${(index + 1).toString().padStart(3, "0")}`,
      purchase_price: (0.5 + index * 0.2).toFixed(2),
      is_primary: true,
    })),
    skipDuplicates: true,
  });

  await prisma.brandProduct.createMany({
    data: productRecords.map((product, index) => ({
      brand_id: products[index].brand.id,
      product_id: product.id,
    })),
    skipDuplicates: true,
  });

  await prisma.productWarehouse.createMany({
    data: productRecords.map((product, index) => ({
      product_id: product.id,
      warehouse_id: warehouseRecords[index % warehouseRecords.length].id,
      assigned_at: new Date(),
    })),
    skipDuplicates: true,
  });

  const locations = Array.from({ length: 10 }, (_, index) => {
    const warehouse = warehouseRecords[index % warehouseRecords.length];
    const zone = String.fromCharCode(65 + (index % 4));
    const rack = `R${Math.floor(index / 4) + 1}`;
    const level = `L${(index % 3) + 1}`;
    const bin = `B${(index % 5) + 1}`;
    const location_code = generateLocationCode(
      warehouse.code,
      zone,
      rack,
      level,
      bin,
    );

    return {
      warehouse_id: warehouse.id,
      location_code,
      zone_code: zone,
      rack_code: rack,
      level_code: level,
      bin_code: bin,
      full_path: location_code,
      location_status: LocationStatus.AVAILABLE,
      storage_condition: StorageType.AMBIENT,
      max_weight: "1000.000",
      max_volume: "10.000",
      current_weight: "0.000",
      current_volume: "0.000",
      occupancy_percent: "0.00",
      is_active: true,
    };
  });

  const locationRecords = await Promise.all(
    locations.map((location) =>
      prisma.warehouseLocation.upsert({
        where: { location_code: location.location_code },
        update: {},
        create: location,
      }),
    ),
  );

  const inventoryRecords = await Promise.all(
    productRecords.map((product, index) =>
      prisma.inventory.upsert({
        where: {
          product_id_warehouse_location_id: {
            product_id: product.id,
            warehouse_location_id: locationRecords[index].id,
          },
        },
        update: {},
        create: {
          product_id: product.id,
          warehouse_location_id: locationRecords[index].id,
          quantity: (100 + index * 25).toFixed(3),
          reserved_quantity: (index * 2).toFixed(3),
          available_quantity: (100 + index * 25 - index * 2).toFixed(3),
        },
      }),
    ),
  );

  await prisma.locationAllowedCategory.createMany({
    data: locationRecords.map((location, index) => ({
      location_id: location.id,
      category_id: categoryRecords[index % categoryRecords.length].id,
      is_allowed: true,
      rule_source: RuleSource.DIRECT,
      inherit_from_parent: true,
      priority: index + 1,
      effective_from: new Date(),
      note: `Allowed category for location ${location.location_code}`,
    })),
    skipDuplicates: true,
  });

  const productLotRecords = await Promise.all(
    productRecords.map((product, index) =>
      prisma.productLot.upsert({
        where: { lot_no: `LOT-${product.code}-${index + 1}` },
        update: {},
        create: {
          lot_no: `LOT-${product.code}-${index + 1}`,
          product_id: product.id,
          inventories_id: inventoryRecords[index].id,
          status: LotStatus.ACTIVE,
          production_date: new Date(
            `2026-0${(index % 9) + 1}-01T00:00:00.000Z`,
          ),
          expired_date: new Date(`2027-0${(index % 9) + 1}-01T00:00:00.000Z`),
          received_at: new Date(),
        },
      }),
    ),
  );

  const adminUser = await prisma.user.findUnique({
    where: { username: "admin" },
  });
  if (!adminUser) {
    throw new Error("Admin user not found after seeding users");
  }

  const stockInRecords = await Promise.all(
    productRecords.map((product, index) =>
      prisma.stockIn.upsert({
        where: { code: generateStockInCode(index + 1) },
        update: {},
        create: {
          warehouse_location_id: locationRecords[index].id,
          code: generateStockInCode(index + 1),
          description: `Stock in for ${product.name}`,
          status: "COMPLETED",
          created_by: adminUser.id,
          approved_by: adminUser.id,
          supplier_id: products[index].supplier.id,
        },
      }),
    ),
  );

  const stockInDetailRecords = await Promise.all(
    stockInRecords.map((stockIn, index) =>
      prisma.stockInDetail.create({
        data: {
          stock_in_id: stockIn.id,
          product_id: productRecords[index].id,
          expected_quantity: (100 + index * 5).toFixed(3),
          received_quantity: (100 + index * 5).toFixed(3),
          unit_price: (2 + index * 0.2).toFixed(2),
        },
      }),
    ),
  );

  await Promise.all(
    stockInDetailRecords.map((detail, index) =>
      prisma.stockInDetailLot.create({
        data: {
          stock_in_detail_id: detail.id,
          product_lot_id: productLotRecords[index].id,
          quantity: detail.received_quantity,
        },
      }),
    ),
  );

  const stockOutRecords = await Promise.all(
    productRecords.map((product, index) =>
      prisma.stockOut.upsert({
        where: { code: generateStockOutCode(index + 1) },
        update: {},
        create: {
          warehouse_location_id: locationRecords[index].id,
          code: generateStockOutCode(index + 1),
          description: `Stock out for ${product.name}`,
          status: "PENDING",
          created_by: adminUser.id,
        },
      }),
    ),
  );

  const stockOutDetailRecords = await Promise.all(
    stockOutRecords.map((stockOut, index) =>
      prisma.stockOutDetail.create({
        data: {
          stock_out_id: stockOut.id,
          product_id: productRecords[index].id,
          quantity: (20 + index * 3).toFixed(3),
          unit_price: (2.5 + index * 0.15).toFixed(2),
        },
      }),
    ),
  );

  await Promise.all(
    stockOutDetailRecords.map((detail, index) =>
      prisma.stockOutDetailLot.create({
        data: {
          stock_out_detail_id: detail.id,
          product_lot_id: productLotRecords[index].id,
          quantity: detail.quantity,
        },
      }),
    ),
  );

  await prisma.stockInDiscrepancy.createMany({
    data: stockInRecords.map((stockIn, index) => ({
      stock_in_id: stockIn.id,
      reported_by: adminUser.id,
      resolved_by: adminUser.id,
      expected_qty: (100 + index * 5).toFixed(3),
      actual_qty: (100 + index * 5 - 1).toFixed(3),
      reason: `Actual quantity mismatch for stock in ${stockIn.code}`,
      action_taken: "Adjusted inventory",
      status: "RESOLVED",
    })),
    skipDuplicates: true,
  });

  await prisma.auditLog.createMany({
    data: productRecords.map((product, index) => {
      const auditData: {
        module: string;
        entity_type: string;
        entity_id: number;
        action: "CREATE" | "UPDATE";
        old_data?: { name: string };
        new_data: { name: string };
        reference_code: string;
        note: string;
        created_by: number;
      } = {
        module: "products",
        entity_type: "product",
        entity_id: product.id,
        action: index % 2 === 0 ? "CREATE" : "UPDATE",
        new_data: { name: product.name },
        reference_code: product.code,
        note: `Audit log entry for product ${product.code}`,
        created_by: adminUser.id,
      };

      if (index % 2 !== 0) {
        auditData.old_data = { name: `${product.name} old` };
      }

      return auditData;
    }),
    skipDuplicates: true,
  });

  await prisma.inventoryTransaction.createMany({
    data: productRecords.map((product, index) => ({
      warehouse_location_id: locationRecords[index].id,
      product_id: product.id,
      lot_id: null,
      product_uom_id: products[index].baseUom.id,
      transaction_type: TransactionType.IN,
      quantity: (120 + index * 10).toFixed(3),
      base_quantity: (120 + index * 10).toFixed(3),
      balance_after: (120 + index * 10).toFixed(3),
      reference_type: "INITIAL_STOCK",
      reference_id: `STOCK-${index + 1}`,
      note: `Initial opening stock for product ${product.name}`,
      created_by: adminUser.id,
      transaction_date: new Date(),
    })),
    skipDuplicates: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
