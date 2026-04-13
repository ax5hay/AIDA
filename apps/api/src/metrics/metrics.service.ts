import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async health() {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  async counts() {
    const [facilities, assessments, districtRows] = await Promise.all([
      this.prisma.facility.count(),
      this.prisma.chcAssessment.count(),
      this.prisma.facility.findMany({ select: { district: true }, distinct: ["district"] }),
    ]);
    const districts = [...new Set(districtRows.map((r) => r.district))].sort((a, b) =>
      a.localeCompare(b),
    );
    return {
      facilities,
      assessments,
      districtCount: districts.length,
      districts,
    };
  }
}
