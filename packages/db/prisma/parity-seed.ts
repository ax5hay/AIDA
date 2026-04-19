/**
 * Reference taxonomy for Parity (no submissions). Run after migrate / db push:
 *   npx tsx packages/db/prisma/parity-seed.ts
 *
 * For synthetic ANC rows with outliers use parity-synthetic-seed.ts instead.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const district = await prisma.parityDistrict.upsert({
    where: { name: "Una" },
    update: {},
    create: { name: "Una", sortOrder: 0 },
  });

  const blocks = ["Amb", "Haroli"] as const;
  const blockRows: { id: string; name: string }[] = [];
  for (const name of blocks) {
    const b = await prisma.parityBlock.upsert({
      where: { districtId_name: { districtId: district.id, name } },
      update: {},
      create: { districtId: district.id, name, sortOrder: blockRows.length },
    });
    blockRows.push(b);
  }

  const types = [
    ["CH", "Community hospital", 0],
    ["CHC", "Community health centre", 1],
    ["PHC", "Primary health centre", 2],
    ["RH", "Regional hospital", 3],
  ] as const;
  const ftIds: Record<string, string> = {};
  for (const [code, label, order] of types) {
    const ft = await prisma.parityFacilityType.upsert({
      where: { code },
      update: { label },
      create: { code, label, sortOrder: order },
    });
    ftIds[code] = ft.id;
  }

  for (const block of blockRows) {
    const rDh = await prisma.parityRegion.upsert({
      where: { blockId_name: { blockId: block.id, name: "Dhussada" } },
      update: {},
      create: { blockId: block.id, name: "Dhussada", sortOrder: 0 },
    });
    await prisma.parityFacility.upsert({
      where: { regionId_name: { regionId: rDh.id, name: "CHC Dhussada" } },
      update: {},
      create: {
        regionId: rDh.id,
        facilityTypeId: ftIds["CHC"]!,
        name: "CHC Dhussada",
        sortOrder: 0,
      },
    });
    await prisma.parityFacility.upsert({
      where: { regionId_name: { regionId: rDh.id, name: "PHC Dhussada" } },
      update: {},
      create: {
        regionId: rDh.id,
        facilityTypeId: ftIds["PHC"]!,
        name: "PHC Dhussada",
        sortOrder: 1,
      },
    });

    const rCt = await prisma.parityRegion.upsert({
      where: { blockId_name: { blockId: block.id, name: "Chintpurni" } },
      update: {},
      create: { blockId: block.id, name: "Chintpurni", sortOrder: 1 },
    });
    await prisma.parityFacility.upsert({
      where: { regionId_name: { regionId: rCt.id, name: "CHC Chintpurni" } },
      update: {},
      create: {
        regionId: rCt.id,
        facilityTypeId: ftIds["CHC"]!,
        name: "CHC Chintpurni",
        sortOrder: 0,
      },
    });
    await prisma.parityFacility.upsert({
      where: { regionId_name: { regionId: rCt.id, name: "PHC Chintpurni" } },
      update: {},
      create: {
        regionId: rCt.id,
        facilityTypeId: ftIds["PHC"]!,
        name: "PHC Chintpurni",
        sortOrder: 1,
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log("Parity taxonomy seed complete (Una, blocks, regions, CH/CHC/PHC/RH facilities).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
