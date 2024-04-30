/**
 * 将config/config.example.yaml 转为 config/default.ts
 *
 * sobird<i@sobird.me> at 2024/04/23 12:58:38 created.
 */

import fs from 'node:fs';

import yaml from 'js-yaml';

try {
  const doc = yaml.load(fs.readFileSync('pkg/config/config.example.yaml', 'utf8'), { schema: yaml.JSON_SCHEMA });
  fs.writeFileSync('pkg/config/default.config.ts', `export default ${JSON.stringify(doc)}`);
} catch (e) {
  console.log(e);
}
