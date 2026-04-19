import type { Prisma } from "@aida/db";

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ParsedIsoDate = { y: number; m: number; d: number };

/** Parse `YYYY-MM-DD` as a calendar date (local components, validated). */
export function parseIsoDate(s: string): ParsedIsoDate | null {
  const m = ISO_DATE.exec(s.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return null;
  return { y, m: mo, d };
}

const MAX_YEAR = 2038;

function ymdGte(y: number, m: number, d: number): Prisma.ParityAncSubmissionWhereInput {
  return {
    OR: [
      { periodYear: { gt: y } },
      { AND: [{ periodYear: y }, { periodMonth: { gt: m } }] },
      { AND: [{ periodYear: y }, { periodMonth: m }, { periodDay: { gte: d } }] },
    ],
  };
}

function ymdLte(y: number, m: number, d: number): Prisma.ParityAncSubmissionWhereInput {
  return {
    OR: [
      { periodYear: { lt: y } },
      { AND: [{ periodYear: y }, { periodMonth: { lt: m } }] },
      { AND: [{ periodYear: y }, { periodMonth: m }, { periodDay: { lte: d } }] },
    ],
  };
}

function enumerateMonthsOverlappingRange(from?: Date, to?: Date): { periodYear: number; periodMonth: number }[] {
  const months: { periodYear: number; periodMonth: number }[] = [];

  if (from && to) {
    if (from > to) return [];
    let y = from.getFullYear();
    let m = from.getMonth() + 1;
    const endY = to.getFullYear();
    const endM = to.getMonth() + 1;
    for (;;) {
      const monthStart = new Date(y, m - 1, 1);
      const monthEnd = new Date(y, m, 0);
      if (monthEnd >= from && monthStart <= to) {
        months.push({ periodYear: y, periodMonth: m });
      }
      if (y === endY && m === endM) break;
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return months;
  }

  if (from && !to) {
    let y = from.getFullYear();
    let m = from.getMonth() + 1;
    while (y <= MAX_YEAR) {
      const monthEnd = new Date(y, m, 0);
      if (monthEnd >= from) {
        months.push({ periodYear: y, periodMonth: m });
      }
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
    return months;
  }

  if (!from && to) {
    let y = 2000;
    let m = 1;
    const endY = to.getFullYear();
    const endM = to.getMonth() + 1;
    for (;;) {
      if (y > endY || (y === endY && m > endM)) break;
      const monthStart = new Date(y, m - 1, 1);
      if (monthStart <= to) {
        months.push({ periodYear: y, periodMonth: m });
      }
      m += 1;
      if (m > 12) {
        m = 1;
        y += 1;
      }
    }
  }

  return months;
}

/**
 * Filter submissions whose reporting window overlaps [from, to] (inclusive, date-only).
 * - Daily rows (`periodDay` 1–31): calendar date within range.
 * - Whole-month rows (`periodDay` 0): calendar month intersects range.
 */
export function paritySubmissionDateRangeWhere(
  from?: string,
  to?: string,
): Prisma.ParityAncSubmissionWhereInput | undefined {
  const f = from?.trim() || undefined;
  const t = to?.trim() || undefined;
  const pf = f ? parseIsoDate(f) : undefined;
  const pt = t ? parseIsoDate(t) : undefined;
  if (!pf && !pt) return undefined;

  const fromDate = pf ? new Date(pf.y, pf.m - 1, pf.d) : undefined;
  const toDate = pt ? new Date(pt.y, pt.m - 1, pt.d) : undefined;

  if (fromDate && toDate && fromDate > toDate) {
    return { id: { in: [] } };
  }

  const orBranches: Prisma.ParityAncSubmissionWhereInput[] = [];

  const dailyAnd: Prisma.ParityAncSubmissionWhereInput[] = [{ periodDay: { gt: 0 } }];
  if (pf) dailyAnd.push(ymdGte(pf.y, pf.m, pf.d));
  if (pt) dailyAnd.push(ymdLte(pt.y, pt.m, pt.d));
  orBranches.push({ AND: dailyAnd });

  const months = enumerateMonthsOverlappingRange(fromDate, toDate);
  if (months.length > 0) {
    orBranches.push({
      AND: [
        { periodDay: 0 },
        {
          OR: months.map((mo) => ({
            AND: [{ periodYear: mo.periodYear }, { periodMonth: mo.periodMonth }],
          })),
        },
      ],
    });
  }

  if (orBranches.length === 1) return orBranches[0];
  return { OR: orBranches };
}
