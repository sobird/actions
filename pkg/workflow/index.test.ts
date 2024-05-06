/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Workflow from '.';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workflowFile = resolve(__dirname, './__mocks__/workflow.yaml');

describe('test workflow schedule event', () => {
  it('schedule cron test case', () => {
    const workflow = Workflow.Read(workflowFile);
    const schedules = workflow.onEvent('schedule');

    expect(schedules?.length).toBe(2);
    expect(schedules?.[0].cron).toBe('30 5 * * 1,3');
    expect(schedules?.[1].cron).toBe('30 5 * * 2,4');
  });

  it('schedule xxx test case', () => {
    const yaml = `
      name: local-action-docker-url
      on:
        schedule:
          - test: '30 5 * * 1,3'

      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
          - uses: ./actions/docker-url
      `;
    const workflow = Workflow.Load(yaml);
    const schedules = workflow.onEvent('schedule');

    expect(schedules?.length).toBe(1);
    expect(schedules?.[0]?.cron).toBeUndefined();
    expect(schedules?.[1]?.cron).toBeUndefined();
  });

  it('schedule empty test case', () => {
    const yaml = `
      name: local-action-docker-url
      on:
        schedule:

      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
          - uses: ./actions/docker-url
      `;
    const workflow = Workflow.Load(yaml);
    const schedules = workflow.onEvent('schedule');

    expect(schedules).toBeNull();
  });

  it('schedule undefined test case', () => {
    const yaml = `
      name: local-action-docker-url
      on: [push, tag]

      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
          - uses: ./actions/docker-url
      `;
    const workflow = Workflow.Load(yaml);
    const schedules = workflow.onEvent('schedule');

    expect(schedules).toBeNull();
  });
});
