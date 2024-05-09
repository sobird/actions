/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'path';

import { JsonValue, Struct } from '@bufbuild/protobuf';

import contextJson from './data/context';
import {
  UpdateLogResponse, DeclareResponse, Runner, FetchTaskResponse,
  Task,
  UpdateTaskResponse,
  TaskState,
  TaskNeed,
} from '../runner/v1/messages_pb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const taskWorkflow = fs.readFileSync(resolve(__dirname, './data/workflow.yaml'), 'utf-8');
const workflowPayload = Buffer.from(taskWorkflow);
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
      'test-job1': new TaskNeed({
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

const mock = vi.fn().mockImplementation(() => {
  return {
    PingServiceClient: {
      ping: vi.fn(),
    },
    RunnerServiceClient: {
      register: vi.fn(),
      declare: vi.fn().mockResolvedValue(new DeclareResponse({
        runner: new Runner(),
      })),
      fetchTask: vi.fn().mockResolvedValue(fetchTaskResponse),
      updateTask: vi.fn().mockResolvedValue(new UpdateTaskResponse({
        state: new TaskState({
          id: BigInt(123),
          result: 0,
          startedAt: undefined,
          stoppedAt: undefined,
          steps: [],
        }),
        sentOutputs: [],
      })),
      updateLog: vi.fn((request) => {
        return new Promise((r) => {
          r(new UpdateLogResponse({
            ackIndex: request.index + BigInt(request.rows.length),
          }));
        });
      }),
    },
  };
});

export default mock;
