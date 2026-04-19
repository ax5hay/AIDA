/**
 * Wipes Parity tables and seeds realistic India-themed ANC data (default 1000 monthly rows).
 * Names reflect districts / blocks / facilities in the style of HMIS reporting; metrics are
 * internally consistent (denominators, BMI bands, PHQ bands, IFA tablet caps).
 *
 *   npx tsx packages/db/prisma/parity-synthetic-seed.ts
 *   npx tsx packages/db/prisma/parity-synthetic-seed.ts 500
 *   PARITY_SYNTHETIC_SUBMISSIONS=2000 npm run parity:synthetic-seed
 */
import { config } from "dotenv";
import * as path from "node:path";
import { Prisma, PrismaClient } from "@prisma/client";
import { PARITY_INT_KEYS } from "@aida/parity-core";

config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

function parseTargetCount(): number {
  const arg = process.argv[2];
  if (arg && /^\d+$/.test(arg)) {
    return Math.max(1, Math.min(50_000, parseInt(arg, 10)));
  }
  const env = process.env.PARITY_SYNTHETIC_SUBMISSIONS;
  if (env && /^\d+$/.test(env)) {
    return Math.max(1, Math.min(50_000, parseInt(env, 10)));
  }
  return 1000;
}

function rndInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Clamp to [0, max] */
function cap(n: number, max: number) {
  if (max <= 0) return 0;
  return Math.min(Math.max(0, Math.round(n)), max);
}

type TypeCode = "CH" | "CHC" | "PHC" | "RH";

type FacBlueprint = {
  district: string;
  block: string;
  region: string;
  /** UPHC rows use PHC facility type in DB but keep urban naming. */
  typeCode: TypeCode | "UPHC";
  /** Local name, e.g. CHC Nurpur — Indian public-health naming */
  name: string;
};

/**
 * Realistic facility/district tree (North + South India mix). Sufficient for ≤100 facilities.
 */
