module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/[^._]*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/\\._', '\\._'],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
