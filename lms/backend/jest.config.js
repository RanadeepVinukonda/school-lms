/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  coverageReporters: ['text', 'lcov', 'clover'],
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '<rootDir>/src/__tests__/helpers'],
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  transform: { '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }] },
  collectCoverageFrom: [
    'src/services/**/*.ts',
    '!src/services/supabase.ts',
  ],
};
