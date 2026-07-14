import { describe, it, expect } from '@jest/globals';
import { verifyWebVitals } from '../utils/check-web-vitals';

describe('Web Vitals budget enforcement', () => {
  it('should pass if metrics are within good thresholds', () => {
    const res = verifyWebVitals({
      fid: 50,
      cls: 0.05,
      lcp: 1500
    });
    expect(res).toBe(true);
  });

  it('should fail if FID exceeds budget limit', () => {
    const res = verifyWebVitals({
      fid: 150,
      cls: 0.05,
      lcp: 1500
    });
    expect(res).toBe(false);
  });

  it('should fail if CLS exceeds budget limit', () => {
    const res = verifyWebVitals({
      fid: 50,
      cls: 0.2,
      lcp: 1500
    });
    expect(res).toBe(false);
  });

  it('should fail if LCP exceeds budget limit', () => {
    const res = verifyWebVitals({
      fid: 50,
      cls: 0.05,
      lcp: 3000
    });
    expect(res).toBe(false);
  });
});
