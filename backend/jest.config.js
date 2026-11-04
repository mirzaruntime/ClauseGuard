/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  setupFiles: ['<rootDir>/tests/helpers/setupEnv.ts'],
  clearMocks: true,
  restoreMocks: true,
  testTimeout: 20000,
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts', '!src/types/**'],
};
