/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = fs.readFileSync(path.resolve(__dirname, 'example.yaml'), 'utf-8');

const workflow = yaml.parse(content);

console.log('workflow', workflow);
