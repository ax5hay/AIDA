/**
 * ANC indicators aligned to `Excel_Sheets/ANC.xlsx` (Haroli sheet row labels).
 * Used for form ordering, labels, validation groups, and analytics keys.
 */

export type ParityIndicatorMeta = {
  /** Prisma / API field name */
  key: keyof ParityIntFields;
  /** Original Excel / programme label */
  label: string;
  /** UI section */
  section: "attendance" | "anc_process" | "trimester" | "vitals" | "labs" | "mental" | "conditions" | "hrp" | "supplements";
  /** Not compared to totalWomenAttendedAnc for ≤ rule */
  isTabletField: boolean;
  /** IFA per woman — hard cap 180 */
  isIfaPerWoman: boolean;
};

/** Integer metric fields only (remarks excluded). */
export type ParityIntFields = {
  totalWomenAttendedAnc: number | null;
  noOfWomenObserved: number | null;
  mcpCardProvided: number | null;
  womenRegisteredIn1stTrimester: number | null;
  broughtMcpCard: number | null;
  mcpCardDulyFilled: number | null;
  trimesterFirst: number | null;
  trimesterSecond: number | null;
  trimesterThird: number | null;
  td1: number | null;
  td2: number | null;
  tdBooster: number | null;
  height: number | null;
  weightMeasuredFirstTrimester: number | null;
  bmiCalculatedFirstTrimester: number | null;
  womenBmiLte185: number | null;
  womenBmi185To2499: number | null;
  womenBmiGte25: number | null;
  weightMeasuredSecondTrimester: number | null;
  weightMeasuredThirdTrimester: number | null;
  bpMeasuredFirstTrimester: number | null;
  bpMeasuredSecondTrimester: number | null;
  bpMeasuredThirdTrimester: number | null;
  hbByCbcFirstVisit: number | null;
  bloodGroupingFirstVisit: number | null;
  hbEveryVisit: number | null;
  tshFirstVisit: number | null;
  ogttFirstVisit: number | null;
  rbsFirstVisit: number | null;
  urineRe: number | null;
  hbsag: number | null;
  hiv: number | null;
  vdrl: number | null;
  usg: number | null;
  tbScreening: number | null;
  phq2Administered: number | null;
  phqScore0To2: number | null;
  phqScore3To5: number | null;
  counsellingProvided: number | null;
  phqScore6: number | null;
  referral: number | null;
  mildAnemia: number | null;
  moderateAnemia: number | null;
  severeAnemia: number | null;
  hypertensive: number | null;
  gdm: number | null;
  hypothyroidism: number | null;
  hyperthyroidism: number | null;
  abdominalExamination: number | null;
  hrpIdentification: number | null;
  hrpRedCardCount: number | null;
  womenReferredHigherFacilities: number | null;
  womenManagedHighRisk: number | null;
  pwGivenFaFirstTrimester: number | null;
  pwGivenAlbendazoleSecondTrimester: number | null;
  pwProvidedIfaTabletsSecondTrimester: number | null;
  ifaTabletsPerWoman: number | null;
  womenCalciumVitaminD: number | null;
};

export const PARITY_INT_KEYS = [
  "totalWomenAttendedAnc",
  "noOfWomenObserved",
  "mcpCardProvided",
  "womenRegisteredIn1stTrimester",
  "broughtMcpCard",
  "mcpCardDulyFilled",
  "trimesterFirst",
  "trimesterSecond",
  "trimesterThird",
  "td1",
  "td2",
  "tdBooster",
  "height",
  "weightMeasuredFirstTrimester",
  "bmiCalculatedFirstTrimester",
  "womenBmiLte185",
  "womenBmi185To2499",
  "womenBmiGte25",
  "weightMeasuredSecondTrimester",
  "weightMeasuredThirdTrimester",
  "bpMeasuredFirstTrimester",
  "bpMeasuredSecondTrimester",
  "bpMeasuredThirdTrimester",
  "hbByCbcFirstVisit",
  "bloodGroupingFirstVisit",
  "hbEveryVisit",
  "tshFirstVisit",
  "ogttFirstVisit",
  "rbsFirstVisit",
  "urineRe",
  "hbsag",
  "hiv",
  "vdrl",
  "usg",
  "tbScreening",
  "phq2Administered",
  "phqScore0To2",
  "phqScore3To5",
  "counsellingProvided",
  "phqScore6",
  "referral",
  "mildAnemia",
  "moderateAnemia",
  "severeAnemia",
  "hypertensive",
  "gdm",
  "hypothyroidism",
  "hyperthyroidism",
  "abdominalExamination",
  "hrpIdentification",
  "hrpRedCardCount",
  "womenReferredHigherFacilities",
  "womenManagedHighRisk",
  "pwGivenFaFirstTrimester",
  "pwGivenAlbendazoleSecondTrimester",
  "pwProvidedIfaTabletsSecondTrimester",
  "ifaTabletsPerWoman",
  "womenCalciumVitaminD",
] as const;