const FACILITY_BLUEPRINTS: FacBlueprint[] = [
  { district: "Una", block: "Amb", region: "Dhussada", typeCode: "CHC", name: "CHC Dhussada" },
  { district: "Una", block: "Amb", region: "Chintpurni", typeCode: "PHC", name: "PHC Chintpurni" },
  { district: "Una", block: "Haroli", region: "Bangana", typeCode: "PHC", name: "PHC Bangana" },
  { district: "Una", block: "Gagret", region: "Mehatpur", typeCode: "CHC", name: "CHC Gagret" },
  { district: "Kangra", block: "Nurpur", region: "Indora", typeCode: "CHC", name: "CHC Indora" },
  { district: "Kangra", block: "Palampur", region: "Baijnath", typeCode: "PHC", name: "PHC Baijnath" },
  { district: "Kangra", block: "Dharamshala", region: "McLeod Ganj", typeCode: "UPHC", name: "UPHC McLeod Ganj" },
  { district: "Mandi", block: "Sarkaghat", region: "Dharampur", typeCode: "PHC", name: "PHC Dharampur" },
  { district: "Mandi", block: "Karsog", region: "Karsog", typeCode: "CHC", name: "CHC Karsog" },
  { district: "Shimla", block: "Theog", region: "Kotkhai", typeCode: "PHC", name: "PHC Kotkhai" },
  { district: "Shimla", block: "Rampur", region: "Nankhari", typeCode: "CHC", name: "CHC Nankhari" },
  { district: "Solan", block: "Kandaghat", region: "Chail", typeCode: "PHC", name: "PHC Chail" },
  { district: "Solan", block: "Nalagarh", region: "Baddi", typeCode: "CHC", name: "CHC Baddi (Ind. Area)" },
  { district: "Sirmaur", block: "Paonta Sahib", region: "Kamrau", typeCode: "PHC", name: "PHC Kamrau" },
  { district: "Sirmaur", block: "Rajgarh", region: "Sarahan", typeCode: "CHC", name: "CHC Rajgarh" },
  { district: "Chamoli", block: "Joshimath", region: "Tapovan", typeCode: "PHC", name: "PHC Joshimath" },
  { district: "Almora", block: "Someshwar", region: "Dwarahat", typeCode: "CHC", name: "CHC Dwarahat" },
  { district: "Mandya", block: "Maddur", region: "Keregodu", typeCode: "PHC", name: "PHC Keregodu" },
  { district: "Mandya", block: "Krishnarajpet", region: "K R Pet", typeCode: "CHC", name: "CHC Krishnarajpet" },
  { district: "Dharwad", block: "Hubballi", region: "Old Hubballi", typeCode: "UPHC", name: "UPHC Old Hubballi" },
  { district: "Dharwad", block: "Navalgund", region: "Annigeri", typeCode: "PHC", name: "PHC Annigeri" },
  { district: "Belagavi", block: "Athani", region: "Hulagabali", typeCode: "CHC", name: "CHC Athani" },
  { district: "Belagavi", block: "Chikodi", region: "Nippani", typeCode: "CHC", name: "CHC Nippani" },
  { district: "Thrissur", block: "Chalakudy", region: "Mala", typeCode: "PHC", name: "PHC Mala" },
  { district: "Thrissur", block: "Irinjalakuda", region: "Kattoor", typeCode: "CHC", name: "CHC Irinjalakuda" },
  { district: "Palakkad", block: "Ottapalam", region: "Lakkidi", typeCode: "PHC", name: "PHC Lakkidi" },
  { district: "Ernakulam", block: "Aluva", region: "Chengamanad", typeCode: "UPHC", name: "UPHC Aluva" },
  { district: "Thiruvananthapuram", block: "Neyyattinkara", region: "Balaramapuram", typeCode: "PHC", name: "PHC Balaramapuram" },
  { district: "Chennai", block: "Tondiarpet", region: "Tondiarpet", typeCode: "UPHC", name: "UPHC Tondiarpet" },
  { district: "Chennai", block: "Velachery", region: "Velachery", typeCode: "UPHC", name: "UPHC Velachery" },
  { district: "Coimbatore", block: "Pollachi", region: "Kinathukadavu", typeCode: "CHC", name: "CHC Pollachi" },
  { district: "Madurai", block: "Melur", region: "Alanganallur", typeCode: "PHC", name: "PHC Alanganallur" },
  { district: "Varanasi", block: "Pindra", region: "Sindhora", typeCode: "CHC", name: "CHC Pindra" },
  { district: "Varanasi", block: "Cholapur", region: "Sewapuri", typeCode: "PHC", name: "PHC Sewapuri" },
  { district: "Lucknow", block: "Malihabad", region: "Mal", typeCode: "CHC", name: "CHC Malihabad" },
  { district: "Lucknow", block: "Bakshi Ka Talab", region: "Itaunja", typeCode: "PHC", name: "PHC Itaunja" },
  { district: "Pune", block: "Haveli", region: "Uruli Kanchan", typeCode: "PHC", name: "PHC Uruli Kanchan" },
  { district: "Pune", block: "Mulshi", region: "Paud", typeCode: "CHC", name: "CHC Paud" },
  { district: "Nashik", block: "Niphad", region: "Niphad", typeCode: "RH", name: "RH Nashik (Ref.)" },
  { district: "Nashik", block: "Sinnar", region: "Sinnar", typeCode: "CHC", name: "CHC Sinnar" },
  { district: "Ahmedabad", block: "Daskroi", region: "Sanand", typeCode: "CHC", name: "CHC Sanand" },
  { district: "Ahmedabad", block: "Viramgam", region: "Viramgam", typeCode: "PHC", name: "PHC Viramgam" },
  { district: "Surat", block: "Kamrej", region: "Kim", typeCode: "CHC", name: "CHC Kamrej" },
  { district: "Surat", block: "Mangrol", region: "Umarpada", typeCode: "PHC", name: "PHC Umarpada" },
  { district: "Jaipur", block: "Sanganer", region: "Chaksu", typeCode: "CHC", name: "CHC Chaksu" },
  { district: "Jaipur", block: "Amber", region: "Jamwa Ramgarh", typeCode: "PHC", name: "PHC Jamwa Ramgarh" },
  { district: "Udaipur", block: "Gogunda", region: "Gogunda", typeCode: "CHC", name: "CHC Gogunda" },
  { district: "Udaipur", block: "Salumber", region: "Lasadiya", typeCode: "PHC", name: "PHC Lasadiya" },
  { district: "Khordha", block: "Balianta", region: "Balipatna", typeCode: "PHC", name: "PHC Balipatna" },
  { district: "Khordha", block: "Jatni", region: "Jatni", typeCode: "UPHC", name: "UPHC Jatni" },
  { district: "Cuttack", block: "Tigiria", region: "Athagarh", typeCode: "CHC", name: "CHC Athagarh" },
  { district: "Visakhapatnam", block: "Anakapalli", region: "Anakapalli", typeCode: "CHC", name: "CHC Anakapalli" },
  { district: "Visakhapatnam", block: "Chintapalli", region: "Paderu", typeCode: "PHC", name: "PHC Paderu (ITDA)" },
  { district: "Kamrup Metropolitan", block: "Guwahati", region: "Dispur", typeCode: "UPHC", name: "UPHC Dispur" },
  { district: "Nagaon", block: "Raha", region: "Raha", typeCode: "CHC", name: "CHC Raha" },
  { district: "Imphal West", block: "Lamphel", region: "Lamphel", typeCode: "CHC", name: "CHC Lamphel" },
  { district: "Aizawl", block: "Aizawl", region: "Durtlang", typeCode: "CHC", name: "CHC Durtlang" },
  { district: "Kohima", block: "Jakhama", region: "Jakhama", typeCode: "PHC", name: "PHC Jakhama" },
  { district: "East Khasi Hills", block: "Mawkynrew", region: "Mawkynrew", typeCode: "PHC", name: "PHC Mawkynrew" },
  { district: "South Garo Hills", block: "Baghmara", region: "Baghmara", typeCode: "CHC", name: "CHC Baghmara" },
  { district: "Anantapur", block: "Guntakal", region: "Guntakal", typeCode: "CHC", name: "CHC Guntakal" },
  { district: "Guntur", block: "Tenali", region: "Tenali", typeCode: "UPHC", name: "UPHC Tenali" },
  { district: "Visakhapatnam", block: "Araku Valley", region: "Araku", typeCode: "PHC", name: "PHC Araku Valley" },
  { district: "Kurnool", block: "Nandyal", region: "Nandyal", typeCode: "RH", name: "RH Nandyal" },
  { district: "Warangal Urban", block: "Hanamkonda", region: "Subedari", typeCode: "UPHC", name: "UPHC Subedari" },
  { district: "Hyderabad", block: "Secunderabad", region: "Marredpally", typeCode: "UPHC", name: "UPHC Marredpally" },
  { district: "Patna", block: "Phulwari", region: "Danapur", typeCode: "CHC", name: "CHC Danapur" },
  { district: "Patna", block: "Patna Sadar", region: "Digha", typeCode: "UPHC", name: "UPHC Digha" },
  { district: "Ranchi", block: "Kanke", region: "Kanke", typeCode: "CHC", name: "CHC Kanke" },
  { district: "Jamshedpur", block: "Potka", region: "Ghatshila", typeCode: "CHC", name: "CHC Ghatshila" },
  { district: "Raipur", block: "Abhanpur", region: "Abhanpur", typeCode: "PHC", name: "PHC Abhanpur" },
  { district: "Bilaspur", block: "Pendra Road", region: "Pendra", typeCode: "CHC", name: "CHC Pendra" },
  { district: "Indore", block: "Mhow", region: "Mhow", typeCode: "CHC", name: "CHC Mhow" },
  { district: "Bhopal", block: "Huzur", region: "Phanda", typeCode: "PHC", name: "PHC Phanda Kalan" },
  { district: "Jabalpur", block: "Shahpura", region: "Shahpura", typeCode: "CHC", name: "CHC Shahpura" },
  { district: "Gurugram", block: "Sohna", region: "Sohna", typeCode: "CHC", name: "CHC Sohna" },
  { district: "Faridabad", block: "Ballabgarh", region: "Tigaon", typeCode: "PHC", name: "PHC Tigaon" },
  { district: "Amritsar", block: "Ajnala", region: "Ajnala", typeCode: "CHC", name: "CHC Ajnala" },
  { district: "Ludhiana", block: "Samrala", region: "Samrala", typeCode: "PHC", name: "PHC Samrala" },
  { district: "Jalandhar", block: "Nakodar", region: "Nakodar", typeCode: "CHC", name: "CHC Nakodar" },
  { district: "Kangra", block: "Jaisinghpur", region: "Palach", typeCode: "PHC", name: "PHC Jaisinghpur" },
  { district: "Una", block: "Bangana", region: "Takarla", typeCode: "PHC", name: "PHC Takarla" },
  { district: "Mandya", block: "Nagamangala", region: "Bellur", typeCode: "PHC", name: "PHC Bellur" },
  { district: "Mysuru", block: "Hunsur", region: "Hunsur", typeCode: "CHC", name: "CHC Hunsur" },
  { district: "Mysuru", block: "Tirumakudalu Narasipura", region: "T. Narasipura", typeCode: "PHC", name: "PHC T. Narasipura" },
  { district: "Belagavi", block: "Gokak", region: "Gokak", typeCode: "RH", name: "RH Belagavi (Ref.)" },
  { district: "Kozhikode", block: "Thamarassery", region: "Koodaranhi", typeCode: "PHC", name: "PHC Koodaranhi" },
  { district: "Kannur", block: "Thalassery", region: "Kadirur", typeCode: "CHC", name: "CHC Thalassery" },
  { district: "Wayanad", block: "Sulthan Bathery", region: "Mullankolli", typeCode: "CHC", name: "CHC Sulthan Bathery" },
  { district: "North Goa", block: "Bardez", region: "Mapusa", typeCode: "UPHC", name: "UPHC Mapusa" },
  { district: "South Goa", block: "Salcete", region: "Margao", typeCode: "CHC", name: "CHC Margao" },
];

