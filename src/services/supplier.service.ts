import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import type {
  GetSuppliersQuery,
  CreateSupplierInput,
  UpdateSupplierInput,
} from "../schemas/supplier.schema";

/**
 * Lấy danh sách nhà cung cấp với phân trang, tìm kiếm
 */
export const getSuppliers = async (query: GetSuppliersQuery) => {
  const { page, limit, search, is_active } = query;
  const skip = (page - 1) * limit;

  // Xây dựng điều kiện where
  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { contact_person: { contains: search } },
    ];
  }

  if (is_active !== undefined) {
    where.is_active = is_active;
  }

  // Query song song: lấy data + đếm tổng
  const [suppliers, total] = await Promise.all([
    prisma.supplier.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        contact_person: true,
        phone: true,
        email: true,
        address: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        productSuppliers: {
          select: {
            supplier_sku: true,
            purchase_price: true,
            is_primary: true,
            product: {
              select: {
                id: true,
                code: true,
                name: true,
                product_type: true,
                product_status: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    prisma.supplier.count({ where }),
  ]);

  return {
    suppliers,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Lấy chi tiết nhà cung cấp theo ID
 */
export const getSupplierById = async (id: number) => {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    select: {
      id: true,
      code: true,
      name: true,
      contact_person: true,
      phone: true,
      email: true,
      address: true,
      is_active: true,
      created_at: true,
      updated_at: true,
      productSuppliers: {
        select: {
          supplier_sku: true,
          purchase_price: true,
          is_primary: true,
          product: {
            select: {
              id: true,
              code: true,
              name: true,
              description: true,
              product_type: true,
              product_status: true,
            },
          },
        },
      },
    },
  });

  if (!supplier) {
    throw new AppError("Không tìm thấy nhà cung cấp", 404);
  }

  return supplier;
};

/**
 * Tạo mới nhà cung cấp
 */
export const createSupplier = async (data: CreateSupplierInput) => {
  // Kiểm tra mã nhà cung cấp đã tồn tại
  const existingSupplier = await prisma.supplier.findUnique({
    where: { code: data.code },
  });
  if (existingSupplier) {
    throw new AppError("Mã nhà cung cấp đã tồn tại", 400);
  }

  const newSupplier = await prisma.supplier.create({
    data: {
      code: data.code,
      name: data.name,
      contact_person: data.contact_person ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      address: data.address ?? null,
      is_active: data.is_active ?? true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      contact_person: true,
      phone: true,
      email: true,
      address: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return newSupplier;
};

/**
 * Cập nhật nhà cung cấp
 */
export const updateSupplier = async (id: number, data: UpdateSupplierInput) => {
  // Kiểm tra nhà cung cấp tồn tại
  const existingSupplier = await prisma.supplier.findUnique({
    where: { id },
  });
  if (!existingSupplier) {
    throw new AppError("Không tìm thấy nhà cung cấp", 404);
  }

  // Kiểm tra mã trùng (nếu thay đổi)
  if (data.code && data.code !== existingSupplier.code) {
    const duplicateCode = await prisma.supplier.findUnique({
      where: { code: data.code },
    });
    if (duplicateCode) {
      throw new AppError("Mã nhà cung cấp đã tồn tại", 400);
    }
  }

  // Chuẩn bị dữ liệu cập nhật
  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.contact_person !== undefined)
    updateData.contact_person = data.contact_person;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.address !== undefined) updateData.address = data.address;
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updatedSupplier = await prisma.supplier.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      code: true,
      name: true,
      contact_person: true,
      phone: true,
      email: true,
      address: true,
      is_active: true,
      created_at: true,
      updated_at: true,
    },
  });

  return updatedSupplier;
};
