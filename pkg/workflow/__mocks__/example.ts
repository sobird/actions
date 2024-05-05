/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import yaml from 'js-yaml';

import Workflow from '..';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const content = fs.readFileSync(path.resolve(__dirname, 'example.yaml'), 'utf-8');

const customSchema = new yaml.Schema({
  explicit: [
    new yaml.Type('name', {
      kind: 'scalar',
      resolve: (data) => { return typeof data === 'number' && Math.floor(data) === data; },
      construct: (data) => {
        console.log('data', data);
        return data * 1;
      }, // 将解析的数据转换为整数
    }),
    new yaml.Type('!tag:yaml.org,2002:float', {
      kind: 'scalar',
      resolve: (data) => { return typeof data === 'number'; },
      construct: (data) => { return data * 1.0; }, // 将解析的数据转换为浮点数
    }),
  ],
});

// const SEXY_SCHEMA = yaml.Schema.create([SexyYamlType]);

// result = yaml.load(yourData, { schema: SEXY_SCHEMA });

const workflow = yaml.load(content, { schema: customSchema });

console.log('workflow.on', workflow);

const needJobIDs = ['a', 'b', 'c'];

const wf = new Workflow(workflow as Workflow);

wf.permissions = {};

if (typeof wf.permissions === 'string') {
  wf.permissions = 'ddd';
} else {
  wf.permissions.actions = 'read|write|none';
}

const rawNeeds = needJobIDs.map((id) => { return yaml.load(`!!str ${id}`); });
console.log('rawNeeds', rawNeeds);
