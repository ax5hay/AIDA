import type { FacilityAssessmentIntelligenceRow } from "./assessment-selects";

export type ExtractedValue =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string };

function n(v: number | null | undefined): ExtractedValue | null {
  if (v === null || v === undefined) return null;
  return { kind: "number", value: v };
}

/** Pull one metric value from an intelligence row (same linkage: one assessment). */
export function extractComparisonMetric(row: FacilityAssessmentIntelligenceRow, id: string): ExtractedValue | null {
  const pwrs = row.pregnantWomenRegisteredAndScreened;
  const pwid = row.pregnantWomenIdentified;
  const del = row.deliveryAndOutcomes;
  const pci = row.preconceptionWomenIdentified;
  const pcm = row.preconceptionWomenManaged;
  const inf = row.infants0To24Months;
  const pn = row.postnatalWomen;

  switch (id) {
    case "meta.period_month":
      return { kind: "string", value: row.periodStart.toISOString().slice(0, 7) };
    case "facility.district":
      return { kind: "string", value: row.facility?.district ?? "—" };
    case "pwrs.total_anc_registered":
      return n(pwrs?.total_anc_registered);
    case "pwrs.hiv_tested":
      return n(pwrs?.hiv_tested);
    case "pwrs.hemoglobin_tested_4_times":
      return n(pwrs?.hemoglobin_tested_4_times);
    case "pwrs.blood_pressure_checked":
      return n(pwrs?.blood_pressure_checked);
    case "pwrs.gdm_ogtt_tested":
      return n(pwrs?.gdm_ogtt_tested);
    case "pwid.diabetes_mellitus":
      return n(pwid?.diabetes_mellitus);
    case "pwid.severe_anemia_preg":
      return n(pwid?.severe_anemia_hb_lt_7);
    case "pwid.moderate_anemia_preg":
      return n(pwid?.moderate_anemia_hb_7_to_9_9);
    case "delivery.live_births":
      return n(del?.live_births);
    case "delivery.maternal_deaths":
      return n(del?.maternal_deaths);
    case "delivery.lbw_lt_2500g":
      return n(del?.lbw_lt_2500g);
    case "delivery.preterm_births_lt_37_weeks":
      return n(del?.preterm_births_lt_37_weeks);
    case "delivery.early_neonatal_deaths_lt_24hrs":
      return n(del?.early_neonatal_deaths_lt_24hrs);
    case "ratio.hiv_per_anc": {
      const anc = pwrs?.total_anc_registered ?? 0;
      const hiv = pwrs?.hiv_tested ?? 0;
      if (!pwrs) return null;
      return { kind: "number", value: hiv / Math.max(1, anc) };
    }
    case "ratio.lbw_per_live_birth": {
      const lb = del?.live_births ?? 0;
      const lbw = del?.lbw_lt_2500g ?? 0;
      if (!del) return null;
      return { kind: "number", value: lbw / Math.max(1, lb) };
    }
    case "pci.anemia_identified_sum":
      if (!pci) return null;
      return {
        kind: "number",
        value: (pci.severe_anemia_hb_lt_8 ?? 0) + (pci.moderate_anemia_hb_8_to_11_99 ?? 0),
      };
    case "pcm.anemia_managed_sum":
      if (!pcm) return null;
      return {
        kind: "number",
        value: (pcm.severe_anemia_hb_lt_8 ?? 0) + (pcm.moderate_anemia_hb_8_to_11_99 ?? 0),
      };
    case "infant.fully_immunized_12_23_months":
      return n(inf?.fully_immunized_12_23_months);
    case "infant.ebf_0_6_months":
      return n(inf?.ebf_0_6_months);
    case "postnatal.postpartum_checkup_48h_to_14d":
      return n(pn?.postpartum_checkup_48h_to_14d);
    case "postnatal.hbnc_visits":
      return n(pn?.hbnc_visits);
    default:
      return null;
  }
}
