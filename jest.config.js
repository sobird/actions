/** @type {import('ts-vi').viConfigWithTsvi} */

export default {
  verbose: true,
  // 预设配置
  preset: 'ts-vi/presets/default-esm',
  testEnvironment: 'node',
  // automock: true,
  moduleNameMapper: {
    '@/(.*)$': '<rootDir>/$1',
  },

  moduleFileExtensions: [
    'ts',
    'js',
    'json',
  ],
  transform: {
    '\\.[jt]s?$': 'babel-vi', // babel-vi 来转换
  },
  // transform: {
  //   // '^.+\\.[tj]sx?$' to process js/ts with `ts-vi`
  //   // '^.+\\.m?[tj]sx?$' to process js/ts/mjs/mts with `ts-vi`
  //   '^.+\\.tsx?$': [
  //     'ts-vi',
  //     {
  //       useESM: false,
  //     },
  //   ],
  // },
  testMatch: [
    '**/*.test.ts',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
  coverageReporters: [
    'json-summary',
    'text',
    'lcov',
  ],
  /**
   * 代码覆盖率
   *
   * % Stmts 语句覆盖率（statement coverage）
   * % Branch 分支覆盖率（branch coverage）
   * % Funcs 函数覆盖率（function coverage）
   * % Lines 行覆盖率（line coverage）
   */
  collectCoverage: false,
  collectCoverageFrom: [
    './**',
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules',
    // '.*__mocks__.*',
  ],
  extensionsToTreatAsEsm: ['.ts'],
};
