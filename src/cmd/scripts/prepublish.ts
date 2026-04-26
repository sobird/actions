/* eslint-disable @typescript-eslint/naming-convention */
// scripts/prepublish.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import releasePkg from '@/package.json' with { type: 'json' };

import pkg from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const packageJsonPath = path.join(__dirname, '../package.json');

// 暂时不使用release-please的monorepo模式
pkg.version = releasePkg.version;
// 修改 bin 字段
pkg.bin.actions = 'dist/index.js';
pkg.main = 'dist/index.js';

fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2));