export const PARITY_INDICATORS: ParityIndicatorMeta[] = [
  { key: "totalWomenAttendedAnc", label: "Total women who attended the ANC", section: "attendance", isTabletField: false, isIfaPerWoman: false },
  { key: "noOfWomenObserved", label: "No. of women observed", section: "attendance", isTabletField: false, isIfaPerWoman: false },
  { key: "mcpCardProvided", label: "MCP card provided", section: "anc_process", isTabletField: false, isIfaPerWoman: false },
  { key: "womenRegisteredIn1stTrimester", label: "Number of women registered in 1st trimester", section: "anc_process", isTabletField: false, isIfaPerWoman: false },
  { key: "broughtMcpCard", label: "Brought MCP card", section: "anc_process", isTabletField: false, isIfaPerWoman: false },
  { key: "mcpCardDulyFilled", label: "MCP card duly filled", section: "anc_process", isTabletField: false, isIfaPerWoman: false },
  { key: "trimesterFirst", label: "1st trimester", section: "trimester", isTabletField: false, isIfaPerWoman: false },
  { key: "trimesterSecond", label: "2nd Trimester", section: "trimester", isTabletField: false, isIfaPerWoman: false },
  { key: "trimesterThird", label: "3rd Trimester", section: "trimester", isTabletField: false, isIfaPerWoman: false },
  { key: "td1", label: "Td 1", section: "trimester", isTabletField: false, isIfaPerWoman: false },
  { key: "td2", label: "Td 2", section: "trimester", isTabletField: false, isIfaPerWoman: false },
  { key: "tdBooster", label: "Td booster", section: "trimester", isTabletField: false, isIfaPerWoman: false },
  { key: "height", label: "Height", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "weightMeasuredFirstTrimester", label: "Weight measured in first trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "bmiCalculatedFirstTrimester", label: "BMI Calculated in 1st trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "womenBmiLte185", label: "Number of women with BMI≤18.5 kg/m²", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "womenBmi185To2499", label: "Number of women with BMI 18.5 to 24.99 kg/m²", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "womenBmiGte25", label: "Number of women with BMI ≥25 kg/m²", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "weightMeasuredSecondTrimester", label: "Weight measured in 2nd trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "weightMeasuredThirdTrimester", label: "Weight measured in 3rd trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "bpMeasuredFirstTrimester", label: "BP measured in 1st trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "bpMeasuredSecondTrimester", label: "BP measured in 2nd trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "bpMeasuredThirdTrimester", label: "BP measured in 3rd trimester", section: "vitals", isTabletField: false, isIfaPerWoman: false },
  { key: "hbByCbcFirstVisit", label: "Hb by CBC at first visit", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "bloodGroupingFirstVisit", label: "Blood Grouping at first visit", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "hbEveryVisit", label: "Hb at every visit", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "tshFirstVisit", label: "TSH at first visit", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "ogttFirstVisit", label: "OGTT at first visit", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "rbsFirstVisit", label: "RBS at first visit", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "urineRe", label: "Urine R/E", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "hbsag", label: "HbsAg", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "hiv", label: "HIV", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "vdrl", label: "VDRL", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "usg", label: "USG", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "tbScreening", label: "TB screening", section: "labs", isTabletField: false, isIfaPerWoman: false },
  { key: "phq2Administered", label: "PHQ2 administered", section: "mental", isTabletField: false, isIfaPerWoman: false },
  { key: "phqScore0To2", label: "PHQ score 0-2", section: "mental", isTabletField: false, isIfaPerWoman: false },
  { key: "phqScore3To5", label: "PHQ score 3-5", section: "mental", isTabletField: false, isIfaPerWoman: false },
  { key: "counsellingProvided", label: "Counselling provided", section: "mental", isTabletField: false, isIfaPerWoman: false },
  { key: "phqScore6", label: "PHQ score 6", section: "mental", isTabletField: false, isIfaPerWoman: false },
  { key: "referral", label: "Referral", section: "mental", isTabletField: false, isIfaPerWoman: false },
  { key: "mildAnemia", label: "Mild anemia", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "moderateAnemia", label: "Moderate anemia", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "severeAnemia", label: "Severe anemia", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "hypertensive", label: "Hypertensive", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "gdm", label: "GDM", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "hypothyroidism", label: "Hypothyroidism", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "hyperthyroidism", label: "Hyperthyroidism", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "abdominalExamination", label: "Abdominal examination", section: "conditions", isTabletField: false, isIfaPerWoman: false },
  { key: "hrpIdentification", label: "HRP identification", section: "hrp", isTabletField: false, isIfaPerWoman: false },
  { key: "hrpRedCardCount", label: "Number of HRP provided with red card", section: "hrp", isTabletField: false, isIfaPerWoman: false },
  { key: "womenReferredHigherFacilities", label: "Number of women referred to higher facilities", section: "hrp", isTabletField: false, isIfaPerWoman: false },
  { key: "womenManagedHighRisk", label: "Number of women managed for high risk conditions", section: "hrp", isTabletField: false, isIfaPerWoman: false },
  { key: "pwGivenFaFirstTrimester", label: "No of PW given FA in 1st trimester", section: "supplements", isTabletField: false, isIfaPerWoman: false },
  { key: "pwGivenAlbendazoleSecondTrimester", label: "No. of PW given Albendazole in 2nd trimester", section: "supplements", isTabletField: false, isIfaPerWoman: false },
  { key: "pwProvidedIfaTabletsSecondTrimester", label: "Number of PW provided with IFA tablets from 2nd trimester", section: "supplements", isTabletField: true, isIfaPerWoman: false },
  { key: "ifaTabletsPerWoman", label: "Number of IFA tablets given to each PW", section: "supplements", isTabletField: true, isIfaPerWoman: true },
  { key: "womenCalciumVitaminD", label: "Number of women provided with Calcium and Vitamin D", section: "supplements", isTabletField: false, isIfaPerWoman: false },
];

export const PARITY_SECTION_LABEL: Record<ParityIndicatorMeta["section"], string> = {
  attendance: "Attendance & coverage",
  anc_process: "ANC process — MCP",
  trimester: "Trimester & immunisation",
  vitals: "Anthropometry & BP",
  labs: "Investigations",
  mental: "Mental health (PHQ)",
  conditions: "Conditions identified",
  hrp: "High-risk pregnancy",
  supplements: "Supplements & deworming",
};
