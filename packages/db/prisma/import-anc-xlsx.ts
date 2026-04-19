/**
 * Import ANC monthly capture from Excel_Sheets/ANC.xlsx into Parity tables.
 *
 * Context-aware import: sheet = block (Amb, Basdehra, Gagret, Haroli, Thanakalan under Una),
 * regions are matched from programme canon (with fuzzy matching for Excel typos/spacing),
 * COMPILED REPORT / Total aggregate columns are skipped.
 *
 * Run from repo root:
 *   npx tsx packages/db/prisma/import-anc-xlsx.ts [--year=2026] [--no-clear] [path/to/ANC.xlsx]
 *
 * Default: clears all Parity blocks/regions/facilities/submissions for district Una, then imports.
 */
import { config } from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import * as XLSX from "xlsx";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  PARITY_INDICATORS,
  PARITY_INT_KEYS,
  type ParityIntFields,
} from "@aida/parity-core";

config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

/** Sheet names in workbook = block names under Una. */
const BLOCK_SHEETS = ["Amb", "Basdehra", "Gagret", "Haroli", "Thanakalan"] as const;
type BlockSheet = (typeof BLOCK_SHEETS)[number];

function isBlockSheet(name: string): name is BlockSheet {
  return (BLOCK_SHEETS as readonly string[]).includes(name);
}

/**
 * Canonical region display names per block (title case; fuzzy-matched to Excel facility suffix).
 */
const CANON_REGIONS: Record<BlockSheet, string[]> = {
  Amb: ["Amb", "Chintpurni", "Dhussara", "Akrot", "Chururu", "Chaksarai", "Dharmshala", "Shivpur", "Lohara"],
  Basdehra: ["Basdehra", "Santoshgarh", "Basal", "Basoli", "Delhan", "Chalola"],
  Gagret: ["Gagret", "DLPC", "Amlehar", "Badhera Rajputan", "Marwarhi"],
  Haroli: [
    "Haroli",
    "Dulehar",
    "Beetan",
    "Kungrat",
    "Bhadsali",
    "Saloh",
    "Khad",
    "Badhera",
    "Bathri",
    "Palakwah",
    "Kuthar beet",
    "Panjawar",
    "Baliwal",
  ],
  Thanakalan: ["Thanakalan", "Bangana", "Chamiari", "Lathiani", "Sohai Takoli", "Raipur Maidan"],
};

const LABEL_ALIASES: Record<string, string> = {
  "counselling provoided": "Counselling provided",
  referrral: "Referral",
  "number of pw provided with ifa tablets from 2nd trimnester":
    "Number of PW provided with IFA tablets from 2nd trimester",
};

function normalizeLabel(raw: string): string {
  let s = raw.trim().toLowerCase();
  s = s.replace(/\s+/g, " ");
  s = s.replace(/²/g, "2");
  s = s.replace(/kg\/m2/gi, "kg/m²");
  return s;
}

function cleanCellText(raw: unknown): string {
  if (raw == null) return "";
  return String(raw).replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}

function normMatch(s: unknown): string {
  return cleanCellText(s).toLowerCase();
}

function buildLabelToKey(): Map<string, keyof ParityIntFields> {
  const m = new Map<string, keyof ParityIntFields>();
  for (const ind of PARITY_INDICATORS) {
    m.set(normalizeLabel(ind.label), ind.key);
  }
  return m;
}

function resolveIndicatorKey(
  raw: string,
  labelToKey: Map<string, keyof ParityIntFields>,
): keyof ParityIntFields | null {
  const n = normalizeLabel(raw);
  const viaAlias = LABEL_ALIASES[n];
  const lookup = viaAlias ? normalizeLabel(viaAlias) : n;
  return labelToKey.get(lookup) ?? null;
}

function monthFromCell(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v.getMonth() + 1;
  const s = String(v).trim().toLowerCase();
  if (s === "jan" || s.startsWith("jan")) return 1;
  if (s === "feb" || s.startsWith("feb")) return 2;
  if (s === "mar" || s === "march" || s.startsWith("mar")) return 3;
  return null;
}

function coerceInt(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number" && Number.isFinite(v)) return Math.round(v);
  if (typeof v === "string") {
    const m = v.match(/^(\d+)/);
    if (m) return Number.parseInt(m[1], 10);
  }
  return null;
}

