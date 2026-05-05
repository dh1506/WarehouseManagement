import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";

export class ReportService {
  /**
   * Báo cáo nhập hàng theo thời gian
   */
  static async getStockInReport(filters: any) {
    const { start_date, end_date, warehouse_location_id, product_id, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: "COMPLETED",
    };

    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }
    if (warehouse_location_id) where.warehouse_location_id = warehouse_location_id;
    if (product_id) {
      where.details = {
        some: {
          product_id,
        },
      };
    }

    const data = await prisma.stockIn.findMany({
      where,
      include: {
        location: {
          include: { warehouse: true },
        },
        supplier: true,
        details: {
          include: { product: true },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

    const total = await prisma.stockIn.count({ where });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Báo cáo xuất hàng theo thời gian
   */
  static async getStockOutReport(filters: any) {
    const { start_date, end_date, warehouse_location_id, product_id, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: "COMPLETED",
    };

    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }
    if (warehouse_location_id) where.warehouse_location_id = warehouse_location_id;
    if (product_id) {
      where.details = {
        some: {
          product_id,
        },
      };
    }

    const data = await prisma.stockOut.findMany({
      where,
      include: {
        location: {
          include: { warehouse: true },
        },
        details: {
          include: { product: true },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

    const total = await prisma.stockOut.count({ where });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Báo cáo kiểm kê
   */
  static async getStockCountReport(filters: any) {
    const { start_date, end_date, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: "APPROVED",
    };

    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }

    const data = await prisma.stockCount.findMany({
      where,
      include: {
        details: {
          include: {
            product: true,
            location: { include: { warehouse: true } },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

    const total = await prisma.stockCount.count({ where });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Báo cáo hủy hàng
   */
  static async getStockDisposalReport(filters: any) {
    const { start_date, end_date, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {
      status: "COMPLETED",
    };

    if (start_date && end_date) {
      where.created_at = {
        gte: new Date(start_date),
        lte: new Date(end_date),
      };
    }

    const data = await prisma.stockDisposal.findMany({
      where,
      include: {
        details: {
          include: {
            product: true,
            location: { include: { warehouse: true } },
            reason: true,
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });

    const total = await prisma.stockDisposal.count({ where });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Báo cáo tồn kho hiện tại
   */
  static async getInventoryReport(filters: any) {
    const { warehouse_location_id, product_id, page = 1, limit = 10 } = filters;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (warehouse_location_id) where.warehouse_location_id = warehouse_location_id;
    if (product_id) where.product_id = product_id;

    const data = await prisma.inventory.findMany({
      where,
      include: {
        product: true,
        location: { include: { warehouse: true } },
      },
      skip,
      take: limit,
      orderBy: { updated_at: "desc" },
    });

    const total = await prisma.inventory.count({ where });

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Dashboard Tổng hợp
   */
  static async getDashboardSummary(filters: any) {
    const start_date = filters.start_date ? new Date(filters.start_date) : new Date(new Date().setHours(0, 0, 0, 0));
    const end_date = filters.end_date ? new Date(filters.end_date) : new Date();

    const dateFilter = {
      gte: start_date,
      lte: end_date,
    };

    // 1. Tổng số phiếu nhập đã hoàn thành
    const totalStockIns = await prisma.stockIn.count({
      where: { status: "COMPLETED", created_at: dateFilter },
    });

    // 2. Tổng số phiếu xuất đã hoàn thành
    const totalStockOuts = await prisma.stockOut.count({
      where: { status: "COMPLETED", created_at: dateFilter },
    });

    // 3. Sản phẩm sắp hết hạn (dưới 30 ngày)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    const expiringLots = await prisma.productLot.count({
      where: {
        status: "ACTIVE",
        expired_date: {
          lte: thirtyDaysFromNow,
          gte: new Date(),
        },
      },
    });

    // 4. Các phiếu kiểm kê phát hiện chênh lệch (variance_quantity != 0)
    const discrepanciesFound = await prisma.stockCountDetail.count({
      where: {
        variance_quantity: {
          not: 0,
        },
        stock_count: {
          created_at: dateFilter,
        },
      },
    });

    return {
      total_stock_ins: totalStockIns,
      total_stock_outs: totalStockOuts,
      expiring_lots: expiringLots,
      discrepancies_found: discrepanciesFound,
      period: {
        start: start_date,
        end: end_date,
      },
    };
  }
}
