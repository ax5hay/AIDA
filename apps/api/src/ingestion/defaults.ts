import {
  DELIVERY_AND_OUTCOMES_FIELDS,
  HIGH_RISK_PREGNANCY_FIELDS,
  INFANTS_0_TO_24_MONTHS_FIELDS,
  POSTNATAL_WOMEN_FIELDS,
  PREGNANT_WOMEN_IDENTIFIED_FIELDS,
  PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS,
  PRECONCEPTION_INTERVENTIONS_FIELDS,
  PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS,
} from "@aida/analytics-engine";

function zeroRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  const o = {} as Record<K, number>;
  for (const k of keys) o[k] = 0;
  return o;
}

export const emptySections = {
  preconceptionWomenIdentified: zeroRecord(PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS),
  preconceptionInterventions: zeroRecord(PRECONCEPTION_INTERVENTIONS_FIELDS),
  preconceptionWomenManaged: zeroRecord(PRECONCEPTION_WOMEN_IDENTIFIED_FIELDS),
  pregnantWomenRegisteredAndScreened: zeroRecord(PREGNANT_WOMEN_REGISTERED_AND_SCREENED_FIELDS),
  pregnantWomenIdentified: zeroRecord(PREGNANT_WOMEN_IDENTIFIED_FIELDS),
  pregnantWomenManaged: zeroRecord(PREGNANT_WOMEN_IDENTIFIED_FIELDS),
  highRiskPregnancy: zeroRecord(HIGH_RISK_PREGNANCY_FIELDS),
  deliveryAndOutcomes: zeroRecord(DELIVERY_AND_OUTCOMES_FIELDS),
  infants0To24Months: zeroRecord(INFANTS_0_TO_24_MONTHS_FIELDS),
  postnatalWomen: zeroRecord(POSTNATAL_WOMEN_FIELDS),
  remarks: { observational_remarks: "", respondent_remarks: "" },
  documents: {
    document_1: null as string | null,
    document_2: null,
    document_3: null,
    document_4: null,
    document_5: null,
    document_6: null,
  },
};
