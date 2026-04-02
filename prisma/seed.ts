import { PrismaClient } from "../src/generated";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

const adapter = new PrismaMariaDb(connectionString);

const prisma = new PrismaClient({ adapter });

async function main() {
  // Clear existing data in correct order (child tables first)
  await prisma.warehouseLocation.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.productSupplier.deleteMany();
  await prisma.productCategoryMap.deleteMany();
  await prisma.productUom.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.manufacturer.deleteMany();
  await prisma.unitOfMeasure.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  // Tạo permissions cho tất cả modules
  const permissions = [
    // Users
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
    // Roles
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
    // Permissions
    {
      name: "permissions:read",
      description: "Read permissions",
      module: "permissions",
      action: "read",
    },
    // Products
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
    // Brands
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
    // Manufacturers
    {
      name: "manufacturers:read",
      description: "Read manufacturers",
      module: "manufacturers",
      action: "read",
    },
    {
      name: "manufacturers:create",
      description: "Create manufacturers",
      module: "manufacturers",
      action: "create",
    },
    {
      name: "manufacturers:update",
      description: "Update manufacturers",
      module: "manufacturers",
      action: "update",
    },
    // Suppliers
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
    // Product Categories
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
    // Units of Measure
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
    // Warehouses
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
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Tạo roles
  const staffRole = await prisma.role.upsert({
    where: { name: "STAFF" },
    update: {},
    create: {
      name: "STAFF",
      description: "Staff with basic permissions for daily warehouse tasks",
    },
  });
  
  const ceoRole = await prisma.role.upsert({
    where: { name: "CEO" },
    update: {},
    create: {
      name: "CEO",
      description: "Chief Executive Officer with full access to all modules",
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: {
      name: "MANAGER",
      description: "Manager with elevated permissions for warehouse operations",
    },
  });

  // Gán permissions cho roles
  const allPermissions = await prisma.permission.findMany();

  // CEO: tất cả permissions
  const ceoPermissions = allPermissions.map((p) => ({ permission_id: p.id }));
  await prisma.rolePermission.createMany({
    data: ceoPermissions.map((p) => ({
      role_id: ceoRole.id,
      permission_id: p.permission_id,
    })),
    skipDuplicates: true,
  });

  // MANAGER: permissions:read, users:read/create/update, roles:read/create/update,
  // và tất cả permissions cho products, brands, manufacturers, suppliers, categories, uoms
  const managerPermissions = allPermissions.filter(
    (p) =>
      p.name === "permissions:read" ||
      p.name.startsWith("users:") ||
      p.name.startsWith("roles:") ||
      p.name.startsWith("products:") ||
      p.name.startsWith("brands:") ||
      p.name.startsWith("manufacturers:") ||
      p.name.startsWith("suppliers:") ||
      p.name.startsWith("categories:") ||
      p.name.startsWith("uoms:") ||
      p.name.startsWith("warehouses:"),
  );
  await prisma.rolePermission.createMany({
    data: managerPermissions.map((p) => ({
      role_id: managerRole.id,
      permission_id: p.id,
    })),
    skipDuplicates: true,
  });

  // STAFF: permissions:read, users:read, roles:read,
  // và read/create/update cho products, brands, manufacturers, suppliers, categories, uoms
  const staffPermissions = allPermissions.filter(
    (p) =>
      p.name === "permissions:read" ||
      p.name === "users:read" ||
      p.name === "roles:read" ||
      p.name.startsWith("products:") ||
      p.name.startsWith("brands:") ||
      p.name.startsWith("manufacturers:") ||
      p.name.startsWith("suppliers:") ||
      p.name.startsWith("categories:") ||
      p.name.startsWith("uoms:") ||
      p.name.startsWith("warehouses:"),
  );
  await prisma.rolePermission.createMany({
    data: staffPermissions.map((p) => ({
      role_id: staffRole.id,
      permission_id: p.id,
    })),
    skipDuplicates: true,
  });

  // Tạo user admin
  const hashedPassword =
    "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW";
  const adminUser = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password_hash: hashedPassword,
      full_name: "Admin",
      email: "admin@gmail.com",
      role_id: ceoRole.id,
    },
  });

  // Tạo warehouse mẫu
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH001" },
    update: {},
    create: {
      code: "WH001",
      name: "Main Warehouse",
    },
  });

  // Cập nhật admin user với warehouse_id
  await prisma.user.update({
    where: { id: adminUser.id },
    data: { warehouse_id: mainWarehouse.id },
  });

  // Seeding sample data for F&B Warehouse

  // Units of Measure (add more to reach 10+)
  const kgUom = await prisma.unitOfMeasure.upsert({
    where: { code: "KG" },
    update: {},
    create: {
      code: "KG",
      name: "Kilogram",
      uom_type: "WEIGHT",
    },
  });

  const literUom = await prisma.unitOfMeasure.upsert({
    where: { code: "L" },
    update: {},
    create: {
      code: "L",
      name: "Liter",
      uom_type: "VOLUME",
    },
  });

  const pieceUom = await prisma.unitOfMeasure.upsert({
    where: { code: "PC" },
    update: {},
    create: {
      code: "PC",
      name: "Piece",
      uom_type: "QUANTITY",
    },
  });

  const packUom = await prisma.unitOfMeasure.upsert({
    where: { code: "PACK" },
    update: {},
    create: {
      code: "PACK",
      name: "Pack",
      uom_type: "PACK",
    },
  });

  // Additional UOMs
  const gramUom = await prisma.unitOfMeasure.upsert({
    where: { code: "G" },
    update: {},
    create: {
      code: "G",
      name: "Gram",
      uom_type: "WEIGHT",
    },
  });

  const tonUom = await prisma.unitOfMeasure.upsert({
    where: { code: "TON" },
    update: {},
    create: {
      code: "TON",
      name: "Ton",
      uom_type: "WEIGHT",
    },
  });

  const meterUom = await prisma.unitOfMeasure.upsert({
    where: { code: "M" },
    update: {},
    create: {
      code: "M",
      name: "Meter",
      uom_type: "LENGTH",
    },
  });

  const boxUom = await prisma.unitOfMeasure.upsert({
    where: { code: "BOX" },
    update: {},
    create: {
      code: "BOX",
      name: "Box",
      uom_type: "PACK",
    },
  });

  const dozenUom = await prisma.unitOfMeasure.upsert({
    where: { code: "DOZEN" },
    update: {},
    create: {
      code: "DOZEN",
      name: "Dozen",
      uom_type: "QUANTITY",
    },
  });

  const palletUom = await prisma.unitOfMeasure.upsert({
    where: { code: "PALLET" },
    update: {},
    create: {
      code: "PALLET",
      name: "Pallet",
      uom_type: "PACK",
    },
  });

  // Product Categories
  const beveragesCategory = await prisma.productCategory.upsert({
    where: { code: "BEVERAGES" },
    update: {},
    create: {
      code: "BEVERAGES",
      name: "Beverages",
      description: "Drinks and beverages",
    },
  });

  const foodCategory = await prisma.productCategory.upsert({
    where: { code: "FOOD" },
    update: {},
    create: {
      code: "FOOD",
      name: "Food",
      description: "Food products",
    },
  });

  const dairyCategory = await prisma.productCategory.upsert({
    where: { code: "DAIRY" },
    update: {},
    create: {
      code: "DAIRY",
      name: "Dairy Products",
      description: "Milk and dairy products",
      parent_id: foodCategory.id,
    },
  });

  // Additional Categories
  const snacksCategory = await prisma.productCategory.upsert({
    where: { code: "SNACKS" },
    update: {},
    create: {
      code: "SNACKS",
      name: "Snacks",
      description: "Snack foods and treats",
      parent_id: foodCategory.id,
    },
  });

  const bakeryCategory = await prisma.productCategory.upsert({
    where: { code: "BAKERY" },
    update: {},
    create: {
      code: "BAKERY",
      name: "Bakery",
      description: "Baked goods and pastries",
      parent_id: foodCategory.id,
    },
  });

  const frozenCategory = await prisma.productCategory.upsert({
    where: { code: "FROZEN" },
    update: {},
    create: {
      code: "FROZEN",
      name: "Frozen Foods",
      description: "Frozen food products",
      parent_id: foodCategory.id,
    },
  });

  const cannedCategory = await prisma.productCategory.upsert({
    where: { code: "CANNED" },
    update: {},
    create: {
      code: "CANNED",
      name: "Canned Goods",
      description: "Canned and preserved foods",
      parent_id: foodCategory.id,
    },
  });

  const condimentsCategory = await prisma.productCategory.upsert({
    where: { code: "CONDIMENTS" },
    update: {},
    create: {
      code: "CONDIMENTS",
      name: "Condiments",
      description: "Sauces, oils, and seasonings",
      parent_id: foodCategory.id,
    },
  });

  const softDrinksCategory = await prisma.productCategory.upsert({
    where: { code: "SOFT_DRINKS" },
    update: {},
    create: {
      code: "SOFT_DRINKS",
      name: "Soft Drinks",
      description: "Carbonated beverages",
      parent_id: beveragesCategory.id,
    },
  });

  const juicesCategory = await prisma.productCategory.upsert({
    where: { code: "JUICES" },
    update: {},
    create: {
      code: "JUICES",
      name: "Juices",
      description: "Fruit and vegetable juices",
      parent_id: beveragesCategory.id,
    },
  });

  // Brands
  const cocaColaBrand = await prisma.brand.upsert({
    where: { code: "COCA_COLA" },
    update: {},
    create: {
      code: "COCA_COLA",
      name: "Coca-Cola",
    },
  });

  const nestleBrand = await prisma.brand.upsert({
    where: { code: "NESTLE" },
    update: {},
    create: {
      code: "NESTLE",
      name: "Nestlé",
    },
  });

  // Additional Brands
  const pepsiBrand = await prisma.brand.upsert({
    where: { code: "PEPSI" },
    update: {},
    create: {
      code: "PEPSI",
      name: "Pepsi",
    },
  });

  const tropicanaBrand = await prisma.brand.upsert({
    where: { code: "TROPICANA" },
    update: {},
    create: {
      code: "TROPICANA",
      name: "Tropicana",
    },
  });

  const wonderBrand = await prisma.brand.upsert({
    where: { code: "WONDER" },
    update: {},
    create: {
      code: "WONDER",
      name: "Wonder Bread",
    },
  });

  const kraftBrand = await prisma.brand.upsert({
    where: { code: "KRAFT" },
    update: {},
    create: {
      code: "KRAFT",
      name: "Kraft",
    },
  });

  const laysBrand = await prisma.brand.upsert({
    where: { code: "LAYS" },
    update: {},
    create: {
      code: "LAYS",
      name: "Lay's",
    },
  });

  const digiornoBrand = await prisma.brand.upsert({
    where: { code: "DIGIORNO" },
    update: {},
    create: {
      code: "DIGIORNO",
      name: "DiGiorno",
    },
  });

  const campbellBrand = await prisma.brand.upsert({
    where: { code: "CAMPBELL" },
    update: {},
    create: {
      code: "CAMPBELL",
      name: "Campbell's",
    },
  });

  const heinzBrand = await prisma.brand.upsert({
    where: { code: "HEINZ" },
    update: {},
    create: {
      code: "HEINZ",
      name: "Heinz",
    },
  });

  const kelloggBrand = await prisma.brand.upsert({
    where: { code: "KELLOGG" },
    update: {},
    create: {
      code: "KELLOGG",
      name: "Kellogg's",
    },
  });

  // Manufacturers
  const cocaColaMfg = await prisma.manufacturer.upsert({
    where: { code: "COCA_COLA_CO" },
    update: {},
    create: {
      code: "COCA_COLA_CO",
      name: "The Coca-Cola Company",
    },
  });

  const nestleMfg = await prisma.manufacturer.upsert({
    where: { code: "NESTLE_SA" },
    update: {},
    create: {
      code: "NESTLE_SA",
      name: "Nestlé S.A.",
    },
  });

  // Additional Manufacturers
  const pepsiMfg = await prisma.manufacturer.upsert({
    where: { code: "PEPSICO_INC" },
    update: {},
    create: {
      code: "PEPSICO_INC",
      name: "PepsiCo Inc.",
    },
  });

  const generalMillsMfg = await prisma.manufacturer.upsert({
    where: { code: "GENERAL_MILLS" },
    update: {},
    create: {
      code: "GENERAL_MILLS",
      name: "General Mills Inc.",
    },
  });

  const kraftMfg = await prisma.manufacturer.upsert({
    where: { code: "KRAFT_HEINZ" },
    update: {},
    create: {
      code: "KRAFT_HEINZ",
      name: "Kraft Heinz Company",
    },
  });

  const campbellMfg = await prisma.manufacturer.upsert({
    where: { code: "CAMPBELL_SOUP" },
    update: {},
    create: {
      code: "CAMPBELL_SOUP",
      name: "Campbell Soup Company",
    },
  });

  const kelloggMfg = await prisma.manufacturer.upsert({
    where: { code: "KELLOGG_CO" },
    update: {},
    create: {
      code: "KELLOGG_CO",
      name: "Kellogg Company",
    },
  });

  const fritoLayMfg = await prisma.manufacturer.upsert({
    where: { code: "FRITO_LAY" },
    update: {},
    create: {
      code: "FRITO_LAY",
      name: "Frito-Lay Inc.",
    },
  });

  const nestlePurinaMfg = await prisma.manufacturer.upsert({
    where: { code: "NESTLE_PURINA" },
    update: {},
    create: {
      code: "NESTLE_PURINA",
      name: "Nestlé Purina PetCare",
    },
  });

  const unileverMfg = await prisma.manufacturer.upsert({
    where: { code: "UNILEVER_PLC" },
    update: {},
    create: {
      code: "UNILEVER_PLC",
      name: "Unilever PLC",
    },
  });

  // Suppliers
  const beverageSupplier = await prisma.supplier.upsert({
    where: { code: "BEV_SUP_001" },
    update: {},
    create: {
      code: "BEV_SUP_001",
      name: "Beverage Distributors Inc.",
      contact_person: "John Smith",
      phone: "+1-555-0101",
      email: "john@beveragedist.com",
      address: "123 Beverage St, Drink City, DC 12345",
    },
  });

  const foodSupplier = await prisma.supplier.upsert({
    where: { code: "FOOD_SUP_001" },
    update: {},
    create: {
      code: "FOOD_SUP_001",
      name: "Fresh Foods Supply Co.",
      contact_person: "Jane Doe",
      phone: "+1-555-0202",
      email: "jane@freshfoods.com",
      address: "456 Food Ave, Eat Town, ET 67890",
    },
  });

  // Additional Suppliers
  const dairySupplier = await prisma.supplier.upsert({
    where: { code: "DAIRY_SUP_001" },
    update: {},
    create: {
      code: "DAIRY_SUP_001",
      name: "Dairy Farms Inc.",
      contact_person: "Mike Johnson",
      phone: "+1-555-0303",
      email: "mike@dairyfarms.com",
      address: "789 Milk Road, Dairy Valley, DV 11223",
    },
  });

  const bakerySupplier = await prisma.supplier.upsert({
    where: { code: "BAKERY_SUP_001" },
    update: {},
    create: {
      code: "BAKERY_SUP_001",
      name: "Golden Bakery Supplies",
      contact_person: "Sarah Wilson",
      phone: "+1-555-0404",
      email: "sarah@goldenbakery.com",
      address: "321 Bread Street, Bakery Town, BT 44556",
    },
  });

  const frozenSupplier = await prisma.supplier.upsert({
    where: { code: "FROZEN_SUP_001" },
    update: {},
    create: {
      code: "FROZEN_SUP_001",
      name: "Arctic Foods Ltd.",
      contact_person: "Tom Brown",
      phone: "+1-555-0505",
      email: "tom@arcticfoods.com",
      address: "654 Ice Lane, Cold City, CC 77889",
    },
  });

  const cannedSupplier = await prisma.supplier.upsert({
    where: { code: "CANNED_SUP_001" },
    update: {},
    create: {
      code: "CANNED_SUP_001",
      name: "Premium Canned Goods",
      contact_person: "Lisa Davis",
      phone: "+1-555-0606",
      email: "lisa@premiumcanned.com",
      address: "987 Can Avenue, Preserve City, PC 99001",
    },
  });

  const condimentSupplier = await prisma.supplier.upsert({
    where: { code: "COND_SUP_001" },
    update: {},
    create: {
      code: "COND_SUP_001",
      name: "Flavor Masters Inc.",
      contact_person: "David Lee",
      phone: "+1-555-0707",
      email: "david@flavormasters.com",
      address: "147 Spice Road, Flavor Town, FT 22334",
    },
  });

  const juiceSupplier = await prisma.supplier.upsert({
    where: { code: "JUICE_SUP_001" },
    update: {},
    create: {
      code: "JUICE_SUP_001",
      name: "Pure Juice Company",
      contact_person: "Emma Taylor",
      phone: "+1-555-0808",
      email: "emma@purejuice.com",
      address: "258 Fruit Boulevard, Juice City, JC 55667",
    },
  });

  const snackSupplier = await prisma.supplier.upsert({
    where: { code: "SNACK_SUP_001" },
    update: {},
    create: {
      code: "SNACK_SUP_001",
      name: "Crunchy Snacks Corp.",
      contact_person: "James Anderson",
      phone: "+1-555-0909",
      email: "james@crunchysnacks.com",
      address: "369 Snack Street, Crunch City, CC 88990",
    },
  });

  // Warehouses

  const hcmWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_HCM" },
    update: {},
    create: {
      code: "WH_HCM",
      name: "Ho Chi Minh Branch",
      is_active: true,
    },
  });

  // Additional Warehouses
  const hanoiWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_HN" },
    update: {},
    create: {
      code: "WH_HN",
      name: "Hanoi Branch",
      is_active: true,
    },
  });

  const danangWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_DN" },
    update: {},
    create: {
      code: "WH_DN",
      name: "Da Nang Branch",
      is_active: true,
    },
  });

  const canthoWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_CT" },
    update: {},
    create: {
      code: "WH_CT",
      name: "Can Tho Branch",
      is_active: true,
    },
  });

  const frozenWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_FROZEN" },
    update: {},
    create: {
      code: "WH_FROZEN",
      name: "Frozen Storage Facility",
      is_active: true,
    },
  });

  const dryGoodsWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_DRY" },
    update: {},
    create: {
      code: "WH_DRY",
      name: "Dry Goods Warehouse",
      is_active: true,
    },
  });

  const beverageWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_BEV" },
    update: {},
    create: {
      code: "WH_BEV",
      name: "Beverage Distribution Center",
      is_active: true,
    },
  });

  const perishableWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_PERISH" },
    update: {},
    create: {
      code: "WH_PERISH",
      name: "Perishable Goods Warehouse",
      is_active: true,
    },
  });

  const bulkWarehouse = await prisma.warehouse.upsert({
    where: { code: "WH_BULK" },
    update: {},
    create: {
      code: "WH_BULK",
      name: "Bulk Storage Facility",
      is_active: true,
    },
  });

  // Products
  const cokeProduct = await prisma.product.upsert({
    where: { code: "COKE_330ML" },
    update: {},
    create: {
      code: "COKE_330ML",
      name: "Coca-Cola 330ml",
      description: "Classic Coca-Cola soft drink",
      product_type: "GOODS",
      brand_id: cocaColaBrand.id,
      manufacturer_id: cocaColaMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-01-01T00:00:00.000Z"),
      expiry_date: new Date("2026-12-31T23:59:59.999Z"),
      min_stock: 100,
      max_stock: 1000,
      storage_conditions: "Store in cool, dry place",
    },
  });

  const milkProduct = await prisma.product.upsert({
    where: { code: "MILK_1L" },
    update: {},
    create: {
      code: "MILK_1L",
      name: "Fresh Milk 1L",
      description: "Fresh whole milk",
      product_type: "GOODS",
      brand_id: nestleBrand.id,
      manufacturer_id: nestleMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-03-01T00:00:00.000Z"),
      expiry_date: new Date("2026-05-31T23:59:59.999Z"),
      min_stock: 50,
      max_stock: 500,
      storage_conditions: "Refrigerate at 4°C",
    },
  });

  // Additional Products
  const pepsiProduct = await prisma.product.upsert({
    where: { code: "PEPSI_330ML" },
    update: {},
    create: {
      code: "PEPSI_330ML",
      name: "Pepsi 330ml",
      description: "Classic Pepsi soft drink",
      product_type: "GOODS",
      brand_id: pepsiBrand.id,
      manufacturer_id: pepsiMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-01-01T00:00:00.000Z"),
      expiry_date: new Date("2026-12-31T23:59:59.999Z"),
      min_stock: 100,
      max_stock: 1000,
      storage_conditions: "Store in cool, dry place",
    },
  });

  const orangeJuiceProduct = await prisma.product.upsert({
    where: { code: "OJ_1L" },
    update: {},
    create: {
      code: "OJ_1L",
      name: "Orange Juice 1L",
      description: "Fresh orange juice",
      product_type: "GOODS",
      brand_id: tropicanaBrand.id,
      manufacturer_id: pepsiMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-02-01T00:00:00.000Z"),
      expiry_date: new Date("2026-04-30T23:59:59.999Z"),
      min_stock: 30,
      max_stock: 300,
      storage_conditions: "Refrigerate at 4°C",
    },
  });

  const breadProduct = await prisma.product.upsert({
    where: { code: "WHITE_BREAD" },
    update: {},
    create: {
      code: "WHITE_BREAD",
      name: "White Bread Loaf",
      description: "Fresh white bread loaf",
      product_type: "GOODS",
      brand_id: wonderBrand.id,
      manufacturer_id: generalMillsMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-03-15T00:00:00.000Z"),
      expiry_date: new Date("2026-03-22T23:59:59.999Z"),
      min_stock: 20,
      max_stock: 200,
      storage_conditions: "Store in cool, dry place",
    },
  });

  const cheeseProduct = await prisma.product.upsert({
    where: { code: "CHEDDAR_500G" },
    update: {},
    create: {
      code: "CHEDDAR_500G",
      name: "Cheddar Cheese 500g",
      description: "Aged cheddar cheese",
      product_type: "GOODS",
      brand_id: kraftBrand.id,
      manufacturer_id: kraftMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-02-15T00:00:00.000Z"),
      expiry_date: new Date("2026-08-15T23:59:59.999Z"),
      min_stock: 15,
      max_stock: 150,
      storage_conditions: "Refrigerate at 4°C",
    },
  });

  const chipsProduct = await prisma.product.upsert({
    where: { code: "POTATO_CHIPS" },
    update: {},
    create: {
      code: "POTATO_CHIPS",
      name: "Potato Chips 200g",
      description: "Crispy potato chips",
      product_type: "GOODS",
      brand_id: laysBrand.id,
      manufacturer_id: pepsiMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-03-01T00:00:00.000Z"),
      expiry_date: new Date("2026-09-01T23:59:59.999Z"),
      min_stock: 50,
      max_stock: 500,
      storage_conditions: "Store in cool, dry place",
    },
  });

  const frozenPizzaProduct = await prisma.product.upsert({
    where: { code: "FROZEN_PIZZA" },
    update: {},
    create: {
      code: "FROZEN_PIZZA",
      name: "Frozen Pepperoni Pizza",
      description: "Frozen pepperoni pizza",
      product_type: "GOODS",
      brand_id: digiornoBrand.id,
      manufacturer_id: nestleMfg.id,
      warehouse_id: frozenWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-01-15T00:00:00.000Z"),
      expiry_date: new Date("2026-07-15T23:59:59.999Z"),
      min_stock: 25,
      max_stock: 250,
      storage_conditions: "Keep frozen at -18°C",
    },
  });

  const cannedSoupProduct = await prisma.product.upsert({
    where: { code: "TOMATO_SOUP" },
    update: {},
    create: {
      code: "TOMATO_SOUP",
      name: "Tomato Soup 400g",
      description: "Creamy tomato soup",
      product_type: "GOODS",
      brand_id: campbellBrand.id,
      manufacturer_id: campbellMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-01-01T00:00:00.000Z"),
      expiry_date: new Date("2027-01-01T23:59:59.999Z"),
      min_stock: 40,
      max_stock: 400,
      storage_conditions: "Store in cool, dry place",
    },
  });

  const ketchupProduct = await prisma.product.upsert({
    where: { code: "KETCHUP_500ML" },
    update: {},
    create: {
      code: "KETCHUP_500ML",
      name: "Tomato Ketchup 500ml",
      description: "Classic tomato ketchup",
      product_type: "GOODS",
      brand_id: heinzBrand.id,
      manufacturer_id: kraftMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-02-01T00:00:00.000Z"),
      expiry_date: new Date("2026-08-01T23:59:59.999Z"),
      min_stock: 30,
      max_stock: 300,
      storage_conditions: "Store in cool, dry place",
    },
  });

  const cerealProduct = await prisma.product.upsert({
    where: { code: "CORN_FLAKES" },
    update: {},
    create: {
      code: "CORN_FLAKES",
      name: "Corn Flakes 500g",
      description: "Crunchy corn flakes cereal",
      product_type: "GOODS",
      brand_id: kelloggBrand.id,
      manufacturer_id: kelloggMfg.id,
      warehouse_id: mainWarehouse.id,
      base_uom_id: pieceUom.id,
      has_batch: true,
      production_date: new Date("2026-03-01T00:00:00.000Z"),
      expiry_date: new Date("2026-09-01T23:59:59.999Z"),
      min_stock: 35,
      max_stock: 350,
      storage_conditions: "Store in cool, dry place",
    },
  });

  // Product Category Maps
  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: cokeProduct.id,
        category_id: beveragesCategory.id,
      },
    },
    update: {},
    create: {
      product_id: cokeProduct.id,
      category_id: beveragesCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: milkProduct.id,
        category_id: dairyCategory.id,
      },
    },
    update: {},
    create: {
      product_id: milkProduct.id,
      category_id: dairyCategory.id,
    },
  });

  // Additional Product Category Maps
  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: pepsiProduct.id,
        category_id: softDrinksCategory.id,
      },
    },
    update: {},
    create: {
      product_id: pepsiProduct.id,
      category_id: softDrinksCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: orangeJuiceProduct.id,
        category_id: juicesCategory.id,
      },
    },
    update: {},
    create: {
      product_id: orangeJuiceProduct.id,
      category_id: juicesCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: breadProduct.id,
        category_id: bakeryCategory.id,
      },
    },
    update: {},
    create: {
      product_id: breadProduct.id,
      category_id: bakeryCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: cheeseProduct.id,
        category_id: dairyCategory.id,
      },
    },
    update: {},
    create: {
      product_id: cheeseProduct.id,
      category_id: dairyCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: chipsProduct.id,
        category_id: snacksCategory.id,
      },
    },
    update: {},
    create: {
      product_id: chipsProduct.id,
      category_id: snacksCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: frozenPizzaProduct.id,
        category_id: frozenCategory.id,
      },
    },
    update: {},
    create: {
      product_id: frozenPizzaProduct.id,
      category_id: frozenCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: cannedSoupProduct.id,
        category_id: cannedCategory.id,
      },
    },
    update: {},
    create: {
      product_id: cannedSoupProduct.id,
      category_id: cannedCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: ketchupProduct.id,
        category_id: condimentsCategory.id,
      },
    },
    update: {},
    create: {
      product_id: ketchupProduct.id,
      category_id: condimentsCategory.id,
    },
  });

  await prisma.productCategoryMap.upsert({
    where: {
      product_id_category_id: {
        product_id: cerealProduct.id,
        category_id: foodCategory.id,
      },
    },
    update: {},
    create: {
      product_id: cerealProduct.id,
      category_id: foodCategory.id,
    },
  });

  // Product UOMs (additional UOMs for products)
  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: { product_id: cokeProduct.id, uom_id: packUom.id },
    },
    update: {},
    create: {
      product_id: cokeProduct.id,
      uom_id: packUom.id,
      conversion_factor: 24, // 1 pack = 24 pieces
      is_default: false,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: { product_id: milkProduct.id, uom_id: literUom.id },
    },
    update: {},
    create: {
      product_id: milkProduct.id,
      uom_id: literUom.id,
      conversion_factor: 1, // 1 piece = 1 liter
      is_default: true,
    },
  });

  // Additional Product UOMs
  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: { product_id: pepsiProduct.id, uom_id: packUom.id },
    },
    update: {},
    create: {
      product_id: pepsiProduct.id,
      uom_id: packUom.id,
      conversion_factor: 24, // 1 pack = 24 pieces
      is_default: false,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: {
        product_id: orangeJuiceProduct.id,
        uom_id: literUom.id,
      },
    },
    update: {},
    create: {
      product_id: orangeJuiceProduct.id,
      uom_id: literUom.id,
      conversion_factor: 1, // 1 piece = 1 liter
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: { product_id: breadProduct.id, uom_id: pieceUom.id },
    },
    update: {},
    create: {
      product_id: breadProduct.id,
      uom_id: pieceUom.id,
      conversion_factor: 1, // 1 piece = 1 loaf
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: {
        product_id: cheeseProduct.id,
        uom_id: kgUom.id,
      },
    },
    update: {},
    create: {
      product_id: cheeseProduct.id,
      uom_id: kgUom.id,
      conversion_factor: 0.5, // 1 piece = 0.5 kg
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: { product_id: chipsProduct.id, uom_id: pieceUom.id },
    },
    update: {},
    create: {
      product_id: chipsProduct.id,
      uom_id: pieceUom.id,
      conversion_factor: 1, // 1 piece = 1 bag
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: {
        product_id: frozenPizzaProduct.id,
        uom_id: pieceUom.id,
      },
    },
    update: {},
    create: {
      product_id: frozenPizzaProduct.id,
      uom_id: pieceUom.id,
      conversion_factor: 1, // 1 piece = 1 pizza
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: {
        product_id: cannedSoupProduct.id,
        uom_id: pieceUom.id,
      },
    },
    update: {},
    create: {
      product_id: cannedSoupProduct.id,
      uom_id: pieceUom.id,
      conversion_factor: 1, // 1 piece = 1 can
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: { product_id: ketchupProduct.id, uom_id: literUom.id },
    },
    update: {},
    create: {
      product_id: ketchupProduct.id,
      uom_id: literUom.id,
      conversion_factor: 0.5, // 1 piece = 0.5 liter
      is_default: true,
    },
  });

  await prisma.productUom.upsert({
    where: {
      product_id_uom_id: {
        product_id: cerealProduct.id,
        uom_id: kgUom.id,
      },
    },
    update: {},
    create: {
      product_id: cerealProduct.id,
      uom_id: kgUom.id,
      conversion_factor: 0.5, // 1 piece = 0.5 kg
      is_default: true,
    },
  });

  // Product Suppliers
  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: cokeProduct.id,
        supplier_id: beverageSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: cokeProduct.id,
      supplier_id: beverageSupplier.id,
      supplier_sku: "CC330",
      purchase_price: 0.5,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: milkProduct.id,
        supplier_id: foodSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: milkProduct.id,
      supplier_id: foodSupplier.id,
      supplier_sku: "FM1L",
      purchase_price: 1.2,
      is_primary: true,
    },
  });

  // Additional Product Suppliers
  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: pepsiProduct.id,
        supplier_id: beverageSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: pepsiProduct.id,
      supplier_id: beverageSupplier.id,
      supplier_sku: "P330",
      purchase_price: 0.45,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: orangeJuiceProduct.id,
        supplier_id: juiceSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: orangeJuiceProduct.id,
      supplier_id: juiceSupplier.id,
      supplier_sku: "OJ1L",
      purchase_price: 1.8,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: breadProduct.id,
        supplier_id: bakerySupplier.id,
      },
    },
    update: {},
    create: {
      product_id: breadProduct.id,
      supplier_id: bakerySupplier.id,
      supplier_sku: "WB001",
      purchase_price: 2.5,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: cheeseProduct.id,
        supplier_id: dairySupplier.id,
      },
    },
    update: {},
    create: {
      product_id: cheeseProduct.id,
      supplier_id: dairySupplier.id,
      supplier_sku: "CH500",
      purchase_price: 4.5,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: chipsProduct.id,
        supplier_id: snackSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: chipsProduct.id,
      supplier_id: snackSupplier.id,
      supplier_sku: "PC200",
      purchase_price: 1.8,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: frozenPizzaProduct.id,
        supplier_id: frozenSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: frozenPizzaProduct.id,
      supplier_id: frozenSupplier.id,
      supplier_sku: "FP001",
      purchase_price: 5.5,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: cannedSoupProduct.id,
        supplier_id: cannedSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: cannedSoupProduct.id,
      supplier_id: cannedSupplier.id,
      supplier_sku: "CS400",
      purchase_price: 1.2,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: ketchupProduct.id,
        supplier_id: condimentSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: ketchupProduct.id,
      supplier_id: condimentSupplier.id,
      supplier_sku: "K500",
      purchase_price: 2.1,
      is_primary: true,
    },
  });

  await prisma.productSupplier.upsert({
    where: {
      product_id_supplier_id: {
        product_id: cerealProduct.id,
        supplier_id: foodSupplier.id,
      },
    },
    update: {},
    create: {
      product_id: cerealProduct.id,
      supplier_id: foodSupplier.id,
      supplier_sku: "CF500",
      purchase_price: 3.2,
      is_primary: true,
    },
  });

  // Warehouse Locations (WH_MAIN)
  // Ambient Zone
  const ambientLocation = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-Z1-A1-R1-L1-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-Z1-A1-R1-L1-B1",
      zone_code: "Z1",
      aisle_code: "A1",
      rack_code: "R1",
      level_code: "L1",
      bin_code: "B1",
      full_path: "WH001-Z1-A1-R1-L1-B1",
      location_status: "AVAILABLE",
      storage_condition: "AMBIENT",
      max_weight: 1000,
      max_volume: 50,
      current_weight: 0,
      current_volume: 0,
    },
  });
  // Frozen Zone
  const frozenLocation = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-FZ1-A1-R1-L1-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-FZ1-A1-R1-L1-B1",
      zone_code: "FZ1",
      aisle_code: "A1",
      rack_code: "R1",
      level_code: "L1",
      bin_code: "B1",
      full_path: "WH001-FZ1-A1-R1-L1-B1",
      location_status: "AVAILABLE",
      storage_condition: "FROZEN",
      max_weight: 800,
      max_volume: 40,
      current_weight: 0,
      current_volume: 0,
    },
  });

  // Additional Warehouse Locations
  const ambientLocation2 = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-Z1-A1-R1-L2-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-Z1-A1-R1-L2-B1",
      zone_code: "Z1",
      aisle_code: "A1",
      rack_code: "R1",
      level_code: "L2",
      bin_code: "B1",
      full_path: "WH001-Z1-A1-R1-L2-B1",
      location_status: "AVAILABLE",
      storage_condition: "AMBIENT",
      max_weight: 1000,
      max_volume: 50,
      current_weight: 0,
      current_volume: 0,
    },
  });

  const ambientLocation3 = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-Z1-A2-R1-L1-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-Z1-A2-R1-L1-B1",
      zone_code: "Z1",
      aisle_code: "A2",
      rack_code: "R1",
      level_code: "L1",
      bin_code: "B1",
      full_path: "WH001-Z1-A2-R1-L1-B1",
      location_status: "AVAILABLE",
      storage_condition: "AMBIENT",
      max_weight: 1000,
      max_volume: 50,
      current_weight: 0,
      current_volume: 0,
    },
  });

  const chilledLocation = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-CZ1-A1-R1-L1-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-CZ1-A1-R1-L1-B1",
      zone_code: "CZ1",
      aisle_code: "A1",
      rack_code: "R1",
      level_code: "L1",
      bin_code: "B1",
      full_path: "WH001-CZ1-A1-R1-L1-B1",
      location_status: "AVAILABLE",
      storage_condition: "CHILLED",
      max_weight: 900,
      max_volume: 45,
      current_weight: 0,
      current_volume: 0,
    },
  });

  const frozenLocation2 = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-FZ1-A1-R1-L2-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-FZ1-A1-R1-L2-B1",
      zone_code: "FZ1",
      aisle_code: "A1",
      rack_code: "R1",
      level_code: "L2",
      bin_code: "B1",
      full_path: "WH001-FZ1-A1-R1-L2-B1",
      location_status: "AVAILABLE",
      storage_condition: "FROZEN",
      max_weight: 800,
      max_volume: 40,
      current_weight: 0,
      current_volume: 0,
    },
  });

  const ambientLocation4 = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-Z1-A2-R1-L2-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-Z1-A2-R1-L2-B1",
      zone_code: "Z1",
      aisle_code: "A2",
      rack_code: "R1",
      level_code: "L2",
      bin_code: "B1",
      full_path: "WH001-Z1-A2-R1-L2-B1",
      location_status: "AVAILABLE",
      storage_condition: "AMBIENT",
      max_weight: 1000,
      max_volume: 50,
      current_weight: 0,
      current_volume: 0,
    },
  });

  const chilledLocation2 = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-CZ1-A1-R1-L2-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-CZ1-A1-R1-L2-B1",
      zone_code: "CZ1",
      aisle_code: "A1",
      rack_code: "R1",
      level_code: "L2",
      bin_code: "B1",
      full_path: "WH001-CZ1-A1-R1-L2-B1",
      location_status: "AVAILABLE",
      storage_condition: "CHILLED",
      max_weight: 900,
      max_volume: 45,
      current_weight: 0,
      current_volume: 0,
    },
  });

  const ambientLocation5 = await prisma.warehouseLocation.upsert({
    where: { location_code: "WH001-Z1-A3-R1-L1-B1" },
    update: {},
    create: {
      warehouse_id: mainWarehouse.id,
      location_code: "WH001-Z1-A3-R1-L1-B1",
      zone_code: "Z1",
      aisle_code: "A3",
      rack_code: "R1",
      level_code: "L1",
      bin_code: "B1",
      full_path: "WH001-Z1-A3-R1-L1-B1",
      location_status: "AVAILABLE",
      storage_condition: "AMBIENT",
      max_weight: 1000,
      max_volume: 50,
      current_weight: 0,
      current_volume: 0,
    },
  });

  // Inventory data for product-location
  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: cokeProduct.id,
        warehouse_location_id: ambientLocation.id,
      },
    },
    update: {},
    create: {
      product_id: cokeProduct.id,
      warehouse_location_id: ambientLocation.id,
      quantity: 500,
      reserved_quantity: 20,
      available_quantity: 480,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: milkProduct.id,
        warehouse_location_id: frozenLocation.id,
      },
    },
    update: {},
    create: {
      product_id: milkProduct.id,
      warehouse_location_id: frozenLocation.id,
      quantity: 200,
      reserved_quantity: 10,
      available_quantity: 190,
    },
  });

  // Additional Inventory Records
  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: pepsiProduct.id,
        warehouse_location_id: ambientLocation2.id,
      },
    },
    update: {},
    create: {
      product_id: pepsiProduct.id,
      warehouse_location_id: ambientLocation2.id,
      quantity: 450,
      reserved_quantity: 15,
      available_quantity: 435,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: orangeJuiceProduct.id,
        warehouse_location_id: chilledLocation.id,
      },
    },
    update: {},
    create: {
      product_id: orangeJuiceProduct.id,
      warehouse_location_id: chilledLocation.id,
      quantity: 120,
      reserved_quantity: 5,
      available_quantity: 115,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: breadProduct.id,
        warehouse_location_id: ambientLocation3.id,
      },
    },
    update: {},
    create: {
      product_id: breadProduct.id,
      warehouse_location_id: ambientLocation3.id,
      quantity: 80,
      reserved_quantity: 8,
      available_quantity: 72,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: cheeseProduct.id,
        warehouse_location_id: chilledLocation2.id,
      },
    },
    update: {},
    create: {
      product_id: cheeseProduct.id,
      warehouse_location_id: chilledLocation2.id,
      quantity: 60,
      reserved_quantity: 3,
      available_quantity: 57,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: chipsProduct.id,
        warehouse_location_id: ambientLocation4.id,
      },
    },
    update: {},
    create: {
      product_id: chipsProduct.id,
      warehouse_location_id: ambientLocation4.id,
      quantity: 250,
      reserved_quantity: 12,
      available_quantity: 238,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: frozenPizzaProduct.id,
        warehouse_location_id: frozenLocation2.id,
      },
    },
    update: {},
    create: {
      product_id: frozenPizzaProduct.id,
      warehouse_location_id: frozenLocation2.id,
      quantity: 100,
      reserved_quantity: 6,
      available_quantity: 94,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: cannedSoupProduct.id,
        warehouse_location_id: ambientLocation5.id,
      },
    },
    update: {},
    create: {
      product_id: cannedSoupProduct.id,
      warehouse_location_id: ambientLocation5.id,
      quantity: 180,
      reserved_quantity: 9,
      available_quantity: 171,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: ketchupProduct.id,
        warehouse_location_id: ambientLocation.id,
      },
    },
    update: {},
    create: {
      product_id: ketchupProduct.id,
      warehouse_location_id: ambientLocation.id,
      quantity: 150,
      reserved_quantity: 7,
      available_quantity: 143,
    },
  });

  await prisma.inventory.upsert({
    where: {
      product_id_warehouse_location_id: {
        product_id: cerealProduct.id,
        warehouse_location_id: ambientLocation2.id,
      },
    },
    update: {},
    create: {
      product_id: cerealProduct.id,
      warehouse_location_id: ambientLocation2.id,
      quantity: 140,
      reserved_quantity: 4,
      available_quantity: 136,
    },
  });

  // Seeding Location Allowed Categories
  const locationAllowedCategoriesData = [
    {
      location_id: chilledLocation.id,
      category_id: dairyCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực lạnh cho sữa",
    },
    {
      location_id: chilledLocation2.id,
      category_id: dairyCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực lạnh cho phô mai",
    },
    {
      location_id: frozenLocation2.id,
      category_id: frozenCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực đông lạnh",
    },
    {
      location_id: ambientLocation.id,
      category_id: condimentsCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực cho gia vị",
    },
    {
      location_id: ambientLocation2.id,
      category_id: snacksCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực cho ngũ cốc",
    },
    {
      location_id: ambientLocation3.id,
      category_id: bakeryCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực cho bánh mì",
    },
    {
      location_id: ambientLocation4.id,
      category_id: snacksCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực cho bim bim",
    },
    {
      location_id: ambientLocation5.id,
      category_id: cannedCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực đồ hộp",
    },
    {
      location_id: chilledLocation.id,
      category_id: juicesCategory.id,
      is_allowed: true,
      rule_source: "DIRECT" as const,
      inherit_from_parent: false,
      priority: 1,
      note: "Khu vực nước ép lạnh",
    },
    {
      location_id: ambientLocation.id,
      category_id: frozenCategory.id,
      is_allowed: false,
      rule_source: "OVERRIDE" as const,
      inherit_from_parent: false,
      priority: 10,
      note: "Cấm để đồ đông lạnh ở nhiệt độ phòng",
    }
  ];

  for (const item of locationAllowedCategoriesData) {
    await prisma.locationAllowedCategory.upsert({
      where: {
        location_id_category_id: {
          location_id: item.location_id,
          category_id: item.category_id,
        }
      },
      update: {},
      create: item,
    });
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
