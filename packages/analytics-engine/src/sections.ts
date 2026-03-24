/**
 * Canonical field lists — must match Prisma schema exactly (single source of truth).
 */
export const PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS = [
  "rti_sti",
  "tb",
  "epilepsy",
  "syphilis",
  "hypothyroidism_tsh_gt_5_5",
  "hyperthyroidism_tsh_lt_0_4",
  "hypertension",
  "hypotension",
  "prediabetes_hba1c_5_7_to_6_4",
  "diabetes_hba1c_gte_6_5",
  "bmi_lt_16",
  "bmi_16_to_18_49",
  "bmi_18_5_to_lt_21",
  "severe_anemia_hb_lt_8",
  "moderate_anemia_hb_8_to_11_99",
  "depressive_symptoms",
] as const;

export const PRECONCEPTION_INTERVENTIONS_FIELDS = [
  "ifa_given",
  "nutrition_counselling",
  "wash_counselling",
] as const;

export const PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS = [
  "total_anc_registered",
  "blood_grouping",
  "cbc_tested",
  "hiv_tested",
  "syphilis_tested",
  "urine_routine_microscopy",
  "thyroid_tsh_tested",
  "gdm_ogtt_tested",
  "blood_pressure_checked",
  "height_measured_first_trimester",
  "weight_measured_first_trimester",
  "weight_measured_all_trimesters",
  "phq2_each_trimester",
  "hemoglobin_tested_4_times",
] as const;

export const PREGNANT_WOMEN_IDENTIFIED_FIELDS = [
  "hiv",
  "syphilis",
  "hypothyroidism",
  "hyperthyroidism",
  "hypertension",
  "hypotension",
  "diabetes_mellitus",
  "bmi_lt_18_5",
  "bmi_lt_25",
  "inadequate_gestational_weight_gain",
  "severe_anemia_hb_lt_7",
  "moderate_anemia_hb_7_to_9_9",
  "depressive_symptoms",
  "other_medical_conditions",
] as const;

export const HIGH_RISK_PREGNANCY_FIELDS = [
  "multiple_pregnancy",
  "boh_history",
  "infections",
  "other_medical_conditions",
] as const;

export const DELIVERY_AND_OUTCOMES_FIELDS = [
  "corticosteroids_given_preterm",
  "registered_mothers_delivered",
  "institutional_delivery_facility",
  "institutional_delivery_other",
  "home_deliveries",
  "maternal_deaths",
  "live_births",
  "vlbw_lt_1500g",
  "lbw_lt_2500g",
  "preterm_births_lt_37_weeks",
  "early_neonatal_deaths_lt_24hrs",
] as const;

export const INFANTS_0_TO_24_MONTHS_FIELDS = [
  "ebf_0_6_months",
  "lbw_vlbw_iron_0_6_months",
  "vitamin_d_0_6_months",
  "preterm_calcium_vitd",
  "ifa_6_24_months",
  "inadequate_weight_gain_6_12_months",
  "inadequate_weight_gain_12_24_months",
  "adequate_weight_gain_0_24_months",
  "wash_counselling_parents",
  "fully_immunized_12_23_months",
] as const;

export const POSTNATAL_WOMEN_FIELDS = [
  "newborns_screened_rbsk",
  "postpartum_checkup_48h_to_14d",
  "hbnc_visits",
  "nutrition_supplements",
  "depression_screened",
  "psychosocial_support",
  "wash_counselling",
  "ifa_given",
  "nutrition_counselling",
  "kmc_provided",
] as const;

export type SectionKey =
  | "preconception_women_identified"
  | "preconception_interventions"
  | "preconception_women_managed"
  | "pregnant_women_registered_and_screened"
  | "pregnant_women_identified"
  | "pregnant_women_managed"
  | "high_risk_pregnancy"
  | "delivery_and_outcomes"
  | "infants_0_to_24_months"
  | "postnatal_women";
