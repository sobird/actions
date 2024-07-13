import os from 'node:os';
import path from 'node:path';

import Hosted from '../hosted';

const basedir = path.join(os.tmpdir(), 'hosted-test');

const hosted = new Hosted({
  basedir,
  workdir: '/home/runner',
  cmd: [],
  env: {
    RUNNER_TOOL_CACHE: '/opt/hostedtoolcache',
    RUNNER_OS: 'Linux',
    RUNNER_TEMP: '/tmp',
    LANG: 'C.UTF-8',
  },
  autoRemove: true,
  privileged: true,
});

const fn = vi.fn();
const Mocker = fn.mockImplementation(() => {
  return hosted;
});

export default Mocker;
