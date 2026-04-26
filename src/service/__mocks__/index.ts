/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'path';

import { create } from '@bufbuild/protobuf';

import context from './data/context';
import {
  PingResponseSchema,
} from '../ping/v1/messages_pb';
import {
  UpdateLogResponseSchema,
  DeclareResponseSchema,
  RunnerSchema,
  FetchTaskResponseSchema,
  TaskSchema,
  UpdateTaskResponseSchema,
  TaskStateSchema,
  TaskNeedSchema,
} from '../runner/v1/messages_pb';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const taskWorkflow = fs.readFileSync(resolve(__dirname, './data/workflow.yaml'), 'utf-8');
const workflowPayload = Buffer.from(taskWorkflow);

export const fetchTaskResponse = create(FetchTaskResponseSchema, {
  tasksVersion: BigInt(123),
  task: create(TaskSchema, {
    id: BigInt(100),
    workflowPayload,
    context,
    secrets: {
      GITHUB_TOKEN: '811c3ee800e04c50ea659fd791afc1bdcc9fea6e',
      GITEA_TOKEN: '811c3ee800e04c50ea659fd791afc1bdcc9fea6e',
    },
    machine: '',
    needs: {
      'test-job1': create(TaskNeedSchema, {
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
      ping: vi.fn((req) => {
        return create(PingResponseSchema, {
          data: `Hello, ${req.data}`,
        });
      }),
    },
    RunnerServiceClient: {
      register: vi.fn(),
      declare: vi.fn().mockResolvedValue(create(DeclareResponseSchema, {
        runner: create(RunnerSchema),
      })),
      fetchTask: vi.fn().mockResolvedValue(fetchTaskResponse),
      updateTask: vi.fn().mockResolvedValue(create(UpdateTaskResponseSchema, {
        state: create(TaskStateSchema, {
          id: BigInt(123),
          result: 0,
          startedAt: undefined,
          stoppedAt: undefined,
          steps: [],
        }),
        sentOutputs: [],
      })),
      updateLog: vi.fn((request) => {
        return create(UpdateLogResponseSchema, {
          ackIndex: request.index + BigInt(request.rows.length),
        });
      }),
    },
  };
});

export default mock;
