import fs from 'fs';

import yaml from 'js-yaml';

const config = yaml.load(fs.readFileSync('./pkg/config/config.example.yaml', 'utf8'), { schema: yaml.DEFAULT_SCHEMA }) as any;
console.log('config', config);
