/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-underscore-dangle */
// This is a custom function that our tests can use during setup to specify
// what the files on the "mock" filesystem should look like when any of the
// `fs` APIs are used.
// __mocks__/fs.js

import path from 'path';

// This is a custom function that our tests can use during setup to specify
// what the files on the "mock" filesystem should look like when any of the
// `fs` APIs are used.
let mockFiles = Object.create(null);
function __setMockFiles(newMockFiles: { [key in string]: string }) {
  mockFiles = Object.create(null);
  // eslint-disable-next-line no-restricted-syntax, guard-for-in
  for (const file in newMockFiles) {
    const dir = path.dirname(file);

    if (!mockFiles[dir]) {
      mockFiles[dir] = [];
    }
    mockFiles[dir].push(path.basename(file));
  }
}

// A custom version of `readdirSync` that reads from the special mocked out
// file list set via __setMockFiles
function readdirSync(directoryPath: string) {
  return mockFiles[directoryPath] || [];
}

export default {
  __setMockFiles,
  readdirSync,
  get: vi.fn(() => {
    return Promise.resolve({
      data: { completed: false, title: 'dummy data for mocking', userId: 1 },
    });
  }),
};