function facilityTypeCode(facilityDisplay: string): string {
  const s = facilityDisplay.trim();
  if (/^CHC\s/i.test(s)) return "CHC";
  if (/^PHC\s/i.test(s)) return "PHC";
  if (/^RH\s/i.test(s)) return "RH";
  if (/^CH\s/i.test(s)) return "CH";
  return "CH";
}

function stripFacilityTypePrefix(title: string): string {
  return title.replace(/^(CHC|PHC|CH|RH)\s+/i, "").trim();
}

function isAggregateOrCompiledHeader(raw: unknown): boolean {
  const s = normMatch(raw);
  if (!s) return false;
  if (s.includes("compiled")) return true;
  if (s === "total") return true;
  if (s.startsWith("total ") && s.includes("report")) return true;
  return false;
}

function isFacilityHeader(raw: unknown): boolean {
  if (raw == null) return false;
  const s = cleanCellText(raw);
  if (!s) return false;
  if (/^indicators?$/i.test(s)) return false;
  if (/^facility$/i.test(s)) return false;
  if (/^months?$/i.test(s)) return false;
  if (isAggregateOrCompiledHeader(s)) return false;
  if (/compiled/i.test(s)) return false;
  return /^(CHC|PHC|CH|RH)\s/i.test(s);
}

function diceCoefficient(a: string, b: string): number {
  const pad = (s: string) => ` ${s.replace(/\s+/g, " ").trim()} `;
  const A = pad(a);
  const B = pad(b);
  const bigrams = (t: string) => {
    const arr: string[] = [];
    for (let i = 0; i < t.length - 1; i++) arr.push(t.slice(i, i + 2));
    return arr;
  };
  const ba = bigrams(A);
  const bb = bigrams(B);
  if (ba.length === 0 && bb.length === 0) return 1;
  if (ba.length === 0 || bb.length === 0) return 0;
  const map = new Map<string, number>();
  for (const x of ba) map.set(x, (map.get(x) ?? 0) + 1);
  let inter = 0;
  for (const x of bb) {
    const n = map.get(x) ?? 0;
    if (n > 0) {
      inter++;
      map.set(x, n - 1);
    }
  }
  return (2 * inter) / (ba.length + bb.length);
}