/** Map blueprint type to Prisma facility type code (UPHC stored as PHC for type table). */
function prismaTypeForBlueprint(t: string): TypeCode {
  if (t === "UPHC") return "PHC";
  return t as TypeCode;
}

const REMARKS_POOL = [
  null,
  null,
  null,
  "HMIS monthly return verified with MO-IC; MCP registers tallied.",
  "BCM field visit on 15th — ANC register cross-checked with MCP cards.",
  "Data entered from facility ANC register; DHIS2 upload pending at district.",
  "Nil specific remark for the month.",
  "IFA stock reconciled with ASHA line-list; minor discrepancy resolved.",
  "High OPD load — lab reagents delayed 3 days; screening completed by month-end.",
  "Quarterly internal audit — documentation complete.",
];

function volumeRangeForType(t: TypeCode): [number, number] {
  switch (t) {
    case "PHC":
      return [14, 92];
    case "CHC":
      return [38, 240];
    case "CH":
      return [28, 160];
    case "RH":
      return [85, 420];
    default:
      return [25, 180];
  }
}

function pickRemark(seq: number): string | null {
  if (seq % 11 !== 0 && seq % 17 !== 0) return null;
  return REMARKS_POOL[rndInt(0, REMARKS_POOL.length - 1)] ?? null;
}

