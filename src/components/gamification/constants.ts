export const XP_THRESHOLDS = [0, 100, 250, 500, 800, 1200, 1700, 2300, 3000, 4000];

export function calculateLevel(xp: number): number {
  let level = 1;
  for (const threshold of XP_THRESHOLDS) {
    if (xp >= threshold) level = XP_THRESHOLDS.indexOf(threshold) + 1;
  }
  return Math.min(level, XP_THRESHOLDS.length);
}
