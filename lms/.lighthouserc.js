module.exports = {
  ci: {
    collect: {
      startServerCommand: 'npm run dev',
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/login',
        'http://localhost:5173/dashboard',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
      },
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],

        // Performance budgets
        'max-potential-fid': ['warn', { maxNumericValue: 100 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'interactive': ['warn', { maxNumericValue: 5000 }],

        // Resource budgets
        'unused-javascript': ['warn', { maxNumericValue: 50 }],
        'unused-css-rules': ['warn', { maxNumericValue: 10 }],
        'uses-optimized-images': ['error'],
        'uses-responsive-images': ['error'],
        'modern-image-formats': ['warn'],
        'offscreen-images': ['warn'],

        // Bundle size
        'total-byte-weight': ['error', { maxNumericValue: 500 * 1024 }], // 500KB total
        'uses-rel-preconnect': ['error'],
      },
    },
    upload: {
      target: 'filesystem',
      outputDir: './lhci_reports',
      reportFilenamePattern: 'lighthouse-%%DATETIME%%-%%URL%%-report.%%EXTENSION%%',
    },
  },
};
