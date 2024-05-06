/* eslint-disable @typescript-eslint/naming-convention */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import Workflow from '.';
import { JobType } from './job';
import { StepType } from './job/step';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const workflowFile = resolve(__dirname, './__mocks__/workflow.yaml');

it('test workflow Read，dump and Load', () => {
  const workflow = Workflow.Read(workflowFile);
  const yaml = workflow.dump();
  const workflow2 = Workflow.Load(yaml);

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
    expect(workflow.jobs.test?.runsOn).toEqual(['ubuntu-latest']);
  });

  it('runs-on labels with group test case', () => {
    const yaml = `
    name: local-action-docker-url
    
    jobs:
      test:
        container: nginx:latest
        runs-on:
          labels: [ubuntu-latest]
          group: linux
        steps:
        - uses: ./actions/docker-url`;
    const workflow = Workflow.Load(yaml);
    expect(workflow.jobs.test?.runsOn).toEqual(['ubuntu-latest', 'linux']);
  });
});

describe('test workflow job', () => {
  it('job container string test case', () => {
    const yaml = `
    name: local-action-docker-url
    
    jobs:
      test:
        container: nginx:latest
        runs-on: ubuntu-latest
        steps:
        - uses: ./actions/docker-url
      test2:
        container:
          image: nginx:latest
          env:
            foo: bar
        runs-on: ubuntu-latest
        steps:
        - uses: ./actions/docker-url
    `;
    const workflow = Workflow.Load(yaml);

    expect(Object.entries(workflow.jobs).length).toBe(2);
    expect(workflow.jobs.test.container?.image).toBe('nginx:latest');
    expect(workflow.jobs.test2.container?.image).toBe('nginx:latest');
    expect(workflow.jobs.test2.container?.env?.foo).toBe('bar');
  });

  it('job container object test case', () => {
    const yaml = `
    name: local-action-docker-url
    
    jobs:
      test:
        container:
          image: r.example.org/something:latest
          credentials:
            username: registry-username
            password: registry-password
          env:
            HOME: /home/user
          volumes:
            - my_docker_volume:/volume_mount
            - /data/my_data
            - /source/directory:/destination/directory
        runs-on: ubuntu-latest
        steps:
        - uses: ./actions/docker-url
    `;
    const workflow = Workflow.Load(yaml);

    expect(Object.entries(workflow.jobs).length).toBe(1);
    expect(workflow.jobs.test.container?.image).toBe('r.example.org/something:latest');
    expect(workflow.jobs.test.container?.env?.HOME).toBe('/home/user');
    expect(workflow.jobs.test.container?.credentials?.username).toBe('registry-username');
    expect(workflow.jobs.test.container?.credentials?.password).toBe('registry-password');
    expect(workflow.jobs.test.container?.volumes).toEqual(['my_docker_volume:/volume_mount', '/data/my_data', '/source/directory:/destination/directory']);
  });

  it('job type normal test case', () => {
    const yaml = `
    name: invalid job definition

    jobs:
      default-job:
        runs-on: ubuntu-latest
        steps:
          - run: echo
      remote-reusable-workflow-yml:
        uses: remote/repo/some/path/to/workflow.yml@main
      remote-reusable-workflow-yaml:
        uses: remote/repo/some/path/to/workflow.yaml@main
      remote-reusable-workflow-custom-path:
        uses: remote/repo/path/to/workflow.yml@main
      local-reusable-workflow-yml:
        uses: ./some/path/to/workflow.yml
      local-reusable-workflow-yaml:
        uses: ./some/path/to/workflow.yaml
    `;
    const workflow = Workflow.Load(yaml);
    expect(Object.entries(workflow.jobs).length).toBe(6);

    expect(workflow.jobs['default-job'].type).toBe(JobType.Default);
    expect(workflow.jobs['remote-reusable-workflow-yml'].type).toBe(JobType.ReusableWorkflowRemote);
    expect(workflow.jobs['remote-reusable-workflow-yaml'].type).toBe(JobType.ReusableWorkflowRemote);
    expect(workflow.jobs['remote-reusable-workflow-custom-path'].type).toBe(JobType.ReusableWorkflowRemote);
    expect(workflow.jobs['local-reusable-workflow-yml'].type).toBe(JobType.ReusableWorkflowLocal);
    expect(workflow.jobs['local-reusable-workflow-yaml'].type).toBe(JobType.ReusableWorkflowLocal);
  });

  it('job type invalid test case', () => {
    const yaml = `
    name: invalid job definition

    jobs:
      remote-reusable-workflow-missing-version:
        uses: remote/repo/some/path/to/workflow.yml
      remote-reusable-workflow-bad-extension:
        uses: remote/repo/some/path/to/workflow.json
      local-reusable-workflow-bad-extension:
        uses: ./some/path/to/workflow.json
      local-reusable-workflow-bad-path:
        uses: some/path/to/workflow.yaml
    `;
    const workflow = Workflow.Load(yaml);
    expect(Object.entries(workflow.jobs).length).toBe(4);

    expect(workflow.jobs['remote-reusable-workflow-missing-version'].type).toBe(JobType.Invalid);
    expect(workflow.jobs['remote-reusable-workflow-bad-extension'].type).toBe(JobType.Invalid);
    expect(workflow.jobs['local-reusable-workflow-bad-extension'].type).toBe(JobType.Invalid);
    expect(workflow.jobs['local-reusable-workflow-bad-path'].type).toBe(JobType.Invalid);
  });

  it('job step type test case', () => {
    const yaml = `
    name: invalid step definition
    
    jobs:
      test:
        runs-on: ubuntu-latest
        steps:
          - name: test1
            uses: actions/checkout@v2
            run: echo
          - name: test2
            run: echo
          - name: test3
            uses: actions/checkout@v2
          - name: test4
            uses: docker://nginx:latest
          - name: test5
            uses: ./local-action
    `;
    const workflow = Workflow.Load(yaml);
    expect(Object.entries(workflow.jobs).length).toBe(1);
    expect(workflow.jobs.test.steps?.length).toBe(5);

    expect(workflow.jobs.test.steps?.[0].type).toBe(StepType.Invalid);
    expect(workflow.jobs.test.steps?.[1].type).toBe(StepType.Run);
    expect(workflow.jobs.test.steps?.[2].type).toBe(StepType.UsesActionRemote);
    expect(workflow.jobs.test.steps?.[3].type).toBe(StepType.UsesDockerURL);
    expect(workflow.jobs.test.steps?.[4].type).toBe(StepType.UsesActionLocal);
  });

  it('', () => {
    //
  });
});
