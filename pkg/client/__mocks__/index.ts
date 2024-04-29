/* eslint-disable @typescript-eslint/naming-convention */
import fs from 'fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'path';
import { JsonValue, Struct } from '@bufbuild/protobuf';
import {
  UpdateLogResponse, DeclareResponse, Runner, FetchTaskResponse,
  Task,
} from '../runner/v1/messages_pb';
import contextJson from './data/context';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const taskWorkflow = fs.readFileSync(resolve(__dirname, './data/workflow.yaml'), 'utf-8');
const workflowPayload = Buffer.from(taskWorkflow);
const context = Struct.fromJson((contextJson as JsonValue));

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
      fetchTask: vi.fn().mockResolvedValue(new FetchTaskResponse({
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
          needs: {},
          vars: {},
        }),
      })),
      updateTask: vi.fn(),
      updateLog: vi.fn((request) => {
        return new Promise((resolve) => {
          resolve(new UpdateLogResponse({
            ackIndex: request.index + BigInt(request.rows.length),
          }));
        });
      }),
    },
  };
});

export default mock;