/** Trimester counts: each ≤ total, t1≥t2≥t3, and t1+t2+t3 ≥ total (repeat visits). */
function trimesterTriplet(total: number): [number, number, number] {
  let t1 = rndInt(Math.max(1, Math.ceil(total / 3)), total);
  let t2 = rndInt(0, t1);
  let t3 = rndInt(0, t2);
  if (t1 + t2 + t3 < total) {
    t1 = Math.min(total, t1 + (total - (t1 + t2 + t3)));
  }
  return [t1, t2, t3];
}

/**
 * Coherent metrics satisfying Parity business rules (validateParityBusinessRules).
 */
function buildCoherentMetrics(total: number, typeCode: TypeCode): Record<string, number | null> {
  const r = Math.random;
  const pct = (lo: number, hi: number) => lo + r() * (hi - lo);
  const nn = (p: number) => cap(total * p, total);

  const observed = cap(nn(pct(0.78, 0.98)), total);

  const mcpCardProvided = nn(pct(0.72, 0.97));
  const broughtMcpCard = nn(pct(0.68, 0.95));
  const mcpPairCap = Math.min(total, mcpCardProvided + broughtMcpCard);
  const mcpCardDulyFilled = rndInt(0, mcpPairCap);
  const womenRegisteredIn1stTrimester = nn(pct(0.42, 0.78));

  const [trimesterFirst, trimesterSecond, trimesterThird] = trimesterTriplet(total);

  let td1 = nn(pct(0.48, 0.9));
  let td2 = cap(Math.round(td1 * (0.55 + r() * 0.35)), td1);
  let tdBooster = cap(Math.round(td2 * (0.25 + r() * 0.45)), td2);

  const height = nn(pct(0.55, 0.92));

  const weightMeasuredFirstTrimester = rndInt(0, trimesterFirst);
  const bmiCalculatedFirstTrimester = rndInt(0, weightMeasuredFirstTrimester);

  const shareU = pct(0.06, 0.16);
  const shareO = pct(0.1, 0.22);
  let womenBmiLte185 = cap(Math.round(bmiCalculatedFirstTrimester * shareU), bmiCalculatedFirstTrimester);
  let womenBmiGte25 = cap(Math.round(bmiCalculatedFirstTrimester * shareO), bmiCalculatedFirstTrimester);
  let womenBmi185To2499 = bmiCalculatedFirstTrimester - womenBmiLte185 - womenBmiGte25;
  if (womenBmi185To2499 < 0) {
    const adj = Math.floor((womenBmiLte185 + womenBmiGte25 - bmiCalculatedFirstTrimester) / 2) + 1;
    womenBmiLte185 = Math.max(0, womenBmiLte185 - adj);
    womenBmiGte25 = Math.max(0, womenBmiGte25 - adj);
    womenBmi185To2499 = bmiCalculatedFirstTrimester - womenBmiLte185 - womenBmiGte25;
  }

  const weightMeasuredSecondTrimester = rndInt(0, trimesterSecond);
  const weightMeasuredThirdTrimester = rndInt(0, trimesterThird);
  const bpMeasuredFirstTrimester = rndInt(0, trimesterFirst);
  const bpMeasuredSecondTrimester = rndInt(0, trimesterSecond);
  const bpMeasuredThirdTrimester = rndInt(0, trimesterThird);

  const hbByCbcFirstVisit = nn(pct(0.62, 0.94));
  const bloodGroupingFirstVisit = nn(pct(0.55, 0.9));
  const hbEveryVisit = hbByCbcFirstVisit + rndInt(0, Math.max(0, Math.floor(total * 0.35)));
  const tshFirstVisit = nn(pct(0.28, 0.62));
  const ogttFirstVisit = nn(pct(0.12, 0.42));
  const rbsFirstVisit = nn(pct(0.35, 0.7));
  const urineRe = nn(pct(0.55, 0.88));
  const hbsag = nn(pct(0.55, 0.9));
  const hiv = nn(pct(0.55, 0.9));
  const vdrl = nn(pct(0.52, 0.88));
  const usg = nn(pct(0.38, 0.75));
  const tbScreening = nn(pct(0.45, 0.82));

  const phq2Administered = cap(nn(pct(0.12, 0.45)), total);
  let phqScore0To2 = rndInt(0, phq2Administered);
  let phqScore3To5 = rndInt(0, Math.max(0, phq2Administered - phqScore0To2));
  let phqScore6 = Math.max(0, phq2Administered - phqScore0To2 - phqScore3To5);

  const counsellingProvided = rndInt(0, phq2Administered);
  const referral = rndInt(0, phq2Administered);

  const anemiaBudget = rndInt(0, total);
  const severeAnemia = rndInt(0, Math.min(anemiaBudget, Math.max(1, Math.floor(total * 0.03)) + 1));
  const moderateAnemia = rndInt(0, Math.min(anemiaBudget - severeAnemia, Math.floor(total * 0.08)));
  const mildAnemia = anemiaBudget - severeAnemia - moderateAnemia;

  const hypertensive = cap(nn(pct(0.02, 0.12)), total);
  const gdm = cap(nn(pct(0.01, 0.08)), total);
  const hypothyroidism = cap(nn(pct(0.01, 0.06)), total);
  const hyperthyroidism = cap(nn(pct(0, 0.03)), total);
  const abdominalExamination = nn(pct(0.48, 0.88));

  const hrpIdentification = cap(nn(pct(0.03, 0.14)), total);
  const hrpRedCardCount = hrpIdentification === 0 ? 0 : rndInt(0, hrpIdentification);
  const womenReferredHigherFacilities =
    hrpIdentification === 0 ? 0 : rndInt(0, hrpIdentification);
  const womenManagedHighRisk = hrpIdentification === 0 ? 0 : rndInt(0, hrpIdentification);

  const pwGivenFaFirstTrimester = rndInt(0, trimesterFirst);
  const pwGivenAlbendazoleSecondTrimester = rndInt(0, trimesterSecond);
  const womenCalciumVitaminD = nn(pct(0.4, 0.82));

  const womenIfa = nn(pct(0.52, 0.92));
  const ifaTabletsPerWoman = rndInt(48, 220);
  const pwProvidedIfaTabletsSecondTrimester = womenIfa * ifaTabletsPerWoman;

  const row: Record<string, number | null> = {
    totalWomenAttendedAnc: total,
    noOfWomenObserved: observed,
    mcpCardProvided,
    womenRegisteredIn1stTrimester,
    broughtMcpCard,
    mcpCardDulyFilled,
    trimesterFirst,
    trimesterSecond,
    trimesterThird,
    td1,
    td2,
    tdBooster,
    height,
    weightMeasuredFirstTrimester,
    bmiCalculatedFirstTrimester,
    womenBmiLte185,
    womenBmi185To2499,
    womenBmiGte25,
    weightMeasuredSecondTrimester,
    weightMeasuredThirdTrimester,
    bpMeasuredFirstTrimester,
    bpMeasuredSecondTrimester,
    bpMeasuredThirdTrimester,
    hbByCbcFirstVisit,
    bloodGroupingFirstVisit,
    hbEveryVisit,
    tshFirstVisit,
    ogttFirstVisit,
    rbsFirstVisit,
    urineRe,
    hbsag,
    hiv,
    vdrl,
    usg,
    tbScreening,
    phq2Administered,
    phqScore0To2,
    phqScore3To5,
    counsellingProvided,
    phqScore6,
    referral,
    mildAnemia,
    moderateAnemia,
    severeAnemia,
    hypertensive,
    gdm,
    hypothyroidism,
    hyperthyroidism,
    abdominalExamination,
    hrpIdentification,
    hrpRedCardCount,
    womenReferredHigherFacilities,
    womenManagedHighRisk,
    pwGivenFaFirstTrimester,
    pwGivenAlbendazoleSecondTrimester,
    pwProvidedIfaTabletsSecondTrimester,
    ifaTabletsPerWoman,
    womenCalciumVitaminD,
  };

  for (const k of PARITY_INT_KEYS) {
    if (row[k] === undefined) row[k] = null;
  }

  return row;
}

