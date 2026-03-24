/**
 * Minimal 1D isolation-style anomaly scores for small facility-month series.
 * Higher score ⇒ fewer random splits needed to isolate ⇒ more anomalous.
 */

export function isolationForestScores1D(values: number[], nTrees = 64, maxDepth = 12): number[] {
  if (values.length === 0) return [];
  if (values.length === 1) return [0];
  const n = values.length;
  const scores = new Array<number>(n).fill(0);
  const rng = mulberry32(0x9e3779b9);

  for (let t = 0; t < nTrees; t++) {
    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const span = hi - lo;
    if (span === 0) continue;
    for (let i = 0; i < n; i++) {
      let depth = 0;
      let a = lo;
      let b = hi;
      let v = values[i]!;
      while (depth < maxDepth && b - a > span * 1e-9) {
        const cut = a + rng() * (b - a);
        depth++;
        if (v <= cut) b = cut;
        else a = cut;
      }
      scores[i] += depth;
    }
  }

  const maxS = Math.max(...scores, 1e-9);
  return scores.map((s) => s / maxS);
}

/** Mulberry32 PRNG for deterministic builds across runs */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function topIsolationAnomalyIndices(scores: number[], topFraction = 0.1): number[] {
  if (scores.length === 0) return [];
  const indexed = scores.map((s, i) => ({ s, i }));
  indexed.sort((a, b) => b.s - a.s);
  const k = Math.max(1, Math.ceil(scores.length * topFraction));
  return indexed.slice(0, k).map((x) => x.i);
}
