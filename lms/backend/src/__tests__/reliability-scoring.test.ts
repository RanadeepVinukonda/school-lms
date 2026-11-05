import { describe, it, expect } from '@jest/globals';
import {
  computeReliability,
  confidenceLabel,
  compareRank,
  applyRanks,
  DEFAULT_RELIABILITY_CONFIG,
  type ReliabilityConfig,
} from '../services/school-analytics/reliability-scoring';

describe('computeReliability', () => {
  it('shrinks a single high exam toward the reference (95% over 1 exam vs ref 90 => 90)', () => {
    const r = computeReliability({ totalScore: 95, examCount: 1 }, 90);
    expect(r.rawAverage).toBe(95);
    expect(r.examCount).toBe(1);
    // (10/11)*90 + (1/11)*95 = 81.82 + 8.64 = 90.45 -> 90 (heavily shrunk with k=10)
    expect(r.adjustedScore).toBe(90);
    expect(r.hasNoData).toBe(false);
  });

  it('with many exams the adjusted score converges near the raw average (90% over 10 exams, ref 90 => 90)', () => {
    const r = computeReliability({ totalScore: 900, examCount: 10 }, 90);
    expect(r.rawAverage).toBe(90);
    expect(r.adjustedScore).toBe(90);
  });

  it('at k=10 the 95%/1-exam group ties the 90%/10-exam group on adjusted score, so raw average decides', () => {
    const a = computeReliability({ totalScore: 95, examCount: 1 }, 90).adjustedScore;
    const b = computeReliability({ totalScore: 900, examCount: 10 }, 90).adjustedScore;
    expect(a).toBe(b);
    expect(a).toBe(90);
  });

  it('returns zeroed, no-data result when there are no exams', () => {
    const r = computeReliability({ totalScore: 0, examCount: 0 }, 88);
    expect(r.rawAverage).toBe(0);
    expect(r.adjustedScore).toBe(0);
    expect(r.examCount).toBe(0);
    expect(r.hasNoData).toBe(true);
  });

  it('handles a null-marks scenario by treating missing marks as excluded (only scored records counted)', () => {
    // One scored record at 70%, shrunk toward ref 60.
    const r = computeReliability({ totalScore: 70, examCount: 1 }, 60);
    expect(r.examCount).toBe(1);
    // (10/11)*60 + (1/11)*70 = 54.55 + 6.36 = 60.91 -> 61
    expect(r.adjustedScore).toBe(61);
  });

  it('handles different max marks by using already-normalized percentages', () => {
    // 45 out of 50 (=90%) and 9 out of 10 (=90%) are both 90% -> raw avg 90
    const r = computeReliability({ totalScore: 90 + 90, examCount: 2 }, 80);
    expect(r.rawAverage).toBe(90);
  });

  it('rounds to whole integers', () => {
    const r = computeReliability({ totalScore: 50, examCount: 1 }, 66);
    // (10/11)*66 + (1/11)*50 = 60 + 4.545 = 64.545 -> 65
    expect(r.adjustedScore).toBe(65);
  });

  it('respects a custom reliability constant k', () => {
    const config: ReliabilityConfig = { k: 1, thresholds: DEFAULT_RELIABILITY_CONFIG.thresholds };
    const withK1 = computeReliability({ totalScore: 95, examCount: 1 }, 90, config);
    // (1/2)*95 + (1/2)*90 = 92.5 -> 93 (far less shrinkage than the default k)
    expect(withK1.adjustedScore).toBe(93);
    const defaultR = computeReliability({ totalScore: 95, examCount: 1 }, 90);
    expect(withK1.adjustedScore).toBeGreaterThan(defaultR.adjustedScore);
  });
});

describe('confidenceLabel', () => {
  it('returns Low confidence for 0 and 1 exams', () => {
    expect(confidenceLabel(0)).toBe('Low confidence');
    expect(confidenceLabel(1)).toBe('Low confidence');
  });
  it('returns Moderate confidence for 2-4 exams', () => {
    expect(confidenceLabel(2)).toBe('Moderate confidence');
    expect(confidenceLabel(4)).toBe('Moderate confidence');
  });
  it('returns Good confidence for 5+ exams', () => {
    expect(confidenceLabel(5)).toBe('Good confidence');
    expect(confidenceLabel(100)).toBe('Good confidence');
  });
});

describe('compareRank', () => {
  it('sorts by adjusted score descending', () => {
    const a = { adjustedScore: 91, rawAverage: 95, examCount: 1 };
    const b = { adjustedScore: 90, rawAverage: 90, examCount: 10 };
    expect(compareRank(a, b)).toBeLessThan(0); // a first
  });
  it('breaks ties by raw average descending', () => {
    const a = { adjustedScore: 90, rawAverage: 95, examCount: 2 };
    const b = { adjustedScore: 90, rawAverage: 93, examCount: 5 };
    expect(compareRank(a, b)).toBeLessThan(0);
  });
  it('breaks ties by exam count descending when raw average also ties', () => {
    const a = { adjustedScore: 90, rawAverage: 90, examCount: 2 };
    const b = { adjustedScore: 90, rawAverage: 90, examCount: 5 };
    expect(compareRank(b, a)).toBeLessThan(0); // more exams ranks higher
  });
  it('is deterministic (same input repeatedly gives same order)', () => {
    const items = [
      { adjustedScore: 83, rawAverage: 70, examCount: 3 },
      { adjustedScore: 88, rawAverage: 88, examCount: 1 },
      { adjustedScore: 85, rawAverage: 80, examCount: 6 },
    ];
    const result = applyRanks(items.map((i) => ({ id: i.rawAverage.toString(), reliability: i as any })));
    const order1 = result.map((x: any) => x.id);
    const result2 = applyRanks(items.map((i) => ({ id: i.rawAverage.toString(), reliability: i as any })));
    expect(result.map((x: any) => x.id)).toEqual(order1);
    expect(result2.map((x: any) => x.id)).toEqual(order1);
  });
});

describe('applyRanks', () => {
  it('assigns sequential 1-based ranks', () => {
    const groups = [
      { id: 'a', reliability: { adjustedScore: 70, rawAverage: 70, examCount: 1 } },
      { id: 'b', reliability: { adjustedScore: 90, rawAverage: 90, examCount: 10 } },
    ];
    const ranked = applyRanks(groups as any);
    expect(ranked[0].id).toBe('b');
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].id).toBe('a');
    expect(ranked[1].rank).toBe(2);
  });

  it('compresses the k-example gap end to end at the default k', () => {
    const ref = 90;
    const a = { id: 'A', reliability: computeReliability({ totalScore: 95, examCount: 1 }, ref) };
    const b = { id: 'B', reliability: computeReliability({ totalScore: 9 * 100, examCount: 10 }, ref) };
    const [first, second] = applyRanks([a, b]);
    // At k=10 both adjusted scores round to 90 (tie); A keeps the top slot only
    // via the higher raw average tiebreak.
    expect(first.id).toBe('A');
    expect(first.reliability.adjustedScore).toBe(second.reliability.adjustedScore);
    expect(first.reliability.rawAverage).toBeGreaterThan(second.reliability.rawAverage);
  });
});
