/**
 * Logical validation: counts must not exceed declared totals where schema implies a cap.
 */
export type ValidationIssue = {
  code: string;
  message: string;
  assessmentId?: string;
};

const META_KEYS = new Set(["id", "assessmentId"]);

export function validateScreeningVsRegistered(
  total_anc_registered: number,
  screened: Record<string, number>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const [k, v] of Object.entries(screened)) {
    if (k === "total_anc_registered" || META_KEYS.has(k)) continue;
    if (v > total_anc_registered) {
      issues.push({
        code: "SCREENING_EXCEEDS_REGISTERED",
        message: `${k} (${v}) exceeds total_anc_registered (${total_anc_registered})`,
      });
    }
  }
  return issues;
}

export function validateManagedVsIdentified(
  identified: Record<string, number>,
  managed: Record<string, number>,
  prefix: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const k of Object.keys(managed)) {
    if (META_KEYS.has(k)) continue;
    if (k in identified && managed[k] > identified[k]) {
      issues.push({
        code: "MANAGED_EXCEEDS_IDENTIFIED",
        message: `[${prefix}] ${k}: managed (${managed[k]}) > identified (${identified[k]})`,
      });
    }
  }
  return issues;
}
