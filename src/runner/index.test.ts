import { create } from '@bufbuild/protobuf';

import { IssueSchema, IssueType } from '@/gen/runner/v1/messages_pb';
import { HOSTED } from '@/labels';
import type Config from '@/runner/config';
import Workflow from '@/workflow';
import Run from '@/workflow/plan/run';

import Runner, { WellKnownTags } from '.';

const workflow = Workflow.Load(`
name: test workflow
on: push
jobs:
  build:
    name: build
    runs-on: ubuntu-latest
    env:
      FROM_JOB: job
    steps:
      - run: echo hi
`);

/** config 里只有被读到的字段需要存在，其余按需覆盖 */
function createRunner(overrides: Partial<Config> = {}) {
  const config = { context: {}, workdir: process.cwd(), ...overrides };
  return new Runner(new Run('build', workflow), config as unknown as Config);
}

describe('runner env', () => {
  it('records the step and global env from setEnv', () => {
    const runner = createRunner();

    runner.setEnv('FOO', 'bar');

    expect(runner.context.env.FOO).toBe('bar');
    expect(runner.globalEnv.FOO).toBe('bar');
  });

  it('rejects the blocklisted NODE_OPTIONS as an error issue', () => {
    const runner = createRunner();
    const write = vi.spyOn(runner, 'write').mockImplementation(() => {});

    // 官方把变量名统一转成大写再比对，小写写法同样要拦住
    runner.setEnv('node_options', '--max-old-space-size=1');

    expect(runner.context.env.node_options).toBeUndefined();
    expect(runner.issues).toHaveLength(1);
    expect(runner.issues[0].type).toBe(IssueType.ERROR);
    expect(runner.issues[0].message).toBe("Can't update node_options environment variable using set-env command.");
    expect(write).toHaveBeenCalledWith(WellKnownTags.Error, runner.issues[0].message);
  });

  it('merges the job env with the step env', () => {
    const runner = createRunner();

    expect(runner.Env({ FOO: 'step' })).toEqual({ FROM_JOB: 'job', FOO: 'step' });
  });

  it('marks the checkout as skipped', () => {
    const runner = createRunner({ skipCheckout: true });

    expect(runner.Env({}).ACTIONS_SKIP_CHECKOUT).toBe('true');
  });

  it('prepends a path once, most recent first', () => {
    const runner = createRunner();

    runner.addPath('/opt/a');
    runner.addPath('/opt/b');
    expect(runner.prependPath).toEqual(['/opt/b', '/opt/a']);

    runner.addPath('/opt/a');
    expect(runner.prependPath).toEqual(['/opt/a', '/opt/b']);
  });
});

describe('runner masks', () => {
  it('masks the value and each of its lines', () => {
    const runner = createRunner();

    runner.addMask('hunter2');
    runner.addMask('multi\nline');

    expect(runner.maskSecrets('token hunter2 end')).toBe('token *** end');
    expect(runner.maskSecrets('multi')).toBe('***');
    expect(runner.maskSecrets('line')).toBe('***');
  });

  it('warns instead of masking an empty value', () => {
    const runner = createRunner();
    const write = vi.spyOn(runner, 'write').mockImplementation(() => {});

    runner.addMask('   ');

    const message = "Can't add secret mask for empty string in ##[add-mask] command.";
    expect(runner.masks.size).toBe(0);
    expect(runner.issues[0].message).toBe(message);
    expect(write).toHaveBeenCalledWith(WellKnownTags.Warning, message);
  });

  it('masks the secrets of the context', () => {
    const runner = createRunner();
    runner.context.secrets.TOKEN = 's3cret';

    expect(runner.maskSecrets('s3cret')).toBe('***');
  });

  it('keeps the message when insecureSecrets is on', () => {
    const runner = createRunner({ insecureSecrets: true });
    runner.context.secrets.TOKEN = 's3cret';

    expect(runner.maskSecrets('s3cret')).toBe('s3cret');
  });
});

