import { prisma } from "../config/db.config";
import { AppError } from "../utils/app-error";
import { ReportType } from "../generated";

export class ReportConfigService {
  static async getAllConfigs() {
    return prisma.reportConfig.findMany({
      orderBy: { created_at: "desc" },
    });
  }

  static async getConfigById(id: number) {
    const config = await prisma.reportConfig.findUnique({
      where: { id },
    });

    if (!config) {
      throw new AppError("Không tìm thấy cấu hình báo cáo", 404);
    }

    return config;
  }

  static async createConfig(data: {
    name: string;
    report_type: ReportType;
    recipient_emails: string;
    schedule_cron: string;
    is_active?: boolean;
  }) {
    return prisma.reportConfig.create({
      data,
    });
  }

  static async updateConfig(id: number, data: any) {
    const config = await this.getConfigById(id);

    return prisma.reportConfig.update({
      where: { id: config.id },
      data,
    });
  }

  static async deleteConfig(id: number) {
    const config = await this.getConfigById(id);

    return prisma.reportConfig.delete({
      where: { id: config.id },
    });
  }
}
