import type { FieldMetric } from "./aggregate";

const DELIVERY_LIVE_BIRTH_RATE_FIELDS = new Set([
  "maternal_deaths",
  "vlbw_lt_1500g",
  "lbw_lt_2500g",
  "preterm_births_lt_37_weeks",
  "early_neonatal_deaths_lt_24hrs",
  "corticosteroids_given_preterm",
]);

const DELIVERY_SITE_FIELDS = new Set([
  "institutional_delivery_facility",
  "institutional_delivery_other",
  "home_deliveries",
]);

function sumKeys(totals: Record<string, number>, keys: readonly string[]): number {
  return keys.reduce((s, k) => s + (totals[k] ?? 0), 0);
}

/**
 * Field metric cards: each row shows count + % vs an explicit denominator.
 *
 * - **ANC (registered & screened)**: every field except `total_anc_registered` uses Σ total_anc_registered as denom;
 *   `total_anc_registered` is the pool (no % vs self).
 * - **Identification / intervention / high-risk / infants / postnatal**: denom = Σ all fields in the section
 *   (share of recorded workload in that section; counts may overlap women across conditions).
 * - **Delivery & outcomes**: per-field — mortality/LBW/preterm vs live_births; site mix vs Σ(institutional+institutional_other+home);
 *   reference-only fields skip %.
 */
export function buildFieldMetricsForSection(
  section: string,
  totals: Record<string, number>,
  keys: readonly string[],
): FieldMetric[] {
  if (section === "pregnant_women_registered_and_screened") {
    const anc = totals.total_anc_registered ?? 0;
    return keys.map((field) => {
      if (field === "total_anc_registered") {
        return {
          field,
          absolute: totals[field] ?? 0,
          pctOfDenominator: null,
          denominator: anc > 0 ? anc : null,
          denominatorNote: "Denominator pool for screening rows below (Σ total_anc_registered).",
        };
      }
      return {
        field,
        absolute: totals[field] ?? 0,
        pctOfDenominator: anc > 0 ? ((totals[field] ?? 0) / anc) * 100 : null,
        denominator: anc > 0 ? anc : null,
        denominatorNote: "÷ Σ total_anc_registered (same reporting window).",
      };
    });
  }

  if (section === "delivery_and_outcomes") {
    const lb = totals.live_births ?? 0;
    const siteSum =
      (totals.institutional_delivery_facility ?? 0) +
      (totals.institutional_delivery_other ?? 0) +
      (totals.home_deliveries ?? 0);

    return keys.map((field) => {
      const abs = totals[field] ?? 0;

      if (field === "live_births") {
        return {
          field,
          absolute: abs,
          pctOfDenominator: null,
          denominator: lb > 0 ? lb : null,
          denominatorNote: "Outcome numerator; rates below use live_births as denominator.",
        };
      }

      if (DELIVERY_LIVE_BIRTH_RATE_FIELDS.has(field)) {
        return {
          field,
          absolute: abs,
          pctOfDenominator: lb > 0 ? (abs / lb) * 100 : null,
          denominator: lb > 0 ? lb : null,
          denominatorNote: "÷ live_births (per-birth rate).",
        };
      }

      if (DELIVERY_SITE_FIELDS.has(field)) {
        return {
          field,
          absolute: abs,
          pctOfDenominator: siteSum > 0 ? (abs / siteSum) * 100 : null,
          denominator: siteSum > 0 ? siteSum : null,
          denominatorNote: "÷ Σ(institutional facility + institutional other + home).",
        };
      }

      if (field === "registered_mothers_delivered") {
        return {
          field,
          absolute: abs,
          pctOfDenominator: null,
          denominator: abs > 0 ? abs : null,
          denominatorNote: "Registration count (not a rate numerator in this grid).",
        };
      }

      const sectionSum = sumKeys(totals, keys);
      return {
        field,
        absolute: abs,
        pctOfDenominator: sectionSum > 0 ? (abs / sectionSum) * 100 : null,
        denominator: sectionSum > 0 ? sectionSum : null,
        denominatorNote: "÷ Σ all fields in delivery & outcomes (mix).",
      };
    });
  }

  const sectionSum = sumKeys(totals, keys);
  const note =
    "÷ Σ all counts in this section (each condition’s share of the summed workload; one woman may appear in multiple fields).";

  return keys.map((field) => ({
    field,
    absolute: totals[field] ?? 0,
    pctOfDenominator: sectionSum > 0 ? ((totals[field] ?? 0) / sectionSum) * 100 : null,
    denominator: sectionSum > 0 ? sectionSum : null,
    denominatorNote: note,
  }));
}

/** Per-month bucket: same denominator rules as `buildFieldMetricsForSection` for time-series % */
export function monthlyDenominatorForField(
  section: string,
  field: string,
  t: Record<string, number>,
  keys: readonly string[],
): number | null {
  if (section === "pregnant_women_registered_and_screened") {
    const anc = t.total_anc_registered ?? 0;
    if (field === "total_anc_registered") return null;
    return anc > 0 ? anc : null;
  }

  if (section === "delivery_and_outcomes") {
    const lb = t.live_births ?? 0;
    const siteSum =
      (t.institutional_delivery_facility ?? 0) +
      (t.institutional_delivery_other ?? 0) +
      (t.home_deliveries ?? 0);

    if (field === "live_births" || field === "registered_mothers_delivered") return null;
    if (DELIVERY_LIVE_BIRTH_RATE_FIELDS.has(field)) return lb > 0 ? lb : null;
    if (DELIVERY_SITE_FIELDS.has(field)) return siteSum > 0 ? siteSum : null;
    const sectionSum = sumKeys(t, keys);
    return sectionSum > 0 ? sectionSum : null;
  }

  const sectionSum = sumKeys(t, keys);
  return sectionSum > 0 ? sectionSum : null;
}
