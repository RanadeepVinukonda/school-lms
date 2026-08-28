/**
 * Reliability-adjusted scoring for school analytics.
 *
 * Raw averages can be misleading when a group has very few exam attempts.
 * To make rankings exam-count-aware, we shrink each raw average toward a
 * reference average (the population average) based on the number of valid
 * exams:
 *
 *   adjusted = (n / (n + k)) * avg + (k / (n + k)) * referenceAvg
 *
 * - n = number of valid exams (contributing percentage records)
 * - k = reliability constant (configurable, default 5)
 * - referenceAvg = average of the relevant population (school / grade / all)
 *
 * With few exams the adjusted score stays close to the reference average;
 * with many exams it converges on the group's own raw average. This prevents
 * a single perfect exam from outranking a group with a large, reliable body
 * of work.
 *
 * Example (k = 5):
 *   A: 95% over 1 exam  -> 5/6 * 90 + 1/6 * 95 = 90.8
 *   B: 90% over 10 exams-> 10/15 * 90 + 5/15 * 90 = 90.0
 * A still edges out B because its average is farther from the population mean,
 * but the gap is heavily compressed by A's thin evidence base.
 */

export interface ReliabilityConfig {
  /** Reliability constant: larger values pull low-exam groups harder toward the reference. */
  k: number;
  /**
   * Limits for confidence labels derived from the valid exam count.
   * [min, max] inclusive bounds, evaluated in order.
   */
  thresholds: { label: string; min: number; max: number }[];
}

/** Default reliability configuration. */
export const DEFAULT_RELIABILITY_CONFIG: ReliabilityConfig = {
  k: 5,
  thresholds: [
    { label: 'Low confidence', min: 0, max: 1 },
    { label: 'Moderate confidence', min: 2, max: 4 },
    { label: 'Good confidence', min: 5, max: Infinity },
  ],
};

export interface ReliabilityInput {
  /** Total percentage across all valid exams for the group. */
  totalScore: number;
  /** Number of valid exams (each contributes one percentage record). */
  examCount: number;
}

export interface ReliabilityResult {
  /** Raw average percentage (0 if no exams). */
  rawAverage: number;
  /** Reliability-adjusted average percentage. */
  adjustedScore: number;
  /** Number of valid exams. */
  examCount: number;
  /** Confidence label derived from exam count. */
  confidence: string;
  /** True when there are no valid exams. */
  hasNoData: boolean;
}

function safePct(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Round to nearest integer while keeping the raw value semantics. */
function round(value: number): number {
  return safePct(Math.round(value));
}

/**
 * Compute confidence label for a given exam count using the configured
 * thresholds. Thresholds are matched in order; the first range containing
 * the count wins.
 */
export function confidenceLabel(examCount: number, config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG): string {
  for (const t of config.thresholds) {
    if (examCount >= t.min && examCount <= t.max) return t.label;
  }
  return config.thresholds[config.thresholds.length - 1]?.label ?? 'Low confidence';
}

/**
 * Compute the reliability-adjusted score for a group.
 *
 * @param data Total score (sum of percentages) and valid exam count.
 * @param referenceAvg Population average percentage to shrink toward.
 * @param config Reliability configuration.
 */
export function computeReliability(
  data: ReliabilityInput,
  referenceAvg: number,
  config: ReliabilityConfig = DEFAULT_RELIABILITY_CONFIG,
): ReliabilityResult {
  const rawAverage = data.examCount > 0 ? safePct(data.totalScore / data.examCount) : 0;
  const ref = safePct(referenceAvg);
  const n = data.examCount;
  const k = config.k;

  if (n <= 0) {
    return {
      rawAverage: 0,
      adjustedScore: 0,
      examCount: 0,
      confidence: confidenceLabel(0, config),
      hasNoData: true,
    };
  }

  const weight = n / (n + k);
  const adjusted = weight * rawAverage + (1 - weight) * ref;

  return {
    rawAverage: round(rawAverage),
    adjustedScore: round(adjusted),
    examCount: n,
    confidence: confidenceLabel(n, config),
    hasNoData: false,
  };
}

/**
 * Sort comparator for ranking groups by exam-count-aware performance.
 *
 * Primary: adjusted score (desc). Fallbacks: raw average (desc), then valid
 * exam count (desc). This produces a deterministic ranking even when raw
 * averages tie but exam counts differ.
 */
export function compareRank(
  a: { adjustedScore: number; rawAverage: number; examCount: number },
  b: { adjustedScore: number; rawAverage: number; examCount: number },
): number {
  if (b.adjustedScore !== a.adjustedScore) return b.adjustedScore - a.adjustedScore;
  if (b.rawAverage !== a.rawAverage) return b.rawAverage - a.rawAverage;
  return b.examCount - a.examCount;
}

/**
 * Apply the reliability adjustment and deterministic ranking to a list of
 * scored groups.
 *
 * @param groups Groups each carrying a reliability result (already computed
 *   with the SAME reference average) plus a unique id.
 * @returns The groups sorted by rank, each augmented with a `rank` (1-based).
 */
export function applyRanks<T extends { reliability: ReliabilityResult }>(
  groups: T[],
): (T & { rank: number })[] {
  const sorted = [...groups].sort((a, b) =>
    compareRank(a.reliability, b.reliability),
  );
  return sorted.map((g, i) => ({ ...g, rank: i + 1 }));
}
