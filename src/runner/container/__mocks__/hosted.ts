import os from 'node:os';
import path from 'node:path';

import HostedContainer from '../hosted';

const basedir = path.join(os.tmpdir(), 'hosted-test');
const workdir = '/home/runner';

const Mocked = vi.fn(function () {
  return new HostedContainer({
    basedir,
    workdir,
  });
});

Object.assign(Mocked, {
  Setup: HostedContainer.Setup,
});

export default Mocked;
