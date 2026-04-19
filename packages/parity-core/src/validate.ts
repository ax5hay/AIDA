import type { ParityIndicatorMeta } from "./indicators.js";
import { PARITY_INDICATORS, PARITY_INT_KEYS } from "./indicators.js";
import type { ParityCreateBody } from "./schema.js";

export type ParityValidationIssue = {
  code: string;
  field?: string;
  message: string;
  severity: "error" | "warning";
};

const metaByKey = new Map<string, ParityIndicatorMeta>(PARITY_INDICATORS.map((m) => [m.key, m]));

/** Not capped by `≤ total women attended` (tablet counts / repeat Hb tests). */
const EXCLUDE_LE_TOTAL = new Set<string>([
  "pwProvidedIfaTabletsSecondTrimester",
  "ifaTabletsPerWoman",
  "hbEveryVisit",
]);

function nn(v: number | null | undefined): number {
  return v ?? 0;
}

/**
 * Programme cross-field rules for ANC capture. Errors block saves.
 */
export function validateParityBusinessRules(body: ParityCreateBody): ParityValidationIssue[] {
  const issues: ParityValidationIssue[] = [];
  const err = (code: string, message: string, field?: string) =>
    issues.push({ code, message, field, severity: "error" });

  const d = body.totalWomenAttendedAnc;

  // --- Attendance & coverage ---
  if (body.noOfWomenObserved != null && d != null && body.noOfWomenObserved > d) {
    err("OBSERVED_EXCEEDS_ATTENDED", "No. of women observed cannot exceed total women who attended ANC.", "noOfWomenObserved");
  }

  // --- ANC process — MCP ---
  const mcpProv = body.mcpCardProvided;
  const mcpBrought = body.broughtMcpCard;
  const mcpDuly = body.mcpCardDulyFilled;
  if (mcpDuly != null) {
    const mcpSum = nn(mcpProv) + nn(mcpBrought);
    if (mcpDuly > mcpSum) {
      err(
        "MCP_DULY_EXCEEDS_PROVIDED_PLUS_BROUGHT",
        "MCP card duly filled cannot exceed MCP card provided plus brought MCP card.",
        "mcpCardDulyFilled",
      );
    }
  }

  // --- Trimester & immunisation ---
  const t1 = body.trimesterFirst;
  const t2 = body.trimesterSecond;
  const t3 = body.trimesterThird;
  if (d != null && t1 != null && t2 != null && t3 != null && nn(t1) + nn(t2) + nn(t3) < d) {
    err(
      "TRIMESTER_SUM_BELOW_TOTAL",
      "1st + 2nd + 3rd trimester counts should be at least total women who attended ANC (repeat visits across trimesters are allowed).",
      "trimesterFirst",
    );
  }

  const td1 = body.td1;
  const td2 = body.td2;
  const tdB = body.tdBooster;
  if (td1 != null && td2 != null && td2 > td1) {
    err("TD2_EXCEEDS_TD1", "Td 2 cannot exceed Td 1.", "td2");
  }
  if (td2 != null && tdB != null && tdB > td2) {
    err("TD_BOOSTER_EXCEEDS_TD2", "Td booster cannot exceed Td 2.", "tdBooster");
  }

  // --- Anthropometry & BP ---
  const bmiCalc = body.bmiCalculatedFirstTrimester;
  const w1 = body.weightMeasuredFirstTrimester;
  const b1 = body.womenBmiLte185;
  const b2 = body.womenBmi185To2499;
  const b3 = body.womenBmiGte25;
  const bmiBandSum = nn(b1) + nn(b2) + nn(b3);

  if (bmiCalc == null && bmiBandSum > 0) {
    err(
      "BMI_CALC_REQUIRED_WITH_BANDS",
      "BMI calculated in 1st trimester is required when any BMI category count is entered.",
      "bmiCalculatedFirstTrimester",
    );
  }
  if (bmiCalc != null && bmiBandSum !== bmiCalc) {
    err(
      "BMI_BAND_SUM_MISMATCH",
      `Underweight + normal + overweight BMI counts (${bmiBandSum}) must equal BMI calculated in 1st trimester (${bmiCalc}).`,
      "womenBmiLte185",
    );
  }
  if (bmiCalc != null && w1 != null && bmiCalc > w1) {
    err(
      "BMI_CALC_EXCEEDS_WEIGHT_MEASURED",
      "BMI calculated in 1st trimester cannot exceed weight measured in first trimester.",
      "bmiCalculatedFirstTrimester",
    );
  }
  if (w1 != null && t1 != null && w1 > t1) {
    err(
      "WEIGHT_1ST_EXCEEDS_TRIMESTER_1",
      "Weight measured in first trimester cannot exceed 1st trimester count.",
      "weightMeasuredFirstTrimester",
    );
  }
  const w2 = body.weightMeasuredSecondTrimester;
  const w3 = body.weightMeasuredThirdTrimester;
  if (w2 != null && t2 != null && w2 > t2) {
    err(
      "WEIGHT_2ND_EXCEEDS_TRIMESTER_2",
      "Weight measured in 2nd trimester cannot exceed 2nd trimester count.",
      "weightMeasuredSecondTrimester",
    );
  }
  if (w3 != null && t3 != null && w3 > t3) {
    err(
      "WEIGHT_3RD_EXCEEDS_TRIMESTER_3",
      "Weight measured in 3rd trimester cannot exceed 3rd trimester count.",
      "weightMeasuredThirdTrimester",
    );
  }

  const bp1 = body.bpMeasuredFirstTrimester;
  const bp2 = body.bpMeasuredSecondTrimester;
  const bp3 = body.bpMeasuredThirdTrimester;
  if (bp1 != null && t1 != null && bp1 > t1) {
    err("BP_1ST_EXCEEDS_TRIMESTER_1", "BP measured in 1st trimester cannot exceed 1st trimester count.", "bpMeasuredFirstTrimester");
  }
  if (bp2 != null && t2 != null && bp2 > t2) {
    err("BP_2ND_EXCEEDS_TRIMESTER_2", "BP measured in 2nd trimester cannot exceed 2nd trimester count.", "bpMeasuredSecondTrimester");
  }
  if (bp3 != null && t3 != null && bp3 > t3) {
    err("BP_3RD_EXCEEDS_TRIMESTER_3", "BP measured in 3rd trimester cannot exceed 3rd trimester count.", "bpMeasuredThirdTrimester");
  }

  // --- Investigations ---
  const hbCbc = body.hbByCbcFirstVisit;
  const hbEv = body.hbEveryVisit;
  if (hbCbc != null && hbEv != null && hbEv < hbCbc) {
    err("HB_EVERY_LT_FIRST", "Hb at every visit cannot be less than Hb by CBC at first visit (repeat testing is allowed).", "hbEveryVisit");
  }

  // --- Mental health (PHQ) ---
  const phqAdm = body.phq2Administered;
  const p0 = body.phqScore0To2;
  const p3 = body.phqScore3To5;
  const p6 = body.phqScore6;
  const phqSum = nn(p0) + nn(p3) + nn(p6);

  if (phqAdm == null && phqSum > 0) {
    err("PHQ_ADMIN_REQUIRED", "PHQ2 administered is required when any PHQ score band is entered.", "phq2Administered");
  }
  if (phqAdm != null && phqSum > phqAdm) {
    err("PHQ_BANDS_EXCEED_ADMINISTERED", "PHQ score 0–2 + 3–5 + 6 cannot exceed PHQ2 administered.", "phqScore0To2");
  }
  if (phqAdm != null) {
    if (p0 != null && p0 > phqAdm) {
      err("PHQ0_EXCEEDS_ADMIN", "PHQ score 0–2 cannot exceed PHQ2 administered.", "phqScore0To2");
    }
    if (p3 != null && p3 > phqAdm) {
      err("PHQ3_EXCEEDS_ADMIN", "PHQ score 3–5 cannot exceed PHQ2 administered.", "phqScore3To5");
    }
    if (p6 != null && p6 > phqAdm) {
      err("PHQ6_EXCEEDS_ADMIN", "PHQ score 6 cannot exceed PHQ2 administered.", "phqScore6");
    }
    const couns = body.counsellingProvided;
    if (couns != null && couns > phqAdm) {
      err("COUNSELLING_EXCEEDS_PHQ", "Counselling provided cannot exceed PHQ2 administered.", "counsellingProvided");
    }
    const ref = body.referral;
    if (ref != null && ref > phqAdm) {
      err("REFERRAL_EXCEEDS_PHQ", "Referral cannot exceed PHQ2 administered.", "referral");
    }
  }

  // --- Conditions (anemia mutually exclusive aggregate) ---
  const mild = body.mildAnemia;
  const mod = body.moderateAnemia;
  const sev = body.severeAnemia;
  const anemiaSum = nn(mild) + nn(mod) + nn(sev);
  if (d != null && anemiaSum > d) {
    err("ANEMIA_SUM_EXCEEDS_TOTAL", "Mild + moderate + severe anemia counts cannot exceed total women who attended ANC.", "mildAnemia");
  }

  // --- High-risk pregnancy ---
  const hrpId = body.hrpIdentification;
  if (body.hrpRedCardCount != null && hrpId != null && body.hrpRedCardCount > hrpId) {
    err("HRP_RED_EXCEEDS_ID", "HRP red card count cannot exceed HRP identification.", "hrpRedCardCount");
  }
  if (body.womenReferredHigherFacilities != null && hrpId != null && body.womenReferredHigherFacilities > hrpId) {
    err("HRP_REFERRED_EXCEEDS_ID", "Women referred to higher facilities cannot exceed HRP identification.", "womenReferredHigherFacilities");
  }
  if (body.womenManagedHighRisk != null && hrpId != null && body.womenManagedHighRisk > hrpId) {
    err("HRP_MANAGED_EXCEEDS_ID", "Women managed for high risk cannot exceed HRP identification.", "womenManagedHighRisk");
  }

  // --- Supplements & deworming ---
  if (body.pwGivenFaFirstTrimester != null && t1 != null && body.pwGivenFaFirstTrimester > t1) {
    err("FA_1ST_EXCEEDS_TRIM1", "PW given FA in 1st trimester cannot exceed 1st trimester count.", "pwGivenFaFirstTrimester");
  }
  if (body.pwGivenAlbendazoleSecondTrimester != null && t2 != null && body.pwGivenAlbendazoleSecondTrimester > t2) {
    err(
      "ALB_2ND_EXCEEDS_TRIM2",
      "PW given albendazole in 2nd trimester cannot exceed 2nd trimester count.",
      "pwGivenAlbendazoleSecondTrimester",
    );
  }

  // --- Cross-category: numerators ≤ total (except tablet fields & hb every visit) ---
  if (d != null) {
    for (const key of PARITY_INT_KEYS) {
      if (key === "totalWomenAttendedAnc") continue;
      if (EXCLUDE_LE_TOTAL.has(key)) continue;
      const v = body[key];
      if (v == null) continue;
      if (v > d) {
        err(
          "NUMERATOR_EXCEEDS_DENOMINATOR",
          `${metaByKey.get(key)?.label ?? key} cannot exceed total women who attended ANC (${d}).`,
          key,
        );
      }
    }
  }

  return issues;
}