describe('runner outputs and state', () => {
  it('records the output and returns its expression path', () => {
    const runner = createRunner();
    runner.context.github.action = 'first';
    runner.context.steps.first = { outputs: {}, outcome: 'success', conclusion: 'success' };

    expect(runner.setOutput('foo', 'bar')).toBe('steps.first.outputs.foo');
    expect(runner.context.steps.first.outputs.foo).toBe('bar');
    // 非标识符只能用下标写法，否则拼出来的表达式求值会失败
    expect(runner.setOutput('foo-bar', 'baz')).toBe("steps['first']['outputs']['foo-bar']");
  });

  it('ignores setOutput outside a step', () => {
    const runner = createRunner();
    runner.context.github.action = '';

    expect(runner.setOutput('foo', 'bar')).toBe('');
  });

  it('exposes the saved state of the current action', () => {
    const runner = createRunner();
    runner.context.github.action = 'first';

    runner.saveState('key', 'value');

    expect(runner.ActionStates).toEqual({ key: 'value' });
    expect(runner.IntraActionState.first).toEqual({ key: 'value' });
  });
});

describe('runner issues', () => {
  it('keeps at most ten issues per type', () => {
    const runner = createRunner();

    for (let i = 0; i < 12; i++) {
      runner.addIssue(create(IssueSchema, { type: IssueType.WARNING, message: `warn ${i}` }), { writeToLog: false });
    }

    expect(runner.issues).toHaveLength(Runner.MaxCountPerIssueType);
    expect(runner.issues.at(-1)?.message).toBe('warn 9');
  });

  it('masks the message before storing it', () => {
    const runner = createRunner();
    runner.addMask('hunter2');

    runner.addIssue(create(IssueSchema, { type: IssueType.ERROR, message: 'leaked hunter2' }), { writeToLog: false });

    expect(runner.issues[0].message).toBe('leaked ***');
  });

  it('drops issues that have no log tag', () => {
    const runner = createRunner();

    runner.addIssue(create(IssueSchema, { type: IssueType.UNSPECIFIED, message: 'nope' }), { writeToLog: false });

    expect(runner.issues).toHaveLength(0);
  });
});

describe('runner container names', () => {
  it('names the container after the workflow and job', () => {
    const runner = createRunner();

    expect(runner.ContainerName()).toBe('WORKFLOW-test-workflow-JOB-build');
    expect(runner.ContainerName('service')).toBe('WORKFLOW-test-workflow-JOB-build-ID-service');
  });

  it('creates its own network unless a mode is configured', () => {
    expect(createRunner().ContainerNetworkName()).toEqual(['WORKFLOW-test-workflow-JOB-build-Network', true]);
    expect(createRunner({ containerNetworkMode: 'host' }).ContainerNetworkName()).toEqual(['host', false]);
  });
});

describe('runner clone', () => {
  it('clones into an embedded runner sharing masks and the root', () => {
    const runner = createRunner();

    const cloned = runner.clone();

    expect(cloned).not.toBe(runner);
    expect(cloned.isEmbedded).toBe(true);
    expect(cloned.root).toBe(runner);
    expect(cloned.masks).toBe(runner.masks);
    expect(cloned.context).not.toBe(runner.context);
  });
});

describe('runner hosted', () => {
  it('runs on the host when the platform picker returns the hosted sentinel', () => {
    const runner = createRunner({ platforms: new Map(), platformPicker: () => HOSTED });

    expect(runner.IsHosted).toBe(true);
  });

  it('runs on the host when the label maps to the hosted sentinel', () => {
    const runner = createRunner({ platforms: new Map([['ubuntu-latest', HOSTED]]) });

    expect(runner.IsHosted).toBe(true);
  });

  it('runs in a container when the label maps to an image', () => {
    const runner = createRunner({ platforms: new Map([['ubuntu-latest', 'gitea/runner-images:ubuntu-latest']]) });

    expect(runner.IsHosted).toBe(false);
  });
});
