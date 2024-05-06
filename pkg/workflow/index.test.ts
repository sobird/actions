/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Workflow from '.';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workflowFile = resolve(__dirname, './__mocks__/workflow.yaml');

it('test workflow Read，dump and Load', () => {
  const workflow = Workflow.Read(workflowFile);
  const yaml = workflow.dump();
  const workflow2 = Workflow.Load(yaml);

  console.log('workflow', workflow);
  console.log('workflow2', workflow2);

  expect(workflow).toEqual(workflow2);
});

describe('test workfow on event', () => {
  it('string event test case', () => {
    const yaml = `
      name: local-action-docker-url
      on: push
      
      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
          - uses: ./actions/docker-url
      `;

    const workflow = Workflow.Load(yaml);
    expect(workflow.on).toBe('push');
  });

  it('list event test case', () => {
    const yaml = `
      name: local-action-docker-url
      on: [push, pull_request]
      
      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
          - uses: ./actions/docker-url
      `;

    const workflow = Workflow.Load(yaml);
    expect(workflow.on).toEqual(['push', 'pull_request']);
  });

  it('map event test case', () => {
    const yaml = `
      name: local-action-docker-url
      on:
        push:
          branches:
          - master
        pull_request:
          branches:
          - main
      
      jobs:
        test:
          runs-on: ubuntu-latest
          steps:
          - uses: ./actions/docker-url
      `;

    const workflow = Workflow.Load(yaml);
    expect(workflow.onEvent('push')).toEqual({ branches: ['master'] });
    expect(workflow.onEvent('pull_request')).toEqual({ branches: ['main'] });
  });

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

describe('test workflow runs-on labels', () => {
  it('runs-on labels normal test case', () => {
    const yaml = `
    name: local-action-docker-url
    
    jobs:
      test:
        container: nginx:latest
        runs-on:
          labels: ubuntu-latest
        steps:
        - uses: ./actions/docker-url`;
    const workflow = Workflow.Load(yaml);
    console.log('workflow.jobs', workflow.jobs.test.runsOn);
    expect(workflow.jobs.test?.runsOn).toEqual(['ubuntu-latest']);
  });
});
