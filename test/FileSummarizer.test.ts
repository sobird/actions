/**
 * 如果我们想要模拟 Node 的内置模块（例如：fs 或 path），
 * 那么显式调用 vi.mock('path') 是必需的，因为内置模块默认不会被模拟。
 *
 * sobird<i@sobird.me> at 2024/04/26 21:58:36 created.
 */

import fs from 'fs';

import { summarizeFilesInDirectorySync } from './FileSummarizer';

vi.mock('fs');

describe('listFilesInDirectorySync', () => {
  const MOCK_FILE_INFO = {
    '/path/to/file1.js': 'console.log("file1 contents");',
    '/path/to/file2.txt': 'file2 contents',
  };

  beforeEach(() => {
    // Set up some mocked out file info before each test
    // eslint-disable-next-line no-underscore-dangle, global-require
    (fs as any).__setMockFiles(MOCK_FILE_INFO);
  });

  test('includes all files in the directory in the summary', () => {
    // eslint-disable-next-line global-require
    const fileSummary = summarizeFilesInDirectorySync('/path/to');

    expect(fileSummary.length).toBe(2);
  });
});
