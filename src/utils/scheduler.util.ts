import * as cron from "node-cron";
import { ReportConfigService } from "../services/report-config.service";
import { ReportService } from "../services/report.service";
import { sendEmail } from "./email.util";

export const initScheduler = () => {
  console.log("Khởi tạo Scheduler gửi báo cáo định kỳ...");

  // Chạy mỗi phút để kiểm tra lịch biểu
  // Cách tiếp cận đơn giản: Lấy tất cả cấu hình đang active và lên lịch cho từng cấu hình
  // Để tránh tạo quá nhiều cron jobs, ta có thể khởi tạo các cron job dựa trên cấu hình trong database.
  
  // Tuy nhiên, nếu cấu hình thay đổi thì cần phải reload lại.
  // Ở đây ta dùng một giải pháp thực tế: mỗi cấu hình khi load lên sẽ được tạo một job.
  
  setupCronJobs();
};

let scheduledJobs: cron.ScheduledTask[] = [];

export const setupCronJobs = async () => {
  // Dọn dẹp các job cũ
  for (const job of scheduledJobs) {
    job.stop();
  }
  scheduledJobs = [];

  try {
    const configs = await ReportConfigService.getAllConfigs();
    
    for (const config of configs) {
      if (!config.is_active) continue;

      const job = cron.schedule(config.schedule_cron, async () => {
        console.log(`Bắt đầu chạy báo cáo: ${config.name}`);
        try {
          const reportData = await ReportService.getDashboardSummary({});
          
          const emailHtml = `
            <h2>Báo cáo tổng quan: ${config.name}</h2>
            <p><strong>Loại báo cáo:</strong> ${config.report_type}</p>
            <ul>
              <li>Tổng số phiếu nhập hoàn thành: ${reportData.total_stock_ins}</li>
              <li>Tổng số phiếu xuất hoàn thành: ${reportData.total_stock_outs}</li>
              <li>Sản phẩm sắp hết hạn (<30 ngày): ${reportData.expiring_lots}</li>
              <li>Phiếu kiểm kê có chênh lệch: ${reportData.discrepancies_found}</li>
            </ul>
            <p>Báo cáo tự động từ Hệ thống Quản lý Kho.</p>
          `;

          await sendEmail({
            to: config.recipient_emails,
            subject: `[Warehouse System] Báo cáo tự động - ${config.name}`,
            html: emailHtml,
          });

          console.log(`Gửi báo cáo ${config.name} thành công.`);
        } catch (error) {
          console.error(`Lỗi khi chạy báo cáo ${config.name}:`, error);
        }
      });

      scheduledJobs.push(job);
    }
    console.log(`Đã thiết lập ${scheduledJobs.length} lịch biểu báo cáo.`);
  } catch (error) {
    console.error("Lỗi khi thiết lập lịch biểu:", error);
  }
};
