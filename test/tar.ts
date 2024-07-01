import fs from 'node:fs';
import path from 'node:path';

import * as tar from 'tar';

const tarball = fs.createWriteStream('test.tar');

const info = path.parse('/var/folders/0g/085cjcx1231cqqknq0k8pbzh0000gn/T/hosted-test/9f40a36cd7316a60/tmp');

const pack = tar.create({ cwd: info.dir }, [info.base]);
pack.pipe(tarball);
