import ExcelJS from 'exceljs';
import { prisma } from '../config/db.config';
import { AppError } from '../utils/app-error';
import { importSalesRowSchema } from '../schemas/sales.schema';
import { Prisma } from '../generated';

export class SalesService {
  /**
   * Import data from an Excel file buffer.
   */
  static async importSalesBatch(fileBuffer: Buffer, userId: number, originalFilename: string) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(fileBuffer as any);
    
    // We expect the first worksheet to contain the data
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new AppError('File Excel không có dữ liệu', 400);
    }

    // Determine the header row by scanning first 5 rows
    let headerRowIdx = -1;
    let headers: string[] = [];
    
    for (let i = 1; i <= Math.min(5, worksheet.rowCount); i++) {
      const row = worksheet.getRow(i);
      const rowValues = row.values as any[];
      if (rowValues && rowValues.length > 0) {
        const potentialHeaders = rowValues.map(v => v ? v.toString().trim() : '').filter(v => v);
        // Look for typical headers, e.g., 'transaction_code', 'product_id', etc.
        // We will just assume row 1 is the header for simplicity if not found.
        if (potentialHeaders.some(h => ['transaction_code', 'Mã hóa đơn', 'Mã giao dịch'].includes(h))) {
          headerRowIdx = i;
          headers = rowValues.map(v => v ? v.toString().trim() : '');
          break;
        }
      }
    }

    if (headerRowIdx === -1) {
      headerRowIdx = 1;
      headers = (worksheet.getRow(1).values as any[]).map(v => v ? v.toString().trim() : '');
    }

    const records: any[] = [];
    const errorLog: string[] = [];
    
    // Map expected columns
    const colMap: Record<string, number> = {};
    headers.forEach((h, idx) => {
      if (!h) return;
      const lower = h.toLowerCase();
      if (lower.includes('transaction_code') || lower.includes('hóa đơn') || lower.includes('mã giao dịch')) colMap['transaction_code'] = idx;
      else if (lower.includes('transaction_type') || lower.includes('loại')) colMap['transaction_type'] = idx;
      else if (lower.includes('date') || lower.includes('ngày')) colMap['transaction_date'] = idx;
      else if (lower.includes('product_id') || lower.includes('mã sản phẩm')) colMap['product_id'] = idx;
      else if (lower.includes('location_id') || lower.includes('điểm bán') || lower.includes('kho')) colMap['warehouse_location_id'] = idx;
      else if (lower.includes('quantity') || lower.includes('số lượng')) colMap['quantity'] = idx;
      else if (lower.includes('price') || lower.includes('đơn giá')) colMap['unit_price'] = idx;
      else if (lower.includes('promo') || lower.includes('khuyến mãi')) colMap['promo_discount_amount'] = idx;
    });

    // Check if required columns exist
    const requiredCols = ['transaction_code', 'transaction_type', 'transaction_date', 'product_id', 'warehouse_location_id', 'quantity', 'unit_price'];
    const missingCols = requiredCols.filter(c => !colMap[c]);
    if (missingCols.length > 0) {
      throw new AppError(`File Excel thiếu các cột bắt buộc: ${missingCols.join(', ')}`, 400);
    }

    // Process rows
    for (let i = headerRowIdx + 1; i <= worksheet.rowCount; i++) {
      const row = worksheet.getRow(i);
      const rowValues = row.values as any[];
      if (!rowValues || rowValues.length === 0 || rowValues.every(v => v === null || v === undefined || v === '')) {
        continue; // Skip empty rows
      }

      const getVal = (key: string) => colMap[key] !== undefined ? rowValues[colMap[key] as number] : undefined;

      const rawData = {
        transaction_code: getVal('transaction_code')?.toString() || '',
        transaction_type: getVal('transaction_type')?.toString().toUpperCase() || '',
        transaction_date: getVal('transaction_date'),
        product_id: getVal('product_id'),
        warehouse_location_id: getVal('warehouse_location_id'),
        quantity: getVal('quantity'),
        unit_price: getVal('unit_price'),
        promo_discount_amount: getVal('promo_discount_amount') || 0,
      };

      // Zod Validation
      const parsed = importSalesRowSchema.safeParse(rawData);
      if (!parsed.success) {
        errorLog.push(`Dòng ${i}: ${parsed.error.issues.map((e: any) => e.message).join(', ')}`);
        continue;
      }

      records.push({ rowNumber: i, data: parsed.data });
    }

    if (records.length === 0) {
      throw new AppError('Không có dữ liệu hợp lệ để import', 400);
    }

    // Create a batch record
    const batchCode = `POS_SYNC_${Date.now()}`;
    const batch = await prisma.salesImportBatch.create({
      data: {
        batch_code: batchCode,
        source: 'MANUAL_EXCEL',
        status: 'PROCESSING',
        total_records: records.length,
        created_by: userId,
      }
    });

    let successCount = 0;
    let errorCount = 0;

    // Process records in a massive transaction to ensure data integrity
    try {
      await prisma.$transaction(async (tx) => {
        for (const record of records) {
          const { rowNumber, data } = record;
          
          try {
            // Calculate net amount
            const netAmount = new Prisma.Decimal(data.quantity).mul(new Prisma.Decimal(data.unit_price)).sub(new Prisma.Decimal(data.promo_discount_amount));
            
            // Check if Product and Location exist
            const product = await tx.product.findUnique({ where: { id: data.product_id }, include: { base_uom: true } });
            if (!product) throw new Error(`Sản phẩm (ID: ${data.product_id}) không tồn tại`);
            
            const location = await tx.warehouseLocation.findUnique({ where: { id: data.warehouse_location_id } });
            if (!location) throw new Error(`Điểm bán (ID: ${data.warehouse_location_id}) không tồn tại`);

            // Check if duplicate transaction
            const existing = await tx.salesTransaction.findUnique({
              where: {
                unq_pos_transaction: {
                  transaction_code: data.transaction_code,
                  transaction_type: data.transaction_type,
                  product_id: data.product_id
                }
              }
            });
            
            if (existing) throw new Error(`Giao dịch này đã tồn tại (Mã: ${data.transaction_code}, Loại: ${data.transaction_type}, SP: ${data.product_id})`);

            // Find Inventory record
            let inventory = await tx.inventory.findUnique({
              where: {
                product_id_warehouse_location_id: {
                  product_id: data.product_id,
                  warehouse_location_id: data.warehouse_location_id
                }
              }
            });

            if (!inventory) {
              if (data.transaction_type === 'SALE') {
                 // In some logic, if selling from a place with no inventory record, we might fail or auto-create with negative balance.
                 // We will create it with 0 to deduct from.
                 inventory = await tx.inventory.create({
                   data: {
                     product_id: data.product_id,
                     warehouse_location_id: data.warehouse_location_id,
                     quantity: new Prisma.Decimal(0),
                     available_quantity: new Prisma.Decimal(0),
                     reserved_quantity: new Prisma.Decimal(0),
                   }
                 });
              } else {
                 // For returns
                 inventory = await tx.inventory.create({
                  data: {
                    product_id: data.product_id,
                    warehouse_location_id: data.warehouse_location_id,
                    quantity: new Prisma.Decimal(0),
                    available_quantity: new Prisma.Decimal(0),
                    reserved_quantity: new Prisma.Decimal(0),
                  }
                });
              }
            }

            // Write SalesTransaction
            const salesTx = await tx.salesTransaction.create({
              data: {
                batch_id: batch.id,
                warehouse_location_id: data.warehouse_location_id,
                transaction_code: data.transaction_code,
                transaction_type: data.transaction_type,
                transaction_date: data.transaction_date,
                product_id: data.product_id,
                quantity: data.quantity,
                unit_price: data.unit_price,
                promo_discount_amount: data.promo_discount_amount,
                net_amount: netAmount,
                is_valid: true,
                is_inventory_updated: true,
              }
            });

            const qtyDecimal = new Prisma.Decimal(data.quantity);
            const balanceBefore = inventory.quantity;
            let balanceAfter = balanceBefore;
            let invTxType: any = null;

            if (data.transaction_type === 'SALE') {
              balanceAfter = balanceBefore.sub(qtyDecimal);
              invTxType = 'POS_SALE';
              
              // Cập nhật Inventory (Trừ kho)
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: balanceAfter,
                  available_quantity: { decrement: qtyDecimal }
                }
              });
            } else if (data.transaction_type === 'RETURN') {
              balanceAfter = balanceBefore.add(qtyDecimal);
              invTxType = 'POS_RETURN';
              
              // Cập nhật Inventory (Cộng kho)
              await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                  quantity: balanceAfter,
                  available_quantity: { increment: qtyDecimal }
                }
              });
            }

            // Ghi log InventoryTransaction
            await tx.inventoryTransaction.create({
              data: {
                warehouse_location_id: data.warehouse_location_id,
                product_id: data.product_id,
                product_uom_id: product.base_uom_id, 
                transaction_type: invTxType,
                quantity: qtyDecimal,
                base_quantity: qtyDecimal, // Assuming no unit conversion in POS for simplicity
                balance_after: balanceAfter,
                reference_type: 'SALES_TRANSACTION',
                reference_id: salesTx.id.toString(),
                transaction_date: data.transaction_date,
                created_by: userId,
                note: `Đồng bộ từ hóa đơn POS ${data.transaction_code}`
              }
            });

            // Upsert SalesDailySummary
            // summary_date in DB is Date. We should strip time to 00:00:00 UTC for grouping.
            const dateObj = new Date(data.transaction_date);
            const summaryDate = new Date(Date.UTC(dateObj.getUTCFullYear(), dateObj.getUTCMonth(), dateObj.getUTCDate()));

            const summaryWhere = {
              unq_daily_location_product: {
                summary_date: summaryDate,
                warehouse_location_id: data.warehouse_location_id,
                product_id: data.product_id
              }
            };

            const existingSummary = await tx.salesDailySummary.findUnique({ where: summaryWhere });

            if (existingSummary) {
               const updateData: any = {
                 total_promo_amount: { increment: new Prisma.Decimal(data.promo_discount_amount) },
               };
               
               if (data.transaction_type === 'SALE') {
                  updateData.total_sales_qty = { increment: qtyDecimal };
                  updateData.net_sales_qty = { increment: qtyDecimal };
                  updateData.total_revenue = { increment: netAmount };
               } else if (data.transaction_type === 'RETURN') {
                  updateData.total_returned_qty = { increment: qtyDecimal };
                  updateData.net_sales_qty = { decrement: qtyDecimal };
                  updateData.total_revenue = { decrement: netAmount };
               }

               await tx.salesDailySummary.update({
                 where: summaryWhere,
                 data: updateData
               });
            } else {
               await tx.salesDailySummary.create({
                 data: {
                   summary_date: summaryDate,
                   warehouse_location_id: data.warehouse_location_id,
                   product_id: data.product_id,
                   total_sales_qty: data.transaction_type === 'SALE' ? qtyDecimal : new Prisma.Decimal(0),
                   total_returned_qty: data.transaction_type === 'RETURN' ? qtyDecimal : new Prisma.Decimal(0),
                   net_sales_qty: data.transaction_type === 'SALE' ? qtyDecimal : new Prisma.Decimal(0).sub(qtyDecimal),
                   total_promo_amount: new Prisma.Decimal(data.promo_discount_amount),
                   total_revenue: data.transaction_type === 'SALE' ? netAmount : new Prisma.Decimal(0).sub(netAmount),
                 }
               });
            }

            successCount++;

          } catch (error: any) {
             errorLog.push(`Dòng ${rowNumber}: ${error.message}`);
             errorCount++;
          }
        }

        // If you want atomic transaction: if there's any error, throw to rollback EVERYTHING.
        // The prompt says "Hệ thống không cho phép lưu dữ liệu nếu phát hiện lỗi hoặc trùng lặp" -> We must rollback!
        if (errorCount > 0) {
           throw new Error('ROLLBACK');
        }
      });
      
      // Update batch to COMPLETED
      await prisma.salesImportBatch.update({
        where: { id: batch.id },
        data: {
          status: 'COMPLETED',
          success_records: successCount,
          error_records: 0,
        }
      });

      return {
        batchId: batch.id,
        successCount,
        errorCount: 0,
        errors: []
      };

    } catch (e: any) {
      // It rolled back! Update batch to FAILED
      await prisma.salesImportBatch.update({
        where: { id: batch.id },
        data: {
          status: 'FAILED',
          success_records: 0,
          error_records: records.length,
          error_log: errorLog,
        }
      });

      throw new AppError(`Import thất bại. Vui lòng kiểm tra lỗi chi tiết: ${errorLog[0]} ${errorLog.length > 1 ? `(và ${errorLog.length - 1} lỗi khác)` : ''}`, 400);
    }
  }

  /**
   * Lấy danh sách giao dịch bán hàng (Pagination + Filters)
   */
  static async queryTransactions(filters: any) {
    const { page, limit, startDate, endDate, warehouse_location_id, product_id } = filters;
    
    const skip = (page - 1) * limit;
    const where: Prisma.SalesTransactionWhereInput = {};

    if (startDate || endDate) {
      where.transaction_date = {};
      if (startDate) where.transaction_date.gte = new Date(startDate);
      if (endDate) where.transaction_date.lte = new Date(endDate);
    }

    if (warehouse_location_id) where.warehouse_location_id = warehouse_location_id;
    if (product_id) where.product_id = product_id;

    const [transactions, total] = await Promise.all([
      prisma.salesTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { transaction_date: 'desc' },
        include: {
          product: { select: { code: true, name: true } },
          location: { select: { location_code: true } },
        }
      }),
      prisma.salesTransaction.count({ where })
    ]);

    // Format BigInt to string before returning
    const formatted = transactions.map(t => ({
      ...t,
      id: t.id.toString(),
    }));

    return {
      data: formatted,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Lấy dữ liệu tổng hợp hàng ngày
   */
  static async queryDailySummaries(filters: any) {
    const { page, limit, startDate, endDate, warehouse_location_id, product_id } = filters;
    
    const skip = (page - 1) * limit;
    const where: Prisma.SalesDailySummaryWhereInput = {};

    if (startDate || endDate) {
      where.summary_date = {};
      if (startDate) where.summary_date.gte = new Date(startDate);
      if (endDate) where.summary_date.lte = new Date(endDate);
    }

    if (warehouse_location_id) where.warehouse_location_id = warehouse_location_id;
    if (product_id) where.product_id = product_id;

    const [summaries, total] = await Promise.all([
      prisma.salesDailySummary.findMany({
        where,
        skip,
        take: limit,
        orderBy: { summary_date: 'desc' },
        include: {
          product: { select: { code: true, name: true } },
          location: { select: { location_code: true } },
        }
      }),
      prisma.salesDailySummary.count({ where })
    ]);

    return {
      data: summaries,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