/** ~sqrt(n) facilities, clamped */
function facilityCountForTarget(target: number): number {
  return Math.min(FACILITY_BLUEPRINTS.length, Math.max(8, Math.round(Math.sqrt(target))));
}

type FacRef = {
  id: string;
  blockId: string;
  regionId: string;
  districtId: string;
  typeCode: TypeCode;
};

async function wipeParity() {
  await prisma.parityAncSubmission.deleteMany();
  await prisma.parityFacility.deleteMany();
  await prisma.parityRegion.deleteMany();
  await prisma.parityBlock.deleteMany();
  await prisma.parityDistrict.deleteMany();
  await prisma.parityFacilityType.deleteMany();
}

async function seedFacilityTypes(): Promise<Record<string, string>> {
  const types = [
    ["CH", "Community hospital", 0],
    ["CHC", "Community health centre", 1],
    ["PHC", "Primary health centre", 2],
    ["RH", "Regional hospital", 3],
  ] as const;
  const ftIds: Record<string, string> = {};
  for (const [code, label, order] of types) {
    const ft = await prisma.parityFacilityType.create({
      data: { code, label, sortOrder: order },
    });
    ftIds[code] = ft.id;
  }
  return ftIds;
}

async function buildFacilitiesFromBlueprints(
  ftIds: Record<string, string>,
  nFacilities: number,
): Promise<FacRef[]> {
  const slice = FACILITY_BLUEPRINTS.slice(0, nFacilities);
  const districtByName = new Map<string, string>();
  const blockByKey = new Map<string, string>();
  const regionByKey = new Map<string, string>();
  const blockSortByDistrict = new Map<string, number>();
  const regionSortByBlock = new Map<string, number>();
  const out: FacRef[] = [];

  let dOrder = 0;
  let facSort = 0;

  for (const bp of slice) {
    let districtId = districtByName.get(bp.district);
    if (!districtId) {
      const d = await prisma.parityDistrict.create({
        data: { name: bp.district, sortOrder: dOrder++ },
      });
      districtId = d.id;
      districtByName.set(bp.district, districtId);
    }

    const bk = `${bp.district}|${bp.block}`;
    let blockId = blockByKey.get(bk);
    if (!blockId) {
      const bo = blockSortByDistrict.get(bp.district) ?? 0;
      blockSortByDistrict.set(bp.district, bo + 1);
      const b = await prisma.parityBlock.create({
        data: {
          districtId,
          name: bp.block,
          sortOrder: bo,
        },
      });
      blockId = b.id;
      blockByKey.set(bk, blockId);
    }

    const rk = `${bk}|${bp.region}`;
    let regionId = regionByKey.get(rk);
    if (!regionId) {
      const ro = regionSortByBlock.get(bk) ?? 0;
      regionSortByBlock.set(bk, ro + 1);
      const reg = await prisma.parityRegion.create({
        data: {
          blockId,
          name: bp.region,
          sortOrder: ro,
        },
      });
      regionId = reg.id;
      regionByKey.set(rk, regionId);
    }

    const prismaType = prismaTypeForBlueprint(bp.typeCode);
    const fac = await prisma.parityFacility.create({
      data: {
        regionId,
        facilityTypeId: ftIds[prismaType]!,
        name: bp.name,
        sortOrder: facSort++,
      },
    });

    out.push({
      id: fac.id,
      blockId,
      regionId,
      districtId,
      typeCode: prismaType,
    });
  }

  return out;
}

