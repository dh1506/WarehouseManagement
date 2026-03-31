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
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }

  // Tạo roles
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

  const staffRole = await prisma.role.upsert({
    where: { name: "STAFF" },
    update: {},
    create: {
      name: "STAFF",
      description: "Staff with basic permissions for daily warehouse tasks",
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
      p.name.startsWith("uoms:"),
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
      p.name.startsWith("uoms:"),
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
  await prisma.user.upsert({
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

  // Seeding sample data for F&B Warehouse

  // Units of Measure
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
      base_uom_id: pieceUom.id,
      has_batch: true,
      has_expiry: true,
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
      base_uom_id: pieceUom.id,
      has_batch: true,
      has_expiry: true,
      min_stock: 50,
      max_stock: 500,
      storage_conditions: "Refrigerate at 4°C",
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
