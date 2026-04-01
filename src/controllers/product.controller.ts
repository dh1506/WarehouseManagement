import type { Request, Response } from "express";
import * as productService from "../services/product.service";
import { catchAsync } from "../utils/catch-async";

/**
 * Lấy danh sách sản phẩm
 * GET /api/products
 */
export const getProducts = catchAsync(async (req: Request, res: Response) => {
  const query = {
    page: Number(req.query.page) || 1,
    limit: Number(req.query.limit) || 10,
    search: req.query.search as string | undefined,
    category_id: req.query.category_id
      ? Number(req.query.category_id)
      : undefined,
    product_type: req.query.product_type as any,
    product_status: req.query.product_status as any,
    brand_id: req.query.brand_id ? Number(req.query.brand_id) : undefined,
    warehouse_id: req.query.warehouse_id
      ? Number(req.query.warehouse_id)
      : undefined,
    production_date_from: req.query.production_date_from
      ? new Date(String(req.query.production_date_from))
      : undefined,
    production_date_to: req.query.production_date_to
      ? new Date(String(req.query.production_date_to))
      : undefined,
    expiry_date_from: req.query.expiry_date_from
      ? new Date(String(req.query.expiry_date_from))
      : undefined,
    expiry_date_to: req.query.expiry_date_to
      ? new Date(String(req.query.expiry_date_to))
      : undefined,
  };

  const result = await productService.getProducts(query);

  res.status(200).json({
    success: true,
    data: result,
    message: "Lấy danh sách sản phẩm thành công",
  });
});

/**
 * Lấy chi tiết sản phẩm theo ID
 * GET /api/products/:id
 */
export const getProductById = catchAsync(
  async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const product = await productService.getProductById(id);

    res.status(200).json({
      success: true,
      data: product,
      message: "Lấy thông tin sản phẩm thành công",
    });
  },
);

/**
 * Tạo mới sản phẩm
 * POST /api/products
 */
export const createProduct = catchAsync(async (req: Request, res: Response) => {
  const product = await productService.createProduct(req.body);

  res.status(201).json({
    success: true,
    data: product,
    message: "Tạo sản phẩm thành công",
  });
});

/**
 * Cập nhật sản phẩm
 * PATCH /api/products/:id
 */
export const updateProduct = catchAsync(async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  const product = await productService.updateProduct(id, req.body);

  res.status(200).json({
    success: true,
    data: product,
    message: "Cập nhật sản phẩm thành công",
  });
});
