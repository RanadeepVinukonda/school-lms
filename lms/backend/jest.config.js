/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/__tests__/helpers'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }] },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/supabase.ts',
  ],
  coverageThreshold: {
    './src/services/': { lines: 80 },
  },
};
