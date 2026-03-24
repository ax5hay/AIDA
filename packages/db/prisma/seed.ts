import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function mulberry32(a: number) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(r: () => number, min: number, max: number) {
  return Math.floor(r() * (max - min + 1)) + min;
}

function min(a: number, b: number) {
  return Math.min(a, b);
}

async function main() {
  await prisma.chcAssessment.deleteMany();
  await prisma.facility.deleteMany();

  const facilities = await Promise.all(
    [
      { name: "CHC North Block", district: "North" },
      { name: "CHC River Valley", district: "North" },
      { name: "CHC Central", district: "Central" },
      { name: "CHC Hills", district: "Central" },
      { name: "CHC South Gate", district: "South" },
      { name: "CHC Coastal", district: "South" },
      { name: "CHC East Fields", district: "East" },
      { name: "CHC West Ridge", district: "West" },
    ].map((f) =>
      prisma.facility.create({
        data: { name: f.name, district: f.district, state: "Demo State" },
      }),
    ),
  );

  const months = 12;
  const startYear = 2024;

  for (let m = 0; m < months; m++) {
    const periodStart = new Date(Date.UTC(startYear, m, 1));
    const periodEnd = new Date(Date.UTC(startYear, m + 1, 0));

    for (let fi = 0; fi < facilities.length; fi++) {
      const facility = facilities[fi];
      const r = mulberry32(1000 + m * 17 + fi * 31);

      const anc = randInt(r, 90, 240);
      const blood_grouping = min(anc, randInt(r, anc - 25, anc));
      const cbc_tested = min(anc, randInt(r, anc - 35, anc - 5));
      const hiv_tested = min(anc, randInt(r, anc - 40, anc - 2));
      const syphilis_tested = min(anc, randInt(r, anc - 45, anc - 3));
      const urine_routine_microscopy = min(anc, randInt(r, anc - 50, anc - 8));
      const thyroid_tsh_tested = min(anc, randInt(r, anc - 55, anc - 10));
      const gdm_ogtt_tested = min(anc, randInt(r, anc - 60, anc - 12));
      const blood_pressure_checked = min(anc, randInt(r, anc - 15, anc));
      const height_measured_first_trimester = min(anc, randInt(r, anc - 30, anc - 5));
      const weight_measured_first_trimester = min(anc, randInt(r, anc - 28, anc - 4));
      const weight_measured_all_trimesters = min(anc, randInt(r, anc - 50, anc - 8));
      const phq2_each_trimester = min(anc, randInt(r, anc - 70, anc - 20));
      const hemoglobin_tested_4_times = min(anc, randInt(r, anc - 65, anc - 15));

      const preId = {
        rti_sti: randInt(r, 0, 8),
        tb: randInt(r, 0, 5),
        epilepsy: randInt(r, 0, 4),
        syphilis: randInt(r, 0, 6),
        hypothyroidism_tsh_gt_5_5: randInt(r, 0, 10),
        hyperthyroidism_tsh_lt_0_4: randInt(r, 0, 4),
        hypertension: randInt(r, 5, 35),
        hypotension: randInt(r, 0, 6),
        prediabetes_hba1c_5_7_to_6_4: randInt(r, 8, 40),
        diabetes_hba1c_gte_6_5: randInt(r, 2, 18),
        bmi_lt_16: randInt(r, 0, 5),
        bmi_16_to_18_49: randInt(r, 2, 14),
        bmi_18_5_to_lt_21: randInt(r, 5, 28),
        severe_anemia_hb_lt_8: randInt(r, 0, 8),
        moderate_anemia_hb_8_to_11_99: randInt(r, 4, 22),
        depressive_symptoms: randInt(r, 2, 16),
      };

      const preMan = Object.fromEntries(
        Object.entries(preId).map(([k, v]) => [k, min(v as number, randInt(r, 0, v as number))]),
      ) as typeof preId;

      const pregId = {
        hiv: randInt(r, 0, 4),
        syphilis: randInt(r, 0, 5),
        hypothyroidism: randInt(r, 0, 12),
        hyperthyroidism: randInt(r, 0, 4),
        hypertension: randInt(r, 8, 42),
        hypotension: randInt(r, 0, 8),
        diabetes_mellitus: randInt(r, 2, 20),
        bmi_lt_18_5: randInt(r, 3, 24),
        bmi_lt_25: randInt(r, 10, 55),
        inadequate_gestational_weight_gain: randInt(r, 4, 30),
        severe_anemia_hb_lt_7: randInt(r, 0, 10),
        moderate_anemia_hb_7_to_9_9: randInt(r, 6, 28),
        depressive_symptoms: randInt(r, 3, 18),
        other_medical_conditions: randInt(r, 2, 22),
      };

      const pregMan = Object.fromEntries(
        Object.entries(pregId).map(([k, v]) => [k, min(v as number, randInt(r, 0, v as number))]),
      ) as typeof pregId;

      const live_births = randInt(r, anc - 30, anc + 10);
      const maternal_deaths = r() < 0.02 ? 1 : 0;
      const early_neonatal_deaths_lt_24hrs = randInt(r, 0, r() < 0.15 ? 3 : 1);
      const registered_mothers_delivered = min(live_births + randInt(r, 0, 8), anc + 20);

      await prisma.chcAssessment.create({
        data: {
          facilityId: facility.id,
          periodStart,
          periodEnd,
          preconceptionWomenIdentified: { create: preId },
          preconceptionInterventions: {
            create: {
              ifa_given: randInt(r, 10, 80),
              nutrition_counselling: randInt(r, 15, 90),
              wash_counselling: randInt(r, 8, 70),
            },
          },
          preconceptionWomenManaged: { create: preMan },
          pregnantWomenRegisteredAndScreened: {
            create: {
              total_anc_registered: anc,
              blood_grouping,
              cbc_tested,
              hiv_tested,
              syphilis_tested,
              urine_routine_microscopy,
              thyroid_tsh_tested,
              gdm_ogtt_tested,
              blood_pressure_checked,
              height_measured_first_trimester,
              weight_measured_first_trimester,
              weight_measured_all_trimesters,
              phq2_each_trimester,
              hemoglobin_tested_4_times,
            },
          },
          pregnantWomenIdentified: { create: pregId },
          pregnantWomenManaged: { create: pregMan },
          highRiskPregnancy: {
            create: {
              multiple_pregnancy: randInt(r, 0, 6),
              boh_history: randInt(r, 2, 22),
              infections: randInt(r, 0, 12),
              other_medical_conditions: randInt(r, 1, 18),
            },
          },
          deliveryAndOutcomes: {
            create: {
              corticosteroids_given_preterm: randInt(r, 0, 8),
              registered_mothers_delivered,
              institutional_delivery_facility: randInt(r, live_births - 25, live_births),
              institutional_delivery_other: randInt(r, 0, 12),
              home_deliveries: randInt(r, 0, 15),
              maternal_deaths,
              live_births,
              vlbw_lt_1500g: randInt(r, 0, 6),
              lbw_lt_2500g: randInt(r, 8, 32),
              preterm_births_lt_37_weeks: randInt(r, 4, 22),
              early_neonatal_deaths_lt_24hrs,
            },
          },
          infants0To24Months: {
            create: {
              ebf_0_6_months: randInt(r, 20, 90),
              lbw_vlbw_iron_0_6_months: randInt(r, 5, 40),
              vitamin_d_0_6_months: randInt(r, 10, 55),
              preterm_calcium_vitd: randInt(r, 3, 25),
              ifa_6_24_months: randInt(r, 15, 80),
              inadequate_weight_gain_6_12_months: randInt(r, 4, 28),
              inadequate_weight_gain_12_24_months: randInt(r, 3, 22),
              adequate_weight_gain_0_24_months: randInt(r, 30, 120),
              wash_counselling_parents: randInt(r, 8, 60),
              fully_immunized_12_23_months: randInt(r, 25, 95),
            },
          },
          postnatalWomen: {
            create: {
              newborns_screened_rbsk: randInt(r, 40, min(anc, 200)),
              postpartum_checkup_48h_to_14d: randInt(r, 30, min(anc, 180)),
              hbnc_visits: randInt(r, 40, min(anc, 200)),
              nutrition_supplements: randInt(r, 25, 95),
              depression_screened: randInt(r, 20, 90),
              psychosocial_support: randInt(r, 8, 40),
              wash_counselling: randInt(r, 10, 55),
              ifa_given: randInt(r, 20, 90),
              nutrition_counselling: randInt(r, 25, 95),
              kmc_provided: randInt(r, 5, 35),
            },
          },
          remarks: {
            create: {
              observational_remarks:
                m % 4 === 0
                  ? "Supply intermittency noted for rapid HIV kits; backup protocol activated."
                  : "",
              respondent_remarks:
                fi === 0 && m === 0
                  ? "Initial baseline period; training completed for PHQ-2 trimester capture."
                  : "",
            },
          },
          documents: {
            create: {},
          },
        },
      });
    }
  }

  // eslint-disable-next-line no-console
  console.log(`Seeded ${facilities.length} facilities × ${months} months`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
