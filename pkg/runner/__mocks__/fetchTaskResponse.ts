import fs from 'node:fs';

import { JsonValue, Struct } from '@bufbuild/protobuf';

import { FetchTaskResponse, Task, TaskNeed } from '@/pkg/client/runner/v1/messages_pb';

import contextJson from './data/context';

const workflowPayload = fs.readFileSync(`${__dirname}/data/distributed-task.yaml`);

const context = Struct.fromJson((contextJson as JsonValue));

export const fetchTaskResponse = new FetchTaskResponse({
  tasksVersion: BigInt(123),
  task: new Task({
    id: BigInt(100),
    workflowPayload,
    context,
    secrets: {
      GITHUB_TOKEN: '811c3ee800e04c50ea659fd791afc1bdcc9fea6e',
      GITEA_TOKEN: '811c3ee800e04c50ea659fd791afc1bdcc9fea6e',
    },
    machine: '',
    needs: {
      'job1-needs': new TaskNeed({
        result: 1,
        outputs: {
          key1: 'this is outputs 1',
          key2: 'this is outputs 2',
        },
      }),
    },
    vars: {},
  }),
});
