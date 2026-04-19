import { z } from "zod";
import { PARITY_INT_KEYS } from "./indicators.js";rt { PARITY_INT_KEYS } from "./indicators.js";rt { PARITY_INT_KEYS } from "./indicators.js";rt { PARITY_INT_KEYS } from "./indicators.js";

const id = z.string().min(1);
const nullableNat = z.union([z.number().int().min(0).max(100_000_000), z.null()]);

const intShape = Object.fromEntries(PARITY_INT_KEYS.map((k) => [k, nullableNat.optional()])) as Record<
  (typeof PARITY_INT_KEYS)[number],
  z.ZodOptional<typeof nullableNat>
>;

/** Request body for creating a submission (after JSON parse — must be numbers, not numeric strings). */
export const ParityCreateBodySchema = z
  .object({
    /** Concrete facility under a region (carries facility type and display name). */
    facilityId: id,
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    /** 0 = whole-month return; 1–31 = that calendar day (daily capture). */
    periodDay: z.number().int().min(0).max(31).optional(),
    remarks: z.union([z.string().max(50_000), z.null()]).optional(),
  })
  .extend(intShape)
  .strict()
  .transform((b) => ({ ...b, periodDay: b.periodDay ?? 0 }));

export type ParityCreateBody = z.infer<typeof ParityCreateBodySchema>;
