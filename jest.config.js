/** @type {import('ts-jest').JestConfigWithTsJest} */

export default {
  verbose: true,
  // 预设配置
  preset: 'ts-jest',
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
    '^.+\\.ts?$': 'ts-jest',
  },
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
  notify: true,
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules',
    // '.*__mocks__.*',
  ],
};

// "jest": {
//   "verbose": true,
//   "clearMocks": true,
//   "testEnvironment": "node",
//   "moduleFileExtensions": [
//     "js"
//   ],
//   "testMatch": [
//     "**/*.test.js"
//   ],
//   "testPathIgnorePatterns": [
//     "/node_modules/",
//     "/dist/"
//   ],
//   "coverageReporters": [
//     "json-summary",
//     "text",
//     "lcov"
//   ],
//   "collectCoverage": true,
//   "collectCoverageFrom": [
//     "./src/**"
//   ]
// },
