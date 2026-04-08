import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import dotenv from 'dotenv';
import { PrismaClient, Prisma } from '../generated';
import { getCurrentUserId } from '../utils/als.util';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined in .env file");
}

const adapter = new PrismaMariaDb(connectionString);

// Client gốc - dùng nội bộ để ghi audit log (tránh đệ quy vô hạn)
const basePrisma = new PrismaClient({ adapter });

// ==================== AUDIT LOG EXTENSION ====================

/** Danh sách model KHÔNG ghi audit log (tránh đệ quy hoặc log thừa) */
const SKIP_AUDIT_MODELS = ['AuditLog', 'InventoryTransaction'];

/** Ánh xạ Prisma Model Name -> Module nghiệp vụ */
const MODEL_TO_MODULE: Record<string, string> = {
  User: 'USER_MANAGEMENT',
  Role: 'ROLE_MANAGEMENT',
  Permission: 'PERMISSION_MANAGEMENT',
  RolePermission: 'ROLE_MANAGEMENT',
  Product: 'PRODUCT_MANAGEMENT',
  ProductCategory: 'PRODUCT_CATEGORY_MANAGEMENT',
  ProductCategoryMap: 'PRODUCT_MANAGEMENT',
  ProductUom: 'PRODUCT_MANAGEMENT',
  Brand: 'BRAND_MANAGEMENT',
  BrandProduct: 'BRAND_MANAGEMENT',
  UnitOfMeasure: 'UNIT_OF_MEASURE_MANAGEMENT',
  Supplier: 'SUPPLIER_MANAGEMENT',
  ProductSupplier: 'SUPPLIER_MANAGEMENT',
  Warehouse: 'WAREHOUSE_MANAGEMENT',
  WarehouseLocation: 'WAREHOUSE_LOCATION_MANAGEMENT',
  LocationAllowedCategory: 'WAREHOUSE_LOCATION_MANAGEMENT',
  Inventory: 'INVENTORY_MANAGEMENT',
  ProductLot: 'PRODUCT_LOT_MANAGEMENT',
  ProductWarehouse: 'WAREHOUSE_MANAGEMENT',
  StockIn: 'STOCK_IN',
  StockInDetail: 'STOCK_IN',
  StockInDetailLot: 'STOCK_IN',
  StockInDiscrepancy: 'STOCK_IN',
  StockOut: 'STOCK_OUT',
  StockOutDetail: 'STOCK_OUT',
  StockOutDetailLot: 'STOCK_OUT',
};

/** Chuyển PascalCase sang camelCase để truy cập dynamic model trên Prisma */
const toCamelCase = (str: string): string =>
  str.charAt(0).toLowerCase() + str.slice(1);

/** Trích xuất mã tham chiếu (reference_code) từ dữ liệu entity */
const extractReferenceCode = (data: Record<string, unknown>): string | null => {
  const codeFields = ['code', 'location_code', 'lot_no', 'username'];
  for (const field of codeFields) {
    if (field in data && typeof data[field] === 'string') {
      return data[field] as string;
    }
  }
  return null;
};

/**
 * Interface cho delegate model của Prisma (dùng dynamic access)
 */
interface PrismaDelegate {
  findFirst: (args: { where: Record<string, unknown> }) => Promise<unknown>;
}

/**
 * Ghi một bản ghi audit log xuống DB thông qua basePrisma (không trigger extension)
 */
const writeAuditLog = async (
  model: string,
  action: 'CREATE' | 'UPDATE' | 'DELETE',
  entityId: number,
  oldData: unknown,
  newData: unknown,
  referenceCode: string | null
): Promise<void> => {
  const userId = getCurrentUserId();
  if (!userId) return; // Không ghi log nếu không xác định được user (VD: seeding)

  try {
    await basePrisma.auditLog.create({
      data: {
        module: MODEL_TO_MODULE[model] ?? model,
        entity_type: model,
        entity_id: entityId,
        action,
        old_data: oldData !== null && oldData !== undefined
          ? (JSON.parse(JSON.stringify(oldData)) as Prisma.InputJsonValue)
          : Prisma.DbNull,
        new_data: newData !== null && newData !== undefined
          ? (JSON.parse(JSON.stringify(newData)) as Prisma.InputJsonValue)
          : Prisma.DbNull,
        reference_code: referenceCode,
        created_by: userId,
      },
    });
  } catch (error) {
    // Ghi log lỗi nhưng KHÔNG block operation chính
    console.error(`[AuditLog] Lỗi ghi audit log cho ${model}:`, error);
  }
};

/**
 * Lấy dữ liệu cũ (old data) trước khi update/delete
 */
const getOldData = async (
  model: string,
  where: Record<string, unknown>
): Promise<unknown> => {
  try {
    const accessor = toCamelCase(model);
    const delegate = (basePrisma as unknown as Record<string, unknown>)[accessor] as
      | PrismaDelegate
      | undefined;
    if (delegate?.findFirst) {
      return await delegate.findFirst({ where });
    }
  } catch {
    // Bỏ qua nếu không lấy được old data
  }
  return null;
};

// ==================== EXPORT EXTENDED PRISMA CLIENT ====================

/** Prisma Client mở rộng với tự động ghi Audit Log cho mọi thao tác CUD */
export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async create({ model, args, query }) {
        const result = await query(args);

        if (!SKIP_AUDIT_MODELS.includes(model)) {
          const data = result as Record<string, unknown>;
          const entityId = (data['id'] as number) ?? 0;
          const refCode = extractReferenceCode(data);
          void writeAuditLog(model, 'CREATE', entityId, null, data, refCode);
        }

        return result;
      },

      async update({ model, args, query }) {
        if (SKIP_AUDIT_MODELS.includes(model)) {
          return query(args);
        }

        const oldData = await getOldData(model, args.where as Record<string, unknown>);
        const result = await query(args);
        const data = result as Record<string, unknown>;
        const entityId = (data['id'] as number) ?? 0;
        const refCode = extractReferenceCode(data);
        void writeAuditLog(model, 'UPDATE', entityId, oldData, data, refCode);

        return result;
      },

      async delete({ model, args, query }) {
        if (SKIP_AUDIT_MODELS.includes(model)) {
          return query(args);
        }

        const oldData = await getOldData(model, args.where as Record<string, unknown>);
        const result = await query(args);
        const data = (oldData ?? result) as Record<string, unknown>;
        const entityId = (data['id'] as number) ?? 0;
        const refCode = extractReferenceCode(data);
        void writeAuditLog(model, 'DELETE', entityId, oldData, null, refCode);

        return result;
      },
    },
  },
});
