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
  // Clear existing data
  await prisma.rolePermission.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();
  await prisma.permission.deleteMany();

  // Tạo permissions
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
      description: "Chief Executive Officer with full access",
    },
  });

  const managerRole = await prisma.role.upsert({
    where: { name: "MANAGER" },
    update: {},
    create: {
      name: "MANAGER",
      description: "Manager role with elevated permissions",
    },
  });

  const staffRole = await prisma.role.upsert({
    where: { name: "STAFF" },
    update: {},
    create: {
      name: "STAFF",
      description: "Staff role with basic permissions",
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

  // MANAGER: permissions:read, users:read/create/update, roles:read/create/update
  const managerPermissions = allPermissions.filter(
    (p) =>
      p.name === "permissions:read" ||
      p.name.startsWith("users:") && !p.name.includes("delete") ||
      p.name.startsWith("roles:") && !p.name.includes("delete")
  );
  await prisma.rolePermission.createMany({
    data: managerPermissions.map((p) => ({
      role_id: managerRole.id,
      permission_id: p.id,
    })),
    skipDuplicates: true,
  });

  // STAFF: permissions:read, users:read, roles:read
  const staffPermissions = allPermissions.filter(
    (p) => p.name === "permissions:read" || p.name === "users:read" || p.name === "roles:read"
  );
  await prisma.rolePermission.createMany({
    data: staffPermissions.map((p) => ({
      role_id: staffRole.id,
      permission_id: p.id,
    })),
    skipDuplicates: true,
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
