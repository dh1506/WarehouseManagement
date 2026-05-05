import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// =============================================
// Cấu hình Nodemailer với Gmail SMTP
// =============================================

let transporter: Transporter | null = null;

/**
 * Khởi tạo và cache Nodemailer transporter (Singleton pattern)
 * Sử dụng Gmail với App Password (2FA enabled)
 */
const getTransporter = (): Transporter => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD, // App Password từ Google Account
    },
  });

  return transporter;
};

// =============================================
// Interfaces
// =============================================

export interface MapeAlertItem {
  productId: number;
  productCode: string;
  productName: string;
  forecastQty: number;
  actualQty: number;
  mapeScore: number;
  alertLevel: 'WARNING' | 'CRITICAL';
}

export interface MapeAlertEmailPayload {
  forecastMonth: string; // VD: "Tháng 05/2026"
  forecastId: number;
  warningItems: MapeAlertItem[];
  criticalItems: MapeAlertItem[];
  dashboardUrl: string;
}

// =============================================
// Hàm gửi email cảnh báo MAPE
// =============================================

/**
 * Gửi email tổng hợp cảnh báo sai lệch MAPE cho quản lý
 * @param payload Dữ liệu cảnh báo
 */
export const sendMapeAlertEmail = async (payload: MapeAlertEmailPayload): Promise<void> => {
  const { forecastMonth, forecastId, warningItems, criticalItems, dashboardUrl } = payload;

  const recipientEmail = process.env.EMAIL_ALERT_RECIPIENT;
  if (!recipientEmail) {
    console.warn('[Email] EMAIL_ALERT_RECIPIENT chưa được cấu hình, bỏ qua gửi email.');
    return;
  }

  const totalAlertsCount = warningItems.length + criticalItems.length;
  if (totalAlertsCount === 0) return;

  // Render bảng HTML cho từng nhóm cảnh báo
  const renderTable = (items: MapeAlertItem[], level: 'WARNING' | 'CRITICAL'): string => {
    if (items.length === 0) return '<p>Không có cảnh báo.</p>';
    const color = level === 'CRITICAL' ? '#DC2626' : '#D97706';
    const rows = items
      .map(
        (item) => `
        <tr>
          <td style="padding:8px;border:1px solid #e5e7eb;">${item.productCode}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;">${item.productName}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${item.forecastQty.toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;">${item.actualQty.toFixed(2)}</td>
          <td style="padding:8px;border:1px solid #e5e7eb;text-align:right;font-weight:bold;color:${color};">${item.mapeScore.toFixed(2)}%</td>
        </tr>
      `
      )
      .join('');

    return `
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <thead>
          <tr style="background-color:#f3f4f6;">
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Mã SP</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:left;">Tên sản phẩm</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Dự báo</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">Thực tế</th>
            <th style="padding:8px;border:1px solid #e5e7eb;text-align:right;">MAPE (%)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  };

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head><meta charset="UTF-8"></head>
    <body style="font-family:Arial,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#1f2937;">
      <div style="background:#1e3a5f;padding:20px;border-radius:8px 8px 0 0;">
        <h1 style="color:white;margin:0;font-size:20px;">
          ⚠️ Cảnh Báo Sai Lệch Dự Báo AI
        </h1>
        <p style="color:#93c5fd;margin:4px 0 0;">Báo cáo tổng hợp hàng ngày</p>
      </div>
      
      <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
        <p>Xin chào,</p>
        <p>Hệ thống phát hiện <strong>${totalAlertsCount} sản phẩm</strong> có sai lệch dự báo vượt mức cho phép trong kỳ <strong>${forecastMonth}</strong> (ID: #${forecastId}).</p>

        ${
          criticalItems.length > 0
            ? `
          <div style="background:#fef2f2;border-left:4px solid #DC2626;padding:16px;margin:16px 0;border-radius:4px;">
            <h3 style="color:#DC2626;margin:0 0 12px;">🚨 CRITICAL - MAPE &gt; 20% (${criticalItems.length} sản phẩm)</h3>
            ${renderTable(criticalItems, 'CRITICAL')}
          </div>
        `
            : ''
        }

        ${
          warningItems.length > 0
            ? `
          <div style="background:#fffbeb;border-left:4px solid #D97706;padding:16px;margin:16px 0;border-radius:4px;">
            <h3 style="color:#D97706;margin:0 0 12px;">⚠️ WARNING - MAPE &gt; 10% (${warningItems.length} sản phẩm)</h3>
            ${renderTable(warningItems, 'WARNING')}
          </div>
        `
            : ''
        }

        <div style="margin-top:24px;text-align:center;">
          <a href="${dashboardUrl}" 
             style="background:#1e3a5f;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-size:15px;">
            📊 Xem Dashboard Dự Báo
          </a>
        </div>

        <p style="margin-top:24px;font-size:12px;color:#6b7280;">
          Email này được gửi tự động bởi hệ thống Warehouse Management. Không trả lời email này.
        </p>
      </div>
    </body>
    </html>
  `;

  const mail = getTransporter();
  await mail.sendMail({
    from: `"WMS AI Forecast" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: `[WMS Alert] Cảnh báo MAPE - ${forecastMonth} - ${criticalItems.length} critical, ${warningItems.length} warning`,
    html: htmlContent,
  });

  console.log(`[Email] Gửi MAPE alert email thành công đến ${recipientEmail}`);
};

// =============================================
// Hàm gửi email chung
// =============================================

export const sendEmail = async (options: {
  to: string;
  subject: string;
  html: string;
}): Promise<void> => {
  const mail = getTransporter();
  await mail.sendMail({
    from: `"Warehouse Management System" <${process.env.EMAIL_USER}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  console.log(`[Email] Gửi email thành công đến ${options.to}`);
};
