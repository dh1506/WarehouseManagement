import { PrismaClient, StockDisposalStatus, Prisma } from "../../src/generated";
import { generateStockDisposalCode } from "../../src/utils/generate-code.util";

export async function seedStockDisposal(prisma: PrismaClient) {
  console.log("🔍 Seeding Stock Disposal...");

  const users = await prisma.user.findMany();
  const admin = users.find((u) => u.username === "admin") || users[0];
  const manager = users.find((u) => u.username === "hung.manager") || users[1];
  const staff = users.find((u) => u.username === "vy.staff") || users[3];

  const locations = await prisma.warehouseLocation.findMany();
  const products = await prisma.product.findMany();
  const lots = await prisma.productLot.findMany();

  // 1. Seed Disposal Reasons
  const reasonsData = [
    { name: "EXPIRED", description: "Hàng hết hạn sử dụng" },
    { name: "DAMAGED", description: "Hàng hư hỏng, đổ vỡ" },
    { name: "LOST", description: "Hàng thất thoát không rõ lý do" },
    { name: "QUALITY_ISSUE", description: "Hàng lỗi chất lượng từ nhà sản xuất" },
    { name: "RETURN_TO_SUPPLIER_FAIL", description: "Hàng trả lại NCC nhưng bị từ chối" },
    { name: "OTHER", description: "Nguyên nhân khác" },
  ];

  for (const reason of reasonsData) {
    await prisma.disposalReason.upsert({
      where: { name: reason.name },
      update: { description: reason.description },
      create: reason,
    });
  }

  const reasons = await prisma.disposalReason.findMany();

  // 2. Seed Stock Disposals (10+ records)
  
  // Mixed statuses: DRAFT, PENDING, APPROVED, COMPLETED, CANCELLED
  const statuses: StockDisposalStatus[] = [
    "COMPLETED", "COMPLETED", "COMPLETED", 
    "APPROVED", "PENDING", "PENDING", 
    "DRAFT", "DRAFT", "CANCELLED", "COMPLETED"
  ];

  for (let i = 0; i < 10; i++) {
    const status = statuses[i] || "DRAFT";
    const code = generateStockDisposalCode(i + 1);
    
    const disposal = await prisma.stockDisposal.create({
      data: {
        code,
        description: `Phiếu hủy hàng mẫu số ${i + 1} - Trạng thái ${status}`,
        status,
        created_by: staff?.id || 1,
        approved_by: status === "APPROVED" || status === "COMPLETED" ? (manager?.id || 1) : null,
        details: {
          create: products.slice(i, i + 2).map((p, idx) => ({
            warehouse_location_id: locations[(i + idx) % locations.length].id,
            product_id: p.id,
            lot_id: lots[(i + idx) % lots.length]?.id || null,
            reason_id: reasons[i % reasons.length].id,
            quantity: new Prisma.Decimal(5 + idx * 2),
            unit_price: new Prisma.Decimal(10000 + idx * 5000),
            reason_note: `Ghi chú chi tiết cho dòng ${idx + 1}`,
          })),
        },
        history: {
          create: [
            {
              status: "DRAFT",
              note: "Tạo phiếu nháp",
              created_by: staff?.id || 1,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7), // 7 days ago
            },
            ...(status !== "DRAFT" ? [{
              status: "PENDING",
              note: "Gửi yêu cầu phê duyệt",
              created_by: staff?.id || 1,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 6),
            }] : []),
            ...(status === "APPROVED" || status === "COMPLETED" ? [{
              status: "APPROVED",
              note: "Đã phê duyệt phiếu",
              created_by: manager?.id || 1,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
            }] : []),
            ...(status === "COMPLETED" ? [{
              status: "COMPLETED",
              note: "Đã thực hiện xong việc hủy hàng và trừ tồn kho",
              created_by: manager?.id || 1,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4),
            }] : []),
            ...(status === "CANCELLED" ? [{
              status: "CANCELLED",
              note: "Hủy bỏ phiếu theo yêu cầu",
              created_by: staff?.id || 1,
              created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5),
            }] : []),
          ],
        },
      },
    });
  }

  console.log("✅ Seed Stock Disposal completed!");
}