/** Map Excel facility suffix to canonical region label for this block. */
function resolveCanonRegion(block: BlockSheet, facilityTitle: string): string {
  const suffix = stripFacilityTypePrefix(cleanCellText(facilityTitle));
  const slug = normMatch(suffix);
  const canon = CANON_REGIONS[block];
  let best: string | null = null;
  let bestScore = 0;

  for (const r of canon) {
    const nr = normMatch(r);
    let s = 0;
    if (slug === nr) s = 1;
    else if (slug.includes(nr) || nr.includes(slug)) s = 0.92;
    else {
      s = Math.max(diceCoefficient(slug, nr), diceCoefficient(slug.replace(/[^a-z0-9]/g, ""), nr.replace(/[^a-z0-9]/g, "")));
      if (slug.length >= 4 && (nr.startsWith(slug) || slug.startsWith(nr))) s = Math.max(s, 0.88);
    }
    if (s > bestScore) {
      bestScore = s;
      best = r;
    }
  }

  if (best && bestScore >= 0.55) return best;

  // Fallback: use cleaned suffix title-cased (still better than failing import)
  if (suffix.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(`[${block}] Weak region match for "${facilityTitle}" → using raw suffix (score ${bestScore.toFixed(2)})`);
    return suffix.replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return "Unknown";
}

function findCompiledExclusiveCol(matrix: unknown[][]): number | null {
  let minCol: number | null = null;
  for (let r = 0; r < Math.min(6, matrix.length); r++) {
    const row = matrix[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      const t = cleanCellText(row[c]);
      if (t && /compiled/i.test(t)) {
        minCol = minCol == null ? c : Math.min(minCol, c);
      }
    }
  }
  return minCol;
}

function sheetToMatrix(ws: XLSX.WorkSheet): unknown[][] {
  return XLSX.utils.sheet_to_json<unknown[]>(ws, {
    header: 1,
    defval: null,
    raw: false,
  }) as unknown[][];
}

function findFirstIndicatorRow(matrix: unknown[][]): number {
  for (let r = 0; r < matrix.length; r++) {
    const cell = matrix[r]?.[0];
    if (cell == null) continue;
    const n = normalizeLabel(String(cell));
    if (n.includes("total women who attended")) return r;
  }
  throw new Error("Could not find 'Total women who attended' row (col A).");
}

interface Triplet {
  startCol: number;
  facilityName: string;
}

function resolveFacilityName(
  matrix: unknown[][],
  facRow: number,
  monthRow: number,
  c: number,
): string | null {
  /** Excel quirks: facility may sit above Jan, left of Jan (Gagret), or to the right after Mar (second Amb Chaksarai). */
  const tryCells = [
    matrix[facRow]?.[c],
    matrix[facRow]?.[c + 1],
    matrix[facRow]?.[c + 2],
    matrix[facRow]?.[c + 3],
    matrix[monthRow]?.[c - 1],
    matrix[facRow]?.[c - 1],
  ];
  for (const raw of tryCells) {
    if (isFacilityHeader(raw)) return cleanCellText(raw);
  }
  return null;
}

function extractTriplets(
  matrix: unknown[][],
  facRow: number,
  monthRow: number,
  compiledExclusive: number | null,
): Triplet[] {
  const row = matrix[monthRow];
  if (!row?.length) return [];
  const end = compiledExclusive != null ? compiledExclusive : row.length;
  const out: Triplet[] = [];
  const seen = new Set<number>();
  for (let c = 0; c + 2 < end && c < row.length - 2; c++) {
    if (monthFromCell(row[c]) !== 1) continue;
    if (monthFromCell(row[c + 1]) !== 2) continue;
    if (monthFromCell(row[c + 2]) !== 3) continue;

    const facilityName = resolveFacilityName(matrix, facRow, monthRow, c);
    if (!facilityName) continue;
    if (isAggregateOrCompiledHeader(facilityName)) continue;
    if (seen.has(c)) continue;
    seen.add(c);
    out.push({ startCol: c, facilityName });
  }
  return out;
}

function detectLayout(matrix: unknown[][], compiledExclusive: number | null): { facRow: number; monthRow: number; triplets: Triplet[] } | null {
  let best: { facRow: number; monthRow: number; triplets: Triplet[] } | null = null;
  for (let monthRow = 0; monthRow <= 6; monthRow++) {
    const facCandidates = [monthRow - 1, monthRow, monthRow - 2].filter((n) => n >= 0);
    for (const facRow of facCandidates) {
      const triplets = extractTriplets(matrix, facRow, monthRow, compiledExclusive);
      if (triplets.length === 0) continue;
      if (!best || triplets.length > best.triplets.length) {
        best = { facRow, monthRow, triplets };
      }
    }
  }
  return best;
}

function rowHasAnyMetric(row: Prisma.ParityAncSubmissionUncheckedCreateInput): boolean {
  for (const k of PARITY_INT_KEYS) {
    if (row[k] != null) return true;
  }
  return false;
}

async function clearDistrictHierarchy(districtId: string) {
  await prisma.parityAncSubmission.deleteMany({ where: { districtId } });
  await prisma.parityFacility.deleteMany({ where: { region: { block: { districtId } } } });
  await prisma.parityRegion.deleteMany({ where: { block: { districtId } } });
  await prisma.parityBlock.deleteMany({ where: { districtId } });
}

async function main() {
  const argv = process.argv.slice(2);
  let fileArg = path.resolve(process.cwd(), "Excel_Sheets/ANC.xlsx");
  let periodYear = 2026;
  let doClear = true;

  for (const a of argv) {
    if (a.startsWith("--year=")) periodYear = Number(a.slice(7));
    else if (a === "--no-clear") doClear = false;
    else if (!a.startsWith("-")) fileArg = path.resolve(process.cwd(), a);
  }

  if (!fs.existsSync(fileArg)) {
    throw new Error(`Workbook not found: ${fileArg}`);
  }

  const districtName = process.env.PARITY_IMPORT_DISTRICT ?? "Una";

  const wb = XLSX.readFile(fileArg, { type: "binary", cellDates: true });
  const labelToKey = buildLabelToKey();

  const district = await prisma.parityDistrict.upsert({
    where: { name: districtName },
    update: {},
    create: { name: districtName, sortOrder: 0 },
  });

  if (doClear) {
    await clearDistrictHierarchy(district.id);
    // eslint-disable-next-line no-console
    console.log(`Cleared Parity hierarchy for district ${JSON.stringify(districtName)}.`);
  }

  for (const [code, lbl, order] of [
    ["CH", "Community hospital", 0],
    ["CHC", "Community health centre", 1],
    ["PHC", "Primary health centre", 2],
    ["RH", "Regional hospital", 3],
  ] as const) {
    await prisma.parityFacilityType.upsert({
      where: { code },
      update: { label: lbl },
      create: { code, label: lbl, sortOrder: order },
    });
  }

  const facilityTypes = await prisma.parityFacilityType.findMany();
  const ftByCode = new Map(facilityTypes.map((f) => [f.code, f.id]));

  const createRows: Prisma.ParityAncSubmissionUncheckedCreateInput[] = [];
  let sheetsProcessed = 0;
  /** Dedupe same display name in same region → unique DB name */
  const facilityNameCounts = new Map<string, number>();

  for (const sheetName of wb.SheetNames) {
    if (!isBlockSheet(sheetName)) {
      // eslint-disable-next-line no-console
      console.warn(`Skip sheet ${JSON.stringify(sheetName)}: not a known block tab.`);
      continue;
    }

    const ws = wb.Sheets[sheetName];
    if (!ws) continue;

    const matrix = sheetToMatrix(ws);
    if (matrix.length < 4) continue;

    const compiledEx = findCompiledExclusiveCol(matrix);
    const layout = detectLayout(matrix, compiledEx);
    if (!layout?.triplets.length) {
      // eslint-disable-next-line no-console
      console.warn(`Skip sheet ${JSON.stringify(sheetName)}: no Jan–Mar groups found.`);
      continue;
    }

    const blockOrder = BLOCK_SHEETS.indexOf(sheetName);
    const block = await prisma.parityBlock.create({
      data: { districtId: district.id, name: sheetName, sortOrder: blockOrder },
    });

    const firstInd = findFirstIndicatorRow(matrix);
    sheetsProcessed++;

    for (const { startCol, facilityName: facilityTitle } of layout.triplets) {
      const ftCode = facilityTypeCode(facilityTitle);
      const facilityTypeId = ftByCode.get(ftCode);
      if (!facilityTypeId) throw new Error(`Missing facility type ${ftCode}`);

      const regionCanon = resolveCanonRegion(sheetName, facilityTitle);
      const regionSort = CANON_REGIONS[sheetName].indexOf(regionCanon);
      const region = await prisma.parityRegion.upsert({
        where: { blockId_name: { blockId: block.id, name: regionCanon } },
        update: { sortOrder: regionSort >= 0 ? regionSort : 99 },
        create: { blockId: block.id, name: regionCanon, sortOrder: regionSort >= 0 ? regionSort : 99 },
      });

      let dbFacilityName = cleanCellText(facilityTitle);
      const dedupeKey = `${region.id}::${normMatch(dbFacilityName)}`;
      const n = (facilityNameCounts.get(dedupeKey) ?? 0) + 1;
      facilityNameCounts.set(dedupeKey, n);
      if (n > 1) dbFacilityName = `${dbFacilityName} · ${n}`;

      const facility = await prisma.parityFacility.upsert({
        where: { regionId_name: { regionId: region.id, name: dbFacilityName } },
        update: { facilityTypeId, sortOrder: startCol },
        create: {
          regionId: region.id,
          facilityTypeId,
          name: dbFacilityName,
          sortOrder: startCol,
        },
      });

      for (let mi = 0; mi < 3; mi++) {
        const col = startCol + mi;
        const periodMonth = mi + 1;
        const metrics: Partial<Record<keyof ParityIntFields, number | null>> = {};

        for (let r = firstInd; r < matrix.length; r++) {
          const labelCell = matrix[r]?.[0];
          if (labelCell == null || String(labelCell).trim() === "") break;
          const key = resolveIndicatorKey(String(labelCell), labelToKey);
          if (!key) continue;
          metrics[key] = coerceInt(matrix[r]?.[col]);
        }

        const row: Prisma.ParityAncSubmissionUncheckedCreateInput = {
          districtId: district.id,
          blockId: block.id,
          regionId: region.id,
          facilityId: facility.id,
          periodYear,
          periodMonth,
          periodDay: 0,
          remarks: `Imported ${path.basename(fileArg)} / ${sheetName}`,
        };
        for (const k of PARITY_INT_KEYS) {
          row[k] = metrics[k] ?? null;
        }
        if (!rowHasAnyMetric(row)) continue;
        createRows.push(row);
      }
    }
  }

  if (createRows.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No submission rows to insert.");
    return;
  }

  const res = await prisma.parityAncSubmission.createMany({
    data: createRows,
    skipDuplicates: true,
  });

  // eslint-disable-next-line no-console
  console.log(
    `ANC import: ${sheetsProcessed} block sheet(s), ${createRows.length} row(s) prepared, ${res.count} inserted. Year=${periodYear} district=${districtName}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