function periodSequence(count: number): { year: number; month: number }[] {
  const periods: { year: number; month: number }[] = [];
  let y = 2025;
  let m = 4;
  for (let i = 0; i < count; i++) {
    periods.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return periods;
}

async function main() {
  const TARGET = parseTargetCount();
  const nFacilities = facilityCountForTarget(TARGET);
  const nPeriods = Math.ceil(TARGET / nFacilities);

  await wipeParity();
  const ftIds = await seedFacilityTypes();
  const facilities = await buildFacilitiesFromBlueprints(ftIds, nFacilities);
  const periods = periodSequence(nPeriods);

  const submissions: Prisma.ParityAncSubmissionCreateManyInput[] = [];

  for (const period of periods) {
    for (const fac of facilities) {
      if (submissions.length >= TARGET) break;

      const [vmin, vmax] = volumeRangeForType(fac.typeCode);
      let total = rndInt(vmin, vmax);
      const seq = submissions.length;

      if (seq % 199 === 0) total = rndInt(Math.max(6, vmin), Math.min(22, vmax));
      if (seq % 277 === 0) total = rndInt(Math.min(280, vmax + 40), Math.min(400, vmax + 120));

      const metrics = buildCoherentMetrics(total, fac.typeCode);
      submissions.push({
        districtId: fac.districtId,
        blockId: fac.blockId,
        regionId: fac.regionId,
        facilityId: fac.id,
        periodYear: period.year,
        periodMonth: period.month,
        periodDay: 0,
        remarks: pickRemark(seq),
        ...metrics,
      });
    }
    if (submissions.length >= TARGET) break;
  }

  await prisma.parityAncSubmission.createMany({ data: submissions });

  // eslint-disable-next-line no-console
  console.log(
    `Parity seed (India demo): wiped Parity tables; ${facilities.length} facilities across Indian districts, ${submissions.length} monthly HMIS-style rows (Apr 2025 onward, periodDay=0).`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
