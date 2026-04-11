import { PrismaClient, UserStatus } from "../../src/generated";

export async function seedAuth(prisma: PrismaClient) {
  console.log("🚀 Seeding Auth System...");

  // 1. Định nghĩa danh sách Permissions
  const permissions = [
    // USERS
    { name: "users:read", description: "Xem người dùng", module: "users", action: "read" },
    { name: "users:create", description: "Tạo người dùng", module: "users", action: "create" },
    { name: "users:update", description: "Sửa người dùng", module: "users", action: "update" },
    { name: "users:delete", description: "Xóa người dùng", module: "users", action: "delete" },

    // ROLES
    { name: "roles:read", description: "Xem vai trò", module: "roles", action: "read" },
    { name: "roles:create", description: "Tạo vai trò", module: "roles", action: "create" },
    { name: "roles:update", description: "Sửa vai trò", module: "roles", action: "update" },
    { name: "roles:delete", description: "Xóa vai trò", module: "roles", action: "delete" },

    // PERMISSIONS
    { name: "permissions:read", description: "Xem quyền hạn", module: "permissions", action: "read" },

    // PRODUCTS
    { name: "products:read", description: "Xem sản phẩm", module: "products", action: "read" },
    { name: "products:create", description: "Tạo sản phẩm", module: "products", action: "create" },
    { name: "products:update", description: "Sửa sản phẩm", module: "products", action: "update" },
    { name: "products:delete", description: "Xóa sản phẩm", module: "products", action: "delete" },

    // BRANDS
    { name: "brands:read", description: "Xem thương hiệu", module: "brands", action: "read" },
    { name: "brands:create", description: "Tạo thương hiệu", module: "brands", action: "create" },
    { name: "brands:update", description: "Sửa thương hiệu", module: "brands", action: "update" },

    // CATEGORIES
    { name: "categories:read", description: "Xem danh mục", module: "categories", action: "read" },
    { name: "categories:create", description: "Tạo danh mục", module: "categories", action: "create" },
    { name: "categories:update", description: "Sửa danh mục", module: "categories", action: "update" },
    { name: "categories:delete", description: "Xóa danh mục", module: "categories", action: "delete" },

    // SUPPLIERS
    { name: "suppliers:read", description: "Xem NCC", module: "suppliers", action: "read" },
    { name: "suppliers:create", description: "Tạo NCC", module: "suppliers", action: "create" },
    { name: "suppliers:update", description: "Sửa nhà cung cấp", module: "suppliers", action: "update" },

    // UOMS
    { name: "uoms:read", description: "Xem ĐVT", module: "uoms", action: "read" },
    { name: "uoms:create", description: "Tạo đơn vị tính", module: "uoms", action: "create" },
    { name: "uoms:update", description: "Sửa đơn vị tính", module: "uoms", action: "update" },

    // WAREHOUSES
    { name: "warehouses:read", description: "Xem kho", module: "warehouses", action: "read" },
    { name: "warehouses:create", description: "Tạo kho", module: "warehouses", action: "create" },
    { name: "warehouses:update", description: "Sửa kho", module: "warehouses", action: "update" },

    // INVENTORY
    { name: "inventory:read", description: "Xem tồn kho", module: "inventory", action: "read" },
    { name: "inventory:create", description: "Tạo tồn kho", module: "inventory", action: "create" },
    { name: "inventory:update", description: "Sửa tồn kho", module: "inventory", action: "update" },
    { name: "inventory:delete", description: "Xóa tồn kho", module: "inventory", action: "delete" },

    // LOCATION ALLOWED CATEGORIES
    { name: "location_allowed_categories:read", description: "Xem danh mục cho phép tại vị trí", module: "location_allowed_categories", action: "read" },
    { name: "location_allowed_categories:create", description: "Thêm danh mục cho phép tại vị trí", module: "location_allowed_categories", action: "create" },
    { name: "location_allowed_categories:update", description: "Cập nhật danh mục cho phép tại vị trí", module: "location_allowed_categories", action: "update" },
    { name: "location_allowed_categories:delete", description: "Xóa danh mục cho phép tại vị trí", module: "location_allowed_categories", action: "delete" },

    // STOCK INS
    { name: "stock_ins:read", description: "Xem phiếu nhập", module: "stock_ins", action: "read" },
    { name: "stock_ins:create", description: "Tạo phiếu nhập", module: "stock_ins", action: "create" },
    { name: "stock_ins:update", description: "Sửa phiếu nhập", module: "stock_ins", action: "update" },
    { name: "stock_ins:approve", description: "Duyệt phiếu nhập", module: "stock_ins", action: "approve" },
    { name: "stock_ins_discrepancies:create", description: "Tạo biên bản chênh lệch", module: "stock_ins_discrepancies", action: "create" },
    { name: "stock_ins_discrepancies:resolve", description: "Giải quyết chênh lệch", module: "stock_ins_discrepancies", action: "resolve" },

    // STOCK OUTS
    { name: "stock_outs:read", description: "Xem phiếu xuất", module: "stock_outs", action: "read" },
    { name: "stock_outs:create", description: "Tạo phiếu xuất", module: "stock_outs", action: "create" },

    // INVENTORY TRANSACTIONS
    { name: "inventory_transactions:read", description: "Xem nhật ký", module: "inventory_transactions", action: "read" },
    { name: "inventory_transactions:create", description: "Tạo giao dịch điều chỉnh", module: "inventory_transactions", action: "create" },
  ];

  for (const p of permissions) {
    await prisma.permission.upsert({
      where: { name: p.name },
      update: {},
      create: p,
    });
  }

  // 2. Định nghĩa Roles (3 role cơ bản)
  const roles = [
    { name: "STAFF", description: "Nhân viên" },
    { name: "MANAGER", description: "Quản lý" },
    { name: "CEO", description: "Giám đốc điều hành" }
  ];

  const roleRecords = await Promise.all(
    roles.map((r) =>
      prisma.role.upsert({
        where: { name: r.name },
        update: {},
        create: r,
      })
    )
  );

  const roleMap = Object.fromEntries(roleRecords.map((r) => [r.name, r.id]));
  const allPermissions = await prisma.permission.findMany();

  // 3. Phân quyền cho từng Role
  for (const role of roleRecords) {
    let targetPermissions = [];

    if (role.name === "CEO") {
      targetPermissions = allPermissions; // CEO full quyền
    } else if (role.name === "MANAGER") {
      // Manager: quyền xem tất cả + quyền tạo/sửa (loại bỏ quyền delete)
      targetPermissions = allPermissions.filter(p => !p.action.includes("delete"));
    } else {
      // Staff: chỉ quyền xem (read)
      targetPermissions = allPermissions.filter(p => p.action === "read");
    }

    await prisma.rolePermission.createMany({
      data: targetPermissions.map((p) => ({
        role_id: role.id,
        permission_id: p.id,
      })),
      skipDuplicates: true,
    });
  }

  // 4. Định nghĩa Users (Đã gán lại role mới)
  const users = [
    { username: "admin", full_name: "Hệ thống Admin", email: "admin@fb.com", role_id: roleMap["CEO"] },
    { username: "hung.manager", full_name: "Nguyễn Văn Hùng", email: "hung.mng@fb.com", role_id: roleMap["MANAGER"] },
    { username: "lan.manager", full_name: "Trần Thị Lan", email: "lan.mng@fb.com", role_id: roleMap["MANAGER"] },
    { username: "vy.staff", full_name: "Hoàng Thúy Vy", email: "vy.staff@fb.com", role_id: roleMap["STAFF"] },
    { username: "tuan.staff", full_name: "Đặng Anh Tuấn", email: "tuan.staff@fb.com", role_id: roleMap["STAFF"] },
    { username: "son.staff", full_name: "Vũ Hồng Sơn", email: "son.staff@fb.com", role_id: roleMap["STAFF"] },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: { role_id: u.role_id }, // Cập nhật role nếu user đã tồn tại
      create: {
        ...u,
        password_hash: "$2b$10$02j7B5YIoaPFDl7hfT8zpuFlcfsAZtTY466rNGVqyNug.ua8jInvW", 
        user_status: UserStatus.ACTIVE,
      },
    });
  }

  console.log("Seed Auth completed!");
}