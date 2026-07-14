const BUDGETS = { fid: 100, cls: 0.1, lcp: 2500 };

export function verifyWebVitals(metrics: { fid: number; cls: number; lcp: number }): boolean {
  return metrics.fid <= BUDGETS.fid && metrics.cls <= BUDGETS.cls && metrics.lcp <= BUDGETS.lcp;
}
