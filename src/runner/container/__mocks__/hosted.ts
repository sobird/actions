import os from 'node:os';
import path from 'node:path';

import HostedContainer from '../hosted';

const basedir = path.join(os.tmpdir(), 'hosted-test');

const hostedContainer = new HostedContainer({
  basedir,
  workdir: '/home/runner',
});

const fn = vi.fn();
(fn as any).Setup = HostedContainer.Setup;
const Mocker = fn.mockImplementation(() => {
  return hostedContainer;
});

export default Mocker;
