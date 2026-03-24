import {
  bottleneckStageIndex,
  funnelMetrics,
  type FunnelStageInput,
  type FunnelStageMetric,
} from "./intelligence";
import {
  PRECONCEPTION_INTERVENTIONS_FIELDS,
  PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS,
  PREGNANT_WOMEN_IDENTIFIED_FIELDS,
} from "./sections";

export type SectionTotals = {
  preconceptionIdentified: Record<string, number>;
  preconceptionInterventions: Record<string, number>;
  preconceptionManaged: Record<string, number>;
  pregnantRegisteredScreened: Record<string, number>;
  pregnantIdentified: Record<string, number>;
  pregnantManaged: Record<string, number>;
  deliveryOutcomes: Record<string, number>;
  postnatalWomen: Record<string, number>;
  infants: Record<string, number>;
};

function sumKeys(totals: Record<string, number>, keys: readonly string[]): number {
  let s = 0;
  for (const k of keys) s += totals[k] ?? 0;
  return s;
}

/** Preconception: Identified → Intervention (sum of program touches) → Managed */
export function preconceptionPipelineStages(t: SectionTotals): FunnelStageInput[] {
  const identified = sumKeys(t.preconceptionIdentified, PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const intervention = sumKeys(t.preconceptionInterventions, PRECONCEPTION_INTERVENTIONS_FIELDS as unknown as string[]);
  const managed = sumKeys(t.preconceptionManaged, PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  return [
    { id: "identified", label: "Identified (conditions summed)", count: identified },
    { id: "intervention", label: "Intervention (IFA + counselling)", count: intervention },
    { id: "managed", label: "Managed (cohort)", count: managed },
  ];
}

/**
 * Pregnancy: Registered → Screened (Hb×4 depth) → Identified → Managed → Delivery outcome (live births)
 * Note: stages use different section tables; interpret as reporting-volume chain, not individual tracing.
 */
export function pregnancyPipelineStages(t: SectionTotals): FunnelStageInput[] {
  const reg = t.pregnantRegisteredScreened.total_anc_registered ?? 0;
  const screened = t.pregnantRegisteredScreened.hemoglobin_tested_4_times ?? 0;
  const identified = sumKeys(t.pregnantIdentified, PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const managed = sumKeys(t.pregnantManaged, PREGNANT_WOMEN_IDENTIFIED_FIELDS as unknown as string[]);
  const live = t.deliveryOutcomes.live_births ?? 0;
  return [
    { id: "registered", label: "ANC registered", count: reg },
    { id: "screened", label: "Hb tested 4× (screening depth)", count: screened },
    { id: "identified", label: "Identified (conditions summed)", count: identified },
    { id: "managed", label: "Managed (cohort)", count: managed },
    { id: "delivery_outcome", label: "Live births (outcome)", count: live },
  ];
}

/** Postnatal: Delivery → Checkup → HBNC → Recovery bundle */
export function postnatalPipelineStages(t: SectionTotals): FunnelStageInput[] {
  const del = t.deliveryOutcomes.registered_mothers_delivered ?? 0;
  const check = t.postnatalWomen.postpartum_checkup_48h_to_14d ?? 0;
  const hbnc = t.postnatalWomen.hbnc_visits ?? 0;
  const recovery =
    (t.postnatalWomen.nutrition_supplements ?? 0) +
    (t.postnatalWomen.kmc_provided ?? 0) +
    (t.postnatalWomen.nutrition_counselling ?? 0) +
    (t.postnatalWomen.ifa_given ?? 0);
  return [
    { id: "delivery", label: "Mothers delivered (registered)", count: del },
    { id: "checkup", label: "Postpartum checkup 48h–14d", count: check },
    { id: "hbnc", label: "HBNC visits", count: hbnc },
    { id: "recovery", label: "Recovery support (nutrition + KMC + IFA)", count: recovery },
  ];
}

/** Infant: Birth → Nutrition → Growth → Immunization */
export function infantPipelineStages(t: SectionTotals): FunnelStageInput[] {
  const birth = t.deliveryOutcomes.live_births ?? 0;
  const nutrition = (t.infants.ebf_0_6_months ?? 0) + (t.infants.ifa_6_24_months ?? 0);
  const growth =
    (t.infants.adequate_weight_gain_0_24_months ?? 0) +
    (t.infants.inadequate_weight_gain_6_12_months ?? 0) +
    (t.infants.inadequate_weight_gain_12_24_months ?? 0);
  const imm = t.infants.fully_immunized_12_23_months ?? 0;
  return [
    { id: "birth", label: "Live births (cohort entry)", count: birth },
    { id: "nutrition", label: "Nutrition (EBF + IFA 6–24m)", count: nutrition },
    { id: "growth", label: "Growth tracking (wt gain flags)", count: growth },
    { id: "immunization", label: "Fully immunized 12–23m", count: imm },
  ];
}

export type PipelineBundle = {
  key: "preconception" | "pregnancy" | "postnatal" | "infant";
  label: string;
  stages: FunnelStageMetric[];
  bottleneckIndex: number | null;
  bottleneckId: string | null;
};

export function buildAllPipelines(t: SectionTotals): PipelineBundle[] {
  const defs: Array<{ key: PipelineBundle["key"]; label: string; stages: FunnelStageInput[] }> = [
    { key: "preconception", label: "Preconception", stages: preconceptionPipelineStages(t) },
    { key: "pregnancy", label: "Pregnancy", stages: pregnancyPipelineStages(t) },
    { key: "postnatal", label: "Postnatal", stages: postnatalPipelineStages(t) },
    { key: "infant", label: "Infant", stages: infantPipelineStages(t) },
  ];
  return defs.map((d) => {
    const m = funnelMetrics(d.stages);
    const bi = bottleneckStageIndex(m);
    return {
      key: d.key,
      label: d.label,
      stages: m,
      bottleneckIndex: bi,
      bottleneckId: bi !== null ? m[bi]?.id ?? null : null,
    };
  });
}
