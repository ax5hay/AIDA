import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class FacilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async listFacilities() {
    return this.prisma.facility.findMany({
      orderBy: [{ district: "asc" }, { name: "asc" }],
      select: { id: true, name: true, district: true, state: true },
    });
  }

  async listDistricts(): Promise<string[]> {
    const rows = await this.prisma.facility.findMany({ select: { district: true } });
    return [...new Set(rows.map((r) => r.district))].sort((a, b) => a.localeCompare(b));
  }
}
